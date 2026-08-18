import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import useAuthStore from './store/useAuthStore';
import { Layout } from './components/ui/Layout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OTPPage from './pages/auth/OTPPage';

// App pages
import DashboardPage from './pages/DashboardPage';
import InventoryDashboardPage from './pages/inventory/InventoryDashboardPage';
import InventoryAnalyticsPage from './pages/inventory/InventoryAnalyticsPage';
import InventorySalesPage from './pages/inventory/InventorySalesPage';
import InventoryProductsPage from './pages/inventory/InventoryProductsPage';
import AjoGroupsPage from './pages/ajo/AjoGroupsPage';
import AjoGroupDetailPage from './pages/ajo/AjoGroupDetailPage';
import ThriftPage from './pages/thrift/ThriftPage';
import AccountPage from './pages/account/AccountPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: ReactNode }) {
  const tokens = useAuthStore((s) => s.tokens);
  if (!tokens) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<OTPPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory"
            element={
              <ProtectedRoute>
                <InventoryDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/analytics"
            element={
              <ProtectedRoute>
                <InventoryAnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/sales"
            element={
              <ProtectedRoute>
                <InventorySalesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inventory/products/:catId"
            element={
              <ProtectedRoute>
                <InventoryProductsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ajo"
            element={
              <ProtectedRoute>
                <AjoGroupsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ajo/:id"
            element={
              <ProtectedRoute>
                <AjoGroupDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/thrift"
            element={
              <ProtectedRoute>
                <ThriftPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
