import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { createRedisClient } from '../src/db/redis.js';
import type { PingableStore } from '../src/routes/health.js';

// These tests need no running Redis: the client is created but never connected,
// and the health check talks to a stub.
const config = { ...loadConfig({ NODE_ENV: 'test' }), corsOrigins: ['http://localhost:5173'] };
const redis = createRedisClient(config.redis, { reconnect: false });

function storeThat(behaviour: 'up' | 'down' | 'not-ready'): PingableStore {
  return {
    isReady: behaviour !== 'not-ready',
    ping: () =>
      behaviour === 'down'
        ? Promise.reject(new Error('connection refused'))
        : Promise.resolve('PONG'),
  };
}

const appWith = (health: PingableStore) => createApp({ config, redis, health });

describe('GET /api/health', () => {
  it('returns 200 when Redis answers PING', async () => {
    const res = await request(appWith(storeThat('up'))).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.redis.status).toBe('up');
    expect(typeof res.body.services.redis.latencyMs).toBe('number');
  });

  it('returns 503 when Redis PING fails', async () => {
    const res = await request(appWith(storeThat('down'))).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.redis).toEqual({ status: 'down', error: 'connection refused' });
  });

  it('returns 503 when the Redis client is not ready', async () => {
    const res = await request(appWith(storeThat('not-ready'))).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.services.redis.status).toBe('down');
  });
});

describe('error handling and HTTP hygiene', () => {
  const app = appWith(storeThat('up'));

  it('returns the standard error shape for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'ROUTE_NOT_FOUND', message: 'Route GET /api/does-not-exist not found' },
    });
  });

  it('returns 400 BAD_JSON for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });

  it('returns 413 for oversized bodies', async () => {
    const res = await request(app)
      .post('/api/checkout')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'x'.repeat(200_000) }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('sets CORS headers for the configured origin and security headers', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
