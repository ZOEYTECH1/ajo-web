import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PlusIcon, XCircleIcon, TrashIcon, ChevronDownIcon, ChevronUpIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
import { Pagination } from '../../components/ui/Pagination';
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

interface PaginatedSales {
  count: number;
  next: string | null;
  previous: string | null;
  results: Sale[];
}

interface Category { id: number; name: string; }
interface Product { id: number; name: string; price: string; effective_price: string | null; quantity: number; }
interface Customer { id: number; name: string; }

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v));
}

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn = 'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

// ── New Sale Modal ─────────────────────────────────────────────────────────────

interface CartItem {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: string;
}

interface CompletedSale {
  total: string;
  customer_name?: string;
  items: { product_name: string; quantity: number; unit_price: string; subtotal: string }[];
  notes: string;
  sold_at: string;
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
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

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
    if (prod) setUnitPrice(prod.effective_price ?? prod.price);
  }

  function addToCart() {
    if (!selectedProduct || !qty || !unitPrice) return;
    const qtyNum = Number(qty);
    if (qtyNum > selectedProduct.quantity) {
      setErr(`Only ${selectedProduct.quantity} units of "${selectedProduct.name}" available.`);
      return;
    }
    const existing = cart.find(c => c.product_id === selectedProduct.id);
    if (existing) {
      const newQty = existing.quantity + qtyNum;
      if (newQty > selectedProduct.quantity) {
        setErr(`Cannot exceed available stock of ${selectedProduct.quantity} units.`);
        return;
      }
      setCart(cart.map(c => c.product_id === selectedProduct.id ? { ...c, quantity: newQty } : c));
    } else {
      setCart([...cart, { product_id: selectedProduct.id, product_name: selectedProduct.name, quantity: qtyNum, unit_price: unitPrice }]);
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
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['inventory-sales'] });
      setCompletedSale(res.data);
    },
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

  // Receipt view
  if (completedSale) {
    const receiptText = [
      '🧾 SALE RECEIPT',
      '──────────────────',
      `📅 ${new Date(completedSale.sold_at).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      completedSale.customer_name ? `👤 ${completedSale.customer_name}` : '👤 Walk-in Customer',
      '──────────────────',
      ...(completedSale.items ?? []).map((i: any) =>
        `• ${i.product_name} x${i.quantity} @ ₦${Number(i.unit_price).toLocaleString()} = ₦${Number(i.subtotal).toLocaleString()}`
      ),
      '──────────────────',
      `TOTAL: ₦${Number(completedSale.total).toLocaleString()}`,
      ...(completedSale.notes ? [`📝 ${completedSale.notes}`] : []),
      '',
      'Thank you! 🙏',
    ].join('\n');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
          <div className="text-center">
            <div className="text-5xl mb-3">✅</div>
            <h2 className="text-xl font-bold text-(--text-primary)">Sale Recorded!</h2>
            <p className="text-sm text-(--text-secondary) mt-1">
              {completedSale.customer_name ?? 'Walk-in'} · {formatCurrency(completedSale.total)}
            </p>
          </div>
          <div className="bg-(--bg) rounded-xl p-4 text-xs font-mono text-(--text-secondary) whitespace-pre leading-relaxed overflow-auto max-h-48">
            {receiptText}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                if (navigator.clipboard) await navigator.clipboard.writeText(receiptText);
              }}
              className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:text-(--text-primary) transition-colors"
            >
              Copy Receipt
            </button>
            <button
              type="button"
              onClick={() => {
                setCart([]); setSelectedCatId(''); setSelectedProdId('');
                setQty('1'); setUnitPrice(''); setCustomerId(''); setNotes(''); setErr('');
                setCompletedSale(null);
              }}
              className="flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 transition-colors"
            >
              New Sale
            </button>
          </div>
          <button type="button" onClick={onClose} className="w-full text-sm text-(--text-muted) hover:text-(--text-primary) py-1 transition-colors">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">New Sale</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Add item row */}
          <div className="bg-(--bg) rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-(--text-secondary)">Add Items</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-(--text-secondary) mb-1">Category</label>
                <select value={selectedCatId} onChange={(e) => { setSelectedCatId(e.target.value); setSelectedProdId(''); setUnitPrice(''); }} className={inputCls}>
                  <option value="">Select category…</option>
                  {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-(--text-secondary) mb-1">Product</label>
                <select value={selectedProdId} onChange={(e) => handleProductSelect(e.target.value)} disabled={!selectedCatId} className={inputCls}>
                  <option value="">Select product…</option>
                  {products?.map(p => <option key={p.id} value={p.id}>{p.name} (qty: {p.quantity})</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-(--text-secondary) mb-1">Qty</label>
                <input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-(--text-secondary) mb-1">Unit Price (NGN)</label>
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
            <div className="border border-(--border) rounded-xl overflow-hidden">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-(--bg)">
                  <tr>
                    {['Product', 'Qty', 'Unit Price', 'Subtotal', ''].map(h => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-(--text-secondary) uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cart.map(item => (
                    <tr key={item.product_id}>
                      <td className="px-4 py-2 text-sm text-(--text-primary)">{item.product_name}</td>
                      <td className="px-4 py-2 text-sm text-(--text-secondary)">{item.quantity}</td>
                      <td className="px-4 py-2 text-sm text-(--text-secondary)">{formatCurrency(item.unit_price)}</td>
                      <td className="px-4 py-2 text-sm font-semibold text-(--text-primary)">{formatCurrency(item.quantity * Number(item.unit_price))}</td>
                      <td className="px-4 py-2">
                        <button type="button" onClick={() => setCart(cart.filter(c => c.product_id !== item.product_id))} className="text-(--text-muted) hover:text-red-600">
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-3 bg-(--bg) flex justify-end">
                <span className="text-sm font-bold text-(--text-primary)">Total: {formatCurrency(total)}</span>
              </div>
            </div>
          )}

          {/* Customer + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Customer (optional)</label>
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={inputCls}>
                <option value="">Walk-in / No customer</option>
                {customers?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Notes</label>
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

function exportSalesCsv(sales: Sale[]) {
  const header = 'Date,Customer,Items,Total (NGN)\n';
  const rows = sales.map(s => {
    const items = s.items.map(i => `${i.product_name} x${i.quantity}`).join('; ');
    return `${format(new Date(s.sold_at), 'yyyy-MM-dd HH:mm')},${s.customer_name || 'Walk-in'},"${items}",${Number(s.total).toFixed(2)}`;
  }).join('\n');
  const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ajo-sales.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventorySalesPage() {
  const [showNewSale, setShowNewSale] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<PaginatedSales>({
    queryKey: ['inventory-sales', page],
    queryFn: () => api.get(`/inventory/sales/?page=${page}`).then(r => r.data),
  });

  const sales = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Sales</h1>
          <p className="text-sm text-(--text-secondary)">All recorded sales transactions</p>
        </div>
        <div className="flex items-center gap-2">
          {sales.length > 0 && (
            <button
              type="button"
              onClick={() => exportSalesCsv(sales)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) text-(--text-secondary) px-3 py-2 text-sm font-semibold hover:text-(--text-primary) transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Export CSV
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowNewSale(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            New Sale
          </button>
        </div>
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
                {['Date', 'Items', 'Customer', 'Total', ''].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={6} cols={5} />
              ) : sales.length > 0 ? (
                sales.map(sale => (
                  <>
                    <tr
                      key={sale.id}
                      className="hover:bg-(--primary-tint)/30 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                    >
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
                      <td className="px-6 py-4 text-(--text-muted)">
                        {sale.items.length > 0 && (
                          expandedId === sale.id
                            ? <ChevronUpIcon className="h-4 w-4" />
                            : <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </td>
                    </tr>
                    {expandedId === sale.id && sale.items.length > 0 && (
                      <tr key={`${sale.id}-items`} className="bg-(--bg)">
                        <td colSpan={5} className="px-8 py-3">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-xs text-(--text-muted) uppercase">
                                <th className="text-left pb-1 pr-4">Product</th>
                                <th className="text-right pb-1 pr-4">Qty</th>
                                <th className="text-right pb-1 pr-4">Unit Price</th>
                                <th className="text-right pb-1">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-(--border)">
                              {sale.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5 pr-4 font-medium text-(--text-primary)">{item.product_name}</td>
                                  <td className="py-1.5 pr-4 text-right text-(--text-secondary)">{item.quantity}</td>
                                  <td className="py-1.5 pr-4 text-right text-(--text-secondary)">{formatCurrency(item.unit_price)}</td>
                                  <td className="py-1.5 text-right font-semibold text-(--text-primary)">{formatCurrency(item.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {sale.notes && <p className="mt-2 text-xs text-(--text-muted) italic">Note: {sale.notes}</p>}
                        </td>
                      </tr>
                    )}
                  </>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No sales recorded yet.{' '}
                    <button type="button" onClick={() => setShowNewSale(true)} className="text-orange-600 font-semibold hover:underline">Record the first sale.</button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onChange={setPage} />

      {showNewSale && <NewSaleModal onClose={() => setShowNewSale(false)} />}
    </div>
  );
}
