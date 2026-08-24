import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../components/ui/Skeleton';
import api from '../../services/api';

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
  mobilization_rate: number;
  dispute_rate: number;
  total_amount: number;
  confirmed_amount: number;
  total_count: number;
  disputed_count: number;
}

interface OrgGroup {
  id: number;
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
  rows.push(['Group Name', 'Frequency', 'Members', 'Collector']);
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
          <button type="button" onClick={onClose} className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">
            Enter the email address of the collector you want to invite. They'll receive an email with an invite link.
          </p>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Email address *</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(''); }}
              placeholder="collector@example.com"
              className="w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [actionError, setActionError] = useState<Record<number, string>>({});

  const { data, isLoading, error } = useQuery<OrgDashboard>({
    queryKey: ['thrift-org', orgId],
    queryFn: () => api.get(`/thrift/orgs/${orgId}/dashboard/`).then(r => r.data),
    enabled: !!orgId,
  });

  const collectorActionMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: string }) =>
      api.patch(`/thrift/orgs/${orgId}/members/${memberId}/`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgId] });
    },
    onError: (e: any, vars) => {
      setActionError(prev => ({
        ...prev,
        [vars.memberId]: e.response?.data?.detail ?? 'Something went wrong.',
      }));
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (email: string) => api.post(`/thrift/orgs/${orgId}/members/`, { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgId] });
      setShowInvite(false);
    },
  });

  const reportActionMutation = useMutation({
    mutationFn: ({ reportId, action }: { reportId: number; action: 'resolve' | 'dismiss' | 'review' }) =>
      api.patch(`/thrift/orgs/${orgId}/reports/${reportId}/`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org', orgId] });
    },
  });

  if (isLoading) return <OrgSkeleton />;

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-teal-600">← Thrift Groups</Link>
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Organisation not found or you do not have access.
        </div>
      </div>
    );
  }

  const { organization: org, collectors, pending_collectors, groups, payment_stats, recent_reports = [], collector_stats = {} } = data;
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-teal-600">← Thrift Groups</Link>

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
              to={`/thrift/org/${orgId}/billing`}
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
                          {stats ? `${stats.mobilization_rate.toFixed(0)}%` : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-(--text-secondary)">
                          {stats ? `${stats.dispute_rate.toFixed(1)}%` : '—'}
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
                              <p className="text-xs text-red-600">{actionError[c.id]}</p>
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
        <h2 className="text-base font-bold text-(--text-primary)">Groups</h2>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Name', 'Frequency', 'Members', 'Collector'].map(h => (
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
                        <Link to={`/thrift/${g.id}`} className="text-teal-600 hover:underline">
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

      {/* ── Reports ── */}
      {recent_reports.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-(--text-primary)">
            Reports
            <span className="ml-2 text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
              {recent_reports.filter(r => r.status === 'pending').length} pending
            </span>
          </h2>
          <div className="space-y-3">
            {recent_reports.map(report => (
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
        </div>
      )}

      {/* Modals */}
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
