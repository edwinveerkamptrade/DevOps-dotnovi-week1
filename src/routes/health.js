import express from 'express';
import { healthCheck } from '../db.js';

const router = express.Router();

// Liveness means the HTTP process can serve requests; it does not require PostgreSQL.
router.get('/live', (_req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Readiness requires the database, unlike liveness.
async function readinessHandler(_req, res) {
  try {
    const dbHealthy = await healthCheck();
    res.status(dbHealthy ? 200 : 503).json({
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbHealthy ? 'connected' : 'disconnected',
    });
  } catch (error) {
    console.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
    });
  }
}

// Keep GET /health working for existing consumers and student workflows.
router.get(['/', '/ready'], readinessHandler);

export default router;
