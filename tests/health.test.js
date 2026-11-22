import { jest } from '@jest/globals';

const mockHealthCheck = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('../src/db.js', () => ({
  default: null,
  query: jest.fn(),
  getClient: jest.fn(),
  healthCheck: mockHealthCheck,
}));

const { default: app } = await import('../src/index.js');
const request = (await import('supertest')).default;

afterEach(() => {
  mockHealthCheck.mockReset();
  mockHealthCheck.mockResolvedValue(true);
});

describe('Health check endpoints', () => {
  it('keeps GET /health compatible with the existing health response', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.database).toBe('connected');
    expect(typeof response.body.uptime).toBe('number');
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it('does not query PostgreSQL for liveness', async () => {
    mockHealthCheck.mockResolvedValue(false);
    const response = await request(app).get('/health/live').expect(200);
    expect(response.body.status).toBe('alive');
    expect(typeof response.body.uptime).toBe('number');
    expect(mockHealthCheck).not.toHaveBeenCalled();
  });

  it('returns readiness 200 when PostgreSQL is accessible', async () => {
    const response = await request(app).get('/health/ready').expect(200);
    expect(response.body.status).toBe('healthy');
    expect(response.body.database).toBe('connected');
  });

  it('returns readiness 503 when PostgreSQL is not accessible', async () => {
    mockHealthCheck.mockResolvedValue(false);
    const response = await request(app).get('/health/ready').expect(503);
    expect(response.body.status).toBe('degraded');
    expect(response.body.database).toBe('disconnected');
  });

  it('returns a safe 503 response when the database health check throws', async () => {
    mockHealthCheck.mockRejectedValue(new Error('Sensitive database error'));
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const response = await request(app).get('/health/ready').expect(503);
      expect(response.body.status).toBe('unhealthy');
      expect(response.body.database).toBe('disconnected');
      expect(JSON.stringify(response.body)).not.toContain('Sensitive database error');
    } finally {
      log.mockRestore();
    }
  });
});
