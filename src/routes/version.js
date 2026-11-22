import express from 'express';
import { readFileSync } from 'node:fs';

const router = express.Router();
const { name, version } = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8')
);

router.get('/', (_req, res) => {
  res.json({
    name,
    version,
    commit: process.env.APP_COMMIT_SHA || 'unknown',
  });
});

export default router;
