import { useId, type Key, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Skeleton } from './Skeleton';

export type SortDirection = 'asc' | 'desc';
export interface SortState {
  key: string;
  direction: SortDirection;
}

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  /** Cell renderer. Defaults to `row[key]`. */
  cell?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Use JetBrains Mono with tabular figures (prices, IDs, specs). */
  numeric?: boolean;
  sortable?: boolean;
  /** Hide below a breakpoint to keep tables readable on phones. */
  hideBelow?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => Key;
  /** Describes the table for assistive tech; visually hidden unless `showCaption`. */
  caption: string;
  showCaption?: boolean;
  loading?: boolean;
  /** Rows of skeletons shown while loading. */
  loadingRows?: number;
  /** Rendered in a full-width row when there are no rows. */
  empty?: ReactNode;
  density?: 'compact' | 'comfortable';
  striped?: boolean;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  className?: string;
}

const align = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;
const hide = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
} as const;

/**
 * Data table with semantic markup (<table>, <caption>, <th scope>),
 * sortable headers (buttons with aria-sort), loading skeletons and an empty
 * state. Wide tables scroll horizontally inside a keyboard-focusable region.
 */
export function Table<T>({
  columns,
  rows,
  getRowKey,
  caption,
  showCaption = false,
  loading = false,
  loadingRows = 4,
  empty,
  density = 'comfortable',
  striped = false,
  sort,
  onSortChange,
  className,
}: TableProps<T>) {
  const captionId = useId();
  const pad = density === 'compact' ? 'px-3 py-2' : 'px-4 py-3';

  const toggleSort = (key: string) => {
    const direction: SortDirection = sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc';
    onSortChange?.({ key, direction });
  };

  return (
    <div
      role="region"
      aria-labelledby={captionId}
      tabIndex={0}
      className={cn('overflow-x-auto rounded-lg border border-border bg-surface', className)}
    >
      <table className="w-full border-collapse text-sm" aria-busy={loading || undefined}>
        <caption
          id={captionId}
          className={cn(
            showCaption ? 'px-4 py-3 text-left text-sm font-medium text-fg' : 'sr-only',
          )}
        >
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-border bg-elevated">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              const ariaSort = active
                ? sort!.direction === 'asc'
                  ? 'ascending'
                  : 'descending'
                : undefined;
              return (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={col.sortable ? (ariaSort ?? 'none') : undefined}
                  className={cn(
                    pad,
                    'whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-fg-muted',
                    align[col.align ?? (col.numeric ? 'right' : 'left')],
                    col.hideBelow && hide[col.hideBelow],
                    col.className,
                  )}
                >
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 uppercase transition-colors duration-fast hover:text-fg"
                    >
                      {col.header}
                      {active ? (
                        sort!.direction === 'asc' ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : (
                          <ArrowDown className="size-3.5" aria-hidden />
                        )
                      ) : (
                        <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: loadingRows }, (_, i) => (
              <tr key={`skeleton-${i}`} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className={cn(pad, col.hideBelow && hide[col.hideBelow])}>
                    <Skeleton className="h-4 w-full max-w-32" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-0">
                {empty ?? <p className="px-4 py-10 text-center text-sm text-fg-muted">No data</p>}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                className={cn(
                  'border-b border-border transition-colors duration-fast last:border-0 hover:bg-accent-soft',
                  striped && 'even:bg-sunken',
                )}
              >
                {columns.map((col, i) => {
                  const content = col.cell
                    ? col.cell(row)
                    : String((row as Record<string, unknown>)[col.key] ?? '');
                  const Cell = i === 0 ? 'th' : 'td';
                  return (
                    <Cell
                      key={col.key}
                      scope={i === 0 ? 'row' : undefined}
                      className={cn(
                        pad,
                        'text-fg',
                        i === 0 ? 'font-medium' : 'text-fg-secondary',
                        align[col.align ?? (col.numeric ? 'right' : 'left')],
                        col.numeric && 'eh-numeric',
                        col.hideBelow && hide[col.hideBelow],
                        col.className,
                      )}
                    >
                      {content}
                    </Cell>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
