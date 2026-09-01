import { useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/useAuthStore';
import { Layout } from './components/ui/Layout';
import api from './services/api';
import type { User } from './services/authService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      // 5 minutes — stable data (profiles, group details, rate tables) should
      // not re-fetch on every navigation; individual queries that need fresher
      // data (notifications) override this with their own staleTime.
      staleTime: 5 * 60 * 1000,
    },
  },
});

export function ProtectedLayout() {
  const tokens = useAuthStore((s) => s.tokens);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  // Rehydrate the user object on every fresh page load so auth-dependent UI
  // (e.g. isCollector checks) works correctly after a browser refresh.
  useEffect(() => {
    if (tokens && !user) {
      api.get<User>('/auth/me/').then(r => setUser(r.data)).catch(() => clearAuth());
    }
  }, [tokens, user, setUser, clearAuth]);

  if (!tokens) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
