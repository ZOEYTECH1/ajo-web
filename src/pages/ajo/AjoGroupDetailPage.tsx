import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import clsx from 'clsx';
import { ChevronLeftIcon, UserGroupIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface Member {
  id: number;
  user: { first_name: string; last_name: string; email: string };
  position: number;
  has_collected: boolean;
}

interface Payment {
  id: number;
  payer_name: string;
  amount: number;
  date: string;
  cycle_number: number;
  status: string;
}

interface GroupDetail {
  id: number;
  name: string;
  description?: string;
  frequency: string;
  contribution_amount: number;
  status: string;
  current_collector?: string;
  current_cycle: number;
  total_cycles: number;
  next_payment_date?: string;
  start_date?: string;
  members: Member[];
  payments: Payment[];
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

const paymentColumns: Column<Record<string, unknown>>[] = [
  { key: 'payer_name', header: 'Member' },
  { key: 'cycle_number', header: 'Cycle' },
  {
    key: 'amount',
    header: 'Amount',
    render: (value) => formatCurrency(Number(value)),
  },
  {
    key: 'date',
    header: 'Date',
    render: (value) => {
      try {
        return format(new Date(String(value)), 'dd MMM yyyy');
      } catch {
        return String(value);
      }
    },
  },
  {
    key: 'status',
    header: 'Status',
    render: (value) => {
      const s = String(value).toLowerCase();
      return (
        <span
          className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
            s === 'paid'
              ? 'bg-green-100 text-green-700'
              : s === 'pending'
              ? 'bg-yellow-100 text-yellow-700'
              : 'bg-gray-100 text-gray-600',
          )}
        >
          {value as string}
        </span>
      );
    },
  },
];

type TabKey = 'payments' | 'members';

export default function AjoGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('payments');

  const { data, isLoading, error } = useQuery<GroupDetail>({
    queryKey: ['ajo-group', id],
    queryFn: async () => {
      const response = await api.get(`/groups/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-6 text-center text-sm text-red-700">
        Failed to load group details.{' '}
        <Link to="/ajo" className="underline font-medium">Go back</Link>
      </div>
    );
  }

  const memberColumns: Column<Record<string, unknown>>[] = [
    {
      key: 'user',
      header: 'Name',
      render: (value) => {
        const u = value as Member['user'];
        return `${u.first_name} ${u.last_name}`.trim() || u.email;
      },
    },
    {
      key: 'user',
      header: 'Email',
      render: (value) => (value as Member['user']).email,
    },
    { key: 'position', header: 'Position' },
    {
      key: 'has_collected',
      header: 'Collected',
      render: (value) =>
        value ? (
          <span className="text-green-600 font-medium">Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
  ];

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

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
            {data.description && (
              <p className="text-sm text-gray-500 mt-1">{data.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <UserGroupIcon className="h-4 w-4" />
                {data.members.length} members
              </span>
              {data.next_payment_date && (
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Next payment: {format(new Date(data.next_payment_date), 'dd MMM yyyy')}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <div className="bg-orange-50 rounded-lg px-4 py-3 text-center">
              <p className="text-orange-600 font-bold text-xl">{formatCurrency(data.contribution_amount)}</p>
              <p className="text-orange-500 text-xs capitalize">{data.frequency}</p>
            </div>
          </div>
        </div>

        {/* Cycle info */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500">Status</p>
            <p className="font-medium text-gray-900 capitalize">{data.status}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Current Cycle</p>
            <p className="font-medium text-gray-900">
              {data.current_cycle} / {data.total_cycles}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Current Collector</p>
            <p className="font-medium text-gray-900">{data.current_collector ?? '—'}</p>
          </div>
          {data.start_date && (
            <div>
              <p className="text-xs text-gray-500">Start Date</p>
              <p className="font-medium text-gray-900">
                {format(new Date(data.start_date), 'dd MMM yyyy')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 flex">
          {(['payments', 'members'] as TabKey[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-6 py-3 text-sm font-medium capitalize transition-colors',
                activeTab === tab
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'payments' ? (
            <Table
              columns={paymentColumns}
              data={(data.payments ?? []) as unknown as Record<string, unknown>[]}
              emptyMessage="No payments recorded yet."
            />
          ) : (
            <Table
              columns={memberColumns}
              data={(data.members ?? []) as unknown as Record<string, unknown>[]}
              emptyMessage="No members found."
            />
          )}
        </div>
      </div>
    </div>
  );
}
