import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface ThriftGroup {
  id: number;
  name: string;
  frequency: string;
  contribution_amount: number;
  member_count: number;
  total_saved: number;
  status: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
        s === 'active'
          ? 'bg-green-100 text-green-700'
          : s === 'completed'
          ? 'bg-blue-100 text-blue-700'
          : s === 'pending'
          ? 'bg-yellow-100 text-yellow-700'
          : 'bg-gray-100 text-gray-600',
      )}
    >
      {status}
    </span>
  );
}

const columns: Column<Record<string, unknown>>[] = [
  { key: 'name', header: 'Group Name' },
  {
    key: 'frequency',
    header: 'Frequency',
    render: (value) => <span className="capitalize">{String(value)}</span>,
  },
  {
    key: 'contribution_amount',
    header: 'Contribution',
    render: (value) => formatCurrency(Number(value)),
  },
  {
    key: 'member_count',
    header: 'Members',
  },
  {
    key: 'total_saved',
    header: 'Total Saved',
    render: (value) => (
      <span className="font-semibold text-gray-900">{formatCurrency(Number(value))}</span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => <StatusBadge status={String(value)} />,
  },
];

export default function ThriftPage() {
  const { data, isLoading, error } = useQuery<ThriftGroup[]>({
    queryKey: ['thrift-groups'],
    queryFn: async () => {
      const response = await api.get('/thrift/groups/');
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Thrift Groups</h1>
        <p className="text-sm text-gray-500">Your cooperative savings groups</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load thrift groups. Please refresh.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Table
          columns={columns}
          data={(data ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="You are not a member of any thrift group yet."
        />
      </div>
    </div>
  );
}
