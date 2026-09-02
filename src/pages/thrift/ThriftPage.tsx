import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PlusIcon, KeyIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

interface ThriftGroup {
  id: number;
  uuid: string;
  name: string;
  description: string;
  frequency: string;
  cycle_type: string;
  invite_code: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  collector: { id: number; full_name: string; email: string } | null;
  organization: { uuid: string; name: string } | null;
}


function SubscriptionBadge({ group }: { group: ThriftGroup }) {
  if (group.organization) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-teal-50 text-teal-700">
        Bank managed
      </span>
    );
  }
  const label = group.is_on_trial ? 'Trial' : group.is_subscription_active ? 'Active' : 'Inactive';
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
      group.is_on_trial ? 'bg-yellow-100 text-yellow-700'
      : group.is_subscription_active ? 'bg-green-100 text-green-700'
      : 'bg-(--bg) text-(--text-secondary)',
    )}>
      {label}
    </span>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
const submitBtn = 'flex-1 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    description: '',
    frequency: 'monthly',
    cycle_type: 'rolling',
    start_date: '',
    end_date: '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/thrift/', {
      name: form.name.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      cycle_type: form.cycle_type,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['thrift-groups'] }); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); setErr(''); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Group name is required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">Create Thrift Group</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Group Name *">
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Apapa Market Weekly Thrift" className={inputCls} />
          </Field>

          <Field label="Frequency *">
            <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)} className={inputCls}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>

          <Field label="Cycle Type *">
            <select value={form.cycle_type} onChange={(e) => set('cycle_type', e.target.value)} className={inputCls}>
              <option value="rolling">Rolling / Open-ended</option>
              <option value="fixed">Fixed Cycle</option>
            </select>
          </Field>

          {form.cycle_type === 'fixed' && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Date *">
                <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label="End Date *">
                <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}

          <Field label="Description (optional)">
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="What is this group for?" className={inputCls} />
          </Field>

          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={submitBtn}>
              {mutation.isPending ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Join Group Modal ──────────────────────────────────────────────────────────

function JoinGroupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [stage, setStage] = useState<'code' | 'amount' | 'confirm'>('code');
  const [groupName, setGroupName] = useState('');
  const [err, setErr] = useState('');

  const joinMutation = useMutation({
    mutationFn: () => api.post('/thrift/join/', {
      invite_code: code.trim().toUpperCase(),
      personal_amount: amount,
    }),
    onSuccess: (r) => {
      setGroupName(r.data?.member?.group?.name ?? 'the group');
      setStage('confirm');
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.detail ?? d?.invite_code?.[0] ?? d?.personal_amount?.[0] ?? 'Something went wrong.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Join Thrift Group</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>

        <div className="p-6 space-y-4">
          {stage === 'code' && (
            <>
              <p className="text-sm text-(--text-secondary)">Enter the invite code shared by your collector.</p>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                maxLength={8}
                placeholder="e.g. A1B2C3D4"
                aria-label="Invite code"
                className={`${inputCls} tracking-[0.3em] uppercase font-mono text-center text-lg`}
              />
              {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                <button type="button" onClick={() => { setErr(''); setStage('amount'); }} disabled={code.trim().length < 6} className={submitBtn}>
                  Next
                </button>
              </div>
            </>
          )}

          {stage === 'amount' && (
            <>
              <p className="text-sm text-(--text-secondary)">Enter the amount you will contribute per collection period.</p>
              <Field label="My Contribution Amount (NGN) *">
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErr(''); }}
                  placeholder="e.g. 5000"
                  className={inputCls}
                />
              </Field>
              {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStage('code')} className={cancelBtn}>Back</button>
                <button
                  type="button"
                  onClick={() => joinMutation.mutate()}
                  disabled={!amount || Number(amount) <= 0 || joinMutation.isPending}
                  className={submitBtn}
                >
                  {joinMutation.isPending ? 'Joining…' : 'Send Request'}
                </button>
              </div>
            </>
          )}

          {stage === 'confirm' && (
            <>
              <div className="rounded-xl bg-teal-50 border border-teal-100 p-4 text-center">
                <p className="text-xs text-teal-600 uppercase tracking-wider font-semibold mb-1">Request sent!</p>
                <p className="text-lg font-bold text-(--text-primary)">{groupName}</p>
                <p className="text-sm text-(--text-secondary) mt-1">Waiting for collector approval.</p>
              </div>
              <button
                type="button"
                onClick={() => { qc.invalidateQueries({ queryKey: ['thrift-groups'] }); onClose(); }}
                className={submitBtn}
              >
                Done
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ThriftPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const currentUser = useAuthStore((s) => s.user);

  const { data, isLoading, error } = useQuery<ThriftGroup[]>({
    queryKey: ['thrift-groups'],
    queryFn: () => api.get('/thrift/').then(r => r.data),
  });

  const { data: userOrgs = [] } = useQuery<{ uuid: string; name: string }[]>({
    queryKey: ['thrift-user-orgs'],
    queryFn: () => api.get('/thrift/orgs/').then(r => r.data),
  });

  const groups = data ?? [];

  // Derive role flags from the groups the user is involved in
  const isAnyCollector = groups.some(g => g.collector?.id === currentUser?.id);
  const hasSoloGroup   = groups.some(g => g.collector?.id === currentUser?.id && !g.organization);
  // A payer is someone who is a member of at least one group where they are not the collector
  const isAnyPayer     = groups.some(g => g.collector?.id !== currentUser?.id);
  // Org admin: user owns or admins at least one organisation
  const isOrgAdmin     = userOrgs.length > 0;
  const orgLink        = isOrgAdmin ? `/org/${userOrgs[0].uuid}` : '/thrift/org/create';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-(--text-primary)">Thrift Groups</h1>
            <p className="text-sm text-(--text-secondary)">Your cooperative savings groups</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Payers only: collectors don't make payments */}
            {isAnyPayer && (
              <Link to="/thrift/history" className="text-sm text-(--text-muted) hover:text-teal-600 transition-colors whitespace-nowrap">
                My Payment History →
              </Link>
            )}
            {/* Collectors only: rotation queue */}
            {isAnyCollector && (
              <Link to="/thrift/queue" className="text-sm text-(--text-muted) hover:text-teal-600 transition-colors whitespace-nowrap">
                Collector Queue →
              </Link>
            )}
            {/* Solo collectors only: platform billing (org-linked groups are billed via the org) */}
            {hasSoloGroup && (
              <Link to="/thrift/billing" className="text-sm text-(--text-muted) hover:text-teal-600 transition-colors whitespace-nowrap">
                Billing →
              </Link>
            )}
            {/* Org admins see their dashboard; solo collectors see create form */}
            {(isOrgAdmin || isAnyCollector) && (
              <Link to={orgLink} className="text-sm text-(--text-muted) hover:text-teal-600 transition-colors whitespace-nowrap">
                Organisation →
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-(--border) text-(--text-secondary) px-4 py-2 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
          >
            <KeyIcon className="h-4 w-4" />
            Join Group
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create Group
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load thrift groups. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Group Name', 'Frequency', 'Cycle', 'Members', 'Collector', 'Organisation', 'Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={5} cols={7} />
              ) : data && data.length > 0 ? (
                data.map(group => (
                  <tr key={group.uuid} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link to={`/thrift/${group.uuid}`} className="text-teal-600 hover:underline">{group.name}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary) capitalize">{group.frequency}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary) capitalize">{group.cycle_type}</td>
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{group.member_count}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{group.collector?.full_name ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{group.organization?.name ?? '—'}</td>
                    <td className="px-6 py-4"><SubscriptionBadge group={group} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    You are not a member of any thrift group yet.
                    <br />
                    <button type="button" onClick={() => setShowJoin(true)} className="mt-3 text-teal-600 font-semibold hover:underline">
                      Join with an invite code
                    </button>
                    {' or '}
                    <button type="button" onClick={() => setShowCreate(true)} className="text-teal-600 font-semibold hover:underline">
                      create a new group
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} />}
    </div>
  );
}
