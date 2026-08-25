import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, startOfWeek } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, ArrowDownTrayIcon, TagIcon } from '@heroicons/react/24/outline';
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
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">My Expense Categories</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newName.trim()) addMutation.mutate(); } }}
              placeholder="New category name"
              className="flex-1 rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <button
              type="button"
              disabled={!newName.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate()}
              className="rounded-lg bg-orange-600 text-white px-4 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {addMutation.isPending ? '…' : 'Add'}
            </button>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:text-(--text-primary) transition-colors">
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

  const { data: customCats = [] } = useQuery<UserExpenseCategory[]>({
    queryKey: ['inventory-expense-categories'],
    queryFn: () => api.get('/inventory/expense-categories/').then(r => r.data),
  });

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
                  className="px-3 py-1 rounded-full text-xs font-semibold border border-(--border) text-(--text-secondary) hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700 transition-colors">
                  Today
                </button>
                <button type="button" onClick={() => { const d = new Date(); d.setDate(d.getDate() - 1); setForm(f => ({ ...f, spent_at: format(d, 'yyyy-MM-dd') })); }}
                  className="px-3 py-1 rounded-full text-xs font-semibold border border-(--border) text-(--text-secondary) hover:bg-orange-50 hover:border-orange-400 hover:text-orange-700 transition-colors">
                  Yesterday
                </button>
              </div>
              <input type="date" value={form.spent_at} onChange={(e) => setForm(f => ({ ...f, spent_at: e.target.value }))} className={inputCls} />
            </div>
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
  const [showManageCats, setShowManageCats] = useState(false);
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
          >
            <TagIcon className="h-4 w-4" />
            Categories
          </button>
          {expenses.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => exportCsvBlob(expenses, period)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportPdf(expenses, period)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                PDF
              </button>
            </>
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
                byDate.map(([day, dayExpenses]) => (
                  <>
                    <tr key={`hdr-${day}`} className="bg-(--bg)">
                      <td colSpan={5} className="px-6 py-2 text-xs font-bold text-(--text-secondary) uppercase tracking-wider">
                        {format(new Date(day + 'T00:00:00'), 'EEEE, dd MMM yyyy')}
                        <span className="ml-2 font-normal normal-case text-(--text-muted)">
                          ({formatCurrency(dayExpenses.reduce((s, e) => s + Number(e.amount), 0))})
                        </span>
                      </td>
                    </tr>
                    {dayExpenses.map(e => (
                      <tr key={e.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                        <td className="px-6 py-4 text-sm text-(--text-muted) whitespace-nowrap pl-8">—</td>
                        <td className="px-6 py-4 text-sm text-(--text-primary)">{e.category_label}</td>
                        <td className="px-6 py-4 text-sm text-(--text-secondary)">{e.description || '—'}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-(--text-primary)">{formatCurrency(e.amount)}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => setEditExpense(e)}
                              className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors" title="Edit">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(e.id); }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-600 hover:bg-red-50 transition-colors" title="Delete">
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
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

      {showManageCats && <ManageCategoriesModal onClose={() => setShowManageCats(false)} />}
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
