import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import {
  UserGroupIcon,
  BanknotesIcon,
  CubeIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

interface Notification {
  id: number;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface QuickLinkProps {
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
  iconBg: string;
  iconColor: string;
}

function QuickLink({ to, icon: Icon, label, description, iconBg, iconColor }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5 hover:border-(--primary) hover:shadow-md transition-all"
    >
      <div className={`shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div>
        <p className="font-semibold text-(--text-primary) group-hover:text-(--primary) transition-colors">
          {label}
        </p>
        <p className="text-xs text-(--text-muted) mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: notifications, isLoading: notifLoading, isError: notifError, refetch: refetchNotif } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications/');
      return response.data;
    },
    retry: 1,
  });

  const firstName = user?.first_name || 'there';
  const modules = user?.selectedModules ?? [];
  const hasInventory = modules.length === 0 || modules.includes('inventory');
  const hasAjo       = modules.length === 0 || modules.includes('ajo');
  const hasThrift    = modules.length === 0 || modules.includes('thrift');

  const quickLinks: QuickLinkProps[] = [
    hasAjo && {
      to: '/ajo',
      icon: UserGroupIcon,
      label: 'Ajo Groups',
      description: 'View and manage your savings circles',
      iconBg: 'bg-(--primary-tint)',
      iconColor: 'text-(--primary)',
    },
    hasThrift && {
      to: '/thrift',
      icon: BanknotesIcon,
      label: 'Thrift',
      description: 'Your cooperative savings groups',
      iconBg: 'bg-green-50 dark:bg-green-950/40',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    hasInventory && {
      to: '/inventory',
      icon: CubeIcon,
      label: 'Inventory',
      description: 'Track products, sales and analytics',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
  ].filter(Boolean) as QuickLinkProps[];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">
          Good {getGreeting()}, {firstName}!
        </h1>
        <p className="text-sm text-(--text-secondary)">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Quick links */}
      {quickLinks.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-(--text-secondary) mb-3">Quick Access</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <QuickLink key={link.to} {...link} />
            ))}
          </div>
        </section>
      )}

      {/* Notifications */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <BellIcon className="h-5 w-5 text-(--text-muted)" />
          <h2 className="text-base font-semibold text-(--text-secondary)">Recent Notifications</h2>
        </div>

        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm divide-y divide-(--border)">
          {notifLoading ? (
            <div className="p-6 space-y-4">
              <p className="text-xs text-(--text-muted) text-center animate-pulse">
                Connecting to server — this may take a moment on first load…
              </p>
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-gray-700 rounded-full mt-0.5 shrink-0 skeleton" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 skeleton" />
                    <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/3 skeleton" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifError ? (
            <div className="px-5 py-8 text-center space-y-2">
              <p className="text-sm text-(--text-muted)">Could not load notifications.</p>
              <button
                type="button"
                onClick={() => refetchNotif()}
                className="text-sm text-(--primary) font-semibold hover:underline"
              >
                Retry
              </button>
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 ${
                  !n.is_read ? 'bg-(--primary-tint)/30' : ''
                }`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                    n.is_read ? 'bg-gray-300 dark:bg-gray-600' : 'bg-(--primary)'
                  }`}
                />
                <div>
                  <p className="text-sm text-(--text-primary)">{n.message}</p>
                  <p className="text-xs text-(--text-muted) mt-0.5">
                    {format(new Date(n.created_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-sm text-(--text-muted)">
              No notifications yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
