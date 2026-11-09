import { describe, expect, it, vi } from 'vitest';
import { fetchHealth } from './health';
import { ApiError, apiRequest } from './http';

function mockFetch(status: number, body: unknown) {
  return vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

describe('apiRequest', () => {
  it('sends JSON and parses JSON responses', async () => {
    const fetchSpy = mockFetch(200, { ok: true });

    const result = await apiRequest<{ ok: boolean }>('/api/thing', {
      method: 'POST',
      body: { a: 1 },
    });

    expect(result).toEqual({ ok: true });
    const [url, init] = fetchSpy.mock.calls[0]!;
    expect(url).toBe('/api/thing');
    expect(init?.body).toBe('{"a":1}');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });

  it('throws ApiError with the server error code and message', async () => {
    mockFetch(404, { error: { code: 'NOT_FOUND', message: 'Product not found' } });

    const error = await apiRequest('/api/products/x').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404, code: 'NOT_FOUND', message: 'Product not found' });
  });
});

describe('fetchHealth', () => {
  it('returns the degraded body instead of throwing on 503', async () => {
    const body = {
      status: 'degraded',
      uptimeSeconds: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
      services: { redis: { status: 'down', error: 'connection refused' } },
    };
    mockFetch(503, body);

    await expect(fetchHealth()).resolves.toEqual(body);
  });
});
