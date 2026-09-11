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
  SparklesIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/useAuthStore';
import { logout } from '../../services/authService';
import api from '../../services/api';
import { cloudinaryUrl } from '../../lib/cloudinary';
import { useModuleAccess } from '../../hooks/useModuleAccess';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const topItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: HomeIcon },
];

const bottomItems: NavItem[] = [
  { label: 'Notifications', to: '/notifications', icon: BellIcon },
  { label: 'Account',       to: '/account',       icon: UserCircleIcon },
];

type ModuleKey = 'ajo' | 'thrift' | 'inventory';

const MODULE_ITEMS: { key: ModuleKey; label: string; to: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; description: string }[] = [
  { key: 'ajo',       label: 'Ajo Groups', to: '/ajo',       icon: UserGroupIcon, description: 'Run savings circles with scheduled contributions and payouts.' },
  { key: 'thrift',    label: 'Thrift',     to: '/thrift',    icon: BanknotesIcon, description: 'Cooperative savings groups with flexible contribution tracking.' },
  { key: 'inventory', label: 'Inventory',  to: '/inventory', icon: CubeIcon,      description: 'Track products, sales, expenses and analytics for your business.' },
];

interface Notification { is_read: boolean }

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const { usesAjo, usesThrift, usesInventory } = useModuleAccess();

  const moduleInUse: Record<ModuleKey, boolean> = {
    ajo: usesAjo,
    thrift: usesThrift,
    inventory: usesInventory,
  };
  const activeModules  = MODULE_ITEMS.filter((m) => moduleInUse[m.key]);
  const exploreModules = MODULE_ITEMS.filter((m) => !moduleInUse[m.key]);

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
        {[...topItems, ...activeModules, ...bottomItems].map(({ label, to, icon: Icon }) => (
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
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="flex-1">{label}</span>
            {label === 'Notifications' && unreadCount > 0 && (
              <span className="flex items-center justify-center h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-xs font-bold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
        ))}

        {/* Modules not in use yet — kept out of the main nav entirely, shown
            as a distinct "explore" section with a description of what each
            one does, matching mobile's discover-card treatment. Not locked —
            there's no backend access gating on either platform — just
            de-emphasized until the user actually starts using it. */}
        {exploreModules.length > 0 && (
          <div className="pt-4 mt-3 border-t border-(--border) space-y-1.5">
            <p className="px-3 text-[11px] font-semibold text-(--text-muted) uppercase tracking-wide flex items-center gap-1.5">
              <SparklesIcon className="h-3.5 w-3.5" aria-hidden="true" />
              Explore
            </p>
            {exploreModules.map(({ key, label, to, icon: Icon, description }) => (
              <NavLink
                key={key}
                to={to}
                onClick={onClose}
                className="flex items-start gap-3 px-3 py-2.5 rounded-lg border border-dashed border-(--border) hover:border-(--primary) hover:bg-(--primary-tint)/20 transition-colors"
              >
                <Icon className="h-5 w-5 shrink-0 text-(--text-muted) mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-(--text-secondary)">{label}</p>
                  <p className="text-xs text-(--text-muted) mt-0.5 leading-snug">{description}</p>
                </div>
              </NavLink>
            ))}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-(--border) space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.profile_photo_url ? (
            <img
              src={cloudinaryUrl(user.profile_photo_url, 64, 64)}
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
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
          Logout
        </button>
      </div>
    </aside>
  );
}
