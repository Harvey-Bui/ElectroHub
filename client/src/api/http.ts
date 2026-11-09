const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

/** Error shape returned by the ElectroHub API: `{ error: { code, message, details } }`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: string = 'ERROR',
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** The `error.details` payload (e.g. `{ available: 2 }` or a list of field issues). */
  get details(): unknown {
    return (this.body as { error?: { details?: unknown } } | undefined)?.error?.details;
  }

  /**
   * For 400 VALIDATION_ERROR responses: `{ "shippingAddress.city": "Required" }`,
   * keyed by the same dotted path the server reports, for showing errors inline.
   */
  get fieldErrors(): Record<string, string> {
    if (this.code !== 'VALIDATION_ERROR' || !Array.isArray(this.details)) return {};
    const out: Record<string, string> = {};
    for (const issue of this.details as Array<{ path?: string; message?: string }>) {
      if (issue.path && issue.message && !(issue.path in out)) out[issue.path] = issue.message;
    }
    return out;
  }
}

/** Human-readable message for any thrown value. */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.') {
  if (error instanceof ApiError) return error.message;
  if (error instanceof TypeError) return "Can't reach the store. Check your connection.";
  return fallback;
}

type RequestOptions = Omit<RequestInit, 'body'> & { body?: unknown };

/** Typed JSON fetch wrapper used by every API module. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...init } = options;

  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  const data: unknown = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | undefined)?.error;
    throw new ApiError(
      response.status,
      error?.message ?? `Request failed with status ${response.status}`,
      error?.code,
      data,
    );
  }

  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
