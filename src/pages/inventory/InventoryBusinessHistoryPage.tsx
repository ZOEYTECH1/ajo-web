import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { Skeleton } from '../../components/ui/Skeleton';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

interface PastPeriodRecord {
  id: number;
  period_start: string;
  period_end: string;
  total_revenue: string;
  total_expenses: string;
  closing_stock_value: string | null;
  notes: string;
  attachment: string | null;
  created_by_name: string;
  created_at: string;
}

interface LifetimeTotals {
  reported_revenue: string;
  reported_expenses: string;
  tracked_revenue: string;
  tracked_expenses: string;
  combined_revenue: string;
  combined_expenses: string;
  has_reported_data: boolean;
}

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const fmt = (v: string | number) => `₦${Number(v).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDate = (d: string) => format(new Date(`${d}T00:00:00`), 'd MMM yyyy');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{label}</label>
      {children}
    </div>
  );
}

interface RecordForm {
  period_start: string;
  period_end: string;
  total_revenue: string;
  total_expenses: string;
  closing_stock_value: string;
  notes: string;
}

function PastRecordModal({
  initial, recordId, onClose, bizId,
}: { initial?: Partial<RecordForm>; recordId?: number; onClose: () => void; bizId: number | null }) {
  const qc = useQueryClient();
  const isEdit = !!recordId;
  const [form, setForm] = useState<RecordForm>({
    period_start: initial?.period_start ?? '',
    period_end: initial?.period_end ?? '',
    total_revenue: initial?.total_revenue ?? '',
    total_expenses: initial?.total_expenses ?? '',
    closing_stock_value: initial?.closing_stock_value ?? '',
    notes: initial?.notes ?? '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('business_id', String(bizId));
      fd.append('period_start', form.period_start);
      fd.append('period_end', form.period_end);
      fd.append('total_revenue', form.total_revenue);
      fd.append('total_expenses', form.total_expenses);
      if (form.closing_stock_value) fd.append('closing_stock_value', form.closing_stock_value);
      fd.append('notes', form.notes.trim());
      if (file) fd.append('attachment', file);
      const url = isEdit ? `/inventory/past-periods/${recordId}/` : '/inventory/past-periods/';
      const method = isEdit ? api.patch : api.post;
      return method(url, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-past-periods'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-totals'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-trend'] });
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
    if (!form.period_start || !form.period_end) { setErr('Both dates are required.'); return; }
    if (form.period_end < form.period_start) { setErr('End date must be on or after the start date.'); return; }
    if (!form.total_revenue || !form.total_expenses) { setErr('Revenue and expenses are both required (use 0 if none).'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface)">
          <h2 className="text-lg font-bold text-(--text-primary)">{isEdit ? 'Edit Past Record' : 'Add Past Record'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">
            Summarise a period from before you started using this app — e.g. from an old spreadsheet. Just the totals, not individual sales.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="From *">
              <input type="date" value={form.period_start} onChange={(e) => setForm(f => ({ ...f, period_start: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="To *">
              <input type="date" value={form.period_end} onChange={(e) => setForm(f => ({ ...f, period_end: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          <Field label="Total Revenue (NGN) *">
            <input type="number" min="0" step="0.01" value={form.total_revenue} onChange={(e) => setForm(f => ({ ...f, total_revenue: e.target.value }))} placeholder="e.g. 2100000" className={inputCls} />
          </Field>
          <Field label="Total Expenses (NGN) *">
            <input type="number" min="0" step="0.01" value={form.total_expenses} onChange={(e) => setForm(f => ({ ...f, total_expenses: e.target.value }))} placeholder="e.g. 900000" className={inputCls} />
          </Field>
          <Field label="Closing Stock Value (NGN)">
            <input type="number" min="0" step="0.01" value={form.closing_stock_value} onChange={(e) => setForm(f => ({ ...f, closing_stock_value: e.target.value }))} placeholder="Optional — if known" className={inputCls} />
          </Field>
          <Field label="Notes">
            <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional context" className={inputCls} />
          </Field>
          <Field label="Source document">
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-(--text-secondary) file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-orange-700 hover:file:bg-orange-100"
            />
            <p className="mt-1 text-xs text-(--text-muted)">
              Optional — your original CSV, Excel, PDF, or a photo. Kept for your own reference only; nothing in it is read automatically.
            </p>
          </Field>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save' : 'Add Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryBusinessHistoryPage() {
  const { selectedId } = useInventoryBusiness();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<PastPeriodRecord | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PastPeriodRecord | null>(null);

  const { data: records, isLoading } = useQuery<PastPeriodRecord[]>({
    queryKey: ['inventory-past-periods', selectedId],
    queryFn: () => api.get('/inventory/past-periods/', { params: { business_id: selectedId } }).then(r => r.data),
    enabled: selectedId !== null,
  });

  const { data: totals } = useQuery<LifetimeTotals>({
    queryKey: ['inventory-lifetime-totals', selectedId],
    queryFn: () => api.get('/inventory/lifetime-totals/', { params: { business_id: selectedId } }).then(r => r.data),
    enabled: selectedId !== null,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/past-periods/${id}/`, { params: { business_id: selectedId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-past-periods'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-totals'] });
      qc.invalidateQueries({ queryKey: ['inventory-lifetime-trend'] });
      setConfirmDelete(null);
    },
  });

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-(--text-primary)">Business History</h1>
          <p className="text-sm text-(--text-secondary) mt-0.5">Summarise activity from before you started using this app.</p>
        </div>
        <button
          type="button"
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" /> Add Past Record
        </button>
      </div>

      {/* Lifetime totals */}
      {totals && (
        <div className="bg-(--surface) rounded-xl border border-(--border) p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-(--text-secondary) mb-4">Lifetime Totals</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-(--text-muted)">Reported (before app)</p>
              <p className="text-lg font-bold text-(--text-primary) mt-0.5">{fmt(totals.reported_revenue)}</p>
              <p className="text-xs text-(--text-muted)">− {fmt(totals.reported_expenses)} expenses</p>
            </div>
            <div>
              <p className="text-(--text-muted)">Tracked (in this app)</p>
              <p className="text-lg font-bold text-(--text-primary) mt-0.5">{fmt(totals.tracked_revenue)}</p>
              <p className="text-xs text-(--text-muted)">− {fmt(totals.tracked_expenses)} expenses</p>
            </div>
            <div className="sm:border-l sm:border-(--border) sm:pl-4">
              <p className="text-(--text-muted)">Combined</p>
              <p className="text-lg font-bold text-orange-600 mt-0.5">{fmt(totals.combined_revenue)}</p>
              <p className="text-xs text-(--text-muted)">− {fmt(totals.combined_expenses)} expenses</p>
            </div>
          </div>
        </div>
      )}

      {/* Records list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : (records ?? []).length === 0 ? (
        <div className="bg-(--surface) rounded-xl border border-(--border) p-10 text-center">
          <p className="text-sm text-(--text-secondary)">
            No past records yet. Add one if you have activity from before you started using this app that you'd like reflected in your lifetime totals.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(records ?? []).map((rec) => (
            <div key={rec.id} className="bg-(--surface) rounded-xl border border-(--border) p-5 flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-bold text-(--text-primary)">{fmtDate(rec.period_start)} — {fmtDate(rec.period_end)}</p>
                <div className="flex gap-4 mt-1.5 text-sm">
                  <span className="text-(--text-secondary)">Revenue: <strong className="text-(--text-primary)">{fmt(rec.total_revenue)}</strong></span>
                  <span className="text-(--text-secondary)">Expenses: <strong className="text-(--text-primary)">{fmt(rec.total_expenses)}</strong></span>
                </div>
                {rec.notes && <p className="text-sm text-(--text-secondary) mt-1.5">{rec.notes}</p>}
                <div className="flex items-center gap-3 mt-2">
                  {rec.attachment && (
                    <a href={rec.attachment} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline">
                      <PaperClipIcon className="h-3.5 w-3.5" /> View source file
                    </a>
                  )}
                  <span className="text-xs text-(--text-muted)">Added by {rec.created_by_name || 'unknown'}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setEditing(rec); setShowModal(true); }}
                  className="p-2 rounded-lg border border-(--border) text-(--text-secondary) hover:text-orange-600 hover:border-orange-300 transition-colors"
                  aria-label="Edit record"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(rec)}
                  className="p-2 rounded-lg border border-(--border) text-(--text-secondary) hover:text-red-600 hover:border-red-300 transition-colors"
                  aria-label="Delete record"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <PastRecordModal
          initial={editing ? { ...editing, closing_stock_value: editing.closing_stock_value ?? '' } : undefined}
          recordId={editing?.id}
          bizId={selectedId}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-(--text-primary)">Delete this record?</h2>
            <p className="text-sm text-(--text-secondary) mt-2">
              {fmtDate(confirmDelete.period_start)} — {fmtDate(confirmDelete.period_end)} will be removed from your lifetime totals. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button type="button" onClick={() => setConfirmDelete(null)} className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors">Cancel</button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
