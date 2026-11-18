import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { PlusIcon, KeyIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton, SkeletonTable } from '../../components/ui/Skeleton';
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
        : 'bg-(--bg) text-(--text-secondary)',
    )}>
      {label}
    </span>
  );
}

// ── Mobile card list (table is unreadable below tablet width) ─────────────────

function GroupCard({ group }: { group: AjoGroup }) {
  return (
    <Link
      to={`/ajo/${group.id}`}
      className="block surface-soft rounded-xl p-4 hover:bg-(--primary-tint)/30 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-(--primary) truncate">{group.name}</p>
          {group.description && (
            <p className="text-xs text-(--text-muted) mt-0.5 truncate">{group.description}</p>
          )}
        </div>
        <StatusBadge group={group} />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-sm text-(--text-secondary)">
        <span className="capitalize">{group.contribution_frequency}</span>
        <span className="text-(--text-muted)">·</span>
        <span className="font-medium text-(--text-primary)">{formatCurrency(group.contribution_amount)}</span>
        <span className="text-(--text-muted)">·</span>
        <span>{group.member_count} member{group.member_count === 1 ? '' : 's'}</span>
      </div>
    </Link>
  );
}

function GroupCardSkeleton() {
  return (
    <div className="surface-soft rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-5 w-14" rounded />
      </div>
      <Skeleton className="h-3 w-3/5 mt-3" />
    </div>
  );
}

function EmptyGroupsMessage({ onJoin, onCreate }: { onJoin: () => void; onCreate: () => void }) {
  return (
    <p className="text-sm text-(--text-muted) text-center py-8">
      You are not a member of any Ajo group yet.
      <br />
      <button type="button" onClick={onJoin} className="mt-3 inline-block text-(--primary) font-semibold hover:underline">
        Join with an invite code
      </button>
      {' or '}
      <button type="button" onClick={onCreate} className="text-(--primary) font-semibold hover:underline">
        create a new group
      </button>
    </p>
  );
}

// ── Create Group Modal ────────────────────────────────────────────────────────

// Mon=0 … Sun=6 — matches the backend's own weekday encoding exactly
// (Group.compute_cycle_end_date / CreateGroupSerializer.validate_collection_day),
// not an arbitrary frontend choice.
const WEEKDAYS = [
  { value: 0, label: 'Mon' },
  { value: 1, label: 'Tue' },
  { value: 2, label: 'Wed' },
  { value: 3, label: 'Thu' },
  { value: 4, label: 'Fri' },
  { value: 5, label: 'Sat' },
  { value: 6, label: 'Sun' },
];
const MONTH_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function DayPickerButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        'rounded-lg py-2 text-xs font-semibold transition-colors',
        active
          ? 'bg-(--accent) text-white'
          : 'bg-(--bg) text-(--text-secondary) border border-(--border) hover:bg-(--primary-tint)/30',
      )}
    >
      {children}
    </button>
  );
}

// Which day contributions are due -- a free-text number whose valid range
// AND meaning (weekday vs. day-of-month) silently changes with frequency is
// error-prone to type correctly. A tap-to-select grid removes the need to
// know the encoding at all; not shown for daily, where no single day applies.
function CollectionDayPicker({
  frequency,
  value,
  onChange,
}: {
  frequency: string;
  value: string;
  onChange: (val: string) => void;
}) {
  if (frequency === 'daily') return null;

  function toggle(day: number) {
    onChange(value === String(day) ? '' : String(day));
  }

  return (
    <fieldset>
      <legend className="block text-sm font-semibold text-(--text-secondary) mb-1">
        Collection Day (optional)
      </legend>
      <p className="text-xs text-(--text-muted) mb-2">
        {frequency === 'weekly'
          ? 'Which day of the week should members pay by? '
          : 'Which day of the month should members pay by? '}
        <span className="italic">
          Leave blank to default to {frequency === 'weekly' ? 'Monday' : 'the 1st of the month'}.
        </span>
      </p>
      {frequency === 'weekly' ? (
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d) => (
            <DayPickerButton key={d.value} active={value === String(d.value)} onClick={() => toggle(d.value)}>
              {d.label}
            </DayPickerButton>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {MONTH_DAYS.map((d) => (
            <DayPickerButton key={d} active={value === String(d)} onClick={() => toggle(d)}>
              {d}
            </DayPickerButton>
          ))}
        </div>
      )}
    </fieldset>
  );
}

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
      <div className="bg-(--surface) border border-(--border) rounded-2xl shadow-(--shadow-soft-lg) w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">Create Ajo Group</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
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
              onChange={(e) => {
                // collection_day means something different per frequency
                // (weekday vs. day-of-month) -- clear it rather than let a
                // value picked under one frequency silently carry into
                // another, where the same number means a different day.
                set('contribution_frequency', e.target.value);
                set('collection_day', '');
              }}
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

          <CollectionDayPicker
            frequency={form.contribution_frequency}
            value={form.collection_day}
            onChange={(val) => set('collection_day', val)}
          />

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

          <Field label="First Cycle Start (optional)" id="cg-start">
            <input
              id="cg-start"
              type="date"
              value={form.start_date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => set('start_date', e.target.value)}
              className={inputCls}
            />
            <p className="text-xs text-(--text-muted) mt-1">
              The cycle's end date is set automatically based on the contribution frequency and collection day.
            </p>
          </Field>

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

          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

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
      <div className="bg-(--surface) border border-(--border) rounded-2xl shadow-(--shadow-soft-lg) w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Join Ajo Group</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {stage === 'code' ? (
            <>
              <p className="text-sm text-(--text-secondary)">
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
              {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
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
              <div className="rounded-xl bg-(--primary-tint) border border-(--primary-light)/30 p-4 text-center">
                {/* Fixed light box regardless of theme — text here must stay
                    fixed dark too, not the theme-aware --text-* variables
                    (those turn near-white in dark mode and disappear here). */}
                <p className="text-xs text-(--primary) uppercase tracking-wider font-semibold mb-1">Group found</p>
                <p className="text-lg font-bold text-gray-900">{found?.group_name}</p>
                <p className="text-sm text-gray-600 mt-1">{found?.message}</p>
              </div>
              <p className="text-sm text-(--text-secondary) text-center">
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
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)';
const submitBtn =
  'flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100';
const cancelBtn =
  'flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30';

function Field({ label, id, children }: { label: string; id?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-(--text-secondary) mb-1">{label}</label>
      {children}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AjoGroupsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);

  const { data, isLoading, error } = useQuery<AjoGroup[]>({
    queryKey: ['ajo-groups'],
    queryFn: () => api.get('/groups/').then((r) => r.data),
  });

  // Show a "taking longer than usual" hint after 8s — Render free-plan cold starts
  // can take 30–60s. Without this users assume the page is broken.
  useEffect(() => {
    if (!isLoading) { setSlowLoad(false); return; }
    const t = setTimeout(() => setSlowLoad(true), 8000);
    return () => clearTimeout(t);
  }, [isLoading]);

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
            className="text-sm text-(--text-muted) hover:text-(--primary) transition-colors whitespace-nowrap"
          >
            My Payment History →
          </Link>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="inline-flex items-center gap-1.5 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) px-4 py-2 text-sm font-semibold hover:bg-(--primary-tint)/30"
          >
            <KeyIcon className="h-4 w-4" />
            Join Group
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
          >
            <PlusIcon className="h-4 w-4" />
            Create Group
          </button>
        </div>
      </div>

      {slowLoad && isLoading && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          The server is waking up — this can take up to 60 seconds on the first request. Hang tight…
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load groups. Please refresh.
        </div>
      )}

      {/* Mobile/tablet: card list — the table's 5 columns don't fit a narrow
          screen and were overflowing off-screen with no scroll affordance. */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <GroupCardSkeleton key={i} />)
        ) : data && data.length > 0 ? (
          data.map((group) => <GroupCard key={group.id} group={group} />)
        ) : (
          <div className="surface-soft rounded-xl">
            <EmptyGroupsMessage onJoin={() => setShowJoin(true)} onCreate={() => setShowCreate(true)} />
          </div>
        )}
      </div>

      {/* Desktop: full table */}
      <div className="hidden md:block surface-soft overflow-hidden">
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
                  <tr key={group.id} className="hover:bg-(--primary-tint)/30">
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
                  <td colSpan={5} className="px-6 py-12">
                    <EmptyGroupsMessage onJoin={() => setShowJoin(true)} onCreate={() => setShowCreate(true)} />
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
