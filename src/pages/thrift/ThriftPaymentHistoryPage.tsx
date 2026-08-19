import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface ThriftPaymentHistoryItem {
  id: number;
  member_id: number;
  member_name: string;
  group_id: number;
  group_name: string;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  status: 'pending' | 'confirmed' | 'disputed';
  payer_confirmed: boolean;
  dispute_reason: string;
  disputed_at: string | null;
  resolved_at: string | null;
}

interface HistoryResponse {
  collector_payments: ThriftPaymentHistoryItem[];
  payer_payments: ThriftPaymentHistoryItem[];
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

function StatusBadge({ status }: { status: string }) {
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

function PaymentTable({ payments, loading, showMember }: { payments: ThriftPaymentHistoryItem[]; loading: boolean; showMember: boolean }) {
  const headers = ['Group', ...(showMember ? ['Member'] : []), 'Period Date', 'Amount', 'Marked At', 'Status'];
  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-(--border)">
          <thead className="bg-(--bg)">
            <tr>
              {headers.map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {loading ? (
              <SkeletonTable rows={4} cols={headers.length} />
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map(p => (
                <tr key={p.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium">
                    <Link to={`/thrift/${p.group_id}`} className="text-teal-600 hover:underline">{p.group_name}</Link>
                  </td>
                  {showMember && <td className="px-6 py-4 text-sm text-(--text-secondary)">{p.member_name}</td>}
                  <td className="px-6 py-4 text-sm text-(--text-secondary)">{fmt(p.period_date)}</td>
                  <td className="px-6 py-4 text-sm text-(--text-secondary)">{formatCurrency(p.amount)}</td>
                  <td className="px-6 py-4 text-sm text-(--text-secondary)">{fmt(p.marked_at)}</td>
                  <td className="px-6 py-4"><StatusBadge status={p.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type ViewTab = 'payer' | 'collector';

export default function ThriftPaymentHistoryPage() {
  const [activeTab, setActiveTab] = useState<ViewTab>('payer');

  const { data, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['thrift-payment-history'],
    queryFn: () => api.get('/thrift/my-payment-history/').then(r => r.data),
  });

  const payerPayments = data?.payer_payments ?? [];
  const collectorPayments = data?.collector_payments ?? [];
  const showCollectorTab = collectorPayments.length > 0 || (!isLoading && data);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-teal-600">← Thrift Groups</Link>
          <h1 className="text-2xl font-bold text-(--text-primary) mt-1">My Payment History</h1>
          <p className="text-sm text-(--text-secondary)">Your thrift payment records across all groups</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('payer')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            activeTab === 'payer' ? 'bg-teal-600 text-white' : 'bg-(--bg) text-(--text-secondary) hover:text-(--text-primary) border border-(--border)',
          )}
        >
          My Payments ({payerPayments.length})
        </button>
        {showCollectorTab && (
          <button
            type="button"
            onClick={() => setActiveTab('collector')}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
              activeTab === 'collector' ? 'bg-teal-600 text-white' : 'bg-(--bg) text-(--text-secondary) hover:text-(--text-primary) border border-(--border)',
            )}
          >
            Marked by Me ({collectorPayments.length})
          </button>
        )}
      </div>

      {activeTab === 'payer' && (
        <PaymentTable payments={payerPayments} loading={isLoading} showMember={false} />
      )}
      {activeTab === 'collector' && (
        <PaymentTable payments={collectorPayments} loading={isLoading} showMember={true} />
      )}
    </div>
  );
}
