import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/db.js', () => ({
  default: null,
  query: jest.fn(),
  getClient: jest.fn(),
  healthCheck: jest.fn().mockResolvedValue(true),
}));

const { default: app } = await import('../src/index.js');
const request = (await import('supertest')).default;

describe('GET /version', () => {
  const originalCommit = process.env.APP_COMMIT_SHA;

  afterEach(() => {
    if (originalCommit === undefined) {
      delete process.env.APP_COMMIT_SHA;
    } else {
      process.env.APP_COMMIT_SHA = originalCommit;
    }
  });

  it('returns package metadata and a default commit identifier', async () => {
    delete process.env.APP_COMMIT_SHA;
    const response = await request(app).get('/version').expect(200);
    expect(response.body).toEqual({
      name: 'dotNOVI',
      version: '1.0.0',
      commit: 'unknown',
    });
  });

  it('returns the commit provided by the deployment environment', async () => {
    process.env.APP_COMMIT_SHA = '7f3a91c';
    const response = await request(app)
      .get('/version')
      .expect('Content-Type', /json/)
      .expect(200);
    expect(response.body.commit).toBe('7f3a91c');
  });
});
