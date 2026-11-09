import { useEffect, useState } from 'react';
import { fetchHealth, type HealthResponse } from '@/api/health';

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; health: HealthResponse }
  | { kind: 'unreachable'; message: string };

/** Live status of the API server and its Redis database, read from GET /api/health. */
export function ApiStatus() {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchHealth(controller.signal)
      .then((health) => setState({ kind: 'loaded', health }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          kind: 'unreachable',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    return () => controller.abort();
  }, []);

  if (state.kind === 'loading') {
    return <StatusRow tone="neutral" label="Checking API..." />;
  }

  if (state.kind === 'unreachable') {
    return <StatusRow tone="bad" label="API unreachable" detail={state.message} />;
  }

  const { redis } = state.health.services;
  return (
    <div className="space-y-2">
      <StatusRow tone="good" label="API server online" />
      {redis.status === 'up' ? (
        <StatusRow
          tone="good"
          label="Redis connected"
          detail={redis.latencyMs !== undefined ? `${redis.latencyMs} ms` : undefined}
        />
      ) : (
        <StatusRow tone="bad" label="Redis unavailable" detail={redis.error} />
      )}
    </div>
  );
}

const toneClasses = {
  good: 'bg-emerald-500',
  bad: 'bg-rose-500',
  neutral: 'bg-slate-400 animate-pulse',
} as const;

function StatusRow({
  tone,
  label,
  detail,
}: {
  tone: keyof typeof toneClasses;
  label: string;
  detail?: string | undefined;
}) {
  return (
    <p className="flex items-center gap-2 text-sm" role="status">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${toneClasses[tone]}`} />
      <span className="font-medium">{label}</span>
      {detail && <span className="text-slate-500">({detail})</span>}
    </p>
  );
}
