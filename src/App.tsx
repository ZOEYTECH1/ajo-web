import { Outlet, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useAuthStore from './store/useAuthStore';
import { Layout } from './components/ui/Layout';

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
