import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  HomeIcon,
  UserGroupIcon,
  BanknotesIcon,
  CubeIcon,
  UserCircleIcon,
  BellIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/useAuthStore';
import { logout } from '../../services/authService';
import api from '../../services/api';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard',     to: '/dashboard',     icon: HomeIcon },
  { label: 'Ajo Groups',    to: '/ajo',           icon: UserGroupIcon },
  { label: 'Thrift',        to: '/thrift',        icon: BanknotesIcon },
  { label: 'Inventory',     to: '/inventory',     icon: CubeIcon },
  { label: 'Notifications', to: '/notifications', icon: BellIcon },
  { label: 'Account',       to: '/account',       icon: UserCircleIcon },
];

interface Notification { is_read: boolean }

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const { data: notifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications/').then((r) => r.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const notifList: Notification[] = Array.isArray(notifs) ? notifs : (notifs?.results ?? []);
  const unreadCount = notifList.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login', { replace: true });
  };

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : 'User';

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <aside className="flex flex-col h-full bg-(--surface) border-r border-(--border)">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-(--border)">
        <img src="/ajo-logo.svg" alt="Scribe" className="h-9 w-9 shrink-0" />
        <span className="text-xl font-extrabold tracking-tight text-(--primary)">Scribe</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'text-(--primary) bg-(--primary-tint)'
                  : 'text-(--text-secondary) hover:bg-(--primary-tint)/50 hover:text-(--text-primary)',
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1">{label}</span>
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-(--border) space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-(--primary) flex items-center justify-center text-xs font-bold shrink-0 text-white">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-(--text-primary) truncate">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-(--text-muted) truncate">{user.email}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-(--text-secondary) hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
