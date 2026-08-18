import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface AjoGroup {
  id: number;
  name: string;
  contribution_frequency: string;
  contribution_amount: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
}

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(value));
}

function StatusBadge({ group }: { group: AjoGroup }) {
  const label = group.is_on_trial ? 'Trial' : group.is_subscription_active ? 'Active' : 'Inactive';
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      group.is_on_trial
        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-400'
        : group.is_subscription_active
        ? 'bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-400'
        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
    )}>
      {label}
    </span>
  );
}

export default function AjoGroupsPage() {
  const { data, isLoading, error } = useQuery<AjoGroup[]>({
    queryKey: ['ajo-groups'],
    queryFn: async () => {
      const response = await api.get('/groups/');
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Ajo Groups</h1>
        <p className="text-sm text-(--text-secondary)">Your savings circles</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load groups. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Group Name', 'Frequency', 'Amount', 'Members', 'Status'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={5} cols={5} />
              ) : data && data.length > 0 ? (
                data.map((group) => (
                  <tr key={group.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium">
                      <Link
                        to={`/ajo/${group.id}`}
                        className="text-(--primary) hover:underline"
                      >
                        {group.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary) capitalize">
                      {group.contribution_frequency}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">
                      {formatCurrency(group.contribution_amount)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">
                      {group.member_count}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge group={group} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    You are not a member of any Ajo group yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
