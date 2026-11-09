import { Router } from 'express';

/** Minimal surface of the Redis client the health check needs (easy to fake in tests). */
export interface PingableStore {
  readonly isReady: boolean;
  ping(): Promise<string>;
}

export function createHealthRouter(store: PingableStore): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    const started = performance.now();
    let redis: { status: 'up' | 'down'; latencyMs?: number; error?: string };

    try {
      if (!store.isReady) throw new Error('client not ready');
      await store.ping();
      redis = { status: 'up', latencyMs: Math.round((performance.now() - started) * 100) / 100 };
    } catch (error) {
      redis = { status: 'down', error: error instanceof Error ? error.message : String(error) };
    }

    const healthy = redis.status === 'up';
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      services: { redis },
    });
  });

  return router;
}
