import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  frequency: string;
  cycle_type: string;
  invite_code: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  trial_end: string | null;
  subscription_expires: string | null;
  created_at: string;
  collector: { id: number; full_name: string; email: string } | null;
  organization: { id: number; name: string } | null;
}

type Row = Record<string, unknown>;

function SubscriptionBadge({ row }: { row: Row }) {
  const group = row as unknown as ThriftGroup;
  const label = group.is_on_trial ? 'Trial' : group.is_subscription_active ? 'Active' : 'Inactive';
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        group.is_on_trial
          ? 'bg-yellow-100 text-yellow-700'
          : group.is_subscription_active
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-500',
      )}
    >
      {label}
    </span>
  );
}

const columns: Column<Row>[] = [
  { key: 'name', header: 'Group Name' },
  {
    key: 'frequency',
    header: 'Frequency',
    render: (v) => <span className="capitalize">{String(v ?? '')}</span>,
  },
  {
    key: 'cycle_type',
    header: 'Cycle',
    render: (v) => <span className="capitalize">{String(v ?? '')}</span>,
  },
  { key: 'member_count', header: 'Members' },
  {
    key: 'collector',
    header: 'Collector',
    render: (v) => {
      const c = v as { full_name?: string } | null;
      return <span>{c?.full_name ?? '—'}</span>;
    },
  },
  {
    key: 'organization',
    header: 'Organisation',
    render: (v) => {
      const o = v as { name?: string } | null;
      return <span>{o?.name ?? '—'}</span>;
    },
  },
  {
    key: 'is_subscription_active',
    header: 'Status',
    render: (_, row) => <SubscriptionBadge row={row} />,
  },
];

export default function ThriftPage() {
  const { data, isLoading, error } = useQuery<ThriftGroup[]>({
    queryKey: ['thrift-groups'],
    queryFn: async () => {
      const response = await api.get('/thrift/');
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
          data={(data ?? []) as unknown as Row[]}
          loading={isLoading}
          emptyMessage="You are not a member of any thrift group yet."
        />
      </div>
    </div>
  );
}
