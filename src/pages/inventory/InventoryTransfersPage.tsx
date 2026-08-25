import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, XCircleIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';
import { getCategoryEmoji } from '../../utils/inventoryHelpers';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Business {
  id: number;
  name: string;
  mode: string;
  my_role: string;
}

interface TransferItem {
  id: number;
  from_product: number | null;
  to_product: number | null;
  product_name: string;
  quantity: number;
}

interface Transfer {
  id: number;
  from_business: number;
  from_business_name: string;
  to_business: number;
  to_business_name: string;
  reference: string;
  notes: string;
  status: string;
  transferred_at: string;
  items: TransferItem[];
}

interface PaginatedTransfers {
  count: number;
  next: string | null;
  previous: string | null;
  results: Transfer[];
}

interface Category {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  quantity: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const orangeBtn =
  'rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn =
  'rounded-lg border border-(--border) text-(--text-secondary) px-4 py-2 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

// ── Transfer Modal ─────────────────────────────────────────────────────────────

interface CartItem {
  from_product_id: number;
  product_name: string;
  quantity: number;
  available: number;
}

function TransferModal({
  businesses,
  bizId,
  onClose,
}: {
  businesses: Business[];
  bizId: number | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [toBizId, setToBizId] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [qty, setQty] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [err, setErr] = useState('');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['inventory-categories', bizId],
    queryFn: () => api.get('/inventory/categories/', { params: { business_id: bizId } }).then((r) => r.data),
    enabled: !!bizId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['inventory-products', selectedCatId],
    queryFn: () => api.get(`/inventory/categories/${selectedCatId}/products/`).then((r) => r.data),
    enabled: !!selectedCatId,
  });

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/inventory/transfers/', {
        business_id: bizId,
        to_business_id: Number(toBizId),
        items: cart.map(({ from_product_id, product_name, quantity }) => ({
          from_product_id,
          product_name,
          quantity,
        })),
        reference: reference.trim(),
        notes: notes.trim(),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? (first as string[])[0] : String(first ?? 'Transfer failed.')));
    },
  });

  const selectedProd = products.find((p) => p.id === Number(selectedProdId));

  function addToCart() {
    const q = Number(qty);
    if (!selectedProd || !q || q <= 0) { setErr('Select a product and enter quantity.'); return; }
    if (q > selectedProd.quantity) { setErr(`Only ${selectedProd.quantity} units available.`); return; }
    setCart((prev) => {
      const existing = prev.findIndex((i) => i.from_product_id === selectedProd.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = { ...next[existing], quantity: next[existing].quantity + q };
        return next;
      }
      return [...prev, { from_product_id: selectedProd.id, product_name: selectedProd.name, quantity: q, available: selectedProd.quantity }];
    });
    setSelectedProdId('');
    setQty('');
    setErr('');
  }

  const destBusinesses = businesses.filter((b) => b.id !== undefined);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface)">
          <h2 className="text-lg font-bold text-(--text-primary)">New Transfer</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Destination */}
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Transfer To *</label>
            <select value={toBizId} onChange={(e) => { setToBizId(e.target.value); setErr(''); }} className={inputCls}>
              <option value="">Select destination business…</option>
              {destBusinesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {/* Product picker */}
          <div className="rounded-xl border border-(--border) p-4 space-y-3 bg-(--bg)">
            <p className="text-sm font-semibold text-(--text-secondary)">Add Products</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-(--text-secondary) mb-1">Category</label>
                <select value={selectedCatId} onChange={(e) => { setSelectedCatId(e.target.value); setSelectedProdId(''); }} className={inputCls}>
                  <option value="">Select category…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{getCategoryEmoji(c.name)} {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-(--text-secondary) mb-1">Product</label>
                <select value={selectedProdId} onChange={(e) => setSelectedProdId(e.target.value)} disabled={!selectedCatId} className={inputCls}>
                  <option value="">Select product…</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.quantity} in stock)</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="1"
                placeholder="Quantity"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <button type="button" onClick={addToCart} className={orangeBtn}>Add</button>
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-(--text-secondary)">Items to transfer</p>
              {cart.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-(--text-primary)">{item.product_name}</p>
                    <p className="text-xs text-(--text-secondary)">Qty: {item.quantity}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCart((prev) => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600 transition-colors"
                  >
                    <XCircleIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Reference & notes */}
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Reference (optional)</label>
            <input type="text" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. TRF-001" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add any notes…" className={inputCls} />
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!toBizId || cart.length === 0 || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={`flex-1 ${orangeBtn}`}
            >
              {mutation.isPending ? 'Transferring…' : `Transfer ${cart.length} product${cart.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryTransfersPage() {
  const [showModal, setShowModal] = useState(false);
  const [page, setPage] = useState(1);
  const { selectedId, businesses } = useInventoryBusiness();

  const { data, isLoading, error } = useQuery<PaginatedTransfers>({
    queryKey: ['inventory-transfers', page, selectedId],
    queryFn: () => api.get('/inventory/transfers/', { params: { page, business_id: selectedId } }).then((r) => r.data),
    enabled: selectedId !== null,
  });

  const transfers = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  const canTransfer = businesses.some((b) => b.my_role === 'owner' || b.my_role === 'manager');
  const myBusinessIds = useMemo(() => new Set(businesses.map((b) => b.id)), [businesses]);

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Stock Transfers</h1>
          <p className="text-sm text-(--text-secondary)">Move stock between your business locations</p>
        </div>
        {canTransfer && businesses.length > 1 && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Transfer
          </button>
        )}
      </div>

      {businesses.length <= 1 && (
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-700 dark:text-blue-400">
          Stock transfers require at least two business locations. Create a branch from the Business page.
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load transfers. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-lg bg-(--bg) skeleton" />)}
          </div>
        ) : transfers.length === 0 && totalCount === 0 ? (
          <div className="px-6 py-12 text-center">
            <ArrowRightIcon className="h-10 w-10 text-(--text-muted) mx-auto mb-3" />
            <p className="text-sm text-(--text-muted)">No transfers yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-(--border)">
            {transfers.map((t) => {
              const isSent = myBusinessIds.has(t.from_business);
              return (
              <div key={t.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isSent ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'}`}>
                      {isSent ? 'SENT' : 'RECEIVED'}
                    </span>
                    <div className="text-sm font-semibold text-(--text-primary)">{t.from_business_name}</div>
                    <ArrowRightIcon className="h-4 w-4 text-(--text-muted)" />
                    <div className="text-sm font-semibold text-(--text-primary)">{t.to_business_name}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-(--text-muted)">
                      {format(new Date(t.transferred_at), 'dd MMM yyyy, HH:mm')}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                      t.status === 'completed' ? 'bg-green-100 text-green-700' :
                      t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-(--bg) text-(--text-secondary)'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
                {t.reference && (
                  <p className="text-xs text-(--text-secondary) mt-1">Ref: {t.reference}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {t.items.map((item, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-(--bg) border border-(--border) text-(--text-secondary)">
                      {item.product_name} × {item.quantity}
                    </span>
                  ))}
                </div>
                {t.notes && (
                  <p className="text-xs text-(--text-muted) mt-1 italic">{t.notes}</p>
                )}
              </div>
              );
            })}
          </div>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onChange={setPage} />

      {showModal && (
        <TransferModal businesses={businesses} bizId={selectedId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
