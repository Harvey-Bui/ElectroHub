import { ApiStatus } from '@/components/ApiStatus';

export function HomePage() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-4xl font-bold tracking-tight">Welcome to ElectroHub</h1>
        <p className="max-w-2xl text-lg text-slate-600">
          An electronics store whose products, carts, inventory and orders are stored in Redis. The
          catalogue is under construction.
        </p>
      </div>

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          System status
        </h2>
        <ApiStatus />
      </div>
    </section>
  );
}
