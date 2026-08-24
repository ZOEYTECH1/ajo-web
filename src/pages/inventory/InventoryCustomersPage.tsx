import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface Customer {
  id: number;
  name: string;
  phone: string;
  notes: string;
  credit_balance: string;
  created_at: string;
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

// ── Customer Modal ─────────────────────────────────────────────────────────────

function CustomerModal({
  initial,
  customerId,
  onClose,
}: {
  initial?: { name: string; phone: string; notes: string };
  customerId?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!customerId;
  const [form, setForm] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', notes: initial?.notes ?? '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const body = { name: form.name.trim(), phone: form.phone.trim(), notes: form.notes.trim() };
      return isEdit
        ? api.patch(`/inventory/customers/${customerId}/`, body)
        : api.post('/inventory/customers/', body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-customers'] }); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Failed.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Customer name is required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">{isEdit ? 'Edit Customer' : 'Add Customer'}</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Name *">
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mrs. Folake Adeniyi" className={inputCls} />
          </Field>
          <Field label="Phone (optional)">
            <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 08012345678" className={inputCls} />
          </Field>
          <Field label="Notes (optional)">
            <input type="text" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Bulk buyer" className={inputCls} />
          </Field>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={submitBtn}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Credit Modal ──────────────────────────────────────────────────────────────

function CreditModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<'charge' | 'payment'>('charge');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/inventory/customers/${customer.id}/credit/`, { direction, amount, note: note.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-customers'] }); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.detail ?? d?.amount?.[0] ?? 'Failed to update credit.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Manage Credit</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">
            <span className="font-semibold text-(--text-primary)">{customer.name}</span> — current balance:{' '}
            <span className="font-semibold text-orange-600">{formatCurrency(customer.credit_balance)}</span>
          </p>

          <div className="flex gap-2">
            {(['charge', 'payment'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                  direction === d ? 'bg-orange-600 text-white border-orange-600' : 'border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30'
                }`}
              >
                {d === 'charge' ? 'Charge (add debt)' : 'Payment (reduce debt)'}
              </button>
            ))}
          </div>

          <Field label="Amount (NGN) *">
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setErr(''); }} placeholder="e.g. 1000" className={inputCls} />
          </Field>
          <Field label="Note (optional)">
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Bread x2" className={inputCls} />
          </Field>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!amount || Number(amount) <= 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={submitBtn}
            >
              {mutation.isPending ? 'Saving…' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryCustomersPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);

  const { data, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['inventory-customers'],
    queryFn: () => api.get('/inventory/customers/').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Customers</h1>
          <p className="text-sm text-(--text-secondary)">Manage your customer accounts and credit</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load customers. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Name', 'Phone', 'Credit Balance', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={4} cols={5} />
              ) : data && data.length > 0 ? (
                data.map(c => (
                  <tr key={c.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{c.name}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{c.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold">
                      <span className={Number(c.credit_balance) > 0 ? 'text-orange-600' : 'text-(--text-secondary)'}>
                        {formatCurrency(c.credit_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{c.notes || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCreditCustomer(c)}
                          className="text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1 hover:bg-orange-100 transition-colors"
                        >
                          Credit
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCustomer(c)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No customers yet.{' '}
                    <button type="button" onClick={() => setShowAdd(true)} className="text-orange-600 font-semibold hover:underline">Add the first customer.</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && <CustomerModal onClose={() => setShowAdd(false)} />}
      {editCustomer && (
        <CustomerModal
          initial={{ name: editCustomer.name, phone: editCustomer.phone, notes: editCustomer.notes }}
          customerId={editCustomer.id}
          onClose={() => setEditCustomer(null)}
        />
      )}
      {creditCustomer && <CreditModal customer={creditCustomer} onClose={() => setCreditCustomer(null)} />}
    </div>
  );
}
