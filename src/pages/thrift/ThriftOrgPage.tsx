import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../components/ui/Skeleton';
import api from '../../services/api';

// ── Shared styles ────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
const submitBtn = 'flex-1 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

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
  const labels: Record<string, string> = {
    mfb: 'MFB',
    bank: 'Bank',
    cooperative: 'Cooperative',
    other: 'Other',
  };
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200 capitalize">
      {labels[type] ?? type}
    </span>
  );
}

function CollectorStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
      status === 'active' ? 'bg-green-100 text-green-700'
      : status === 'suspended' ? 'bg-(--bg) text-(--text-secondary)'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status}
    </span>
  );
}

function ReportStatusBadge({ status }: { status: OrgReport['status'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize',
      status === 'resolved' ? 'bg-green-100 text-green-700'
      : status === 'dismissed' ? 'bg-(--bg) text-(--text-secondary)'
      : status === 'reviewed' ? 'bg-blue-100 text-blue-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status}
    </span>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5">
      <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-(--text-primary) mt-1">{value}</p>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportCSV(data: OrgDashboard) {
  const rows: string[][] = [];

  rows.push(['=== ORGANISATION SUMMARY ===']);
  rows.push(['Name', data.organization.name]);
  rows.push(['Type', data.organization.org_type]);
  rows.push(['Verified', data.organization.is_verified ? 'Yes' : 'No']);
  rows.push([]);
  rows.push(['=== PAYMENT STATS ===']);
  rows.push(['Total', String(data.payment_stats.total)]);
  rows.push(['Confirmed', String(data.payment_stats.confirmed)]);
  rows.push(['Disputed', String(data.payment_stats.disputed)]);
  rows.push(['Pending', String(data.payment_stats.pending)]);
  rows.push(['Total Collected (NGN)', String(data.payment_stats.total_collected)]);
  rows.push(['Savings Mobilization (%)', String(data.payment_stats.savings_mobilization)]);
  rows.push([]);
  rows.push(['=== COLLECTORS ===']);
  rows.push(['Name', 'Email', 'Status', 'Mobilization Rate (%)', 'Dispute Rate (%)', 'Total Amount', 'Confirmed Amount']);
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
  rows.push(['=== GROUPS ===']);
  rows.push(['Group Name', 'Payout Cycle', 'Members', 'Collector']);
  for (const g of data.groups) {
    rows.push([
      g.name, g.frequency, String(g.member_count),
      g.collector ? `${g.collector.first_name} ${g.collector.last_name}` : 'Unassigned',
    ]);
  }
  rows.push([]);
  rows.push(['=== RECENT REPORTS ===']);
  rows.push(['Reporter', 'Collector', 'Reason', 'Status', 'Date']);
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
      <div className="bg-(--surface) rounded-xl border border-(--border) p-6 space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-(--surface) rounded-xl border border-(--border) p-5 space-y-2">
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
  orgUuid, request, onClose,
}: { orgUuid: number; request: RemovalRequest; onClose: () => void }) {
  const qc = useQueryClient();
  const [settlementNotes, setSettlementNotes] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/thrift/orgs/${orgUuid}/removal-requests/${request.id}/`, {
      action: 'approve',
      settlement_notes: settlementNotes.trim(),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org-removal-requests', orgUuid] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.settlement_notes?.[0] ?? d?.detail ?? 'Something went wrong.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface) z-10">
          <h2 className="text-lg font-bold text-(--text-primary)">Approve Removal</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Member summary */}
          <div className="rounded-xl bg-(--bg) border border-(--border) p-4 grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-(--text-muted) text-xs font-medium">Member</p><p className="font-semibold text-(--text-primary) mt-0.5">{request.member_name}</p></div>
            <div><p className="text-(--text-muted) text-xs font-medium">Group</p><p className="font-semibold text-(--text-primary) mt-0.5">{request.group_name}</p></div>
            <div><p className="text-(--text-muted) text-xs font-medium">Contribution / period</p><p className="font-semibold text-(--text-primary) mt-0.5">{formatCurrency(request.personal_amount)}</p></div>
            <div><p className="text-(--text-muted) text-xs font-medium">Total saved</p><p className="font-semibold text-(--text-primary) mt-0.5">{formatCurrency(request.total_saved)}</p></div>
          </div>

          {/* Payment summary */}
          <div>
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-2">Payment history</p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded-lg bg-(--bg) border border-(--border) p-2">
                <p className="font-bold text-(--text-primary) text-base">{request.payment_summary.total}</p>
                <p className="text-(--text-muted) mt-0.5">Total</p>
              </div>
              <div className="rounded-lg bg-green-50 border border-green-100 p-2">
                <p className="font-bold text-green-700 text-base">{request.payment_summary.confirmed}</p>
                <p className="text-green-600 mt-0.5">Confirmed</p>
              </div>
              <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2">
                <p className="font-bold text-yellow-700 text-base">{request.payment_summary.pending}</p>
                <p className="text-yellow-600 mt-0.5">Pending</p>
              </div>
              <div className="rounded-lg bg-red-50 border border-red-100 p-2">
                <p className="font-bold text-red-700 text-base">{request.payment_summary.disputed}</p>
                <p className="text-red-600 mt-0.5">Disputed</p>
              </div>
            </div>
            <p className="text-sm text-(--text-secondary) mt-2">
              Confirmed amount: <span className="font-semibold text-(--text-primary)">{formatCurrency(request.payment_summary.confirmed_amount)}</span>
            </p>
          </div>

          {/* Member's reason */}
          <div>
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">Reason for leaving</p>
            <p className="text-sm text-(--text-primary) bg-(--bg) border border-(--border) rounded-lg px-3 py-2">{request.reason}</p>
          </div>

          {/* Settlement notes */}
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Settlement notes *</label>
            <p className="text-xs text-(--text-muted) mb-2">
              Describe what was settled before approving: outstanding amounts refunded or forfeited, disputes resolved, any financial adjustments made.
            </p>
            <textarea
              rows={3}
              value={settlementNotes}
              onChange={e => { setSettlementNotes(e.target.value); setErr(''); }}
              placeholder="e.g. All 6 confirmed payments are on record. ₦5,000 outstanding refunded on 2024-01-15. No active disputes."
              className={inputCls}
            />
          </div>

          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!settlementNotes.trim() || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="flex-1 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Approving…' : 'Confirm & Remove Member'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Group Modal (org admin only) ──────────────────────────────────────

function CreateGroupModal({
  orgUuid, collectors, onClose,
}: {
  orgUuid: number;
  collectors: CollectorRecord[];
  onClose: () => void;
}) {
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
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setErr('Group name is required.'); return; }
    if (!form.collector_id) { setErr('Select a collector for this group.'); return; }
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
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Collector *</label>
            <select value={form.collector_id} onChange={e => set('collector_id', e.target.value)} className={inputCls}>
              <option value="">Select a collector…</option>
              {activeCollectors.map(c => (
                <option key={c.id} value={c.id}>{c.user.first_name} {c.user.last_name} — {c.user.email}</option>
              ))}
            </select>
            {activeCollectors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No active collectors in this organisation. Invite and activate a collector first.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Group Name *</label>
            <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Apapa Market Monthly Thrift" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Payout Cycle *</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className={inputCls}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
              <p className="text-xs text-(--text-muted) mt-1">Members contribute daily; this is when the pot pays out and a new cycle starts.</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Cycle Type *</label>
              <select value={form.cycle_type} onChange={e => set('cycle_type', e.target.value)} className={inputCls}>
                <option value="rolling">Rolling / Open-ended</option>
                <option value="fixed">Fixed Cycle</option>
              </select>
            </div>
          </div>

          {form.cycle_type === 'fixed' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Start Date *</label>
                <input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-(--text-secondary) mb-1">End Date *</label>
                <input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className={inputCls} />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Description (optional)</label>
            <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} placeholder="What is this group for?" className={inputCls} />
          </div>

          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending || activeCollectors.length === 0} className={submitBtn}>
              {mutation.isPending ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InviteModal({ onInvite, onClose, isPending }: {
  onInvite: (email: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Invite Collector</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">
            Enter the email address of the collector you want to invite. They'll receive an email with an invite link.
          </p>
          <div>
            <label htmlFor="org-invite-email" className="block text-sm font-semibold text-(--text-secondary) mb-1">Email address *</label>
            <input
              id="org-invite-email"
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(''); }}
              placeholder="collector@example.com"
              className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!email.trim() || isPending}
              onClick={() => {
                if (!email.includes('@')) { setErr('Enter a valid email address.'); return; }
                onInvite(email.trim());
              }}
              className="flex-1 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Inviting…' : 'Send Invite'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ThriftOrgPage() {
  const { uuid: orgUuid } = useParams<{ uuid: string }>();
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [approveRemovalRequest, setApproveRemovalRequest] = useState<RemovalRequest | null>(null);
  const [removalFilter, setRemovalFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [reportFilter, setReportFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved' | 'dismissed'>('all');

  const { data, isLoading, error } = useQuery<OrgDashboard>({
    queryKey: ['thrift-org', orgUuid],
    queryFn: () => api.get(`/thrift/orgs/${orgUuid}/dashboard/`).then(r => r.data),
    enabled: !!orgUuid,
  });

  const { data: allReports = [], isLoading: reportsLoading } = useQuery<OrgReport[]>({
    queryKey: ['thrift-org-reports', orgUuid, reportFilter],
    queryFn: () => {
      const params = reportFilter !== 'all' ? `?status=${reportFilter}` : '';
      return api.get(`/thrift/orgs/${orgUuid}/reports/${params}`).then(r => r.data);
    },
    enabled: !!orgUuid && !!data,
  });

  const { data: removalRequests = [], isLoading: removalLoading } = useQuery<RemovalRequest[]>({
    queryKey: ['thrift-org-removal-requests', orgUuid, removalFilter],
    queryFn: () => api.get(`/thrift/orgs/${orgUuid}/removal-requests/?status=${removalFilter}`).then(r => r.data),
    enabled: !!orgUuid && !!data,
  });

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
        [vars.memberId]: e.response?.data?.detail ?? 'Something went wrong.',
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
    },
  });

  if (isLoading) return <OrgSkeleton />;

  if (error || !data) {
    return (
      <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Organisation not found or you do not have access.
      </div>
    );
  }

  const { organization: org, collectors, pending_collectors, groups, payment_stats, collector_stats = {} } = data;
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <div className="flex items-start gap-3 flex-wrap justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-(--text-primary)">{org.name}</h1>
              <OrgTypeBadge type={org.org_type} />
              {org.is_verified && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                  <CheckBadgeIcon className="h-3.5 w-3.5" />
                  Verified
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => exportCSV(data)}
              className="text-xs font-semibold text-(--text-secondary) bg-(--bg) border border-(--border) rounded-lg px-3 py-1.5 hover:bg-(--primary-tint)/30 transition-colors"
            >
              Export CSV
            </button>
            <Link
              to={`/org/${orgUuid}/billing`}
              className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-100 transition-colors"
            >
              Billing
            </Link>
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="text-xs font-semibold text-white bg-teal-600 rounded-lg px-3 py-1.5 hover:bg-teal-700 transition-colors"
            >
              Invite Collector
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Collectors" value={collectors.length} />
        <StatCard label="Active Groups" value={groups.length} />
        <StatCard label="Total Members" value={totalMembers} />
        <StatCard label="Total Collected" value={formatCurrency(payment_stats.total_collected)} />
      </div>

      {/* ── Pending Collector Approvals ── */}
      {pending_collectors.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-(--text-primary)">
            Pending Collector Approvals
            <span className="ml-2 text-xs font-semibold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
              {pending_collectors.length}
            </span>
          </h2>
          <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-(--border)">
                <thead className="bg-(--bg)">
                  <tr>
                    {['Name', 'Email', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {pending_collectors.map(c => (
                    <tr key={c.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{fullName(c.user)}</td>
                      <td className="px-6 py-4 text-sm text-(--text-secondary)">{c.user.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            disabled={collectorActionMutation.isPending}
                            onClick={() => collectorActionMutation.mutate({ memberId: c.id, action: 'approve' })}
                            className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={collectorActionMutation.isPending}
                            onClick={() => collectorActionMutation.mutate({ memberId: c.id, action: 'reject' })}
                            className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          {actionError[c.id] && (
                            <p className="text-xs text-red-600">{actionError[c.id]}</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Collectors ── */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-(--text-primary)">Collectors</h2>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Name', 'Status', 'Mobilization', 'Dispute Rate', 'Actions'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {collectors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                      No active collectors yet.
                    </td>
                  </tr>
                ) : (
                  collectors.map(c => {
                    const stats = collector_stats[String(c.id)];
                    return (
                      <tr key={c.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{fullName(c.user)}</td>
                        <td className="px-6 py-4"><CollectorStatusBadge status={c.status} /></td>
                        <td className="px-6 py-4 text-sm text-(--text-secondary)">
                          {stats?.mobilization_rate != null ? `${stats.mobilization_rate.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-(--text-secondary)">
                          {stats?.dispute_rate != null ? `${stats.dispute_rate.toFixed(1)}%` : '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            {c.status === 'active' ? (
                              <>
                                <button
                                  type="button"
                                  disabled={collectorActionMutation.isPending}
                                  onClick={() => collectorActionMutation.mutate({ memberId: c.id, action: 'suspend' })}
                                  className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-2.5 py-1 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                                >
                                  Suspend
                                </button>
                                <button
                                  type="button"
                                  disabled={collectorActionMutation.isPending}
                                  onClick={() => { if (confirm(`Remove ${fullName(c.user)} from this organisation?`)) collectorActionMutation.mutate({ memberId: c.id, action: 'remove' }); }}
                                  className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </>
                            ) : c.status === 'suspended' ? (
                              <>
                                <button
                                  type="button"
                                  disabled={collectorActionMutation.isPending}
                                  onClick={() => collectorActionMutation.mutate({ memberId: c.id, action: 'activate' })}
                                  className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                                >
                                  Activate
                                </button>
                                <button
                                  type="button"
                                  disabled={collectorActionMutation.isPending}
                                  onClick={() => { if (confirm(`Remove ${fullName(c.user)} from this organisation?`)) collectorActionMutation.mutate({ memberId: c.id, action: 'remove' }); }}
                                  className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              </>
                            ) : null}
                            {actionError[c.id] && (
                              <p role="alert" className="text-xs text-red-600">{actionError[c.id]}</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Groups ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-(--text-primary)">Groups</h2>
          <button
            type="button"
            onClick={() => setShowCreateGroup(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 transition-colors"
          >
            + Create Group
          </button>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Name', 'Payout Cycle', 'Members', 'Collector'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                      No groups yet.
                    </td>
                  </tr>
                ) : (
                  groups.map(g => (
                    <tr key={g.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium">
                        <Link to={`/org/${orgUuid}/groups/${g.uuid}`} className="text-teal-600 hover:underline cursor-pointer">
                          {g.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-(--text-secondary) capitalize">{g.frequency}</td>
                      <td className="px-6 py-4 text-sm text-(--text-primary) font-medium">{g.member_count}</td>
                      <td className="px-6 py-4 text-sm text-(--text-secondary)">
                        {g.collector ? fullName(g.collector) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Payment Stats ── */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5">
        <h2 className="text-base font-bold text-(--text-primary) mb-4">Payment Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-xs text-(--text-secondary) uppercase tracking-wider font-semibold">Total</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">Confirmed</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.confirmed}</p>
          </div>
          <div>
            <p className="text-xs text-yellow-600 uppercase tracking-wider font-semibold">Pending</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.pending}</p>
          </div>
          <div>
            <p className="text-xs text-red-600 uppercase tracking-wider font-semibold">Disputed</p>
            <p className="text-xl font-bold text-(--text-primary) mt-0.5">{payment_stats.disputed}</p>
          </div>
          {payment_stats.savings_mobilization != null && (
            <div>
              <p className="text-xs text-teal-600 uppercase tracking-wider font-semibold">Mobilization</p>
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
            Reports
            {allReports.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {allReports.filter(r => r.status === 'pending').length} pending
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
                    ? 'bg-teal-600 text-white'
                    : 'bg-(--bg) border border-(--border) text-(--text-secondary) hover:border-teal-300 hover:text-teal-600',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {reportsLoading ? (
          <div className="text-sm text-(--text-secondary) py-4 text-center">Loading reports…</div>
        ) : allReports.length === 0 ? (
          <div className="bg-(--surface) rounded-xl border border-(--border) px-6 py-8 text-center text-sm text-(--text-secondary)">
            No {reportFilter !== 'all' ? reportFilter : ''} reports found.
          </div>
        ) : (
          <div className="space-y-3">
            {allReports.map(report => (
              <div key={report.id} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4 space-y-2">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-(--text-primary)">
                        Against: {report.collector_name}
                      </p>
                      <ReportStatusBadge status={report.status} />
                    </div>
                    <p className="text-xs text-(--text-secondary)">
                      By: {report.reporter_name} · {fmt(report.created_at)}
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
                        Mark Reviewed
                      </button>
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'resolve' })}
                        className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        Resolve
                      </button>
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'dismiss' })}
                        className="text-xs font-semibold text-(--text-secondary) bg-(--bg) border border-(--border) rounded-lg px-2.5 py-1 hover:bg-(--primary-tint)/30 transition-colors disabled:opacity-50"
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                  {report.status === 'reviewed' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        disabled={reportActionMutation.isPending}
                        onClick={() => reportActionMutation.mutate({ reportId: report.id, action: 'resolve' })}
                        className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        Resolve
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Removal Requests ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-bold text-(--text-primary)">
            Removal Requests
            {removalRequests.filter(r => r.status === 'pending').length > 0 && removalFilter === 'pending' && (
              <span className="ml-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                {removalRequests.length} pending
              </span>
            )}
          </h2>
          <div className="flex gap-1">
            {(['pending', 'approved', 'rejected'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setRemovalFilter(f)}
                className={clsx(
                  'text-xs font-semibold px-3 py-1 rounded-full transition-colors capitalize',
                  removalFilter === f
                    ? 'bg-teal-600 text-white'
                    : 'bg-(--bg) border border-(--border) text-(--text-secondary) hover:border-teal-300 hover:text-teal-600',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {removalLoading ? (
          <div className="text-sm text-(--text-secondary) py-4 text-center">Loading…</div>
        ) : removalRequests.length === 0 ? (
          <div className="bg-(--surface) rounded-xl border border-(--border) px-6 py-8 text-center text-sm text-(--text-secondary)">
            No {removalFilter} removal requests.
          </div>
        ) : (
          <div className="space-y-3">
            {removalRequests.map(req => (
              <div key={req.id} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4 space-y-3">
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
                      {req.status}
                    </span>
                  </div>
                </div>

                {/* Payment mini-stats */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-(--bg) border border-(--border) p-2">
                    <p className="font-bold text-(--text-primary)">{req.payment_summary.total}</p>
                    <p className="text-(--text-muted)">Total</p>
                  </div>
                  <div className="rounded-lg bg-green-50 border border-green-100 p-2">
                    <p className="font-bold text-green-700">{req.payment_summary.confirmed}</p>
                    <p className="text-green-600">Confirmed</p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 border border-yellow-100 p-2">
                    <p className="font-bold text-yellow-700">{req.payment_summary.pending}</p>
                    <p className="text-yellow-600">Pending</p>
                  </div>
                  <div className="rounded-lg bg-red-50 border border-red-100 p-2">
                    <p className="font-bold text-red-700">{req.payment_summary.disputed}</p>
                    <p className="text-red-600">Disputed</p>
                  </div>
                </div>

                <div className="text-sm text-(--text-secondary)">
                  Saved: <span className="font-semibold text-(--text-primary)">{formatCurrency(req.total_saved)}</span>
                  <span className="mx-2">·</span>
                  Contribution: <span className="font-semibold text-(--text-primary)">{formatCurrency(req.personal_amount)}/period</span>
                </div>

                <div>
                  <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">Member's reason</p>
                  <p className="text-sm text-(--text-primary) bg-(--bg) border border-(--border) rounded-lg px-3 py-2">{req.reason}</p>
                </div>

                {req.settlement_notes && (
                  <div>
                    <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">
                      {req.status === 'approved' ? 'Settlement notes' : 'Rejection reason'}
                    </p>
                    <p className="text-sm text-(--text-primary) bg-(--bg) border border-(--border) rounded-lg px-3 py-2">{req.settlement_notes}</p>
                  </div>
                )}

                {req.status === 'pending' && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setApproveRemovalRequest(req)}
                      className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-100 transition-colors"
                    >
                      Review & Approve
                    </button>
                    <button
                      type="button"
                      disabled={rejectRemovalMutation.isPending}
                      onClick={() => {
                        const reason = prompt('Reason for rejecting this removal request (optional):') ?? '';
                        rejectRemovalMutation.mutate({ requestId: req.id, reason });
                      }}
                      className="text-xs font-semibold text-(--text-secondary) bg-(--bg) border border-(--border) rounded-lg px-3 py-1.5 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateGroup && (
        <CreateGroupModal
          orgUuid={orgUuid}
          collectors={collectors}
          onClose={() => setShowCreateGroup(false)}
        />
      )}
      {approveRemovalRequest && (
        <ApproveRemovalModal
          orgUuid={orgUuid}
          request={approveRemovalRequest}
          onClose={() => setApproveRemovalRequest(null)}
        />
      )}
      {showInvite && (
        <InviteModal
          isPending={inviteMutation.isPending}
          onClose={() => setShowInvite(false)}
          onInvite={email => inviteMutation.mutate(email)}
        />
      )}
    </div>
  );
}
