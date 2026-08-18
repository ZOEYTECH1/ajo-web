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
  color: string;
}

function QuickLink({ to, icon: Icon, label, description, color }: QuickLinkProps) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-4 bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-orange-200 hover:shadow-md transition-all"
    >
      <div className={`flex-shrink-0 h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
          {label}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications/');
      return response.data;
    },
  });

  const firstName = user?.first_name || 'there';
  const modules = user?.selectedModules ?? [];

  const hasInventory = modules.length === 0 || modules.includes('inventory');
  const hasAjo = modules.length === 0 || modules.includes('ajo');
  const hasThrift = modules.length === 0 || modules.includes('thrift');

  const quickLinks = [
    hasAjo && {
      to: '/ajo',
      icon: UserGroupIcon,
      label: 'Ajo Groups',
      description: 'View and manage your savings circles',
      color: 'bg-orange-50 text-orange-600',
    },
    hasThrift && {
      to: '/thrift',
      icon: BanknotesIcon,
      label: 'Thrift',
      description: 'Your cooperative savings groups',
      color: 'bg-green-50 text-green-600',
    },
    hasInventory && {
      to: '/inventory',
      icon: CubeIcon,
      label: 'Inventory',
      description: 'Track products, sales and analytics',
      color: 'bg-blue-50 text-blue-600',
    },
  ].filter(Boolean) as QuickLinkProps[];

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getGreeting()}, {firstName}!
        </h1>
        <p className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, d MMMM yyyy')}
        </p>
      </div>

      {/* Quick links */}
      {quickLinks.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">Quick Access</h2>
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
          <BellIcon className="h-5 w-5 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-700">Recent Notifications</h2>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
          {notificationsLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-4 w-4 bg-gray-200 rounded-full mt-0.5 flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications && notifications.length > 0 ? (
            notifications.slice(0, 10).map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-5 py-4 ${!n.is_read ? 'bg-orange-50/40' : ''}`}
              >
                <div
                  className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                    n.is_read ? 'bg-gray-300' : 'bg-orange-500'
                  }`}
                />
                <div>
                  <p className="text-sm text-gray-800">{n.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {format(new Date(n.created_at), 'dd MMM yyyy, h:mm a')}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-5 py-10 text-center text-sm text-gray-400">
              No notifications yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
