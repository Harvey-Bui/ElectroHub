import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section className="space-y-4 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <p className="text-slate-600">The page you are looking for does not exist.</p>
      <Link to="/" className="font-medium text-brand-600 hover:text-brand-700">
        Back to home
      </Link>
    </section>
  );
}
