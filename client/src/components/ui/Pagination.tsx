import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/** Previous / "page of total" / Next. Renders nothing for a single page. */
export function Pagination({ page, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className={className ?? 'mt-8 flex items-center justify-center gap-3'}
    >
      <Button
        variant="secondary"
        size="sm"
        leftIcon={<ChevronLeft />}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="eh-numeric text-sm text-fg-secondary">
        <span className="sr-only">Page </span>
        {page} / {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        rightIcon={<ChevronRight />}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
