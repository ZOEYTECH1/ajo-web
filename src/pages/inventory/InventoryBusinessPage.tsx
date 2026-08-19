import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BuildingStorefrontIcon,
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
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
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const orangeBtn =
  'rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn =
  'rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors';

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    owner:        'bg-orange-100 text-orange-700',
    manager:      'bg-blue-100 text-blue-700',
    branch_admin: 'bg-purple-100 text-purple-700',
    staff:        'bg-gray-100 text-gray-700',
  };
  return (
    <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', colors[role] ?? 'bg-gray-100 text-gray-600')}>
      {role.replace('_', ' ')}
    </span>
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Invite Staff</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(''); }}
              placeholder="staff@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Role *</label>
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
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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

function EditBusinessModal({ biz, onClose }: { biz: Business; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: biz.name, address: biz.address ?? '', phone: biz.phone ?? '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/inventory/businesses/${biz.id}/`, { name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim() }),
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
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Edit Business</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Business Name *</label>
            <input type="text" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
            <input type="text" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g. 12 Market St, Lagos" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Phone</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g. 08012345678" className={inputCls} />
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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
  const [showInvite, setShowInvite] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const { data: businesses = [], isLoading: bizLoading } = useQuery<Business[]>({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then((r) => r.data),
    onSuccess: (data) => {
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
      </div>

      {bizLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 rounded-xl bg-(--surface) border border-(--border) skeleton" />)}
        </div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-16">
          <BuildingStorefrontIcon className="h-12 w-12 text-(--text-muted) mx-auto mb-3" />
          <p className="text-(--text-muted) text-sm">No business found.</p>
          <p className="text-xs text-(--text-muted) mt-1">Create a business from the mobile app to get started.</p>
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
                                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
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

      {showInvite && selectedBiz && (
        <InviteModal bizId={selectedBiz.id} onClose={() => setShowInvite(false)} />
      )}
      {showEdit && selectedBiz && (
        <EditBusinessModal biz={selectedBiz} onClose={() => setShowEdit(false)} />
      )}
    </div>
  );
}
