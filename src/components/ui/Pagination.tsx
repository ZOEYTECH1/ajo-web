import clsx from 'clsx';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  onChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize = 20,
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce<(number | '…')[]>((acc, n, idx, arr) => {
      if (idx > 0 && n - (arr[idx - 1] as number) > 1) acc.push('…');
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className="flex items-center justify-between mt-4 gap-3 flex-wrap">
      <p className="text-xs text-(--text-muted)">
        Showing {start}–{end} of {totalCount}
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          className="p-1.5 rounded-lg border border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30 disabled:opacity-40 transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4" />
        </button>

        {pageNums.map((n, i) =>
          n === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-(--text-muted)">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n as number)}
              className={clsx(
                'w-8 h-8 rounded-lg text-xs font-semibold transition-colors',
                page === n
                  ? 'bg-(--primary) text-white'
                  : 'border border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30',
              )}
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg border border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30 disabled:opacity-40 transition-colors"
        >
          <ChevronRightIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
