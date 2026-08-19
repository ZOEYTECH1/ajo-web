import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import clsx from 'clsx';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

// ── API shapes ────────────────────────────────────────────────────────────────

interface PaymentRecord {
  id: number;
  submitted_by: {
    first_name: string;
    last_name: string;
    email: string;
  };
  group_id: number;
  group_name: string;
  cycle_number: number | null;
  amount_entered: string;
  status: string;
  submitted_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function StatusBadge({ value }: { value: string }) {
  const s = value.toLowerCase();
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
      s === 'approved' || s === 'active'
        ? 'bg-green-100 text-green-700'
        : s === 'pending'
        ? 'bg-yellow-100 text-yellow-700'
        : s === 'rejected'
        ? 'bg-red-100 text-red-600'
        : 'bg-gray-100 text-gray-600',
    )}>
      {value}
    </span>
  );
}

// ── Filter buttons ────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'approved' | 'pending' | 'rejected';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'approved', label: 'Approved' },
  { key: 'pending', label: 'Pending' },
  { key: 'rejected', label: 'Rejected' },
];

// ── Table columns ─────────────────────────────────────────────────────────────

const cols: Column<Record<string, unknown>>[] = [
  {
    key: 'group_name',
    header: 'Group',
    render: (v, row) => (
      <Link
        to={`/ajo/${row.group_id as number}`}
        className="text-orange-600 hover:underline font-medium"
      >
        {v as string}
      </Link>
    ),
  },
  {
    key: 'cycle_number',
    header: 'Cycle',
    render: (v) => (v != null ? `#${v}` : '—'),
  },
  {
    key: 'amount_entered',
    header: 'Amount',
    render: (v) => formatCurrency(v as string),
  },
  {
    key: 'submitted_at',
    header: 'Date',
    render: (v) => {
      try { return format(new Date(v as string), 'dd MMM yyyy'); } catch { return v as string; }
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (v) => <StatusBadge value={v as string} />,
  },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AjoPaymentHistoryPage() {
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data, isLoading, error } = useQuery<PaymentRecord[]>({
    queryKey: ['ajo-payment-history'],
    queryFn: () => api.get('/payments/history/').then((r) => r.data),
  });

  const filtered = (data ?? []).filter(
    (p) => filter === 'all' || p.status.toLowerCase() === filter,
  );

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        to="/ajo"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to groups
      </Link>

      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Payment History</h1>
        <p className="text-sm text-gray-500 mt-1">All payments you have submitted across your groups</p>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
              filter === key
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load payment history. Please refresh.
        </div>
      )}

      {/* Table */}
      <Table
        columns={cols}
        data={filtered as unknown as Record<string, unknown>[]}
        loading={isLoading}
        emptyMessage={
          filter === 'all'
            ? 'You have not submitted any payments yet.'
            : `No ${filter} payments found.`
        }
      />
    </div>
  );
}
