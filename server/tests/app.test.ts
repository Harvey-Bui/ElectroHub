import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { PingableStore } from '../src/routes/health.js';

const config = { corsOrigins: ['http://localhost:5173'] };

function storeThat(behaviour: 'up' | 'down' | 'not-ready'): PingableStore {
  return {
    isReady: behaviour !== 'not-ready',
    ping: () =>
      behaviour === 'down'
        ? Promise.reject(new Error('connection refused'))
        : Promise.resolve('PONG'),
  };
}

describe('GET /api/health', () => {
  it('returns 200 when Redis answers PING', async () => {
    const res = await request(createApp({ config, redis: storeThat('up') })).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.services.redis.status).toBe('up');
    expect(typeof res.body.services.redis.latencyMs).toBe('number');
  });

  it('returns 503 when Redis PING fails', async () => {
    const res = await request(createApp({ config, redis: storeThat('down') })).get('/api/health');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services.redis).toEqual({ status: 'down', error: 'connection refused' });
  });

  it('returns 503 when the Redis client is not ready', async () => {
    const res = await request(createApp({ config, redis: storeThat('not-ready') })).get(
      '/api/health',
    );

    expect(res.status).toBe(503);
    expect(res.body.services.redis.status).toBe('down');
  });
});

describe('error handling', () => {
  const app = createApp({ config, redis: storeThat('up') });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_JSON');
  });

  it('sets CORS headers for the configured origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });
});
