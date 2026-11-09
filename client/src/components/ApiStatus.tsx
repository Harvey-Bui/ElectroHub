import { useEffect, useState } from 'react';
import { fetchHealth, type HealthResponse } from '@/api/health';
import { cn } from '@/lib/cn';

type State =
  | { kind: 'loading' }
  | { kind: 'loaded'; health: HealthResponse }
  | { kind: 'unreachable'; message: string };

/**
 * Live status of the API server and its Redis database (GET /api/health).
 * `compact` renders one line for the footer.
 */
export function ApiStatus({ compact = false }: { compact?: boolean }) {
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
  if (compact) {
    return redis.status === 'up' ? (
      <StatusRow
        tone="good"
        label="All systems operational"
        detail={redis.latencyMs !== undefined ? `Redis ${redis.latencyMs} ms` : undefined}
      />
    ) : (
      <StatusRow tone="bad" label="Redis unavailable" detail={redis.error} />
    );
  }
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
  good: 'bg-success',
  bad: 'bg-danger',
  neutral: 'bg-fg-muted animate-pulse',
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
      <span className={cn('inline-block size-2 rounded-full', toneClasses[tone])} aria-hidden />
      <span className="font-medium text-fg-secondary">{label}</span>
      {detail && <span className="eh-numeric text-fg-muted">({detail})</span>}
    </p>
  );
}
