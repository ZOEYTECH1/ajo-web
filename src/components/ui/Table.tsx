import clsx from 'clsx';

export interface Column<T = Record<string, unknown>> {
  key: string;
  header: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface TableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
}

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-(--border) rounded skeleton" />
        </td>
      ))}
    </tr>
  );
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-(--border) shadow-sm">
      <table className="min-w-full divide-y divide-(--border) bg-(--surface)">
        <thead className="bg-(--bg)">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cols={columns.length} />
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={clsx(
                  'hover:bg-(--primary-tint)/30 transition-colors',
                  rowIndex % 2 === 0 ? 'bg-(--surface)' : 'bg-(--bg)',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-6 py-4 text-sm text-(--text-primary) whitespace-nowrap">
                    {col.render
                      ? col.render(row[col.key], row)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
