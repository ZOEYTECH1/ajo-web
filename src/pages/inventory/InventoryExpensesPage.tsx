import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
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

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'transport', label: 'Transport' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'salary', label: 'Salary' },
  { value: 'utility', label: 'Utility' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v));
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn = 'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-gray-300 text-gray-700 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="h-6 w-6" /></button>
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

  const { data, isLoading, error } = useQuery<Expense[]>({
    queryKey: ['inventory-expenses'],
    queryFn: () => api.get('/inventory/expenses/').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/expenses/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-expenses'] }),
  });

  const total = data?.reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Expenses</h1>
          <p className="text-sm text-(--text-secondary)">Track your business costs</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Expense
        </button>
      </div>

      {data && data.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
          <p className="text-sm text-red-600 font-medium">Total recorded expenses</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(total)}</p>
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
              ) : data && data.length > 0 ? (
                data.map(e => (
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
                          className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (confirm('Delete this expense?')) deleteMutation.mutate(e.id); }}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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
