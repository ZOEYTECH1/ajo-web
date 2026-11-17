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

// ── Mobile card view ──────────────────────────────────────────────────────────
// Below tablet width a multi-column table is unreadable (extra columns just
// scroll off-screen with no hint they exist) — so the same columns/data feed
// a stack of cards instead: first column as the card's title, the rest as
// label/value rows, and a trailing "Action(s)" column (the one naming
// convention every call site of this component already uses) as a button
// row at the bottom instead of another label/value line.

function isActionsColumn(header: string) {
  return /^actions?$/i.test(header);
}

function RowCard<T extends Record<string, unknown>>({
  columns,
  row,
  tinted,
}: {
  columns: Column<T>[];
  row: T;
  tinted: boolean;
}) {
  const [titleCol, ...rest] = columns;
  const actionsCol = rest.find((c) => isActionsColumn(c.header));
  const detailCols = rest.filter((c) => c !== actionsCol);

  return (
    <div className={clsx('rounded-xl border border-(--border) p-4', tinted ? 'bg-(--bg)' : 'bg-(--surface)')}>
      <div className="font-semibold text-sm text-(--text-primary)">
        {titleCol.render ? titleCol.render(row[titleCol.key], row) : String(row[titleCol.key] ?? '')}
      </div>
      {detailCols.length > 0 && (
        <dl className="mt-2 space-y-1.5">
          {detailCols.map((col) => (
            <div key={col.key} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-xs text-(--text-muted)">{col.header}</dt>
              <dd className="text-(--text-primary) text-right">
                {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
              </dd>
            </div>
          ))}
        </dl>
      )}
      {actionsCol && (
        <div className="mt-3 pt-3 border-t border-(--border)">
          {actionsCol.render ? actionsCol.render(row[actionsCol.key], row) : null}
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-4 space-y-2">
      <div className="h-4 w-2/5 bg-(--border) rounded skeleton" />
      <div className="h-3 w-3/5 bg-(--border) rounded skeleton" />
      <div className="h-3 w-1/3 bg-(--border) rounded skeleton" />
    </div>
  );
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available.',
}: TableProps<T>) {
  return (
    <>
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : data.length === 0 ? (
          <p className="text-center text-sm text-(--text-muted) py-8">{emptyMessage}</p>
        ) : (
          data.map((row, i) => <RowCard key={i} columns={columns} row={row} tinted={i % 2 === 1} />)
        )}
      </div>

      <div className="hidden md:block overflow-x-auto rounded-xl border border-(--border) shadow-sm">
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
    </>
  );
}
