import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';

type TFn = (key: string, options?: any) => string;

// ── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)';
const submitBtn = 'flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100';
const cancelBtn = 'flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30';

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrgUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface CollectorRecord {
  id: number;
  user: OrgUser;
  status: 'active' | 'suspended' | 'pending';
  role: string;
}

interface CollectorStats {
  mobilization_rate: number | null;
  dispute_rate: number | null;
  total_amount: number;
  confirmed_amount: number;
  total_count: number;
  disputed_count: number;
}

interface OrgGroup {
  id: number;
  uuid: string;
  name: string;
  frequency: string;
  member_count: number;
  collector: { id: number; first_name: string; last_name: string } | null;
}

interface PaymentStats {
  total: number;
  confirmed: number;
  disputed: number;
  pending: number;
  total_collected: number;
  savings_mobilization: number;
}

interface OrgReport {
  id: number;
  reporter_name: string;
  collector_name: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  created_at: string;
  reviewed_at: string | null;
}

interface PaginatedReports {
  count: number;
  next: string | null;
  previous: string | null;
  results: OrgReport[];
}

interface PaymentSummary {
  total: number;
  confirmed: number;
  disputed: number;
  pending: number;
  confirmed_amount: number;
}

interface RemovalRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  settlement_notes: string;
  member_name: string;
  member_email: string;
  group_id: number;
  group_name: string;
  personal_amount: string;
  total_saved: string;
  payment_summary: PaymentSummary;
  resolved_by_name: string | null;
  created_at: string;
  resolved_at: string | null;
}

interface PaginatedRemovalRequests {
  count: number;
  next: string | null;
  previous: string | null;
  results: RemovalRequest[];
}

interface Organization {
  id: number;
  name: string;
  org_type: string;
  is_verified: boolean;
}

interface OrgDashboard {
  organization: Organization;
  collectors: CollectorRecord[];
  pending_collectors: CollectorRecord[];
  groups: OrgGroup[];
  payment_stats: PaymentStats;
  recent_reports: OrgReport[];
  collector_stats: Record<string, CollectorStats>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fullName(u: OrgUser | { id: number; first_name: string; last_name: string }) {
  return `${u.first_name} ${u.last_name}`.trim();
}

function OrgTypeBadge({ type }: { type: string }) {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    mfb: t('thriftPage.org.orgType.mfb'),
    bank: t('thriftPage.org.orgType.bank'),
    cooperative: t('thriftPage.org.orgType.cooperative'),
    other: t('thriftPage.org.orgType.other'),
  };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-(--primary-tint) text-(--primary-dark) border border-(--primary)/30 capitalize">
      {labels[type] ?? type}
    </span>
  );
}

function CollectorStatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
      status === 'active' ? 'bg-green-100 text-green-700'
      : status === 'suspended' ? 'bg-(--bg) text-(--text-secondary)'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {t(`thriftPage.statusValues.${status}`, { defaultValue: status })}
    </span>
  );
}

function ReportStatusBadge({ status }: { status: OrgReport['status'] }) {
  const { t } = useTranslation();
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
      status === 'resolved' ? 'bg-green-100 text-green-700'
      : status === 'dismissed' ? 'bg-(--bg) text-(--text-secondary)'
      : status === 'reviewed' ? 'bg-blue-100 text-blue-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {t(`thriftPage.statusValues.${status}`, { defaultValue: status })}
    </span>
  );
}

function StatCard({ label, value, delay = 0 }: { label: string; value: string | number; delay?: number }) {
  return (
    <div className="surface-soft surface-soft-interactive animate-rise-in p-5" style={{ '--delay': `${delay}ms` } as React.CSSProperties}>
      <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-(--text-primary) mt-1">{value}</p>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(data: OrgDashboard, t: TFn) {
  const rows: string[][] = [];

  rows.push([t('thriftPage.org.csv.summaryHeader')]);
  rows.push([t('thriftPage.org.csv.name'), data.organization.name]);
  rows.push([t('thriftPage.org.csv.type'), data.organization.org_type]);
  rows.push([t('thriftPage.org.csv.verified'), data.organization.is_verified ? t('thriftPage.org.csv.yes') : t('thriftPage.org.csv.no')]);
  rows.push([]);
  rows.push([t('thriftPage.org.csv.paymentStatsHeader')]);
  rows.push([t('thriftPage.org.csv.total'), String(data.payment_stats.total)]);
  rows.push([t('thriftPage.org.csv.confirmed'), String(data.payment_stats.confirmed)]);
  rows.push([t('thriftPage.org.csv.disputed'), String(data.payment_stats.disputed)]);
  rows.push([t('thriftPage.org.csv.pending'), String(data.payment_stats.pending)]);
  rows.push([t('thriftPage.org.csv.totalCollectedNgn'), String(data.payment_stats.total_collected)]);
  rows.push([t('thriftPage.org.csv.savingsMobilizationPercent'), String(data.payment_stats.savings_mobilization)]);
  rows.push([]);
  rows.push([t('thriftPage.org.csv.collectorsHeader')]);
  rows.push([
    t('thriftPage.org.csv.name'), t('thriftPage.org.csv.email'), t('thriftPage.org.csv.status'),
    t('thriftPage.org.csv.mobilizationRatePercent'), t('thriftPage.org.csv.disputeRatePercent'),
    t('thriftPage.org.csv.totalAmount'), t('thriftPage.org.csv.confirmedAmount'),
  ]);
  for (const c of data.collectors) {
    const stats = data.collector_stats[String(c.id)];
    rows.push([
      fullName(c.user),
      c.user.email,
      c.status,
      stats ? String(stats.mobilization_rate) : '',
      stats ? String(stats.dispute_rate) : '',
      stats ? String(stats.total_amount) : '',
      stats ? String(stats.confirmed_amount) : '',
    ]);
  }
  rows.push([]);
  rows.push([t('thriftPage.org.csv.groupsHeader')]);
  rows.push([t('thriftPage.org.csv.groupName'), t('thriftPage.org.csv.payoutCycle'), t('thriftPage.org.csv.members'), t('thriftPage.org.csv.collector')]);
  for (const g of data.groups) {
    rows.push([
      g.name, g.frequency, String(g.member_count),
      g.collector ? `${g.collector.first_name} ${g.collector.last_name}` : t('thriftPage.org.csv.unassigned'),
    ]);
  }
  rows.push([]);
  rows.push([t('thriftPage.org.csv.recentReportsHeader')]);
  rows.push([t('thriftPage.org.csv.reporter'), t('thriftPage.org.csv.collector'), t('thriftPage.org.csv.reason'), t('thriftPage.org.csv.status'), t('thriftPage.org.csv.date')]);
  for (const r of data.recent_reports) {
    rows.push([r.reporter_name, r.collector_name, r.reason, r.status, fmt(r.created_at)]);
  }

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `org-${data.organization.name.replace(/\s+/g, '-')}-report.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Loading Skeleton ──────────────────────────────────────────────────────────

function OrgSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="surface-soft p-6 space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="surface-soft p-5 space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <div className="bg-(--surface) rounded-xl border border-(--border) p-5 space-y-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

// ── Approve Removal Modal (org admin) ────────────────────────────────────────

function ApproveRemovalModal({
  open, orgUuid, request, onClose,
}: { open: boolean; orgUuid: string; request: RemovalRequest | null; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [settlementNotes, setSettlementNotes] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setSettlementNotes(''); setErr(''); }
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => api.patch(`/thrift/orgs/${orgUuid}/removal-requests/${request!.id}/`, {
      action: 'approve',
      settlement_notes: settlementNotes.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org-removal-requests', orgUuid] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.settlement_notes?.[0] ?? d?.detail ?? t('thriftPage.billing.somethingWrong'));
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={t('thriftPage.org.approveModal.title')} size="lg">
      {request && (
        <div className="space-y-4">
          {/* Member summary */}
          <div className="rounded-xl bg-(--bg) border border-(--border) p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div><p className="text-(--text-muted) text-xs font-medium">{t('thriftPage.org.approveModal.member')}</p><p className="font-semibold text-(--text-primary) mt-0.5">{request.member_name}</p></div>
            <div><p className="text-(--text-muted) text-xs font-medium">{t('thriftPage.org.approveModal.group')}</p><p className="font-semibold text-(--text-primary) mt-0.5">{request.group_name}</p></div>
            <div><p className="text-(--text-muted) text-xs font-medium">{t('thriftPage.org.approveModal.contributionPerPeriod')}</p><p className="font-semibold text-(--text-primary) mt-0.5">{formatCurrency(request.personal_amount)}</p></div>
            <div><p className="text-(--text-muted) text-xs font-medium">{t('thriftPage.org.approveModal.totalSaved')}</p><p className="font-semibold text-(--text-primary) mt-0.5">{formatCurrency(request.total_saved)}</p></div>
          </div>

          {/* Payment summary */}
          <div>
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-2">{t('thriftPage.org.approveModal.paymentHistory')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-(--bg) border border-(--border) p-2">
                <p className="font-bold text-(--text-primary) text-base">{request.payment_summary.total}</p>
                <p className="text-(--text-muted) mt-0.5">{t('thriftPage.org.approveModal.total')}</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-2">
                <p className="font-bold text-green-700 text-base">{request.payment_summary.confirmed}</p>
                <p className="text-green-600 mt-0.5">{t('thriftPage.org.approveModal.confirmed')}</p>
              </div>
              <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2">
                <p className="font-bold text-yellow-700 text-base">{request.payment_summary.pending}</p>
                <p className="text-yellow-600 mt-0.5">{t('thriftPage.org.approveModal.pending')}</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-2">
                <p className="font-bold text-red-700 text-base">{request.payment_summary.disputed}</p>
                <p className="text-red-600 mt-0.5">{t('thriftPage.org.approveModal.disputed')}</p>
              </div>
            </div>
            <p className="text-sm text-(--text-secondary) mt-2">
              {t('thriftPage.org.approveModal.confirmedAmount')} <span className="font-semibold text-(--text-primary)">{formatCurrency(request.payment_summary.confirmed_amount)}</span>
            </p>
          </div>

          {/* Member's reason */}
          <div>
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">{t('thriftPage.org.approveModal.reasonForLeaving')}</p>
            <p className="text-sm text-(--text-primary) bg-(--bg) border border-(--border) rounded-lg px-3 py-2">{request.reason}</p>
          </div>

          {/* Settlement notes */}
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.org.approveModal.settlementNotesLabel')}</label>
            <p className="text-xs text-(--text-muted) mb-2">
              {t('thriftPage.org.approveModal.settlementNotesHint')}
            </p>
            <textarea
              rows={3}
              value={settlementNotes}
              onChange={e => { setSettlementNotes(e.target.value); setErr(''); }}
              placeholder={t('thriftPage.org.approveModal.settlementNotesPlaceholder')}
              className={inputCls}
            />
          </div>

          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>{t('common.cancel')}</button>
            <button
              type="button"
              disabled={!settlementNotes.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {mutation.isPending ? t('thriftPage.org.approveModal.approving') : t('thriftPage.org.approveModal.confirmButton')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ── Create Group Modal (org admin only) ──────────────────────────────────────

function CreateGroupModal({
  orgUuid, collectors, onClose,
}: {
  orgUuid: string;
  collectors: CollectorRecord[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '', description: '', frequency: 'monthly',
    cycle_type: 'rolling', start_date: '', end_date: '',
    collector_id: '',
  });
  const [err, setErr] = useState('');

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); setErr(''); }

  const activeCollectors = collectors.filter(c => c.status === 'active');

  const mutation = useMutation({
    mutationFn: () => api.post('/thrift/', {
      name: form.name.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      cycle_type: form.cycle_type,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      org_uuid: orgUuid,
      collector_id: Number(form.collector_id),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgUuid] });
      qc.invalidateQueries({ queryKey: ['thrift-groups'] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? t('thriftPage.createModal.errors.somethingWrong'))));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr(t('thriftPage.createModal.errors.nameRequired')); return; }
    if (!form.collector_id) { setErr(t('thriftPage.org.createGroupModal.selectCollectorError')); return; }
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
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.org.createGroupModal.collectorLabel')}</label>
            <select value={form.collector_id} onChange={e => set('collector_id', e.target.value)} className={inputCls}>
              <option value="">{t('thriftPage.org.createGroupModal.selectCollector')}</option>
              {activeCollectors.map(c => (
                <option key={c.id} value={c.id}>
                  {t('thriftPage.org.createGroupModal.collectorOption', { name: `${c.user.first_name} ${c.user.last_name}`, email: c.user.email })}
                </option>
              ))}
            </select>
            {activeCollectors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{t('thriftPage.org.createGroupModal.noActiveCollectors')}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.createModal.nameLabel')}</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder={t('thriftPage.createModal.namePlaceholder')} className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.createModal.payoutCycleLabel')}</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inputCls}>
                <option value="monthly">{t('thriftPage.createModal.monthly')}</option>
                <option value="yearly">{t('thriftPage.createModal.yearly')}</option>
              </select>
              <p className="text-xs text-(--text-muted) mt-1">{t('thriftPage.createModal.payoutCycleHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.createModal.cycleTypeLabel')}</label>
              <select value={form.cycle_type} onChange={e => set('cycle_type', e.target.value)} className={inputCls}>
                <option value="rolling">{t('thriftPage.createModal.rolling')}</option>
                <option value="fixed">{t('thriftPage.createModal.fixed')}</option>
              </select>
            </div>
          </div>

          {form.cycle_type === 'fixed' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.createModal.startDateLabel')}</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.createModal.endDateLabel')}</label>
                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.createModal.descriptionLabel')}</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('thriftPage.createModal.descriptionPlaceholder')} className={inputCls} />
          </div>

          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>{t('common.cancel')}</button>
            <button type="submit" disabled={mutation.isPending || activeCollectors.length === 0} className={submitBtn}>
              {mutation.isPending ? t('thriftPage.createModal.creating') : t('thriftPage.createModal.createGroup')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteModal({ open, onInvite, onClose, isPending }: {
  open: boolean;
  onInvite: (email: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) { setEmail(''); setErr(''); }
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={t('thriftPage.org.inviteModal.title')}>
      <div className="space-y-4">
        <p className="text-sm text-(--text-secondary)">
          {t('thriftPage.org.inviteModal.description')}
        </p>
        <div>
          <label htmlFor="org-invite-email" className="block text-sm font-semibold text-(--text-secondary) mb-1">{t('thriftPage.org.inviteModal.emailLabel')}</label>
          <input
            id="org-invite-email"
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setErr(''); }}
            placeholder={t('thriftPage.org.inviteModal.emailPlaceholder')}
            className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
          />
        </div>
        {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{err}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30"
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            disabled={!email.trim() || isPending}
            onClick={() => {
              if (!email.includes('@')) { setErr(t('thriftPage.org.inviteModal.invalidEmail')); return; }
              onInvite(email.trim());
            }}
            className="flex-1 rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
          >
            {isPending ? t('thriftPage.org.inviteModal.inviting') : t('thriftPage.org.inviteModal.sendInvite')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ThriftOrgPage() {
  const { t } = useTranslation();
  const { uuid: orgUuid = '' } = useParams<{ uuid: string }>();

  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [approveRemovalRequest, setApproveRemovalRequest] = useState<RemovalRequest | null>(null);
  const [removalFilter, setRemovalFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('all');
  const [reportsPage, setReportsPage] = useState(1);
  const [removalPage, setRemovalPage] = useState(1);

  useEffect(() => { setReportsPage(1); }, [reportFilter]);
  useEffect(() => { setRemovalPage(1); }, [removalFilter]);

  const { data, isLoading, error } = useQuery<OrgDashboard>({
    queryKey: ['thrift-org', orgUuid],
    queryFn: () => api.get(`/thrift/orgs/${orgUuid}/dashboard/`).then(r => r.data),
    enabled: !!orgUuid,
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery<PaginatedReports>({
    queryKey: ['thrift-org-reports', orgUuid, reportFilter, reportsPage],
    queryFn: () => api.get(`/thrift/orgs/${orgUuid}/reports/`, {
      params: { page: reportsPage, ...(reportFilter !== 'all' ? { status: reportFilter } : {}) },
    }).then(r => r.data),
    enabled: !!orgUuid && !!data,
  });
  const allReports = reportsData?.results ?? [];
  const reportsTotalCount = reportsData?.count ?? 0;
  const reportsTotalPages = Math.max(1, Math.ceil(reportsTotalCount / 20));

  // Independent of reportFilter/reportsPage -- the header badge always wants
  // the true system-wide pending count, not "pending items on this page" or
  // "pending items matching whatever filter tab happens to be selected".
  const { data: pendingReportsData } = useQuery<PaginatedReports>({
    queryKey: ['thrift-org-reports-pending-count', orgUuid],
    queryFn: () => api.get(`/thrift/orgs/${orgUuid}/reports/`, { params: { page: 1, status: 'pending' } }).then(r => r.data),
    enabled: !!orgUuid && !!data,
  });
  const pendingReportsCount = pendingReportsData?.count ?? 0;

  const { data: removalData, isLoading: removalLoading } = useQuery<PaginatedRemovalRequests>({
    queryKey: ['thrift-org-removal-requests', orgUuid, removalFilter, removalPage],
    queryFn: () => api.get(`/thrift/orgs/${orgUuid}/removal-requests/`, {
      params: { page: removalPage, status: removalFilter },
    }).then(r => r.data),
    enabled: !!orgUuid && !!data,
  });
  const removalRequests = removalData?.results ?? [];
  const removalTotalCount = removalData?.count ?? 0;
  const removalTotalPages = Math.max(1, Math.ceil(removalTotalCount / 20));

  const rejectRemovalMutation = useMutation({
    mutationFn: ({ requestId, reason }: { requestId: number; reason: string }) =>
      api.patch(`/thrift/orgs/${orgUuid}/removal-requests/${requestId}/`, { action: 'reject', reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thrift-org-removal-requests', orgUuid] }),
  });

  const collectorActionMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: string }) =>
      api.patch(`/thrift/orgs/${orgUuid}/members/${memberId}/`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgUuid] });
    },
    onError: (e: any, vars) => {
      setActionError(prev => ({
        ...prev,
        [vars.memberId]: e.response?.data?.detail ?? t('thriftPage.createModal.errors.somethingWrong'),
      }));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/thrift/orgs/${orgUuid}/members/`, { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgUuid] });
      setShowInvite(false);
    },
  });

  const reportActionMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: number; action: 'resolve' | 'dismiss' | 'review' }) =>
      api.patch(`/thrift/orgs/${orgUuid}/reports/${reportId}/`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgUuid] });
      qc.invalidateQueries({ queryKey: ['thrift-org-reports', orgUuid] });
      qc.invalidateQueries({ queryKey: ['thrift-org-reports-pending-count', orgUuid] });
    },
  });

  if (isLoading) return <OrgSkeleton />;

  if (error || !data) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
        {t('thriftPage.org.notFound')}
      </div>
    );
  }

  const { organization: org, collectors, pending_collectors, groups, payment_stats, collector_stats = {} } = data;
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="surface-soft p-6">
        <div className="flex items-start gap-3 flex-wrap justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-(--text-primary)">{org.name}</h1>
              <OrgTypeBadge type={org.org_type} />
              {org.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-full px-2.5 py-0.5">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  {t('thriftPage.org.verified')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => exportCSV(data, t as unknown as TFn)}
              className="text-xs font-semibold text-(--text-secondary) bg-(--bg) border border-(--border) rounded-lg px-3 py-1.5 hover:bg-(--primary-tint)/30"
            >
              {t('thriftPage.org.exportCsv')}
            </button>
            <Link
              to={`/org/${orgUuid}/billing`}
              className="text-xs font-semibold text-(--primary-dark) bg-(--primary-tint) border border-(--primary)/30 rounded-lg px-3 py-1.5 hover:bg-(--primary-light)/30 transition-colors"
            >
              {t('thriftPage.org.billing')}
            </Link>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="text-xs font-semibold text-white bg-(--primary) rounded-lg px-3 py-1.5 hover:bg-(--primary-dark) hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
            >
              {t('thriftPage.org.inviteCollector')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('thriftPage.org.statCards.totalCollectors')} value={collectors.length} delay={0} />
        <StatCard label={t('thriftPage.org.statCards.activeGroups')} value={groups.length} delay={40} />
        <StatCard label={t('thriftPage.org.statCards.totalMembers')} value={totalMembers} delay={80} />
        <StatCard label={t('thriftPage.org.statCards.totalCollected')} value={formatCurrency(payment_stats.total_collected)} delay={120} />
      </div>

      {/* ── Pending Collector Approvals ── */}
      {pending_collectors.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-(--text-primary)">
            {t('thriftPage.org.pendingApprovals.title')}
            <span className="ml-2 text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {pending_collectors.length}
            </span>
          </h2>
          <Table
            columns={[
              { key: 'user_name', header: t('thriftPage.org.pendingApprovals.headers.name'), render: (_, row) => fullName(row.user as OrgUser) },
              { key: 'user_email', header: t('thriftPage.org.pendingApprovals.headers.email'), render: (_, row) => (row.user as OrgUser).email },
              {
                key: 'id',
                header: t('thriftPage.org.pendingApprovals.headers.actions'),
                render: (id) => {
                  const memberId = id as number;
                  return (
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={collectorActionMutation.isPending}
                        onClick={() => collectorActionMutation.mutate({ memberId, action: 'approve' })}
                        className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {t('thriftPage.org.pendingApprovals.approve')}
                      </button>
                      <button
                        type="button"
                        disabled={collectorActionMutation.isPending}
                        onClick={() => collectorActionMutation.mutate({ memberId, action: 'reject' })}
                        className="text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {t('thriftPage.org.pendingApprovals.reject')}
                      </button>
                      {actionError[memberId] && (
                        <p className="text-xs text-red-600">{actionError[memberId]}</p>
                      )}
                    </div>
                  );
                },
              },
            ]}
            data={pending_collectors as unknown as Record<string, unknown>[]}
          />
        </div>
      )}

      {/* ── Collectors ── */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-(--text-primary)">{t('thriftPage.org.collectors.title')}</h2>
        <Table
          columns={[
            { key: 'user', header: t('thriftPage.org.collectors.headers.name'), render: (v) => fullName(v as OrgUser) },
            { key: 'status', header: t('thriftPage.org.collectors.headers.status'), render: (v) => <CollectorStatusBadge status={v as string} /> },
            {
              key: 'mobilization',
              header: t('thriftPage.org.collectors.headers.mobilization'),
              render: (_, row) => {
                const stats = collector_stats[String(row.id)];
                return stats?.mobilization_rate != null ? `${stats.mobilization_rate.toFixed(0)}%` : '—';
              },
            },
            {
              key: 'dispute_rate',
              header: t('thriftPage.org.collectors.headers.disputeRate'),
              render: (_, row) => {
                const stats = collector_stats[String(row.id)];
                return stats?.dispute_rate != null ? `${stats.dispute_rate.toFixed(1)}%` : '—';
              },
            },
            {
              key: 'collector_actions',
              header: t('thriftPage.org.collectors.headers.actions'),
              render: (_, row) => {
                const c = row as unknown as CollectorRecord;
                return (
                  <div className="flex gap-2 flex-wrap">
                    {c.status === 'active' ? (
                      <>
                        <button
                          type="button"
                          disabled={collectorActionMutation.isPending}
                          onClick={() => collectorActionMutation.mutate({ memberId: c.id, action: 'suspend' })}
                          className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                        >
                          {t('thriftPage.org.collectors.suspend')}
                        </button>
                        <button
                          type="button"
                          disabled={collectorActionMutation.isPending}
                          onClick={() => { if (confirm(t('thriftPage.org.collectors.removeConfirm', { name: fullName(c.user) }))) collectorActionMutation.mutate({ memberId: c.id, action: 'remove' }); }}
                          className="text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {t('thriftPage.org.collectors.remove')}
                        </button>
                      </>
                    ) : c.status === 'suspended' ? (
                      <>
                        <button
                          type="button"
                          disabled={collectorActionMutation.isPending}
                          onClick={() => collectorActionMutation.mutate({ memberId: c.id, action: 'activate' })}
                          className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          {t('thriftPage.org.collectors.activate')}
                        </button>
                        <button
                          type="button"
                          disabled={collectorActionMutation.isPending}
                          onClick={() => { if (confirm(t('thriftPage.org.collectors.removeConfirm', { name: fullName(c.user) }))) collectorActionMutation.mutate({ memberId: c.id, action: 'remove' }); }}
                          className="text-xs font-semibold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          {t('thriftPage.org.collectors.remove')}
                        </button>
                      </>
                    ) : null}
                    {actionError[c.id] && (
                      <p role="alert" className="text-xs text-red-600">{actionError[c.id]}</p>
                    )}
                  </div>
                );
              },
            },
          ]}
          data={collectors as unknown as Record<string, unknown>[]}
          emptyMessage={t('thriftPage.org.collectors.noneYet')}
        />
      </div>

      {/* ── Groups ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-(--text-primary)">{t('thriftPage.org.groups.title')}</h2>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm transition-all duration-150 active:scale-[0.97]"
          >
            {t('thriftPage.org.groups.createGroup')}
          </button>
        </div>
        <Table
          columns={[
            {
              key: 'name',
              header: t('thriftPage.org.groups.headers.name'),
              render: (v, row) => (
                <Link to={`/org/${orgUuid}/groups/${row.uuid as string}`} className="text-(--primary) hover:underline font-medium">
                  {v as string}
                </Link>
              ),
            },
            { key: 'frequency', header: t('thriftPage.org.groups.headers.payoutCycle'), render: (v) => <span className="capitalize">{v as string}</span> },
            { key: 'member_count', header: t('thriftPage.org.groups.headers.members') },
            {
              key: 'collector',
              header: t('thriftPage.org.groups.headers.collector'),
              render: (v) => (v ? fullName(v as OrgUser) : '—'),
            },
          ]}
          data={groups as unknown as Record<string, unknown>[]}
          emptyMessage={t('thriftPage.org.groups.noneYet')}
        />
      </div>

      {/* ── Payment Stats ── */}
      <div className="surface-soft p-5">
        <h2 className="text-base font-bold text-(--text-primary) mb-4">{t('thriftPage.org.paymentSummary.title')}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider font-semibold">{t('thriftPage.org.paymentSummary.total')}</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">{t('thriftPage.org.paymentSummary.confirmed')}</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.confirmed}</p>
          </div>
          <div>
            <p className="text-xs text-yellow-600 uppercase tracking-wider font-semibold">{t('thriftPage.org.paymentSummary.pending')}</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.pending}</p>
          </div>
          <div>
            <p className="text-xs text-red-600 uppercase tracking-wider font-semibold">{t('thriftPage.org.paymentSummary.disputed')}</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.disputed}</p>
          </div>
          {payment_stats.savings_mobilization != null && (
            <div>
              <p className="text-xs text-(--primary) uppercase tracking-wider font-semibold">{t('thriftPage.org.paymentSummary.mobilization')}</p>
              <p className="text-xl font-bold text-(--text-primary) mt-0.5">
                {payment_stats.savings_mobilization.toFixed(0)}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Reports (full list from dedicated endpoint) ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-(--text-primary)">
            {t('thriftPage.org.reports.title')}
            {pendingReportsCount > 0 && (
              <span className="ml-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {t('thriftPage.org.reports.pendingBadge', { count: pendingReportsCount })}
              </span>
            )}
          </h2>
          {/* Status filter tabs */}
          <div className="flex gap-1 flex-wrap">
            {(['all', 'pending', 'reviewed', 'resolved', 'dismissed'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setReportFilter(f)}
                className={clsx(
                  'text-xs font-semibold px-3 py-1 rounded-full transition-colors capitalize',
                  reportFilter === f
                    ? 'bg-(--accent) text-white'
                    : 'bg-(--bg) surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:border-(--primary)/40 hover:text-(--primary)',
                )}
              >
                {t(`thriftPage.statusValues.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {reportsLoading ? (
          <div className="text-sm text-(--text-secondary) py-4 text-center">{t('thriftPage.org.reports.loading')}</div>
        ) : allReports.length === 0 ? (
          <div className="bg-(--surface) rounded-xl border border-(--border) px-6 py-8 text-center text-sm text-(--text-secondary)">
            {t('thriftPage.org.reports.noneFound', { filter: reportFilter !== 'all' ? t(`thriftPage.statusValues.${reportFilter}`) : '' })}
          </div>
        ) : (
          <div className="space-y-3">
            {allReports.map(report => (
              <div key={report.id} className="surface-soft p-4 space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-(--text-primary)">
                        {t('thriftPage.org.reports.against', { name: report.collector_name })}
                      </p>
                      <ReportStatusBadge status={report.status} />
                    </div>
                    <p className="text-xs text-(--text-secondary)">
                      {t('thriftPage.org.reports.by', { name: report.reporter_name, date: fmt(report.created_at) })}
                    </p>
                    <p className="text-xs text-(--text-secondary) mt-1">{report.reason}</p>
                  </div>

                  {report.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'review' })}
                        className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {t('thriftPage.org.reports.markReviewed')}
                      </button>
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'resolve' })}
                        className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {t('thriftPage.org.reports.resolve')}
                      </button>
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'dismiss' })}
                        className="text-xs font-semibold text-(--text-secondary) bg-(--bg) border border-(--border) rounded-lg px-2.5 py-1 hover:bg-(--primary-tint)/30 disabled:opacity-50"
                      >
                        {t('thriftPage.org.reports.dismiss')}
                      </button>
                    </div>
                  )}
                  {report.status === 'reviewed' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'resolve' })}
                        className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        {t('thriftPage.org.reports.resolve')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination page={reportsPage} totalPages={reportsTotalPages} totalCount={reportsTotalCount} pageSize={20} onChange={setReportsPage} />
      </div>

      {/* ── Removal Requests ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-(--text-primary)">
            {t('thriftPage.org.removals.title')}
            {removalTotalCount > 0 && removalFilter === 'pending' && (
              <span className="ml-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {t('thriftPage.org.removals.pendingBadge', { count: removalTotalCount })}
              </span>
            )}
          </h2>
          <div className="flex gap-1 flex-wrap">
            {(['pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setRemovalFilter(f)}
                className={clsx(
                  'text-xs font-semibold px-3 py-1 rounded-full transition-colors capitalize',
                  removalFilter === f
                    ? 'bg-(--accent) text-white'
                    : 'bg-(--bg) surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:border-(--primary)/40 hover:text-(--primary)',
                )}
              >
                {t(`thriftPage.statusValues.${f}`)}
              </button>
            ))}
          </div>
        </div>

        {removalLoading ? (
          <div className="text-sm text-(--text-secondary) py-4 text-center">{t('thriftPage.org.removals.loading')}</div>
        ) : removalRequests.length === 0 ? (
          <div className="bg-(--surface) rounded-xl border border-(--border) px-6 py-8 text-center text-sm text-(--text-secondary)">
            {t('thriftPage.org.removals.noneFound', { filter: t(`thriftPage.statusValues.${removalFilter}`) })}
          </div>
        ) : (
          <div className="space-y-3">
            {removalRequests.map(req => (
              <div key={req.id} className="surface-soft p-4 space-y-3">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-(--text-primary)">{req.member_name}</p>
                    <p className="text-xs text-(--text-secondary) mt-0.5">{req.member_email} · {req.group_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize',
                      req.status === 'approved' ? 'bg-green-100 text-green-700'
                      : req.status === 'rejected' ? 'bg-(--bg) text-(--text-secondary)'
                      : 'bg-yellow-100 text-yellow-700',
                    )}>
                      {t(`thriftPage.statusValues.${req.status}`, { defaultValue: req.status })}
                    </span>
                  </div>
                </div>

                {/* Payment mini-stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-(--bg) border border-(--border) p-2">
                    <p className="font-bold text-(--text-primary)">{req.payment_summary.total}</p>
                    <p className="text-(--text-muted)">{t('thriftPage.org.removals.total')}</p>
                  </div>
                  <div className="rounded-lg bg-green-50 border border-green-100 p-2">
                    <p className="font-bold text-green-700">{req.payment_summary.confirmed}</p>
                    <p className="text-green-600">{t('thriftPage.org.removals.confirmed')}</p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2">
                    <p className="font-bold text-yellow-700">{req.payment_summary.pending}</p>
                    <p className="text-yellow-600">{t('thriftPage.org.removals.pending')}</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-2">
                    <p className="font-bold text-red-700">{req.payment_summary.disputed}</p>
                    <p className="text-red-600">{t('thriftPage.org.removals.disputed')}</p>
                  </div>
                </div>

                <div className="text-sm text-(--text-secondary)">
                  {t('thriftPage.org.removals.savedLabel')} <span className="font-semibold text-(--text-primary)">{formatCurrency(req.total_saved)}</span>
                  <span className="mx-2">·</span>
                  {t('thriftPage.org.removals.contributionLabel')} <span className="font-semibold text-(--text-primary)">{formatCurrency(req.personal_amount)}{t('thriftPage.org.removals.perPeriod')}</span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">{t('thriftPage.org.removals.membersReason')}</p>
                  <p className="text-sm text-(--text-primary) bg-(--bg) border border-(--border) rounded-lg px-3 py-2">{req.reason}</p>
                </div>

                {req.settlement_notes && (
                  <div>
                    <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">
                      {req.status === 'approved' ? t('thriftPage.org.removals.settlementNotes') : t('thriftPage.org.removals.rejectionReason')}
                    </p>
                    <p className="text-sm text-(--text-primary) bg-(--bg) border border-(--border) rounded-lg px-3 py-2">{req.settlement_notes}</p>
                  </div>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setApproveRemovalRequest(req)}
                      className="text-xs font-semibold text-(--primary-dark) bg-(--primary-tint) border border-(--primary)/30 rounded-lg px-3 py-1.5 hover:bg-(--primary-light)/30 transition-colors"
                    >
                      {t('thriftPage.org.removals.reviewApprove')}
                    </button>
                    <button
                      type="button"
                      disabled={rejectRemovalMutation.isPending}
                      onClick={() => {
                        const reason = prompt(t('thriftPage.org.removals.rejectPrompt')) ?? '';
                        rejectRemovalMutation.mutate({ requestId: req.id, reason });
                      }}
                      className="text-xs font-semibold text-(--text-secondary) bg-(--bg) border border-(--border) rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                      {t('thriftPage.org.removals.reject')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <Pagination page={removalPage} totalPages={removalTotalPages} totalCount={removalTotalCount} pageSize={20} onChange={setRemovalPage} />
      </div>

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal
          orgUuid={orgUuid}
          collectors={collectors}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
      <ApproveRemovalModal
        open={approveRemovalRequest !== null}
        orgUuid={orgUuid}
        request={approveRemovalRequest}
        onClose={() => setApproveRemovalRequest(null)}
      />
      <InviteModal
        open={showInvite}
        isPending={inviteMutation.isPending}
        onClose={() => setShowInvite(false)}
        onInvite={email => inviteMutation.mutate(email)}
      />
    </div>
  );
}
