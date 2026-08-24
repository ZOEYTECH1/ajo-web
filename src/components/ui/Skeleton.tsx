import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ className, rounded }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'skeleton bg-(--border)',
        rounded ? 'rounded-full' : 'rounded-md',
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) p-6 flex items-start gap-4">
      <Skeleton className="h-12 w-12 shrink-0" rounded />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <td key={j} className="px-6 py-4">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
