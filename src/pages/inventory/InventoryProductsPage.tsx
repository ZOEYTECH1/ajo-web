import { useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  PlusIcon, PencilIcon, TrashIcon, XCircleIcon, ArrowUpIcon,
  ChartBarIcon, ChevronLeftIcon, ChevronRightIcon,
  ClockIcon, MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { getCategoryEmoji } from '../../utils/inventoryHelpers';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface InventoryMovement {
  id: number;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity_change: number;
  balance_after: number;
  note: string;
  recorded_at: string;
}

interface Product {
  id: number;
  name: string;
  price: string;
  cost_price: string;
  effective_price: string | null;
  discount_percent: number;
  quantity: number;
  barcode: string;
  low_stock_threshold: number;
  expiry_date: string | null;
  image_url: string | null;
  created_at: string;
}

interface Category { id: number; name: string; }

interface ProductDailySummary {
  date: string;
  opening_stock: number;
  closing_stock: number;
  units_sold: number;
  units_received: number;
  revenue: string;
  is_closed: boolean;
}

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v));
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
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

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of stock</span>;
  if (qty <= threshold) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Low stock</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">In stock</span>;
}

// ── Product Form (create/edit) ─────────────────────────────────────────────────

type ProductForm = {
  name: string; price: string; cost_price: string; quantity: string;
  barcode: string; low_stock_threshold: string; expiry_date: string;
  discount_percent: string;
};

function ProductModal({
  initial, catId, prodId, onClose,
}: {
  initial?: Partial<ProductForm>;
  catId: string;
  prodId?: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!prodId;
  const [form, setForm] = useState<ProductForm>({
    name: initial?.name ?? '',
    price: initial?.price ?? '',
    cost_price: initial?.cost_price ?? '',
    quantity: initial?.quantity ?? '',
    barcode: initial?.barcode ?? '',
    low_stock_threshold: initial?.low_stock_threshold ?? '5',
    expiry_date: initial?.expiry_date ?? '',
    discount_percent: initial?.discount_percent ?? '0',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      const body = {
        name: form.name.trim(),
        price: form.price,
        cost_price: form.cost_price || '0',
        quantity: Number(form.quantity || 0),
        barcode: form.barcode.trim() || undefined,
        low_stock_threshold: Number(form.low_stock_threshold || 5),
        expiry_date: form.expiry_date || null,
        discount_percent: Number(form.discount_percent || 0),
      };
      return isEdit
        ? api.patch(`/inventory/products/${prodId}/`, body)
        : api.post(`/inventory/categories/${catId}/products/`, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-products', catId] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Product name is required.'); return; }
    if (!form.price || Number(form.price) < 0) { setErr('Enter a valid price.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">{isEdit ? 'Edit Product' : 'Add Product'}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Product Name *">
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Coca-Cola 50cl" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Selling Price (NGN) *">
              <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 300" className={inputCls} />
            </Field>
            <Field label="Cost Price (NGN)">
              <input type="number" min="0" step="0.01" value={form.cost_price} onChange={(e) => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="e.g. 200" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount %">
              <input type="number" min="0" max="100" step="0.1" value={form.discount_percent} onChange={(e) => setForm(f => ({ ...f, discount_percent: e.target.value }))} placeholder="0" className={inputCls} />
            </Field>
            <Field label="Low Stock Threshold">
              <input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} placeholder="5" className={inputCls} />
            </Field>
          </div>
          {!isEdit && (
            <Field label="Initial Quantity">
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className={inputCls} />
            </Field>
          )}
          <Field label="Barcode (optional)">
            <input type="text" value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="e.g. 1234567890" className={inputCls} />
          </Field>
          <Field label="Expiry Date (optional)">
            <input type="date" value={form.expiry_date} onChange={(e) => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={inputCls} />
          </Field>

          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={submitBtn}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Stock Movement Modal ──────────────────────────────────────────────────────

function StockModal({ prodId, catId, productName, onClose }: { prodId: number; catId: string; productName: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ movement_type: 'in', quantity: '', note: '', supplier: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/inventory/products/${prodId}/movements/`, {
      movement_type: form.movement_type,
      quantity: Number(form.quantity),
      note: form.note.trim(),
      supplier: form.supplier.trim(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-products', catId] }); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Failed.')));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Stock Movement</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">Adjusting stock for <span className="font-semibold text-(--text-primary)">{productName}</span></p>
          <Field label="Movement Type *">
            <select value={form.movement_type} onChange={(e) => setForm(f => ({ ...f, movement_type: e.target.value }))} className={inputCls}>
              <option value="in">Stock In (received)</option>
              <option value="out">Stock Out (removed)</option>
              <option value="adjustment">Adjustment (correction)</option>
            </select>
          </Field>
          <Field label="Quantity *">
            <input type="number" min="1" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="e.g. 10" className={inputCls} />
          </Field>
          {form.movement_type === 'in' && (
            <Field label="Supplier (optional)">
              <input type="text" value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Supplier name" className={inputCls} />
            </Field>
          )}
          <Field label="Note (optional)">
            <input type="text" value={form.note} onChange={(e) => setForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Delivery from Lagos" className={inputCls} />
          </Field>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!form.quantity || Number(form.quantity) < 1 || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={submitBtn}
            >
              {mutation.isPending ? 'Saving…' : 'Record'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Movement History Modal ────────────────────────────────────────────────────

const MOVE_DISPLAY: Record<string, { label: string; bg: string; color: string; sign: string }> = {
  in:         { label: 'Stock In',   bg: 'bg-green-50',  color: 'text-green-700',  sign: '+' },
  out:        { label: 'Stock Out',  bg: 'bg-red-50',    color: 'text-red-700',    sign: '-' },
  adjustment: { label: 'Adjustment', bg: 'bg-blue-50',   color: 'text-blue-700',   sign: '±' },
};

function MovementHistoryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const { data: movements, isLoading } = useQuery<InventoryMovement[]>({
    queryKey: ['inventory-movements', product.id],
    queryFn: () => api.get(`/inventory/products/${product.id}/movements/`).then(r => r.data),
  });

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) shrink-0">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">Stock History</h2>
            <p className="text-sm text-(--text-secondary) mt-0.5">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-4">
          {isLoading ? (
            <div className="animate-pulse space-y-3 p-2">
              {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-lg bg-(--border)" />)}
            </div>
          ) : movements && movements.length > 0 ? (
            <div className="space-y-2">
              {movements.map(m => {
                const d = MOVE_DISPLAY[m.movement_type] ?? MOVE_DISPLAY.adjustment;
                const qty = Math.abs(m.quantity_change);
                return (
                  <div key={m.id} className={clsx('flex items-center gap-4 rounded-xl p-4 border', d.bg, 'border-(--border)')}>
                    <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0', d.bg, d.color)}>
                      {d.sign}{qty}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', d.bg, d.color)}>{d.label}</span>
                        <span className="text-xs text-(--text-muted) truncate">{fmtDate(m.recorded_at)}</span>
                      </div>
                      {m.note && <p className="text-sm text-(--text-secondary) mt-1 truncate">{m.note}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-(--text-muted)">Balance</p>
                      <p className="text-sm font-bold text-(--text-primary)">{m.balance_after}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-(--text-muted) text-center py-10">No stock movements recorded yet.</p>
          )}
        </div>
        <div className="px-4 pb-4 shrink-0">
          <button type="button" onClick={onClose} className={cancelBtn}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Daily Stock Summary Modal ─────────────────────────────────────────────────

function DailySummaryModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [openingInput, setOpeningInput] = useState('');
  const [showOpeningInput, setShowOpeningInput] = useState(false);

  const isToday = date === today;

  const { data: summary, isLoading } = useQuery<ProductDailySummary>({
    queryKey: ['inventory-daily-summary', product.id, date],
    queryFn: () => api.get(`/inventory/products/${product.id}/daily-summary/?date=${date}`).then(r => r.data),
  });

  const closeMutation = useMutation({
    mutationFn: () => api.post(`/inventory/products/${product.id}/close-stock/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-daily-summary', product.id, date] }),
  });

  const openingMutation = useMutation({
    mutationFn: () => api.post(`/inventory/products/${product.id}/set-opening-stock/`, { opening_stock: Number(openingInput) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-daily-summary', product.id, date] });
      setShowOpeningInput(false);
      setOpeningInput('');
    },
  });

  const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">Daily Summary</h2>
            <p className="text-sm text-(--text-secondary) mt-0.5">{product.name}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>

        {/* Date nav */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-(--border) bg-(--bg)">
          <button type="button" onClick={() => setDate(d => addDays(d, -1))} className="p-1.5 rounded-lg hover:bg-(--border) transition-colors">
            <ChevronLeftIcon className="h-4 w-4 text-(--text-secondary)" />
          </button>
          <div className="text-center">
            <p className="text-sm font-semibold text-(--text-primary)">{fmtDate(date)}</p>
            {!isToday && (
              <button type="button" onClick={() => setDate(today)} className="text-xs text-orange-600 font-semibold hover:underline mt-0.5">
                Jump to today
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDate(d => addDays(d, 1))}
            disabled={isToday}
            className="p-1.5 rounded-lg hover:bg-(--border) transition-colors disabled:opacity-30"
          >
            <ChevronRightIcon className="h-4 w-4 text-(--text-secondary)" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-12 rounded-lg bg-(--border)" />)}
            </div>
          ) : summary ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Opening Stock', value: summary.opening_stock, color: 'text-blue-700', bg: 'bg-blue-50' },
                  { label: 'Closing Stock', value: summary.closing_stock, color: 'text-orange-700', bg: 'bg-orange-50' },
                  { label: 'Units Sold', value: summary.units_sold, color: 'text-red-700', bg: 'bg-red-50' },
                  { label: 'Units Received', value: summary.units_received, color: 'text-green-700', bg: 'bg-green-50' },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={clsx('rounded-xl p-4', bg)}>
                    <p className={clsx('text-xs font-semibold uppercase tracking-wide', color)}>{label}</p>
                    <p className={clsx('text-2xl font-bold mt-1', color)}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-(--bg) border border-(--border) px-4 py-3 flex items-center justify-between">
                <p className="text-sm font-medium text-(--text-secondary)">Revenue</p>
                <p className="text-sm font-bold text-(--text-primary)">{formatCurrency(summary.revenue)}</p>
              </div>

              {summary.is_closed && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-2 text-sm text-green-700 font-medium">
                  Stock closed for this day
                </div>
              )}

              {/* Actions — only for today */}
              {isToday && (
                <div className="space-y-2 pt-1">
                  {!summary.is_closed && (
                    <button
                      type="button"
                      onClick={() => { if (confirm('Close stock for today? This records the current quantity as closing stock.')) closeMutation.mutate(); }}
                      disabled={closeMutation.isPending}
                      className="w-full rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
                    >
                      {closeMutation.isPending ? 'Closing…' : 'Close Stock'}
                    </button>
                  )}

                  {showOpeningInput ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="0"
                        value={openingInput}
                        onChange={e => setOpeningInput(e.target.value)}
                        placeholder="Opening stock qty"
                        className={clsx(inputCls, 'flex-1')}
                        autoFocus
                      />
                      <button
                        type="button"
                        disabled={!openingInput || openingMutation.isPending}
                        onClick={() => openingMutation.mutate()}
                        className="rounded-lg bg-blue-600 text-white px-4 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                      >
                        {openingMutation.isPending ? '…' : 'Set'}
                      </button>
                      <button type="button" onClick={() => setShowOpeningInput(false)} className="rounded-lg border border-(--border) px-3 text-sm text-(--text-secondary) hover:bg-(--border)">✕</button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setOpeningInput(String(summary.opening_stock)); setShowOpeningInput(true); }}
                      className="w-full rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:text-(--text-primary) transition-colors"
                    >
                      Set Opening Stock
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-(--text-muted) text-center py-8">No summary data available for this date.</p>
          )}

          <button type="button" onClick={onClose} className={cancelBtn}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryProductsPage() {
  const { catId } = useParams<{ catId: string }>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [summaryProduct, setSummaryProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in' | 'low' | 'out'>('all');

  const { data: category } = useQuery<Category>({
    queryKey: ['inventory-category', catId],
    queryFn: () => api.get(`/inventory/categories/${catId}/`).then(r => r.data),
    enabled: !!catId,
  });

  const { data, isLoading, error } = useQuery<Product[]>({
    queryKey: ['inventory-products', catId],
    queryFn: () => api.get(`/inventory/categories/${catId}/products/`).then(r => r.data),
    enabled: !!catId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/products/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-products', catId] }),
  });

  const filteredData = useMemo(() => {
    let list = data ?? [];
    if (search.trim()) list = list.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.toLowerCase().includes(search.toLowerCase()));
    if (stockFilter === 'out') list = list.filter(p => p.quantity === 0);
    else if (stockFilter === 'low') list = list.filter(p => p.quantity > 0 && p.quantity <= p.low_stock_threshold);
    else if (stockFilter === 'in') list = list.filter(p => p.quantity > p.low_stock_threshold);
    return list;
  }, [data, search, stockFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/inventory/categories" className="text-sm text-(--text-secondary) hover:text-(--primary)">← Categories</Link>
        <span className="text-(--text-secondary)">/</span>
        <span className="text-sm font-semibold text-(--text-primary)">
          {category ? `${getCategoryEmoji(category.name)} ${category.name}` : 'Products'}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">
            {category ? `${getCategoryEmoji(category.name)} ${category.name}` : 'Products'}
          </h1>
          <p className="text-sm text-(--text-secondary)">Manage products in this category</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Product
        </button>
      </div>

      {/* Search + stock filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products or barcodes…"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-(--border) text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([['all', 'All'], ['in', 'In Stock'], ['low', 'Low Stock'], ['out', 'Out of Stock']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setStockFilter(key)}
              className={clsx('px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                stockFilter === key ? 'bg-orange-600 text-white' : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)')}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load products. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['', 'Product', 'Price', 'Cost', 'Discount', 'Quantity', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={5} cols={8} />
              ) : filteredData.length > 0 ? (
                filteredData.map(p => (
                  <tr key={p.id} className={clsx('hover:bg-(--primary-tint)/30 transition-colors', p.quantity === 0 && 'bg-red-50/30')}>
                    <td className="px-4 py-3 text-sm font-semibold text-(--text-primary)">
                      {p.name}
                      {p.barcode && <span className="block text-xs text-(--text-muted)">{p.barcode}</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-secondary)">
                      {formatCurrency(p.effective_price ?? p.price)}
                      {p.discount_percent > 0 && (
                        <span className="block text-xs text-green-600 font-semibold">{p.discount_percent}% off</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-(--text-secondary)">{Number(p.cost_price) > 0 ? formatCurrency(p.cost_price) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-(--text-secondary)">
                      {p.discount_percent > 0 ? `${p.discount_percent}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-(--text-primary)">{p.quantity}</td>
                    <td className="px-4 py-3">
                      <StockBadge qty={p.quantity} threshold={p.low_stock_threshold} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSummaryProduct(p)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Daily summary"
                        >
                          <ChartBarIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryProduct(p)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-purple-600 hover:bg-purple-50 transition-colors"
                          title="Movement history"
                        >
                          <ClockIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setStockProduct(p)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-green-600 hover:bg-green-50 transition-colors"
                          title="Adjust stock"
                        >
                          <ArrowUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditProduct(p)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (confirm(`Delete "${p.name}"?`)) deleteMutation.mutate(p.id); }}
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
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    {search || stockFilter !== 'all' ? 'No products match your filter.' : (
                      <>No products in this category.{' '}
                        <button type="button" onClick={() => setShowAdd(true)} className="text-orange-600 font-semibold hover:underline">Add the first product.</button>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && catId && <ProductModal catId={catId} onClose={() => setShowAdd(false)} />}
      {editProduct && catId && (
        <ProductModal
          initial={{
            name: editProduct.name,
            price: editProduct.price,
            cost_price: editProduct.cost_price,
            barcode: editProduct.barcode,
            low_stock_threshold: String(editProduct.low_stock_threshold),
            expiry_date: editProduct.expiry_date ?? '',
            discount_percent: String(editProduct.discount_percent),
          }}
          catId={catId}
          prodId={editProduct.id}
          onClose={() => setEditProduct(null)}
        />
      )}
      {stockProduct && catId && (
        <StockModal
          prodId={stockProduct.id}
          catId={catId}
          productName={stockProduct.name}
          onClose={() => setStockProduct(null)}
        />
      )}
      {summaryProduct && (
        <DailySummaryModal product={summaryProduct} onClose={() => setSummaryProduct(null)} />
      )}
      {historyProduct && (
        <MovementHistoryModal product={historyProduct} onClose={() => setHistoryProduct(null)} />
      )}
    </div>
  );
}
