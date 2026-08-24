import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

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
  created_at: string;
}

interface Category {
  id: number;
  name: string;
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

function StockBadge({ qty, threshold }: { qty: number; threshold: number }) {
  if (qty === 0) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of stock</span>;
  if (qty <= threshold) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Low stock</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">In stock</span>;
}

// ── Product Form (create/edit) ─────────────────────────────────────────────

type ProductForm = {
  name: string; price: string; cost_price: string; quantity: string;
  barcode: string; low_stock_threshold: string; expiry_date: string;
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
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
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
          {!isEdit && (
            <Field label="Initial Quantity">
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" className={inputCls} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Low Stock Threshold">
              <input type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm(f => ({ ...f, low_stock_threshold: e.target.value }))} placeholder="5" className={inputCls} />
            </Field>
            <Field label="Barcode (optional)">
              <input type="text" value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} placeholder="e.g. 1234567890" className={inputCls} />
            </Field>
          </div>
          <Field label="Expiry Date (optional)">
            <input type="date" value={form.expiry_date} onChange={(e) => setForm(f => ({ ...f, expiry_date: e.target.value }))} className={inputCls} />
          </Field>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
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
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryProductsPage() {
  const { catId } = useParams<{ catId: string }>();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/inventory/categories" className="text-sm text-(--text-secondary) hover:text-(--primary)">← Categories</Link>
        <span className="text-(--text-secondary)">/</span>
        <span className="text-sm font-semibold text-(--text-primary)">{category?.name ?? 'Products'}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">{category?.name ?? 'Products'}</h1>
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
                {['Product', 'Price', 'Cost', 'Quantity', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={5} cols={6} />
              ) : data && data.length > 0 ? (
                data.map(p => (
                  <tr key={p.id} className={clsx('hover:bg-(--primary-tint)/30 transition-colors', p.quantity === 0 && 'bg-red-50/30')}>
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">
                      {p.name}
                      {p.barcode && <span className="block text-xs text-(--text-muted)">{p.barcode}</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{formatCurrency(p.effective_price ?? p.price)}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{Number(p.cost_price) > 0 ? formatCurrency(p.cost_price) : '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-(--text-primary)">{p.quantity}</td>
                    <td className="px-6 py-4">
                      <StockBadge qty={p.quantity} threshold={p.low_stock_threshold} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
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
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No products in this category.{' '}
                    <button type="button" onClick={() => setShowAdd(true)} className="text-orange-600 font-semibold hover:underline">Add the first product.</button>
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
    </div>
  );
}
