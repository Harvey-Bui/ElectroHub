import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiStatus } from './ApiStatus';

describe('<ApiStatus />', () => {
  it('shows Redis as connected when the health check succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          uptimeSeconds: 5,
          timestamp: '2026-01-01T00:00:00.000Z',
          services: { redis: { status: 'up', latencyMs: 0.42 } },
        }),
        { status: 200 },
      ),
    );

    render(<ApiStatus />);

    expect(await screen.findByText('Redis connected')).toBeInTheDocument();
    expect(screen.getByText('(0.42 ms)')).toBeInTheDocument();
  });

  it('shows the API as unreachable when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    render(<ApiStatus />);

    expect(await screen.findByText('API unreachable')).toBeInTheDocument();
  });
});
