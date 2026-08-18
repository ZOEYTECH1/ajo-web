import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface AjoGroup {
  id: number;
  name: string;
  frequency: string;
  contribution_amount: number;
  member_count: number;
  status: string;
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  const classes = clsx(
    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
    s === 'active'
      ? 'bg-green-100 text-green-700'
      : s === 'completed'
      ? 'bg-blue-100 text-blue-700'
      : s === 'pending'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-600',
  );
  return <span className={classes}>{status}</span>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AjoGroupsPage() {
  const { data, isLoading, error } = useQuery<AjoGroup[]>({
    queryKey: ['ajo-groups'],
    queryFn: async () => {
      const response = await api.get('/groups/');
      return response.data;
    },
  });

  const columns: Column<Record<string, unknown>>[] = [
    {
      key: 'name',
      header: 'Group Name',
      render: (value, row) => (
        <Link
          to={`/ajo/${row.id}`}
          className="font-medium text-orange-600 hover:text-orange-700 hover:underline"
        >
          {String(value)}
        </Link>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      render: (value) => (
        <span className="capitalize">{String(value)}</span>
      ),
    },
    {
      key: 'contribution_amount',
      header: 'Amount',
      render: (value) => formatCurrency(Number(value)),
    },
    {
      key: 'member_count',
      header: 'Members',
      render: (value) => (
        <span className="font-medium">{String(value)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => <StatusBadge status={String(value)} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ajo Groups</h1>
          <p className="text-sm text-gray-500">Your savings circles</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load groups. Please refresh.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Table
          columns={columns}
          data={(data ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="You are not a member of any Ajo group yet."
        />
      </div>
    </div>
  );
}
