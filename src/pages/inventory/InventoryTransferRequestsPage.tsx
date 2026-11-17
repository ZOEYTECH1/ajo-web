import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { Modal } from '../../components/ui/Modal';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BusinessMini {
  id: number;
  name: string;
  mode: string;
  partner_code: string;
}

interface PartnerLink {
  id: number;
  requesting_business: BusinessMini;
  partner_business: BusinessMini;
  status: 'pending' | 'accepted' | 'rejected';
}

interface RequestItem {
  id: number;
  product: number | null;
  product_name: string;
  quantity_requested: number;
  fulfilling_product: number | null;
  quantity_fulfilled: number | null;
}

interface TransferRequest {
  id: number;
  requesting_business: BusinessMini;
  fulfilling_business: BusinessMini;
  status: 'pending' | 'approved' | 'rejected';
  note: string;
  requested_by_name: string | null;
  reviewed_by_name: string | null;
  created_at: string;
  reviewed_at: string | null;
  items: RequestItem[];
}

interface Product {
  id: number;
  name: string;
  quantity: number;
  barcode: string;
}

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function StatusBadge({ status }: { status: TransferRequest['status'] }) {
  const cls = {
    pending: 'bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400',
    approved: 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400',
    rejected: 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400',
  }[status];
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', cls)}>
      {status}
    </span>
  );
}

// ── New Request Modal ─────────────────────────────────────────────────────────

function NewRequestModal({ open, bizId, onClose }: { open: boolean; bizId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [fulfillingId, setFulfillingId] = useState('');
  const [note, setNote] = useState('');
  const [rows, setRows] = useState<{ productId: string; qty: string }[]>([{ productId: '', qty: '' }]);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setFulfillingId(''); setNote(''); setRows([{ productId: '', qty: '' }]); setErr(''); }
  }, [open]);

  const { data: links = [] } = useQuery<PartnerLink[]>({
    queryKey: ['inventory-partners', bizId],
    queryFn: () => api.get(`/inventory/businesses/${bizId}/partners/`).then((r) => r.data),
    enabled: open,
  });
  const partners = links
    .filter((l) => l.status === 'accepted')
    .map((l) => (l.requesting_business.id === bizId ? l.partner_business : l.requesting_business));

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['inventory-products-flat', bizId],
    queryFn: () => api.get('/inventory/products/', { params: { business_id: bizId } }).then((r) => r.data),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/transfer-requests/', {
        fulfilling_business_id: Number(fulfillingId),
        note: note.trim() || undefined,
        items: rows
          .filter((r) => r.productId && r.qty)
          .map((r) => ({ product_id: Number(r.productId), quantity_requested: Number(r.qty) })),
      }, { params: { business_id: bizId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfer-requests', bizId] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function updateRow(i: number, patch: Partial<{ productId: string; qty: string }>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!fulfillingId) { setErr('Choose which business to request from.'); return; }
    const valid = rows.filter((r) => r.productId && r.qty);
    if (valid.length === 0) { setErr('Add at least one product and quantity.'); return; }
    mutation.mutate();
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Stock" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Request from</label>
          <select value={fulfillingId} onChange={(e) => setFulfillingId(e.target.value)} className={inputCls}>
            <option value="">Select a connected partner…</option>
            {partners.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {partners.length === 0 && (
            <p className="text-xs text-(--text-muted) mt-1">No connected partners yet — connect with a business first on the Partners page.</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-(--text-secondary)">Items</label>
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={row.productId}
                onChange={(e) => updateRow(i, { productId: e.target.value })}
                className={clsx(inputCls, 'flex-1')}
              >
                <option value="">Select a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={row.qty}
                onChange={(e) => updateRow(i, { qty: e.target.value })}
                placeholder="Qty"
                className={clsx(inputCls, 'w-24')}
              />
              {rows.length > 1 && (
                <button type="button" onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))} className="text-(--text-muted) hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, { productId: '', qty: '' }])}
            className="inline-flex items-center gap-1 text-sm font-semibold text-(--primary) hover:underline"
          >
            <PlusIcon className="h-4 w-4" /> Add another item
          </button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Note (optional)</label>
          <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any additional details…" className={inputCls} />
        </div>

        {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30">
            Cancel
          </button>
          <button type="submit" disabled={mutation.isPending} className="flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) disabled:opacity-50 transition-colors">
            {mutation.isPending ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Review (approve) Modal ────────────────────────────────────────────────────

function ReviewModal({ request, bizId, onClose }: { request: TransferRequest; bizId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [fulfillment, setFulfillment] = useState<Record<number, { productId: string; qty: string }>>(
    Object.fromEntries(request.items.map((it) => [it.id, { productId: '', qty: String(it.quantity_requested) }])),
  );
  const [err, setErr] = useState('');

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['inventory-products-flat', bizId],
    queryFn: () => api.get('/inventory/products/', { params: { business_id: bizId } }).then((r) => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/inventory/transfer-requests/${request.id}/`, {
        status: 'approved',
        items: request.items.map((it) => ({
          item_id: it.id,
          fulfilling_product_id: Number(fulfillment[it.id]?.productId),
          quantity_fulfilled: Number(fulfillment[it.id]?.qty),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfer-requests', bizId] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.detail ?? (typeof d?.items === 'string' ? d.items : 'Could not approve this request.'));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => api.patch(`/inventory/transfer-requests/${request.id}/`, { status: 'rejected' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfer-requests', bizId] });
      onClose();
    },
  });

  function handleApprove(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const missing = request.items.some((it) => !fulfillment[it.id]?.productId || !fulfillment[it.id]?.qty);
    if (missing) { setErr('Choose which of your products to send for every item.'); return; }
    approveMutation.mutate();
  }

  return (
    <Modal open onClose={onClose} title={`Review Request from ${request.requesting_business.name}`} size="lg">
      <form onSubmit={handleApprove} className="space-y-4">
        {request.note && (
          <p className="text-sm text-(--text-secondary) italic rounded-lg bg-(--bg) border border-(--border) px-3 py-2">"{request.note}"</p>
        )}
        <div className="space-y-3">
          {request.items.map((it) => (
            <div key={it.id} className="rounded-lg border border-(--border) p-3 space-y-2">
              <p className="text-sm font-semibold text-(--text-primary)">
                {it.product_name} <span className="font-normal text-(--text-secondary)">× {it.quantity_requested} requested</span>
              </p>
              <div className="flex gap-2 items-center">
                <select
                  value={fulfillment[it.id]?.productId ?? ''}
                  onChange={(e) => setFulfillment((prev) => ({ ...prev, [it.id]: { ...prev[it.id], productId: e.target.value } }))}
                  className={clsx(inputCls, 'flex-1')}
                >
                  <option value="">Fulfill with…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={fulfillment[it.id]?.qty ?? ''}
                  onChange={(e) => setFulfillment((prev) => ({ ...prev, [it.id]: { ...prev[it.id], qty: e.target.value } }))}
                  className={clsx(inputCls, 'w-24')}
                />
              </div>
            </div>
          ))}
        </div>

        {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            disabled={rejectMutation.isPending}
            onClick={() => { if (window.confirm('Reject this stock request?')) rejectMutation.mutate(); }}
            className="flex-1 rounded-lg border border-red-300 text-red-600 py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            {rejectMutation.isPending ? 'Rejecting…' : 'Reject'}
          </button>
          <button
            type="submit"
            disabled={approveMutation.isPending}
            className="flex-1 rounded-lg bg-green-600 text-white py-2.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {approveMutation.isPending ? 'Approving…' : 'Approve & Send Stock'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryTransferRequestsPage() {
  const { selectedId, isLoading: bizLoading } = useInventoryBusiness();
  const bizId = selectedId;
  const [showModal, setShowModal] = useState(false);
  const [reviewing, setReviewing] = useState<TransferRequest | null>(null);
  const [filter, setFilter] = useState<FilterStatus>('all');

  const { data: requests = [], isLoading: reqLoading } = useQuery<TransferRequest[]>({
    queryKey: ['inventory-transfer-requests', bizId, filter],
    queryFn: () => {
      const params: Record<string, string | number> = { business_id: bizId! };
      if (filter !== 'all') params.status = filter;
      return api.get('/inventory/transfer-requests/', { params }).then((r) => r.data);
    },
    enabled: !!bizId,
  });

  const isLoading = bizLoading || reqLoading;

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Stock Requests</h1>
          <p className="text-sm text-(--text-secondary)">Request stock from a connected partner business, or review requests sent to you</p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
        >
          <PlusIcon className="h-4 w-4" />
          New Request
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === key ? 'bg-(--accent) text-white' : 'bg-(--surface) surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-xl bg-(--surface) border border-(--border) animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl bg-(--surface) border border-(--border) px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">No stock requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const isReceived = req.fulfilling_business.id === bizId;
            const other = isReceived ? req.requesting_business : req.fulfilling_business;
            return (
              <div key={req.id} className="surface-soft p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-(--text-primary)">
                        {isReceived ? `Request from ${other.name}` : `Request to ${other.name}`}
                      </p>
                      <StatusBadge status={req.status} />
                    </div>
                    <ul className="text-sm text-(--text-secondary)">
                      {req.items.map((it) => (
                        <li key={it.id}>
                          {it.product_name} × {it.quantity_requested}
                          {it.quantity_fulfilled != null && it.quantity_fulfilled !== it.quantity_requested && (
                            <span className="text-(--text-muted)"> (fulfilled {it.quantity_fulfilled})</span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {req.note && <p className="text-sm text-(--text-secondary) italic">"{req.note}"</p>}
                    <p className="text-xs text-(--text-muted)">
                      {req.requested_by_name && <>Requested by <span className="font-medium text-(--text-secondary)">{req.requested_by_name}</span>{' · '}</>}
                      {format(new Date(req.created_at), 'dd MMM yyyy')}
                    </p>
                    {req.reviewed_by_name && (
                      <p className="text-xs text-(--text-muted)">
                        Reviewed by <span className="font-medium text-(--text-secondary)">{req.reviewed_by_name}</span>
                        {req.reviewed_at && ` · ${format(new Date(req.reviewed_at), 'dd MMM yyyy')}`}
                      </p>
                    )}
                  </div>

                  {req.status === 'pending' && isReceived && (
                    <button
                      type="button"
                      onClick={() => setReviewing(req)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) text-white px-3 py-1.5 text-sm font-semibold hover:bg-(--accent-dark) transition-colors shrink-0"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Review
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {bizId && <NewRequestModal open={showModal} bizId={bizId} onClose={() => setShowModal(false)} />}
      {reviewing && bizId && <ReviewModal request={reviewing} bizId={bizId} onClose={() => setReviewing(null)} />}
    </div>
  );
}
