import { Compass } from 'lucide-react';
import { ButtonLink, EmptyState } from '@/components/ui';

export function NotFoundPage() {
  return (
    <div className="eh-container py-16 md:py-24">
      <EmptyState
        headingLevel="h2"
        icon={<Compass />}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        actions={
          <>
            <ButtonLink to="/">Back to home</ButtonLink>
            <ButtonLink to="/products" variant="secondary">
              Browse products
            </ButtonLink>
          </>
        }
      />
      <h1 className="sr-only">404, page not found</h1>
    </div>
  );
}
