import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BuildingStorefrontIcon,
  BuildingOfficeIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  CubeIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Business {
  id: number;
  name: string;
  mode: string;
  address: string;
  phone: string;
  business_type: string;
  branch_count: number;
  parent_business: number | null;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  my_role: string;
}

interface StaffMember {
  id: number;
  user: number;
  user_name: string;
  user_email: string;
  role: string;
  joined_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ROLES = [
  { value: 'manager',      label: 'Manager' },
  { value: 'branch_admin', label: 'Branch Admin' },
  { value: 'staff',        label: 'Staff' },
];

const MODE_LABELS: Record<string, string> = {
  retail:    'Retail Store',
  warehouse: 'Warehouse',
  branch:    'Branch Shop',
};

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const orangeBtn =
  'rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn =
  'rounded-lg border border-(--border) text-(--text-secondary) px-4 py-2 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner:        'bg-orange-100 text-orange-700',
    manager:      'bg-blue-100 text-blue-700',
    branch_admin: 'bg-purple-100 text-purple-700',
    staff:        'bg-(--bg) text-(--text-secondary)',
  };
  return (
    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', colors[role] ?? 'bg-(--bg) text-(--text-secondary)')}>
      {role.replace('_', ' ')}
    </span>
  );
}

// ── Create Location Modal ─────────────────────────────────────────────────────

type CreationMode = 'retail' | 'warehouse' | 'branch';

const MODE_OPTIONS: { key: CreationMode; label: string; desc: string; icon: React.ElementType; bg: string; color: string }[] = [
  { key: 'retail',    label: 'Retail Store',  desc: 'Sells to customers, tracks revenue and daily P&L.',                      icon: BuildingStorefrontIcon, bg: 'bg-green-50',  color: 'text-green-700' },
  { key: 'warehouse', label: 'Warehouse',      desc: 'Tracks bulk stock, receives goods, dispatches to branches.',              icon: CubeIcon,              bg: 'bg-blue-50',   color: 'text-blue-700'  },
  { key: 'branch',    label: 'Branch Shop',    desc: 'A branch of an existing business — independent inventory.',              icon: BuildingOfficeIcon,    bg: 'bg-purple-50', color: 'text-purple-700'},
];

function CreateLocationModal({ businesses, onClose }: { businesses: Business[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [mode, setMode] = useState<CreationMode>('retail');
  const [parentId, setParentId] = useState<number | null>(null);
  const [err, setErr] = useState('');

  const ownedParents = useMemo(
    () => businesses.filter(b => b.my_role === 'owner' && b.mode !== 'branch'),
    [businesses],
  );

  const mutation = useMutation({
    mutationFn: () => {
      const body: Record<string, any> = { name: name.trim(), mode };
      if (mode === 'branch') body.parent_business_id = parentId;
      return api.post('/inventory/businesses/', body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Could not create location.')));
    },
  });

  function handleSubmit() {
    if (!name.trim()) { setErr('Enter a name for this location.'); return; }
    if (mode === 'branch' && !parentId) { setErr('Select a parent business for this branch.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">Add a Location</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Location Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setErr(''); }}
              placeholder={mode === 'branch' ? 'e.g. Ikeja Branch' : 'e.g. Main Store'}
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-(--text-secondary) mb-2">Type *</p>
            <div className="space-y-2">
              {MODE_OPTIONS.map(({ key, label, desc, icon: Icon, bg, color }) => {
                const isDisabled = key === 'branch' && ownedParents.length === 0;
                const isActive = mode === key;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => { setMode(key); if (key !== 'branch') setParentId(null); setErr(''); }}
                    className={clsx(
                      'w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                      isActive ? `border-orange-500 ${bg}` : 'border-(--border) bg-(--surface) hover:border-orange-300',
                      isDisabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <Icon className={clsx('h-5 w-5 mt-0.5 shrink-0', isActive ? color : 'text-(--text-muted)')} />
                    <div>
                      <p className={clsx('text-sm font-semibold', isActive ? color : 'text-(--text-primary)')}>{label}</p>
                      <p className="text-xs text-(--text-secondary) mt-0.5">{desc}</p>
                      {isDisabled && <p className="text-xs text-orange-600 font-semibold mt-1">Create a retail store or warehouse first.</p>}
                    </div>
                    {isActive && <span className="ml-auto text-orange-600 text-lg shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {mode === 'branch' && ownedParents.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Parent Business *</label>
              <select
                value={parentId ?? ''}
                onChange={e => setParentId(Number(e.target.value) || null)}
                className={inputCls}
              >
                <option value="">Select a business…</option>
                {ownedParents.map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({MODE_LABELS[b.mode] ?? b.mode})</option>
                ))}
              </select>
            </div>
          )}

          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={handleSubmit}
              className={`flex-1 ${orangeBtn}`}
            >
              {mutation.isPending ? 'Creating…' : 'Create Location'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteModal({ bizId, onClose }: { bizId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/inventory/businesses/${bizId}/invite/`, { email: email.trim(), role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-staff', bizId] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.email?.[0] ?? d?.role?.[0] ?? d?.detail ?? 'Failed to invite staff.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Invite Staff</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Email address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(''); }}
              placeholder="staff@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputCls}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!email.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={`flex-1 ${orangeBtn}`}
            >
              {mutation.isPending ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Edit Business Modal ───────────────────────────────────────────────────────

const BUSINESS_TYPES = [
  { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'limited_liability', label: 'Limited Liability (LLC)' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'other', label: 'Other' },
];

function EditBusinessModal({ biz, onClose }: { biz: Business; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: biz.name, address: biz.address ?? '', phone: biz.phone ?? '', business_type: biz.business_type ?? '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/inventory/businesses/${biz.id}/`, { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim(), business_type: form.business_type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? (first as string[])[0] : String(first ?? 'Failed to update.')));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Edit Business</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Business Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. 12 Market St, Lagos" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 08012345678" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Business Type</label>
            <select value={form.business_type} onChange={(e) => setForm(f => ({ ...f, business_type: e.target.value }))} className={inputCls}>
              <option value="">Select type…</option>
              {BUSINESS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!form.name.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              className={`flex-1 ${orangeBtn}`}
            >
              {mutation.isPending ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Business Card ─────────────────────────────────────────────────────────────

function BusinessCard({ biz, selected, onClick }: { biz: Business; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'w-full text-left rounded-xl border p-4 transition-all',
        selected
          ? 'border-orange-500 bg-orange-50 shadow-sm'
          : 'border-(--border) bg-(--surface) hover:border-orange-300',
      )}
    >
      <div className="flex items-center gap-3">
        <BuildingStorefrontIcon className={clsx('h-8 w-8', selected ? 'text-orange-600' : 'text-(--text-muted)')} />
        <div>
          <p className="font-semibold text-(--text-primary)">{biz.name}</p>
          <p className="text-xs text-(--text-secondary) capitalize">{MODE_LABELS[biz.mode] ?? biz.mode} · <RoleBadge role={biz.my_role} /></p>
        </div>
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type TabKey = 'details' | 'staff';

export default function InventoryBusinessPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('details');
  const [selectedBizId, setSelectedBizId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: businesses = [], isLoading: bizLoading } = useQuery<Business[]>({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then((r) => r.data),
    onSuccess: (data: Business[]) => {
      if (data.length > 0 && !selectedBizId) setSelectedBizId(data[0].id);
    },
  } as any);

  const selectedBiz = businesses.find((b) => b.id === selectedBizId) ?? businesses[0] ?? null;

  const { data: staff = [], isLoading: staffLoading } = useQuery<StaffMember[]>({
    queryKey: ['inventory-staff', selectedBiz?.id],
    queryFn: () => api.get(`/inventory/businesses/${selectedBiz!.id}/members/`).then((r) => r.data),
    enabled: !!selectedBiz && activeTab === 'staff',
  });

  const removeStaffMutation = useMutation({
    mutationFn: (memberId: number) =>
      api.delete(`/inventory/businesses/${selectedBiz!.id}/members/${memberId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-staff', selectedBiz?.id] }),
  });

  const isOwnerOrManager = selectedBiz?.my_role === 'owner' || selectedBiz?.my_role === 'manager';

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Business</h1>
          <p className="text-sm text-(--text-secondary)">Manage your business details and staff</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Location
        </button>
      </div>

      {bizLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-(--surface) border border-(--border) skeleton" />)}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-16">
          <BuildingStorefrontIcon className="h-12 w-12 text-(--text-muted) mx-auto mb-3" />
          <p className="font-semibold text-(--text-primary)">No business yet</p>
          <p className="text-sm text-(--text-muted) mt-1 mb-4">Create your first location to start tracking inventory.</p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create Business
          </button>
        </div>
      ) : (
        <>
          {/* Business selector (if multiple) */}
          {businesses.length > 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {businesses.map((b) => (
                <BusinessCard
                  key={b.id}
                  biz={b}
                  selected={b.id === selectedBiz?.id}
                  onClick={() => setSelectedBizId(b.id)}
                />
              ))}
            </div>
          )}

          {selectedBiz && (
            <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
              {/* Tabs */}
              <div className="border-b border-(--border) flex">
                {([
                  { key: 'details' as TabKey, label: 'Business Details', icon: BuildingStorefrontIcon },
                  { key: 'staff' as TabKey,   label: 'Staff',            icon: UserGroupIcon },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveTab(key)}
                    className={clsx(
                      'flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors',
                      activeTab === key
                        ? 'border-b-2 border-orange-600 text-orange-600'
                        : 'text-(--text-secondary) hover:text-(--text-primary)',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              <div className="p-6">
                {/* Details tab */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        { label: 'Business Name', value: selectedBiz.name },
                        { label: 'Mode', value: MODE_LABELS[selectedBiz.mode] ?? selectedBiz.mode },
                        { label: 'My Role', value: <RoleBadge role={selectedBiz.my_role} /> },
                        { label: 'Branches', value: String(selectedBiz.branch_count) },
                        { label: 'Address', value: selectedBiz.address || '—' },
                        { label: 'Phone', value: selectedBiz.phone || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="rounded-lg bg-(--bg) p-4">
                          <p className="text-xs text-(--text-muted) font-semibold uppercase tracking-wide">{label}</p>
                          <p className="mt-1 text-sm font-medium text-(--text-primary)">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3 items-center">
                      {selectedBiz.is_on_trial && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">Trial active</span>
                      )}
                      {selectedBiz.is_subscription_active && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">Subscription active</span>
                      )}
                    </div>

                    {isOwnerOrManager && (
                      <div className="flex justify-end pt-2">
                        <button type="button" onClick={() => setShowEdit(true)} className={orangeBtn}>
                          Edit Business
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Staff tab */}
                {activeTab === 'staff' && (
                  <div className="space-y-4">
                    {isOwnerOrManager && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowInvite(true)}
                          className={`inline-flex items-center gap-1.5 ${orangeBtn}`}
                        >
                          <PlusIcon className="h-4 w-4" />
                          Invite Staff
                        </button>
                      </div>
                    )}

                    {staffLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-lg bg-(--bg) skeleton" />)}
                      </div>
                    ) : staff.length === 0 ? (
                      <p className="text-center py-8 text-sm text-(--text-muted)">No staff members yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-(--border)">
                          <thead className="bg-(--bg)">
                            <tr>
                              {['Name', 'Email', 'Role', 'Actions'].map((h) => (
                                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-(--border)">
                            {staff.map((m) => (
                              <tr key={m.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{m.user_name}</td>
                                <td className="px-6 py-4 text-sm text-(--text-secondary)">{m.user_email}</td>
                                <td className="px-6 py-4"><RoleBadge role={m.role} /></td>
                                <td className="px-6 py-4">
                                  {isOwnerOrManager && m.role !== 'owner' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (confirm(`Remove ${m.user_name} from the team?`)) {
                                          removeStaffMutation.mutate(m.id);
                                        }
                                      }}
                                      disabled={removeStaffMutation.isPending}
                                      className="p-1.5 rounded-lg text-(--text-muted) hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                                      title="Remove"
                                    >
                                      <TrashIcon className="h-4 w-4" />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showCreate && (
        <CreateLocationModal businesses={businesses} onClose={() => setShowCreate(false)} />
      )}
      {showInvite && selectedBiz && (
        <InviteModal bizId={selectedBiz.id} onClose={() => setShowInvite(false)} />
      )}
      {showEdit && selectedBiz && (
        <EditBusinessModal biz={selectedBiz} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
