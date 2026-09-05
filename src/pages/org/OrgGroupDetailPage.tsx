import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { Skeleton, SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface GroupBrief {
  id: number;
  uuid: string;
  name: string;
  frequency: string;
  collector: { id: number; first_name: string; last_name: string } | null;
  member_count: number;
}

interface Payment {
  id: number;
  member: number;
  member_name: string;
  amount: string;
  period_date: string;
  status: 'pending' | 'confirmed' | 'disputed';
}

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      status === 'confirmed' ? 'bg-green-100 text-green-700'
      : status === 'disputed' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status}
    </span>
  );
}

export default function OrgGroupDetailPage() {
  const { uuid: orgUuid, groupUuid } = useParams<{ uuid: string; groupUuid: string }>();
  // Contributions are always collected daily regardless of the group's payout
  // circle (monthly/yearly), so "Today" is a meaningful default for every group.
  const [dateFilter, setDateFilter] = useState<'today' | 'all' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(todayISO());

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery<GroupBrief>({
    queryKey: ['org-group', groupUuid],
    queryFn: () => api.get(`/thrift/${groupUuid}/`).then(r => r.data),
    enabled: !!groupUuid,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['org-group-payments', groupUuid],
    queryFn: () => api.get(`/thrift/${groupUuid}/payments/`).then(r => r.data),
    enabled: !!groupUuid,
  });

  const activeDate = dateFilter === 'today' ? todayISO() : dateFilter === 'custom' ? customDate : null;

  const filteredPayments = useMemo(() => {
    const rows = activeDate ? payments.filter(p => p.period_date === activeDate) : payments;
    return [...rows].sort((a, b) => b.period_date.localeCompare(a.period_date));
  }, [payments, activeDate]);

  const totals = useMemo(() => {
    const confirmed = filteredPayments.filter(p => p.status === 'confirmed');
    return {
      count: filteredPayments.length,
      confirmedCount: confirmed.length,
      pendingCount: filteredPayments.filter(p => p.status === 'pending').length,
      disputedCount: filteredPayments.filter(p => p.status === 'disputed').length,
      confirmedTotal: confirmed.reduce((sum, p) => sum + Number(p.amount), 0),
    };
  }, [filteredPayments]);

  if (groupError) {
    return (
      <div className="space-y-4">
        <Link to={`/org/${orgUuid}`} className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-teal-600">
          <ArrowLeftIcon className="h-4 w-4" /> Back to dashboard
        </Link>
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Group not found or you do not have access.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link to={`/org/${orgUuid}`} className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-teal-600">
        <ArrowLeftIcon className="h-4 w-4" /> Back to dashboard
      </Link>

      {/* Header */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        {groupLoading ? (
          <Skeleton className="h-7 w-48" />
        ) : (
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-(--text-primary)">{group?.name}</h1>
              <p className="text-sm text-(--text-secondary) mt-0.5 capitalize">
                {group?.frequency} circle · {group?.member_count} member{group?.member_count === 1 ? '' : 's'}
                {group?.collector && <> · Collector: {group.collector.first_name} {group.collector.last_name}</>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Date filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setDateFilter('today')}
          className={clsx(
            'text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors',
            dateFilter === 'today' ? 'bg-teal-600 text-white border-teal-600' : 'border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30',
          )}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setDateFilter('all')}
          className={clsx(
            'text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors',
            dateFilter === 'all' ? 'bg-teal-600 text-white border-teal-600' : 'border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30',
          )}
        >
          All collections
        </button>
        <input
          type="date"
          value={customDate}
          onChange={e => { setCustomDate(e.target.value); setDateFilter('custom'); }}
          className={clsx(
            'text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500',
            dateFilter === 'custom' ? 'border-teal-600 text-teal-700' : 'border-(--border) text-(--text-secondary)',
          )}
        />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider font-semibold">Collected</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{formatCurrency(totals.confirmedTotal)}</p>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">Confirmed</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{totals.confirmedCount}</p>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-yellow-600 uppercase tracking-wider font-semibold">Pending</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{totals.pendingCount}</p>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-red-600 uppercase tracking-wider font-semibold">Disputed</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{totals.disputedCount}</p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Date', 'Member', 'Amount', 'Status'].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {paymentsLoading ? (
                <SkeletonTable rows={5} cols={4} />
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No collections {activeDate ? 'on this date' : 'recorded'} yet.
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{fmt(p.period_date)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{p.member_name}</td>
                    <td className="px-6 py-4 text-sm text-(--text-primary)">{formatCurrency(p.amount)}</td>
                    <td className="px-6 py-4"><PaymentStatusBadge status={p.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
