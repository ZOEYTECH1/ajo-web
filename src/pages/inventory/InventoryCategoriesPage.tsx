import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, TrashIcon, XCircleIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';
import { getCategoryEmoji } from '../../utils/inventoryHelpers';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

interface CustomFieldDef {
  name: string;
  field_type: 'text' | 'number';
  required: boolean;
}

interface Category {
  id: number;
  name: string;
  product_count: number;
  created_at: string;
  custom_field_defs: CustomFieldDef[];
}

const TEMPLATES = [
  { emoji: '🛒', label: 'Provisions / Groceries' },
  { emoji: '👗', label: 'Clothes & Fashion' },
  { emoji: '📱', label: 'Electronics' },
  { emoji: '🍲', label: 'Food & Cooked Meals' },
  { emoji: '💄', label: 'Beauty & Cosmetics' },
  { emoji: '🏗️', label: 'Building Materials' },
  { emoji: '💊', label: 'Pharmacy / Medicine' },
  { emoji: '🚗', label: 'Auto Parts & Vehicles' },
  { emoji: '📚', label: 'Books & Stationery' },
  { emoji: '🌾', label: 'Farm Produce' },
  { emoji: '🪑', label: 'Furniture & Household' },
  { emoji: '📦', label: 'Other Goods' },
];

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn = 'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

function AddCategoryModal({
  onClose,
  onSave,
  isPending,
  err,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
  isPending: boolean;
  err: string;
}) {
  const [customMode, setCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">What do you sell?</h2>
            <p className="text-xs text-(--text-secondary) mt-0.5">Pick a category to get started</p>
          </div>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {customMode ? (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-(--text-primary) mb-1">What type of goods do you sell?</p>
                <p className="text-xs text-(--text-secondary) mb-3">
                  Write it in your own words — e.g. "Recharge cards", "Baby clothes", "Spare parts"
                </p>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Enter what you sell…"
                  className={inputCls}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter' && customName.trim()) onSave(customName.trim()); }}
                />
              </div>
              {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setCustomMode(false)} className={cancelBtn}>← Back</button>
                <button
                  type="button"
                  disabled={!customName.trim() || isPending}
                  onClick={() => onSave(customName.trim())}
                  className={submitBtn}
                >
                  {isPending ? 'Saving…' : 'Continue →'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {TEMPLATES.map(({ emoji, label }) => (
                  <button
                    key={label}
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      if (label === 'Other Goods') { setCustomMode(true); return; }
                      onSave(label);
                    }}
                    className="flex flex-col items-center gap-2 rounded-xl border border-(--border) bg-(--bg) hover:border-orange-400 hover:bg-orange-50/50 active:scale-95 p-4 text-center transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <span className="text-3xl">{emoji}</span>
                    <span className="text-xs font-semibold text-(--text-primary) leading-tight">{label}</span>
                  </button>
                ))}
              </div>
              {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              {isPending && <p className="text-sm text-center text-(--text-secondary)">Saving…</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EditCategoryModal({
  initial,
  onClose,
  onSave,
  isPending,
  err,
}: {
  initial: string;
  onClose: () => void;
  onSave: (name: string) => void;
  isPending: boolean;
  err: string;
}) {
  const [name, setName] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Edit Category</h2>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              autoFocus
            />
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="button" disabled={!name.trim() || isPending} onClick={() => onSave(name.trim())} className={submitBtn}>
              {isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomFieldsModal({ category, onClose }: { category: Category; onClose: () => void }) {
  const qc = useQueryClient();
  const [defs, setDefs] = useState<CustomFieldDef[]>(category.custom_field_defs ?? []);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'text' | 'number'>('text');
  const [newRequired, setNewRequired] = useState(false);
  const [err, setErr] = useState('');

  const saveMutation = useMutation({
    mutationFn: (updated: CustomFieldDef[]) =>
      api.patch(`/inventory/categories/${category.id}/`, { custom_field_defs: updated }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-categories'] }); },
    onError: (e: any) => setErr(e.response?.data?.detail ?? 'Failed to save.'),
  });

  function addField() {
    if (!newName.trim()) { setErr('Field name is required.'); return; }
    if (defs.some(d => d.name.toLowerCase() === newName.trim().toLowerCase())) { setErr('A field with this name already exists.'); return; }
    const updated = [...defs, { name: newName.trim(), field_type: newType, required: newRequired }];
    setDefs(updated);
    saveMutation.mutate(updated);
    setNewName('');
    setNewType('text');
    setNewRequired(false);
    setErr('');
  }

  function removeField(name: string) {
    const updated = defs.filter(d => d.name !== name);
    setDefs(updated);
    saveMutation.mutate(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <div>
            <h2 className="text-lg font-bold text-(--text-primary)">Custom Fields</h2>
            <p className="text-xs text-(--text-secondary) mt-0.5">{category.name} — extra attributes per product</p>
          </div>
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Existing fields */}
          {defs.length > 0 ? (
            <div className="space-y-2">
              {defs.map(d => (
                <div key={d.name} className="flex items-center justify-between gap-2 rounded-lg border border-(--border) bg-(--bg) px-3 py-2">
                  <div>
                    <span className="text-sm font-medium text-(--text-primary)">{d.name}</span>
                    <span className="ml-2 text-xs text-(--text-muted)">{d.field_type}{d.required ? ' · required' : ''}</span>
                  </div>
                  <button type="button" onClick={() => removeField(d.name)} className="p-1 text-(--text-muted) hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-(--text-muted) text-center py-2">No custom fields yet.</p>
          )}
          {/* Add field form */}
          <div className="rounded-xl border border-(--border) bg-(--bg) p-4 space-y-3">
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide">Add a field</p>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Field name (e.g. Size, Colour, Brand)"
              className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
            <div className="flex gap-3 items-center">
              <select value={newType} onChange={e => setNewType(e.target.value as 'text' | 'number')}
                className="flex-1 rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="text">Text</option>
                <option value="number">Number</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-(--text-secondary) cursor-pointer select-none">
                <input type="checkbox" checked={newRequired} onChange={e => setNewRequired(e.target.checked)} className="rounded" />
                Required
              </label>
              <button type="button" onClick={addField} disabled={saveMutation.isPending}
                className="rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors">
                Add
              </button>
            </div>
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <button type="button" onClick={onClose} className="w-full rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:text-(--text-primary) transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InventoryCategoriesPage() {
  const qc = useQueryClient();
  const { selectedId } = useInventoryBusiness();
  const [showAdd, setShowAdd] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [customFieldsCat, setCustomFieldsCat] = useState<Category | null>(null);
  const [mutErr, setMutErr] = useState('');

  const { data: categories, isLoading, error } = useQuery<Category[]>({
    queryKey: ['inventory-categories', selectedId],
    queryFn: () => api.get('/inventory/categories/', { params: { business_id: selectedId } }).then(r => r.data),
    enabled: selectedId !== null,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/inventory/categories/', { name, business_id: selectedId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-categories'] }); setShowAdd(false); setMutErr(''); },
    onError: (e: any) => {
      const d = e.response?.data;
      setMutErr(d?.detail ?? d?.name?.[0] ?? 'Failed to create category.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => api.patch(`/inventory/categories/${id}/`, { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory-categories'] }); setEditCat(null); setMutErr(''); },
    onError: (e: any) => {
      const d = e.response?.data;
      setMutErr(d?.detail ?? d?.name?.[0] ?? 'Failed to update category.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/inventory/categories/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-categories'] }),
  });

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Categories</h1>
          <p className="text-sm text-(--text-secondary)">Organise your products by category</p>
        </div>
        <button
          type="button"
          onClick={() => { setMutErr(''); setShowAdd(true); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load categories. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Category', 'Products', 'Actions'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={4} cols={3} />
              ) : categories && categories.length > 0 ? (
                categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link to={`/inventory/products/${cat.id}`} className="inline-flex items-center gap-2 text-(--primary) hover:underline">
                        <span className="text-xl leading-none">{getCategoryEmoji(cat.name)}</span>
                        <span>{cat.name}</span>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{cat.product_count}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setCustomFieldsCat(cat)}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Custom Fields">
                          <AdjustmentsHorizontalIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setMutErr(''); setEditCat(cat); }}
                          className="p-1.5 rounded-lg text-(--text-muted) hover:text-orange-600 hover:bg-orange-50 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { if (confirm(`Delete "${cat.name}"? This cannot be undone.`)) deleteMutation.mutate(cat.id); }}
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
                  <td colSpan={3} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No categories yet.{' '}
                    <button type="button" onClick={() => setShowAdd(true)} className="text-orange-600 font-semibold hover:underline">
                      Add your first category.
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <AddCategoryModal
          onClose={() => setShowAdd(false)}
          onSave={(name) => createMutation.mutate(name)}
          isPending={createMutation.isPending}
          err={mutErr}
        />
      )}
      {editCat && (
        <EditCategoryModal
          initial={editCat.name}
          onClose={() => setEditCat(null)}
          onSave={(name) => updateMutation.mutate({ id: editCat.id, name })}
          isPending={updateMutation.isPending}
          err={mutErr}
        />
      )}
      {customFieldsCat && (
        <CustomFieldsModal category={customFieldsCat} onClose={() => setCustomFieldsCat(null)} />
      )}
    </div>
  );
}
