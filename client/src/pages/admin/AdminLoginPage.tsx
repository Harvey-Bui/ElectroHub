import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, CircleAlert, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAdminLogin, useAdminSession } from '@/api/adminQueries';
import { ApiError, errorMessage } from '@/api/http';
import { LogoMark } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button, Input } from '@/components/ui';

/** Only allow redirects back into the admin area (no open redirects). */
function safeNext(raw: string | null): string {
  return raw && raw.startsWith('/admin') && !raw.startsWith('//') ? raw : '/admin';
}

function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    const seconds =
      (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds ?? 900;
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  if (error instanceof ApiError && error.status === 401) return 'Incorrect username or password.';
  return errorMessage(error);
}

export function AdminLoginPage() {
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const session = useAdminSession();
  const navigate = useNavigate();
  const passwordRef = useRef<HTMLInputElement>(null);
  const login = useAdminLogin({
    onSuccess: () => navigate(next, { replace: true }),
    onError: () => {
      setPassword('');
      passwordRef.current?.focus();
    },
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [missing, setMissing] = useState<{ username?: string; password?: string }>({});

  if (session.isSuccess) return <Navigate to={next} replace />;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errors = {
      username: username.trim() ? undefined : 'Enter your username.',
      password: password ? undefined : 'Enter your password.',
    };
    setMissing(errors);
    if (errors.username || errors.password) return;
    login.mutate({ username: username.trim(), password });
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(40% 40% at 50% 20%, var(--eh-accent-glow) 0%, transparent 70%)',
        }}
      />
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <main className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <LogoMark className="size-12" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-fg">Sign in to Admin</h1>
            <p className="text-sm text-fg-secondary">Manage orders, products and stock.</p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={submit}
          aria-label="Admin sign in"
          className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6 shadow-lg"
        >
          {login.isError && (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md bg-danger-soft p-3 text-sm text-danger"
            >
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {loginErrorMessage(login.error)}
            </p>
          )}
          <Input
            label="Username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            error={missing.username}
          />
          <Input
            ref={passwordRef}
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={missing.password}
            rightElement={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                className="rounded-sm p-1 text-fg-muted hover:text-fg"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            }
          />
          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={login.isPending}
            loadingText="Signing in"
            leftIcon={<LogIn />}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to the store
          </Link>
        </p>
      </main>
    </div>
  );
}
