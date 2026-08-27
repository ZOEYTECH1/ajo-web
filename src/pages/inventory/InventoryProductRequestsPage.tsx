import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, XCircleIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductRequest {
  id: number;
  branch_name: string;
  category_name: string;
  product_name: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  requested_by_name: string;
  reviewed_by_name: string | null;
  reviewed_at: string | null;
  created_at: string;
}

interface PaginatedRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: ProductRequest[];
}

interface Category {
  id: number;
  name: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected';

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

function StatusBadge({ status }: { status: ProductRequest['status'] }) {
  const cls = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }[status];
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
        cls,
      )}
    >
      {status}
    </span>
  );
}

// ── New Request Modal ─────────────────────────────────────────────────────────

function NewRequestModal({
  bizId,
  onClose,
}: {
  bizId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [categoryId, setCategoryId] = useState('');
  const [productName, setProductName] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['inventory-categories'],
    queryFn: () => api.get('/inventory/categories/').then((r) => r.data),
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/inventory/businesses/${bizId}/product-requests/`, {
        category: categoryId ? Number(categoryId) : undefined,
        product_name: productName.trim(),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-product-requests', bizId] });
      onClose();
    },
    onError: (e: any) => {
      setErr(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr('');
    if (!productName.trim()) { setErr('Product name is required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">New Product Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-(--text-muted) hover:text-(--text-primary)"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">
              Category (optional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={inputCls}
            >
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Indomie Chicken 70g"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">
              Note (optional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional details for this request…"
              className={inputCls}
            />
          </div>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryProductRequestsPage() {
  const qc = useQueryClient();
  const { selectedId, selectedBiz, isLoading: bizLoading } = useInventoryBusiness();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [page, setPage] = useState(1);

  const bizId = selectedId;
  const myRole = selectedBiz?.my_role ?? null;

  const canRequest = myRole === 'branch_admin' || myRole === 'staff';
  const canReview = myRole === 'owner' || myRole === 'manager';

  const { data: reqData, isLoading: reqLoading } = useQuery<PaginatedRequests>({
    queryKey: ['inventory-product-requests', bizId, filter, page],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (filter !== 'all') params.set('status', filter);
      return api.get(`/inventory/businesses/${bizId}/product-requests/?${params}`).then((r) => r.data);
    },
    enabled: !!bizId,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ reqId, status }: { reqId: number; status: 'approved' | 'rejected' }) =>
      api.patch(`/inventory/product-requests/${reqId}/`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-product-requests', bizId] });
    },
  });

  const requests = reqData?.results ?? [];
  const totalCount = reqData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  const isLoading = bizLoading || reqLoading;

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Product Requests</h1>
          <p className="text-sm text-(--text-secondary)">
            Request stock from head office or approve branch requests
          </p>
        </div>
        {canRequest && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Request
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setFilter(key); setPage(1); }}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              filter === key
                ? 'bg-orange-600 text-white'
                : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-(--surface) border border-(--border) animate-pulse"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl bg-(--surface) border border-(--border) px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">No product requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-(--text-primary)">
                      {req.product_name}
                    </p>
                    <StatusBadge status={req.status} />
                  </div>
                  {req.category_name && (
                    <p className="text-sm text-(--text-secondary)">
                      Category: {req.category_name}
                    </p>
                  )}
                  {req.note && (
                    <p className="text-sm text-(--text-secondary) italic">
                      "{req.note}"
                    </p>
                  )}
                  <p className="text-xs text-(--text-muted)">
                    Requested by{' '}
                    <span className="font-medium text-(--text-secondary)">
                      {req.requested_by_name}
                    </span>
                    {req.branch_name && ` · ${req.branch_name}`}
                    {' · '}
                    {format(new Date(req.created_at), 'dd MMM yyyy')}
                  </p>
                  {req.reviewed_by_name && (
                    <p className="text-xs text-(--text-muted)">
                      Reviewed by{' '}
                      <span className="font-medium text-(--text-secondary)">
                        {req.reviewed_by_name}
                      </span>
                      {req.reviewed_at && ` · ${format(new Date(req.reviewed_at), 'dd MMM yyyy')}`}
                    </p>
                  )}
                </div>

                {/* Approve / Reject actions */}
                {req.status === 'pending' && canReview && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Approve request for "${req.product_name}"?`))
                          reviewMutation.mutate({ reqId: req.id, status: 'approved' });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckIcon className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={reviewMutation.isPending}
                      onClick={() => {
                        if (window.confirm(`Reject request for "${req.product_name}"?`))
                          reviewMutation.mutate({ reqId: req.id, status: 'rejected' });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onChange={setPage} />

      {showModal && bizId && (
        <NewRequestModal bizId={bizId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
