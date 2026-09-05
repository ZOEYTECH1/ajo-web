import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { format } from 'date-fns';
import { XCircleIcon } from '@heroicons/react/24/outline';
import { Skeleton } from '../../components/ui/Skeleton';
import api from '../../services/api';

// â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface QueueUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface PendingMember {
  id: number;
  user: QueueUser;
  group_uuid: string;
  group_name: string;
  personal_amount: string;
  status: 'pending' | 'amount_pending';
  flag_reason: string;
  created_at: string;
}

interface DisputedPayment {
  id: number;
  member_id: number;
  member_name: string;
  group_uuid: string;
  group_name: string;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  dispute_reason: string;
}

interface CollectorQueueResponse {
  pending_members: PendingMember[];
  disputed_payments: DisputedPayment[];
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmt(d: string | null | undefined) {
  if (!d) return 'â€”';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return 'â€”'; }
}

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';

// â”€â”€ Skeleton Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// â”€â”€ Flag Amount Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function FlagModal({
  member,
  onConfirm,
  onClose,
  isPending,
}: {
  member: PendingMember;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Flag Amount</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">
            Flag <span className="font-semibold text-(--text-primary)">{member.user.first_name} {member.user.last_name}</span>'s
            contribution of <span className="font-semibold text-(--text-primary)">{formatCurrency(member.personal_amount)}</span> and
            ask them to correct it. Provide a reason below.
          </p>
          <div>
            <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Reason *</label>
            <textarea
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Contribution amount doesn't match the group minimum"
              className={inputCls}
            />
          </div>
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
              disabled={!reason.trim() || isPending}
              onClick={() => onConfirm(reason.trim())}
              className="flex-1 rounded-lg bg-yellow-500 text-white py-2.5 text-sm font-semibold hover:bg-yellow-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Flaggingâ€¦' : 'Flag Amount'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type QueueTab = 'pending' | 'disputed';

export default function ThriftQueuePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<QueueTab>('pending');
  const [actionError, setActionError] = useState<Record<number, string>>({});
  const [flagTarget, setFlagTarget] = useState<PendingMember | null>(null);

  const { data, isLoading, error } = useQuery<CollectorQueueResponse>({
    queryKey: ['thrift-collector-queue'],
    queryFn: () => api.get('/thrift/collector-queue/').then(r => r.data),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ groupUuid, memberId, action, reason }: {
      groupUuid: string; memberId: number; action: string; reason?: string;
    }) => api.patch(`/thrift/${groupUuid}/members/${memberId}/`, { action, ...(reason ? { reason } : {}) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-collector-queue'] });
      setFlagTarget(null);
    },
    onError: (e: any, vars) => {
      setActionError(prev => ({
        ...prev,
        [vars.memberId]: e.response?.data?.detail ?? 'Something went wrong.',
      }));
      setFlagTarget(null);
    },
  });

  const pendingMembers = data?.pending_members ?? [];
  const disputedPayments = data?.disputed_payments ?? [];

  const tabs: { key: QueueTab; label: string }[] = [
    { key: 'pending', label: `Pending Members (${pendingMembers.length})` },
    { key: 'disputed', label: `Disputed Payments (${disputedPayments.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Collector Queue</h1>
        <p className="text-sm text-(--text-secondary)">Pending approvals and disputed payments</p>
      </div>

      {/* Global error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load queue. Please refresh.
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
              activeTab === t.key
                ? 'bg-teal-600 text-white'
                : 'bg-(--bg) text-(--text-secondary) hover:text-(--text-primary) border border-(--border)',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* â”€â”€ Pending Members Tab â”€â”€ */}
      {activeTab === 'pending' && (
        <>
          {isLoading ? (
            <SkeletonCards />
          ) : pendingMembers.length === 0 ? (
            <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm px-6 py-16 text-center">
              <p className="text-sm text-(--text-muted)">No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingMembers.map(member => (
                <div key={member.id} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-(--text-primary)">
                        {member.user.first_name} {member.user.last_name}
                      </p>
                      <p className="text-xs text-(--text-secondary)">
                        Group:{' '}
                        <Link
                          to={`/thrift/${member.group_uuid}`}
                          className="text-teal-600 hover:underline font-medium"
                        >
                          {member.group_name}
                        </Link>
                      </p>
                      <p className="text-xs text-(--text-secondary)">
                        Contribution:{' '}
                        <span className="font-semibold text-(--text-primary)">
                          {formatCurrency(member.personal_amount)}
                        </span>
                      </p>
                      <p className="text-xs text-(--text-muted)">Requested {fmt(member.created_at)}</p>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      {member.status === 'amount_pending' ? (
                        /* Member has proposed corrected amount â€” approve or reject */
                        <>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({
                              groupUuid: member.group_uuid,
                              memberId: member.id,
                              action: 'approve',
                            })}
                            className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            Approve Amount
                          </button>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({
                              groupUuid: member.group_uuid,
                              memberId: member.id,
                              action: 'reject',
                            })}
                            className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        /* Fresh pending member â€” approve, flag amount, or reject */
                        <>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({
                              groupUuid: member.group_uuid,
                              memberId: member.id,
                              action: 'approve',
                            })}
                            className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 hover:bg-green-100 transition-colors disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => setFlagTarget(member)}
                            className="text-xs font-semibold text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 hover:bg-yellow-100 transition-colors disabled:opacity-50"
                          >
                            Flag Amount
                          </button>
                          <button
                            type="button"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({
                              groupUuid: member.group_uuid,
                              memberId: member.id,
                              action: 'reject',
                            })}
                            className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Amount flagged banner */}
                  {member.status === 'amount_pending' && member.flag_reason && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-3 py-2 text-xs text-yellow-800">
                      <span className="font-semibold">Flag reason: </span>{member.flag_reason}
                    </div>
                  )}

                  {/* Per-item action error */}
                  {actionError[member.id] && (
                    <p role="alert" className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{actionError[member.id]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* â”€â”€ Disputed Payments Tab â”€â”€ */}
      {activeTab === 'disputed' && (
        <>
          {isLoading ? (
            <SkeletonCards />
          ) : disputedPayments.length === 0 ? (
            <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm px-6 py-16 text-center">
              <p className="text-sm text-(--text-muted)">No disputed payments</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputedPayments.map(payment => (
                <div key={payment.id} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-(--text-primary)">{payment.member_name}</p>
                      <p className="text-xs text-(--text-secondary)">
                        Group:{' '}
                        <Link
                          to={`/thrift/${payment.group_uuid}`}
                          className="text-teal-600 hover:underline font-medium"
                        >
                          {payment.group_name}
                        </Link>
                      </p>
                      <p className="text-xs text-(--text-secondary)">
                        Amount:{' '}
                        <span className="font-semibold text-(--text-primary)">{formatCurrency(payment.amount)}</span>
                        <span className="mx-1.5 text-(--text-muted)">Â·</span>
                        Period: <span className="font-medium">{fmt(payment.period_date)}</span>
                      </p>
                      <p className="text-xs text-(--text-muted)">Marked {fmt(payment.marked_at)}</p>
                    </div>

                    {/* Navigate to group to resolve â€” no direct queue resolution endpoint */}
                    <Link
                      to={`/thrift/${payment.group_uuid}`}
                      className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-1.5 hover:bg-teal-100 transition-colors flex-shrink-0"
                    >
                      View in Group
                    </Link>
                  </div>

                  {/* Dispute reason */}
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
                    <span className="font-semibold">Dispute reason: </span>{payment.dispute_reason}
                  </div>

                  {payment.notes && (
                    <p className="text-xs text-(--text-secondary)">Notes: {payment.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Flag Amount Modal */}
      {flagTarget && (
        <FlagModal
          member={flagTarget}
          isPending={reviewMutation.isPending}
          onClose={() => setFlagTarget(null)}
          onConfirm={reason => reviewMutation.mutate({
            groupUuid: flagTarget.group_uuid,
            memberId: flagTarget.id,
            action: 'flag_amount',
            reason,
          })}
        />
      )}
    </div>
  );
}


