import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Modal } from '../../components/ui/Modal';
import { Table, type Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';
import { useDebounce } from '../../hooks/useDebounce';

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

const inputCls = 'w-full rounded-lg surface-soft-inset bg-(--surface) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn = 'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100';
const cancelBtn = 'flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30';

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
  open,
  initial,
  customerId,
  onClose,
  bizId,
}: {
  open: boolean;
  initial?: { name: string; phone: string; notes: string };
  customerId?: number;
  onClose: () => void;
  bizId: number | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!customerId;
  const [form, setForm] = useState({ name: initial?.name ?? '', phone: initial?.phone ?? '', notes: initial?.notes ?? '' });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setForm({ name: initial?.name ?? '', phone: initial?.phone ?? '', notes: initial?.notes ?? '' }); setErr(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const body = { business_id: bizId, name: form.name.trim(), phone: form.phone.trim(), notes: form.notes.trim() };
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
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Customer' : 'Add Customer'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Name *">
          <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Mrs. Folake Adeniyi" className={inputCls} />
        </Field>
        <Field label="Phone (optional)">
          <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 08012345678" className={inputCls} />
        </Field>
        <Field label="Notes (optional)">
          <input type="text" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Bulk buyer" className={inputCls} />
        </Field>
        {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className={submitBtn}>
            {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Credit Modal ──────────────────────────────────────────────────────────────

function CreditModal({ open, customer, onClose }: { open: boolean; customer: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<'charge' | 'payment'>('charge');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setDirection('charge'); setAmount(''); setNote(''); setErr(''); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => api.post(`/inventory/customers/${customer.id}/credit/`, { direction, amount, note: note.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-customers'] });
      qc.invalidateQueries({ queryKey: ['inventory-customer-credit-history', customer.id] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.detail ?? d?.amount?.[0] ?? 'Failed to update credit.');
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="Manage Credit" size="sm">
      <div className="space-y-4">
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

        {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

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
    </Modal>
  );
}

// ── Credit History Modal ────────────────────────────────────────────────────────

interface CreditEntry {
  id: number;
  direction: 'charge' | 'payment';
  amount: string;
  balance_after: string;
  note: string;
  recorded_at: string;
}

interface PaginatedCreditHistory {
  count: number;
  next: string | null;
  previous: string | null;
  results: CreditEntry[];
}

function DirectionBadge({ value }: { value: 'charge' | 'payment' }) {
  const isCharge = value === 'charge';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
      isCharge ? 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400'
    }`}>
      {isCharge ? 'Charge' : 'Payment'}
    </span>
  );
}

const creditHistoryCols: Column<Record<string, unknown>>[] = [
  {
    key: 'recorded_at',
    header: 'Date',
    render: (v) => {
      try { return format(new Date(v as string), 'dd MMM yyyy, HH:mm'); } catch { return v as string; }
    },
  },
  {
    key: 'direction',
    header: 'Type',
    render: (v) => <DirectionBadge value={v as 'charge' | 'payment'} />,
  },
  {
    key: 'amount',
    header: 'Amount',
    render: (v, row) => (
      <span className={row.direction === 'charge' ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
        {row.direction === 'charge' ? '+' : '-'}{formatCurrency(v as string)}
      </span>
    ),
  },
  {
    key: 'balance_after',
    header: 'Balance After',
    render: (v) => formatCurrency(v as string),
  },
  {
    key: 'note',
    header: 'Note',
    render: (v) => (v as string) || '—',
  },
];

function CreditHistoryModal({ open, customer, onClose }: { open: boolean; customer: Customer; onClose: () => void }) {
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  const { data, isLoading, error } = useQuery<PaginatedCreditHistory>({
    queryKey: ['inventory-customer-credit-history', customer.id, page],
    queryFn: () => api.get(`/inventory/customers/${customer.id}/credit/`, { params: { page } }).then(r => r.data),
    enabled: open,
  });

  const totalPages = data ? Math.ceil(data.count / 20) : 1;

  return (
    <Modal open={open} onClose={onClose} title={`Credit History — ${customer.name}`} size="lg">
      <div className="space-y-4">
        <p className="text-sm text-(--text-secondary)">
          Current balance:{' '}
          <span className="font-semibold text-orange-600">{formatCurrency(customer.credit_balance)}</span>
        </p>

        {error && (
          <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            Failed to load credit history. Please refresh.
          </div>
        )}

        <Table
          columns={creditHistoryCols}
          data={(data?.results ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No credit activity yet."
        />

        <Pagination
          page={page}
          totalPages={totalPages}
          totalCount={data?.count ?? 0}
          pageSize={20}
          onChange={setPage}
        />

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) px-4 py-2 text-sm font-semibold hover:bg-(--primary-tint)/30">
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryCustomersPage() {
  const qc = useQueryClient();
  const { selectedId } = useInventoryBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [creditCustomer, setCreditCustomer] = useState<Customer | null>(null);
  const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null);
  // Modals stay mounted for their close animation, so keep the last targeted
  // customer around for display after the state above is nulled on close.
  const [editCustomerDisplay, setEditCustomerDisplay] = useState<Customer | null>(null);
  useEffect(() => { if (editCustomer) setEditCustomerDisplay(editCustomer); }, [editCustomer]);
  const [creditCustomerDisplay, setCreditCustomerDisplay] = useState<Customer | null>(null);
  useEffect(() => { if (creditCustomer) setCreditCustomerDisplay(creditCustomer); }, [creditCustomer]);
  const [historyCustomerDisplay, setHistoryCustomerDisplay] = useState<Customer | null>(null);
  useEffect(() => { if (historyCustomer) setHistoryCustomerDisplay(historyCustomer); }, [historyCustomer]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, error } = useQuery<Customer[]>({
    queryKey: ['inventory-customers', selectedId],
    queryFn: () => api.get('/inventory/customers/', { params: { business_id: selectedId } }).then(r => r.data),
    enabled: selectedId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/customers/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-customers'] }),
  });

  const handleDelete = (c: Customer) => {
    if (!window.confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(c.id);
  };

  const filtered = (data ?? []).filter(c =>
    c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    c.phone.toLowerCase().includes(debouncedSearch.toLowerCase()),
  );
  const totalCredit = (data ?? []).reduce((sum, c) => sum + Number(c.credit_balance), 0);

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
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
        >
          <PlusIcon className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name or phone…"
        className="w-full max-w-sm rounded-lg surface-soft-inset bg-(--surface) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
      />

      {/* Total credit owed banner */}
      {totalCredit > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl px-4 py-3 shadow-sm animate-rise-in">
          <span className="text-sm font-semibold text-orange-800 dark:text-orange-400">
            Total credit owed: <span className="font-bold">{formatCurrency(totalCredit)}</span>
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load customers. Please refresh.
        </div>
      )}

      <div className="surface-soft overflow-hidden">
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
              ) : filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-(--primary-tint)/30">
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
                          onClick={() => setHistoryCustomer(c)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Credit history"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditCustomer(c)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          disabled={deleteMutation.isPending}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Delete customer"
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
                    {debouncedSearch ? `No customers match "${debouncedSearch}".` : <>No customers yet.{' '}<button type="button" onClick={() => setShowAdd(true)} className="text-orange-600 font-semibold hover:underline">Add the first customer.</button></>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerModal open={showAdd} onClose={() => setShowAdd(false)} bizId={selectedId} />
      {editCustomerDisplay && (
        <CustomerModal
          open={editCustomer !== null}
          initial={{ name: editCustomerDisplay.name, phone: editCustomerDisplay.phone, notes: editCustomerDisplay.notes }}
          customerId={editCustomerDisplay.id}
          onClose={() => setEditCustomer(null)}
          bizId={selectedId}
        />
      )}
      {creditCustomerDisplay && (
        <CreditModal open={creditCustomer !== null} customer={creditCustomerDisplay} onClose={() => setCreditCustomer(null)} />
      )}
      {historyCustomerDisplay && (
        <CreditHistoryModal open={historyCustomer !== null} customer={historyCustomerDisplay} onClose={() => setHistoryCustomer(null)} />
      )}
    </div>
  );
}
