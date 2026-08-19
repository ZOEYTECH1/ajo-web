import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, XCircleIcon, TrashIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: string;
  subtotal: string;
}

interface Sale {
  id: number;
  sold_at: string;
  items: SaleItem[];
  total: string;
  customer_name: string | null;
  notes: string;
}

interface Category { id: number; name: string; }
interface Product { id: number; name: string; price: string; quantity: number; }
interface Customer { id: number; name: string; }

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v));
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn = 'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-gray-300 text-gray-700 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors';

// ── New Sale Modal ─────────────────────────────────────────────────────────────

interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
}

function NewSaleModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [qty, setQty] = useState('1');
  const [unitPrice, setUnitPrice] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState('');

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['inventory-categories'],
    queryFn: () => api.get('/inventory/categories/').then(r => r.data),
  });

  const { data: products } = useQuery<Product[]>({
    queryKey: ['inventory-products', selectedCatId],
    queryFn: () => api.get(`/inventory/categories/${selectedCatId}/products/`).then(r => r.data),
    enabled: !!selectedCatId,
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['inventory-customers'],
    queryFn: () => api.get('/inventory/customers/').then(r => r.data),
  });

  const selectedProduct = products?.find(p => String(p.id) === selectedProdId);

  function handleProductSelect(prodId: string) {
    setSelectedProdId(prodId);
    const prod = products?.find(p => String(p.id) === prodId);
    if (prod) setUnitPrice(prod.price);
  }

  function addToCart() {
    if (!selectedProduct || !qty || !unitPrice) return;
    const existing = cart.find(c => c.product_id === selectedProduct.id);
    if (existing) {
      setCart(cart.map(c => c.product_id === selectedProduct.id ? { ...c, quantity: c.quantity + Number(qty) } : c));
    } else {
      setCart([...cart, { product_id: selectedProduct.id, product_name: selectedProduct.name, quantity: Number(qty), unit_price: unitPrice }]);
    }
    setSelectedProdId('');
    setQty('1');
    setUnitPrice('');
    setErr('');
  }

  const total = cart.reduce((sum, c) => sum + c.quantity * Number(c.unit_price), 0);

  const mutation = useMutation({
    mutationFn: () => api.post('/inventory/sales/', {
      customer_id: customerId ? Number(customerId) : null,
      notes: notes.trim(),
      items: cart.map(c => ({ product_id: c.product_id, quantity: c.quantity, unit_price: c.unit_price })),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-sales'] }); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Failed to record sale.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) { setErr('Add at least one item to the sale.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">New Sale</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><XCircleIcon className="h-6 w-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Add item row */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Add Items</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                <select value={selectedCatId} onChange={(e) => { setSelectedCatId(e.target.value); setSelectedProdId(''); setUnitPrice(''); }} className={inputCls}>
                  <option value="">Select category…</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                <select value={selectedProdId} onChange={(e) => handleProductSelect(e.target.value)} disabled={!selectedCatId} className={inputCls}>
                  <option value="">Select product…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.name} (qty: {p.quantity})</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price (NGN)</label>
                <input type="number" min="0" step="0.01" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={inputCls} />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={addToCart}
                  disabled={!selectedProduct || !qty || !unitPrice}
                  className="w-full rounded-lg bg-gray-800 text-white py-2 text-sm font-semibold hover:bg-gray-900 disabled:opacity-40 transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          </div>

          {/* Cart */}
          {cart.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Product', 'Qty', 'Unit Price', 'Subtotal', ''].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map(item => (
                    <tr key={item.product_id}>
                      <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-gray-600">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-gray-900">{formatCurrency(item.quantity * Number(item.unit_price))}</td>
                      <td className="px-4 py-2">
                        <button type="button" onClick={() => setCart(cart.filter(c => c.product_id !== item.product_id))} className="text-gray-400 hover:text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-gray-50 flex justify-end">
                <span className="text-sm font-bold text-gray-900">Total: {formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Customer + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                <option value="">Walk-in / No customer</option>
                {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" className={inputCls} />
            </div>
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={cart.length === 0 || mutation.isPending} className={submitBtn}>
              {mutation.isPending ? 'Recording…' : `Record Sale · ${formatCurrency(total)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventorySalesPage() {
  const [showNewSale, setShowNewSale] = useState(false);

  const { data, isLoading, error } = useQuery<Sale[]>({
    queryKey: ['inventory-sales'],
    queryFn: () => api.get('/inventory/sales/').then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Sales</h1>
          <p className="text-sm text-(--text-secondary)">All recorded sales transactions</p>
        </div>
        <button
          type="button"
          onClick={() => setShowNewSale(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Sale
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load sales. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Date', 'Items', 'Customer', 'Total'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={6} cols={4} />
              ) : data && data.length > 0 ? (
                data.map(sale => (
                  <tr key={sale.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-(--text-secondary) whitespace-nowrap">
                      {format(new Date(sale.sold_at), 'dd MMM yyyy, h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-primary)">
                      {sale.items.length === 0 ? '—' : (() => {
                        const summary = sale.items.slice(0, 2).map(i => `${i.product_name} ×${i.quantity}`).join(', ');
                        return sale.items.length > 2 ? `${summary} +${sale.items.length - 2} more` : summary;
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{sale.customer_name || '—'}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-(--text-primary) whitespace-nowrap">{formatCurrency(sale.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No sales recorded yet.{' '}
                    <button type="button" onClick={() => setShowNewSale(true)} className="text-orange-600 font-semibold hover:underline">Record the first sale.</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showNewSale && <NewSaleModal onClose={() => setShowNewSale(false)} />}
    </div>
  );
}
