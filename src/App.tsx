import { useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import { Layout } from './components/ui/Layout';
import api from './services/api';
import type { User } from './services/authService';
import { useModuleAccess } from './hooks/useModuleAccess';

export function ProtectedLayout() {
  const tokens = useAuthStore((s) => s.tokens);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const location = useLocation();
  // isNewUser only turns true once detection has actually confirmed there's
  // no real data anywhere for this account -- see useModuleAccess's own
  // comment for why selected_modules.length === 0 alone isn't enough (an
  // existing user whose account predates this field is also empty for a
  // moment before detection silently fills it in from their real usage).
  const { isLoading: modulesDetecting, isNewUser } = useModuleAccess();

  // Rehydrate the user object on every fresh page load so auth-dependent UI
  // (e.g. isCollector checks) works correctly after a browser refresh.
  useEffect(() => {
    if (tokens && !user) {
      api.get<User>('/auth/me/').then(r => setUser(r.data)).catch(() => clearAuth());
    }
  }, [tokens, user, setUser, clearAuth]);

  if (!tokens) return <Navigate to="/login" replace />;

  // A brand-new Google sign-in has phone_number: null — force them through
  // complete-profile before anything else, same as mobile's AuthGuard.
  if (user && !user.phone_number && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  if (user && user.phone_number && location.pathname !== '/pick-modules') {
    // Still detecting whether this is a brand-new account or an existing one
    // just waiting to sync -- hold here rather than rendering the full
    // sidebar with an as-yet-unknown module set.
    if (modulesDetecting) return null;
    if (isNewUser) return <Navigate to="/pick-modules" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return <Outlet />;
}
