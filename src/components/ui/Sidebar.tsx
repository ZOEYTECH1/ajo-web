import { NavLink, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import {
  HomeIcon,
  UserGroupIcon,
  BanknotesIcon,
  CubeIcon,
  UserCircleIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../../store/useAuthStore';
import { logout } from '../../services/authService';

interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', to: '/dashboard', icon: HomeIcon },
  { label: 'Ajo Groups', to: '/ajo', icon: UserGroupIcon },
  { label: 'Thrift', to: '/thrift', icon: BanknotesIcon },
  { label: 'Inventory', to: '/inventory', icon: CubeIcon },
  { label: 'Account', to: '/account', icon: UserCircleIcon },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore logout errors
    } finally {
      clearAuth();
      navigate('/login', { replace: true });
    }
  };

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : 'User';

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <aside className="flex flex-col h-full bg-white border-r border-gray-100">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100">
        <span className="text-2xl font-extrabold text-orange-600 tracking-tight">Ajo</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )
            }
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-gray-100 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          {user?.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={displayName}
              className="h-8 w-8 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
            {user?.email && (
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <ArrowRightStartOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}
