import { ApiError, apiRequest } from './http';

export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptimeSeconds: number;
  timestamp: string;
  services: {
    redis: { status: 'up' | 'down'; latencyMs?: number; error?: string };
  };
}

/**
 * GET /api/health. The server answers 503 (with the same body) when Redis is
 * down, so that case is returned as data rather than thrown.
 */
export async function fetchHealth(signal?: AbortSignal): Promise<HealthResponse> {
  try {
    return await apiRequest<HealthResponse>('/api/health', signal ? { signal } : {});
  } catch (error) {
    if (error instanceof ApiError && error.status === 503 && isHealthResponse(error.body)) {
      return error.body;
    }
    throw error;
  }
}

function isHealthResponse(value: unknown): value is HealthResponse {
  return typeof value === 'object' && value !== null && 'services' in value && 'status' in value;
}
