import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface CategoryProduct {
  id: number;
  name: string;
  quantity: number;
  cost_price: string;
  selling_price: string;
}

interface Category {
  id: number;
  name: string;
  products: CategoryProduct[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryWarehouseReceivePage() {
  const qc = useQueryClient();

  const [selectedCatId, setSelectedCatId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [supplier, setSupplier] = useState('');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const [err, setErr] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['inventory-categories'],
    queryFn: () => api.get('/inventory/categories/').then((r) => r.data),
  });

  const categoryProducts =
    categories.find((c) => String(c.id) === selectedCatId)?.products ?? [];

  const selectedProduct = categoryProducts.find(
    (p) => String(p.id) === selectedProdId,
  );

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/inventory/products/${selectedProdId}/movements/`, {
        movement_type: 'in',
        quantity: Number(quantity),
        supplier: supplier.trim(),
        reference: reference.trim() || undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-categories'] });
      qc.invalidateQueries({ queryKey: ['inventory-products'] });
      setSuccessMsg(
        `Stock received successfully. ${selectedProduct?.name ?? 'Product'}: +${quantity} units.`,
      );
      setQuantity('');
      setSupplier('');
      setReference('');
      setNote('');
      setErr('');
    },
    onError: (e: any) => {
      setErr(e.response?.data?.detail ?? 'Something went wrong.');
      setSuccessMsg('');
    },
  });

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr('');
    setSuccessMsg('');
    if (!selectedCatId) { setErr('Please select a category.'); return; }
    if (!selectedProdId) { setErr('Please select a product.'); return; }
    if (!quantity || Number(quantity) < 1) { setErr('Enter a valid quantity (min 1).'); return; }
    if (!supplier.trim()) { setErr('Supplier name is required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Receive Stock</h1>
        <p className="text-sm text-(--text-secondary)">Log incoming goods into your inventory</p>
      </div>

      {successMsg && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          <CheckCircleIcon className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {err && (
        <div className="flex items-start gap-3 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <XCircleIcon className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-xl">
          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedCatId}
              onChange={(e) => {
                setSelectedCatId(e.target.value);
                setSelectedProdId('');
              }}
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

          {/* Product */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedProdId}
              onChange={(e) => setSelectedProdId(e.target.value)}
              disabled={!selectedCatId}
              className={inputCls}
            >
              <option value="">Select product…</option>
              {categoryProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.quantity} in stock)
                </option>
              ))}
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 50"
              className={inputCls}
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Supplier <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="e.g. Lagos Wholesale Ltd"
              className={inputCls}
            />
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Reference Number
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. GRN-2026-001"
              className={inputCls}
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Note (optional)
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any additional details…"
              className={inputCls}
            />
          </div>

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full sm:w-auto rounded-lg bg-orange-600 text-white px-6 py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Recording…' : 'Record Receipt'}
          </button>
        </form>
      </div>
    </div>
  );
}
