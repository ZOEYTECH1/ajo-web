import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ChartBarIcon,
  CreditCardIcon,
  ArrowRightStartOnRectangleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import useAuthStore from '../store/useAuthStore';
import api from '../services/api';

interface OrgBrief {
  uuid: string;
  name: string;
}

const NAV_ITEMS = [
  { label: 'Dashboard',  path: '',         Icon: ChartBarIcon },
  { label: 'Billing',    path: '/billing',  Icon: CreditCardIcon },
];

export default function OrgAdminLayout() {
  const { uuid } = useParams<{ uuid: string }>();
  const navigate  = useNavigate();
  const clearAuth = useAuthStore(s => s.clearAuth);
  const tokens    = useAuthStore(s => s.tokens);

  // Redirect to org login if not authenticated
  useEffect(() => {
    if (!tokens?.access && !localStorage.getItem('access')) {
      navigate('/org', { replace: true });
    }
  }, [tokens, navigate]);

  const { data: orgs = [] } = useQuery<OrgBrief[]>({
    queryKey: ['thrift-user-orgs'],
    queryFn: () => api.get('/thrift/orgs/').then(r => r.data),
    enabled: !!(tokens?.access || localStorage.getItem('access')),
  });

  const orgName = orgs.find(o => o.uuid === uuid)?.name ?? 'Organisation';

  function handleSignOut() {
    clearAuth();
    navigate('/org', { replace: true });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>

      {/* ── Top header bar ─────────────────────────────────────────────── */}
      <header
        className="h-14 flex items-center justify-between px-6 flex-shrink-0 border-b"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-extrabold text-teal-600 tracking-tight">Ajo</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
            Organisation Admin
          </span>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-red-600"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside
          className="w-60 flex flex-col flex-shrink-0 border-r"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          {/* Org identity */}
          <div className="px-4 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-2.5">
              <span
                className="flex-shrink-0 h-9 w-9 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center"
              >
                <BuildingOffice2Icon className="h-5 w-5 text-teal-600" />
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-bold truncate leading-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {orgName}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Admin portal
                </p>
              </div>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV_ITEMS.map(({ label, path, Icon }) => (
              <NavLink
                key={label}
                to={`/org/${uuid}${path}`}
                end={path === ''}
                className={({ isActive }) => clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-semibold border border-teal-100'
                    : 'hover:bg-teal-50/50',
                )}
                style={({ isActive }) => isActive ? {} : { color: 'var(--text-secondary)' }}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Sign out at bottom */}
          <div className="px-3 pb-5 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <ArrowRightStartOnRectangleIcon className="h-4 w-4 flex-shrink-0" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
