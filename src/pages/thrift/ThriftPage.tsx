import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { PlusIcon, KeyIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

type TFn = (key: string, options?: any) => string;

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
  const { t } = useTranslation();
  if (group.organization) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap bg-(--primary-tint) text-(--primary-dark)">
        {t('thriftPage.page.statusBadge.bankManaged')}
      </span>
    );
  }
  const label = group.is_on_trial ? t('thriftPage.page.statusBadge.trial')
    : group.is_subscription_active ? t('thriftPage.page.statusBadge.active')
    : t('thriftPage.page.statusBadge.inactive');
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

function getGroupCols(t: TFn): Column<Record<string, unknown>>[] {
  return [
    {
      key: 'name',
      header: t('thriftPage.page.headers.groupName'),
      render: (v, row) => (
        <Link to={`/thrift/${row.uuid as string}`} className="text-(--primary) hover:underline font-semibold">
          {v as string}
        </Link>
      ),
    },
    { key: 'frequency', header: t('thriftPage.page.headers.payoutCycle'), render: (v) => <span className="capitalize">{v as string}</span> },
    { key: 'cycle_type', header: t('thriftPage.page.headers.cycleType'), render: (v) => <span className="capitalize">{v as string}</span> },
    { key: 'member_count', header: t('thriftPage.page.headers.members') },
    {
      key: 'collector',
      header: t('thriftPage.page.headers.collector'),
      render: (v) => (v as ThriftGroup['collector'])?.full_name ?? '—',
    },
    {
      key: 'organization',
      header: t('thriftPage.page.headers.organisation'),
      render: (v) => (v as ThriftGroup['organization'])?.name ?? '—',
    },
    { key: 'id', header: t('thriftPage.page.headers.status'), render: (_, row) => <SubscriptionBadge group={row as unknown as ThriftGroup} /> },
  ];
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)';
const submitBtn = 'flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100';
const cancelBtn = 'flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30';

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
  const { t } = useTranslation();
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
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? t('thriftPage.createModal.errors.somethingWrong'))));
    },
  });

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); setErr(''); }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr(t('thriftPage.createModal.errors.nameRequired')); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) border border-(--border) rounded-2xl shadow-(--shadow-soft-lg) w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">{t('thriftPage.createModal.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('thriftPage.createModal.closeDialog')} className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label={t('thriftPage.createModal.nameLabel')}>
            <input type="text" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder={t('thriftPage.createModal.namePlaceholder')} className={inputCls} />
          </Field>

          <Field label={t('thriftPage.createModal.payoutCycleLabel')}>
            <select value={form.frequency} onChange={(e) => set('frequency', e.target.value)} className={inputCls}>
              <option value="monthly">{t('thriftPage.createModal.monthly')}</option>
              <option value="yearly">{t('thriftPage.createModal.yearly')}</option>
            </select>
            <p className="text-xs text-(--text-muted) mt-1">{t('thriftPage.createModal.payoutCycleHint')}</p>
          </Field>

          <Field label={t('thriftPage.createModal.cycleTypeLabel')}>
            <select value={form.cycle_type} onChange={(e) => set('cycle_type', e.target.value)} className={inputCls}>
              <option value="rolling">{t('thriftPage.createModal.rolling')}</option>
              <option value="fixed">{t('thriftPage.createModal.fixed')}</option>
            </select>
          </Field>

          {form.cycle_type === 'fixed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('thriftPage.createModal.startDateLabel')}>
                <input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputCls} />
              </Field>
              <Field label={t('thriftPage.createModal.endDateLabel')}>
                <input type="date" value={form.end_date} onChange={(e) => set('end_date', e.target.value)} className={inputCls} />
              </Field>
            </div>
          )}

          <Field label={t('thriftPage.createModal.descriptionLabel')}>
            <textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder={t('thriftPage.createModal.descriptionPlaceholder')} className={inputCls} />
          </Field>

          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending} className={submitBtn}>
              {mutation.isPending ? t('thriftPage.createModal.creating') : t('thriftPage.createModal.createGroup')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Join Group Modal ──────────────────────────────────────────────────────────

function JoinGroupModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
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
      setGroupName(r.data?.member?.group?.name ?? t('thriftPage.joinModal.theGroup'));
      setStage('confirm');
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.detail ?? d?.invite_code?.[0] ?? d?.personal_amount?.[0] ?? t('thriftPage.createModal.errors.somethingWrong'));
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) border border-(--border) rounded-2xl shadow-(--shadow-soft-lg) w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">{t('thriftPage.joinModal.title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('thriftPage.joinModal.closeDialog')} className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>

        <div className="p-6 space-y-4">
          {stage === 'code' && (
            <>
              <p className="text-sm text-(--text-secondary)">{t('thriftPage.joinModal.enterCodeHint')}</p>
              <input
                type="text"
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setErr(''); }}
                maxLength={8}
                placeholder={t('thriftPage.joinModal.codePlaceholder')}
                aria-label={t('thriftPage.joinModal.codeAriaLabel')}
                className={`${inputCls} tracking-[0.3em] uppercase font-mono text-center text-lg`}
              />
              {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className={cancelBtn}>{t('common.cancel')}</button>
                <button type="button" onClick={() => { setErr(''); setStage('amount'); }} disabled={code.trim().length < 6} className={submitBtn}>
                  {t('thriftPage.joinModal.next')}
                </button>
              </div>
            </>
          )}

          {stage === 'amount' && (
            <>
              <p className="text-sm text-(--text-secondary)">{t('thriftPage.joinModal.amountHint')}</p>
              <Field label={t('thriftPage.joinModal.amountLabel')}>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setErr(''); }}
                  placeholder={t('thriftPage.joinModal.amountPlaceholder')}
                  className={inputCls}
                />
              </Field>
              {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setStage('code')} className={cancelBtn}>{t('thriftPage.joinModal.back')}</button>
                <button
                  type="button"
                  onClick={() => joinMutation.mutate()}
                  disabled={!amount || Number(amount) <= 0 || joinMutation.isPending}
                  className={submitBtn}
                >
                  {joinMutation.isPending ? t('thriftPage.joinModal.joining') : t('thriftPage.joinModal.sendRequest')}
                </button>
              </div>
            </>
          )}

          {stage === 'confirm' && (
            <>
              <div className="rounded-xl bg-(--primary-tint) border border-(--primary-light)/30 p-4 text-center">
                <p className="text-xs text-(--primary) uppercase tracking-wider font-semibold mb-1">{t('thriftPage.joinModal.requestSent')}</p>
                <p className="text-lg font-bold text-(--text-primary)">{groupName}</p>
                <p className="text-sm text-(--text-secondary) mt-1">{t('thriftPage.joinModal.waitingApproval')}</p>
              </div>
              <button
                type="button"
                onClick={() => { qc.invalidateQueries({ queryKey: ['thrift-groups'] }); onClose(); }}
                className={submitBtn}
              >
                {t('thriftPage.joinModal.done')}
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
  const { t } = useTranslation();
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
            <h1 className="text-2xl font-bold text-(--text-primary)">{t('thriftPage.page.title')}</h1>
            <p className="text-sm text-(--text-secondary)">{t('thriftPage.page.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Payers only: collectors don't make payments */}
            {isAnyPayer && (
              <Link to="/thrift/history" className="text-sm text-(--text-muted) hover:text-(--primary) transition-colors whitespace-nowrap">
                {t('thriftPage.page.paymentHistoryLink')}
              </Link>
            )}
            {/* Collectors only: rotation queue */}
            {isAnyCollector && (
              <Link to="/thrift/queue" className="text-sm text-(--text-muted) hover:text-(--primary) transition-colors whitespace-nowrap">
                {t('thriftPage.page.collectorQueueLink')}
              </Link>
            )}
            {/* Solo collectors only: platform billing (org-linked groups are billed via the org) */}
            {hasSoloGroup && (
              <Link to="/thrift/billing" className="text-sm text-(--text-muted) hover:text-(--primary) transition-colors whitespace-nowrap">
                {t('thriftPage.page.billingLink')}
              </Link>
            )}
            {/* Org admins see their dashboard; solo collectors see create form */}
            {(isOrgAdmin || isAnyCollector) && (
              <Link to={orgLink} className="text-sm text-(--text-muted) hover:text-(--primary) transition-colors whitespace-nowrap">
                {t('thriftPage.page.organisationLink')}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="inline-flex items-center gap-1.5 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) px-4 py-2 text-sm font-semibold hover:bg-(--primary-tint)/30"
          >
            <KeyIcon className="h-4 w-4" />
            {t('thriftPage.page.joinGroup')}
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
          >
            <PlusIcon className="h-4 w-4" />
            {t('thriftPage.page.createGroup')}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {t('thriftPage.page.failedToLoad')}
        </div>
      )}

      <Table
        columns={getGroupCols(t as unknown as TFn)}
        data={groups as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage={
          <>
            {t('thriftPage.page.notMemberYet')}
            <br />
            <button type="button" onClick={() => setShowJoin(true)} className="mt-3 text-(--primary) font-semibold hover:underline">
              {t('ajoGroups.joinWithCode')}
            </button>
            {` ${t('ajoGroups.orText')} `}
            <button type="button" onClick={() => setShowCreate(true)} className="text-(--primary) font-semibold hover:underline">
              {t('ajoGroups.createNewGroup')}
            </button>
          </>
        }
      />

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} />}
    </div>
  );
}
