import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, ArrowDownTrayIcon, TagIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { Skeleton } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

interface Expense {
  id: number;
  category: string;
  category_label: string;
  description: string;
  amount: string;
  spent_at: string;
  created_at: string;
}

interface PaginatedExpenses {
  count: number;
  next: string | null;
  previous: string | null;
  results: Expense[];
  total_amount: string;
}

interface UserExpenseCategory {
  id: number;
  name: string;
  created_at: string;
}

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'salary', label: 'Salary' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
];

type Period = 'all' | 'week' | 'month';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'month', label: 'This Month' },
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All Time' },
];

function catLabel(cat: string) {
  return CATEGORIES.find(c => c.value === cat)?.label ?? cat;
}

function ManageCategoriesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState('');

  const { data: cats = [] } = useQuery<UserExpenseCategory[]>({
    queryKey: ['inventory-expense-categories'],
    queryFn: () => api.get('/inventory/expense-categories/').then(r => r.data),
  });

  const addMutation = useMutation({
    mutationFn: () => api.post('/inventory/expense-categories/', { name: newName.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] }); setNewName(''); setErr(''); },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Failed.')));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/expense-categories/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-expense-categories'] }),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) border border-(--border) rounded-2xl shadow-(--shadow-soft-lg) w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">My Expense Categories</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newName.trim()) addMutation.mutate(); } }}
              placeholder="New category name"
              className="flex-1 rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
            />
            <button
              type="button"
              disabled={!newName.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate()}
              className="rounded-lg bg-(--accent) text-white px-4 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {addMutation.isPending ? '…' : 'Add'}
            </button>
          </div>
          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
          {cats.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cats.map(c => (
                <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-(--bg) border border-(--border)">
                  <span className="text-sm font-medium text-(--text-primary)">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => { if (confirm(`Delete category "${c.name}"?`)) deleteMutation.mutate(c.id); }}
                    disabled={deleteMutation.isPending}
                    className="p-1 rounded text-(--text-muted) hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-(--text-muted) text-center py-4">No custom categories yet. Add one above.</p>
          )}
          <button type="button" onClick={onClose} className="w-full rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:text-(--text-primary) transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function exportPdf(expenses: Expense[], period: Period) {
  const label = period === 'month' ? 'This Month' : period === 'week' ? 'This Week' : 'All Time';
  const rows = expenses.map(e =>
    `<tr><td>${e.spent_at.slice(0, 10)}</td><td>${e.category_label}</td><td>${(e.description || '—').replace(/</g, '&lt;')}</td><td style="text-align:right">₦${Number(e.amount).toLocaleString()}</td></tr>`
  ).join('');
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const html = `<!DOCTYPE html><html><head><title>Expenses — ${label}</title>
<style>body{font-family:Arial,sans-serif;padding:20px}h2{margin-bottom:4px}p{color:#666;font-size:13px;margin-top:0}
table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:8px;font-size:13px;text-align:left}
th{background:#f5f5f5;font-weight:600}tfoot td{font-weight:700;background:#fef3c7}
@media print{button{display:none}}</style></head>
<body><h2>Expenses — ${label}</h2><p>Generated: ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
<table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="3">Total</td><td style="text-align:right">₦${total.toLocaleString()}</td></tr></tfoot>
</table><script>window.onload=()=>window.print()</script></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

function exportCsvBlob(expenses: Expense[], period: Period) {
  const periodLabel = period === 'month' ? 'this-month' : period === 'week' ? 'this-week' : 'all-time';
  const header = 'Date,Category,Description,Amount (NGN)\n';
  const rows = expenses.map(e =>
    `${e.spent_at.slice(0, 10)},${catLabel(e.category_label)},"${(e.description || '').replace(/"/g, '""')}",${Number(e.amount).toFixed(2)}`
  ).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ajo-expenses-${periodLabel}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v));
}

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)';
const submitBtn = 'flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100';
const cancelBtn = 'flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{label}</label>
      {children}
    </div>
  );
}

type ExpenseForm = { category: string; description: string; amount: string; spent_at: string };

function ExpenseModal({
  initial,
  expenseId,
  onClose,
  bizId,
}: {
  initial?: Partial<ExpenseForm>;
  expenseId?: number;
  onClose: () => void;
  bizId: number | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!expenseId;
  const today = format(new Date(), 'yyyy-MM-dd');
  const [form, setForm] = useState<ExpenseForm>({
    category: initial?.category ?? 'other',
    description: initial?.description ?? '',
    amount: initial?.amount ?? '',
    spent_at: initial?.spent_at ?? today,
  });
  const [err, setErr] = useState('');

  const { data: customCats = [] } = useQuery<UserExpenseCategory[]>({
    queryKey: ['inventory-expense-categories'],
    queryFn: () => api.get('/inventory/expense-categories/').then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: () => {
      const body = { business_id: bizId, category: form.category, description: form.description.trim(), amount: form.amount, spent_at: form.spent_at };
      return isEdit
        ? api.patch(`/inventory/expenses/${expenseId}/`, body)
        : api.post('/inventory/expenses/', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-expenses'] });
      qc.invalidateQueries({ queryKey: ['inventory-analytics'] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Failed.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount.'); return; }
    if (!form.spent_at) { setErr('Date is required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) border border-(--border) rounded-2xl shadow-(--shadow-soft-lg) w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Category *">
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
              <optgroup label="Preset">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </optgroup>
              {customCats.length > 0 && (
                <optgroup label="My Categories">
                  {customCats.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          </Field>
          <Field label="Amount (NGN) *">
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 50000" className={inputCls} />
          </Field>
          <Field label="Date *">
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <button type="button" onClick={() => setForm(f => ({ ...f, spent_at: format(new Date(), 'yyyy-MM-dd') }))}
                  className="px-3 py-1 rounded-full text-xs font-semibold surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:bg-(--primary-tint) hover:border-(--primary-light) hover:text-(--primary-dark) transition-colors">
                  Today
                </button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); setForm(f => ({ ...f, spent_at: format(d, 'yyyy-MM-dd') })); }}
                  className="px-3 py-1 rounded-full text-xs font-semibold surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:bg-(--primary-tint) hover:border-(--primary-light) hover:text-(--primary-dark) transition-colors">
                  Yesterday
                </button>
              </div>
              <input type="date" value={form.spent_at} onChange={(e) => setForm(f => ({ ...f, spent_at: e.target.value }))} className={inputCls} />
            </div>
          </Field>
          <Field label="Description (optional)">
            <input type="text" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly shop rent" className={inputCls} />
          </Field>
          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={submitBtn}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryExpensesPage() {
  const qc = useQueryClient();
  const { selectedId } = useInventoryBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showManageCats, setShowManageCats] = useState(false);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>('month');

  const today = new Date();
  const { data, isLoading, error } = useQuery<PaginatedExpenses>({
    queryKey: ['inventory-expenses', page, period, selectedId],
    queryFn: () => api.get(`/inventory/expenses/`, { params: { page, business_id: selectedId, ...(period === 'month' ? { spent_at_after: format(startOfMonth(today), 'yyyy-MM-dd') } : period === 'week' ? { spent_at_after: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd') } : {}) } }).then(r => r.data),
    enabled: selectedId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/expenses/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-expenses'] });
      qc.invalidateQueries({ queryKey: ['inventory-analytics'] });
    },
  });

  const expenses = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));
  const totalAmount = Number(data?.total_amount ?? 0);

  const byDate = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const e of expenses) {
      const day = e.spent_at.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(e);
    }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [expenses]);

  const byCategory = useMemo(() => {
    const map: Record<string, { label: string; amount: number }> = {};
    for (const e of expenses) {
      if (!map[e.category]) map[e.category] = { label: e.category_label, amount: 0 };
      map[e.category].amount += Number(e.amount);
    }
    return Object.values(map).sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const pageTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Expenses</h1>
          <p className="text-sm text-(--text-secondary)">Track your business costs</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowManageCats(true)}
            className="inline-flex items-center gap-1.5 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
          >
            <TagIcon className="h-4 w-4" />
            Categories
          </button>
          {expenses.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => exportCsvBlob(expenses, period)}
                className="inline-flex items-center gap-1.5 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportPdf(expenses, period)}
                className="inline-flex items-center gap-1.5 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
          >
            <PlusIcon className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Period filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setPeriod(key); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              period === key
                ? 'bg-(--accent) text-white'
                : 'bg-(--surface) surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {totalCount > 0 && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl px-5 py-4 flex items-center justify-between gap-4 shadow-sm animate-rise-in">
          <div>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              {period === 'month' ? 'Total This Month' : period === 'week' ? 'Total This Week' : 'Total All Time'}
            </p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{formatCurrency(totalAmount || pageTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-500 dark:text-red-400 font-medium uppercase">Entries</p>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{totalCount}</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {byCategory.length > 1 && (
        <div className="surface-soft p-5 space-y-3 animate-rise-in">
          <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">
            Breakdown by Category {totalPages > 1 && <span className="normal-case font-normal">(this page)</span>}
          </p>
          {byCategory.map(({ label, amount }) => {
            const pct = pageTotal > 0 ? Math.round((amount / pageTotal) * 100) : 0;
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-(--text-primary)">{label}</span>
                  <span className="font-semibold text-(--text-primary)">{formatCurrency(amount)} <span className="text-(--text-muted) font-normal">{pct}%</span></span>
                </div>
                <div className="h-1.5 bg-(--border) rounded-full overflow-hidden">
                  <div className="h-1.5 bg-(--primary) rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load expenses. Please refresh.
        </div>
      )}

      {/* A date-grouped list rather than the shared Table component --
          expenses only ever carry 3 real fields (category, description,
          amount) and are always grouped under a day header, so a table's
          column headers added nothing (the "Date" column just showed "—"
          on every row, since the date already lives in the group header).
          This reads fine at any width without needing a separate mobile
          layout. */}
      <div className="surface-soft overflow-hidden">
        {isLoading ? (
          <div className="p-4 sm:p-6 space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : expenses.length > 0 ? (
          <div className="divide-y divide-(--border)">
            {byDate.map(([day, dayExpenses]) => (
              <div key={day}>
                <div className="px-4 sm:px-6 py-2 bg-(--bg) flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                    {format(new Date(day + 'T00:00:00'), 'EEEE, dd MMM yyyy')}
                  </span>
                  <span className="text-xs font-semibold text-(--text-muted)">
                    {formatCurrency(dayExpenses.reduce((s, e) => s + Number(e.amount), 0))}
                  </span>
                </div>
                <div className="divide-y divide-(--border)">
                  {dayExpenses.map(e => (
                    <div key={e.id} className="px-4 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap hover:bg-(--primary-tint)/30 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-(--text-primary)">{e.category_label}</p>
                        {e.description && <p className="text-xs text-(--text-secondary) mt-0.5">{e.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-semibold text-(--text-primary)">{formatCurrency(e.amount)}</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => setEditExpense(e)}
                            className="p-1.5 rounded-lg text-(--text-muted) hover:text-(--primary) hover:bg-(--primary-tint) transition-colors" title="Edit">
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(e.id); }}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-(--text-muted)">
            No expenses recorded yet.{' '}
            <button type="button" onClick={() => setShowAdd(true)} className="text-(--primary) font-semibold hover:underline">Add the first one.</button>
          </p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onChange={setPage} />

      {showManageCats && <ManageCategoriesModal onClose={() => setShowManageCats(false)} />}
      {showAdd && <ExpenseModal onClose={() => setShowAdd(false)} bizId={selectedId} />}
      {editExpense && (
        <ExpenseModal
          initial={{ category: editExpense.category, description: editExpense.description, amount: editExpense.amount, spent_at: editExpense.spent_at.split('T')[0] }}
          expenseId={editExpense.id}
          onClose={() => setEditExpense(null)}
          bizId={selectedId}
        />
      )}
    </div>
  );
}
