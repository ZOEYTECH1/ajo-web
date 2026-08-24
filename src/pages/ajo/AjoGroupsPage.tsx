import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PlusIcon, KeyIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface AjoGroup {
  id: number;
  name: string;
  description?: string;
  contribution_frequency: string;
  contribution_amount: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
}

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(value));
}

function StatusBadge({ group }: { group: AjoGroup }) {
  const label = group.is_on_trial ? 'Trial' : group.is_subscription_active ? 'Active' : 'Inactive';
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      group.is_on_trial
        ? 'bg-yellow-100 text-yellow-700'
        : group.is_subscription_active
        ? 'bg-green-100 text-green-700'
        : 'bg-gray-100 text-gray-500',
    )}>
      {label}
    </span>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    contribution_frequency: 'monthly',
    contribution_amount: '',
    collection_day: '',
    grace_period_days: '7',
    description: '',
    start_date: '',
    end_date: '',
  });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post('/groups/', {
      name: form.name.trim(),
      contribution_frequency: form.contribution_frequency,
      contribution_amount: form.contribution_amount,
      collection_day: form.collection_day ? Number(form.collection_day) : null,
      grace_period_days: Math.min(30, Math.max(0, Number(form.grace_period_days) || 0)),
      description: form.description.trim(),
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-groups'] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(
        d?.detail ??
        (Array.isArray(first) ? first[0] : String(first ?? 'Something went wrong.')),
      );
    },
  });

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setErr('');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Group name is required.'); return; }
    if (!form.contribution_amount || Number(form.contribution_amount) <= 0) {
      setErr('Enter a valid contribution amount.'); return;
    }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Create Ajo Group</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Group Name *" id="cg-name">
            <input
              id="cg-name"
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Lagos Professionals Ajo"
              className={inputCls}
            />
          </Field>

          <Field label="Contribution Frequency *" id="cg-frequency">
            <select
              id="cg-frequency"
              value={form.contribution_frequency}
              onChange={(e) => set('contribution_frequency', e.target.value)}
              className={inputCls}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </Field>

          <Field label="Contribution Amount (NGN) *" id="cg-amount">
            <input
              id="cg-amount"
              type="number"
              min="1"
              value={form.contribution_amount}
              onChange={(e) => set('contribution_amount', e.target.value)}
              placeholder="e.g. 10000"
              className={inputCls}
            />
          </Field>

          <Field label="Collection Day (optional)" id="cg-collection-day">
            <input
              id="cg-collection-day"
              type="number"
              min="0"
              max="31"
              value={form.collection_day}
              onChange={(e) => set('collection_day', e.target.value)}
              placeholder="1–28 for monthly, 0–6 (Mon=0) for weekly"
              className={inputCls}
            />
          </Field>

          <Field label="Grace Period (days, 0–30)" id="cg-grace">
            <input
              id="cg-grace"
              type="number"
              min="0"
              max="30"
              value={form.grace_period_days}
              onChange={(e) => set('grace_period_days', e.target.value)}
              placeholder="e.g. 7"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="First Cycle Start" id="cg-start">
              <input id="cg-start" type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
            </Field>
            <Field label="First Cycle End" id="cg-end">
              <input id="cg-end" type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Description (optional)" id="cg-description">
            <textarea
              id="cg-description"
              rows={2}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is this group for?"
              className={inputCls}
            />
          </Field>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

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
  const [stage, setStage] = useState<'code' | 'confirm'>('code');
  const [found, setFound] = useState<{ group_name: string; group_id?: number; message: string } | null>(null);
  const [err, setErr] = useState('');

  const lookupMutation = useMutation({
    mutationFn: () => api.post('/invite/join/', { invite_code: code.trim().toUpperCase() }),
    onSuccess: (r) => {
      setFound(r.data);
      setStage('confirm');
    },
    onError: (e: any) => {
      setErr(e.response?.data?.detail ?? e.response?.data?.invite_code?.[0] ?? 'Invalid invite code.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Join Ajo Group</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {stage === 'code' ? (
            <>
              <p className="text-sm text-gray-500">
                Enter the 8-character invite code shared by your group admin.
              </p>
              <div>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                  maxLength={8}
                  placeholder="e.g. A1B2C3D4"
                  className={`${inputCls} tracking-[0.3em] uppercase font-mono text-center text-lg`}
                />
              </div>
              {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                <button
                  type="button"
                  onClick={() => { setErr(''); lookupMutation.mutate(); }}
                  disabled={code.trim().length < 6 || lookupMutation.isPending}
                  className={submitBtn}
                >
                  {lookupMutation.isPending ? 'Looking up…' : 'Find Group'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-xl bg-orange-50 border border-orange-100 p-4 text-center">
                <p className="text-xs text-orange-500 uppercase tracking-wider font-semibold mb-1">Group found</p>
                <p className="text-lg font-bold text-gray-900">{found?.group_name}</p>
                <p className="text-sm text-gray-500 mt-1">{found?.message}</p>
              </div>
              <p className="text-sm text-gray-500 text-center">
                Your request will be sent to the group admin for approval.
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setStage('code')} className={cancelBtn}>Back</button>
                <button
                  type="button"
                  onClick={() => {
                    qc.invalidateQueries({ queryKey: ['ajo-groups'] });
                    onClose();
                  }}
                  className={submitBtn}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const submitBtn =
  'flex-1 rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn =
  'flex-1 rounded-lg border border-gray-300 text-gray-700 py-2.5 text-sm font-semibold hover:bg-gray-50 transition-colors';

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AjoGroupsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const { data, isLoading, error } = useQuery<AjoGroup[]>({
    queryKey: ['ajo-groups'],
    queryFn: () => api.get('/groups/').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-(--text-primary)">Ajo Groups</h1>
            <p className="text-sm text-(--text-secondary)">Your savings circles</p>
          </div>
          <Link
            to="/ajo/history"
            className="text-sm text-gray-400 hover:text-orange-600 transition-colors whitespace-nowrap"
          >
            My Payment History →
          </Link>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <KeyIcon className="h-4 w-4" />
            Join Group
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Create Group
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load groups. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Group Name', 'Frequency', 'Amount', 'Members', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={5} cols={5} />
              ) : data && data.length > 0 ? (
                data.map((group) => (
                  <tr key={group.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link to={`/ajo/${group.id}`} className="text-(--primary) hover:underline font-semibold">
                        {group.name}
                      </Link>
                      {group.description && (
                        <p className="text-xs text-(--text-muted) mt-0.5 truncate max-w-xs">{group.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary) capitalize">
                      {group.contribution_frequency}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">
                      {formatCurrency(group.contribution_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">
                      {group.member_count}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge group={group} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    You are not a member of any Ajo group yet.
                    <br />
                    <button
                      type="button"
                      onClick={() => setShowJoin(true)}
                      className="mt-3 text-orange-600 font-semibold hover:underline"
                    >
                      Join with an invite code
                    </button>
                    {' or '}
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="text-orange-600 font-semibold hover:underline"
                    >
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
