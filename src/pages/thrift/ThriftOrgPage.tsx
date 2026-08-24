import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { CheckBadgeIcon } from '@heroicons/react/24/outline';
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
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5">
      <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-(--text-primary) mt-1">{value}</p>
    </div>
  );
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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ThriftOrgPage() {
  const { id } = useParams<{ id: string }>();
  const orgId = Number(id);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<OrgDashboard>({
    queryKey: ['thrift-org', orgId],
    queryFn: () => api.get(`/thrift/orgs/${orgId}/dashboard/`).then(r => r.data),
    enabled: !!orgId,
  });

  const collectorActionMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: 'approve' | 'reject' }) =>
      api.post(`/thrift/orgs/${orgId}/members/${memberId}/`, { action }),
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

  const { organization: org, collectors, pending_collectors, groups, payment_stats } = data;
  const totalMembers = groups.reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-teal-600">← Thrift Groups</Link>

      {/* Header */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <div className="flex items-start gap-3 flex-wrap">
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
                    {['Name', 'Actions'].map(h => (
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
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
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
                  {['Name', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {collectors.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                      No active collectors yet.
                    </td>
                  </tr>
                ) : (
                  collectors.map(c => (
                    <tr key={c.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{fullName(c.user)}</td>
                      <td className="px-6 py-4"><CollectorStatusBadge status={c.status} /></td>
                    </tr>
                  ))
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        </div>
      </div>
    </div>
  );
}
