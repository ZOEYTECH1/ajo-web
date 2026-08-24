import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';

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

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn = 'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

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
}: {
  initial?: Partial<ExpenseForm>;
  expenseId?: number;
  onClose: () => void;
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

  const mutation = useMutation({
    mutationFn: () => {
      const body = { category: form.category, description: form.description.trim(), amount: form.amount, spent_at: form.spent_at };
      return isEdit
        ? api.patch(`/inventory/expenses/${expenseId}/`, body)
        : api.post('/inventory/expenses/', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-expenses'] }); onClose(); },
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
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Category *">
            <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className={inputCls}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Amount (NGN) *">
            <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 50000" className={inputCls} />
          </Field>
          <Field label="Date *">
            <input type="date" value={form.spent_at} onChange={(e) => setForm(f => ({ ...f, spent_at: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Description (optional)">
            <input type="text" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Monthly shop rent" className={inputCls} />
          </Field>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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
  const [showAdd, setShowAdd] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState<Period>('month');

  const today = new Date();
  const periodParams = useMemo(() => {
    if (period === 'month') return `&spent_at_after=${format(startOfMonth(today), 'yyyy-MM-dd')}`;
    if (period === 'week') return `&spent_at_after=${format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')}`;
    return '';
  }, [period, today.toISOString().slice(0, 7)]);

  const { data, isLoading, error } = useQuery<PaginatedExpenses>({
    queryKey: ['inventory-expenses', page, period],
    queryFn: () => api.get(`/inventory/expenses/?page=${page}${periodParams}`).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/expenses/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-expenses'] }),
  });

  const expenses = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));
  const totalAmount = Number(data?.total_amount ?? 0);

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
          {expenses.length > 0 && (
            <button
              type="button"
              onClick={() => exportCsvBlob(expenses, period)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
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
                ? 'bg-orange-600 text-white'
                : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {totalCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-red-600 font-medium">
              {period === 'month' ? 'Total This Month' : period === 'week' ? 'Total This Week' : 'Total All Time'}
            </p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totalAmount || pageTotal)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-red-500 font-medium uppercase">Entries</p>
            <p className="text-2xl font-bold text-red-700">{totalCount}</p>
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {byCategory.length > 1 && (
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5 space-y-3">
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
                  <div className="h-1.5 bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load expenses. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Date', 'Category', 'Description', 'Amount', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={5} cols={5} />
              ) : expenses.length > 0 ? (
                expenses.map(e => (
                  <tr key={e.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-(--text-secondary) whitespace-nowrap">
                      {format(new Date(e.spent_at), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-primary)">{e.category_label}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{e.description || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-(--text-primary)">{formatCurrency(e.amount)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditExpense(e)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(e.id); }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No expenses recorded yet.{' '}
                    <button type="button" onClick={() => setShowAdd(true)} className="text-orange-600 font-semibold hover:underline">Add the first one.</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onChange={setPage} />

      {showAdd && <ExpenseModal onClose={() => setShowAdd(false)} />}
      {editExpense && (
        <ExpenseModal
          initial={{ category: editExpense.category, description: editExpense.description, amount: editExpense.amount, spent_at: editExpense.spent_at.split('T')[0] }}
          expenseId={editExpense.id}
          onClose={() => setEditExpense(null)}
        />
      )}
    </div>
  );
}
