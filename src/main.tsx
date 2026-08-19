import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';

import App, { ProtectedLayout } from './App';
import { ThemeProvider } from './context/ThemeContext';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import OTPPage from './pages/auth/OTPPage';

// App pages
import DashboardPage from './pages/DashboardPage';
import InventoryDashboardPage from './pages/inventory/InventoryDashboardPage';
import InventoryAnalyticsPage from './pages/inventory/InventoryAnalyticsPage';
import InventorySalesPage from './pages/inventory/InventorySalesPage';
import InventoryCategoriesPage from './pages/inventory/InventoryCategoriesPage';
import InventoryProductsPage from './pages/inventory/InventoryProductsPage';
import InventoryExpensesPage from './pages/inventory/InventoryExpensesPage';
import InventoryCustomersPage from './pages/inventory/InventoryCustomersPage';
import AjoGroupsPage from './pages/ajo/AjoGroupsPage';
import AjoGroupDetailPage from './pages/ajo/AjoGroupDetailPage';
import AjoPaymentHistoryPage from './pages/ajo/AjoPaymentHistoryPage';
import ThriftPage from './pages/thrift/ThriftPage';
import ThriftGroupDetailPage from './pages/thrift/ThriftGroupDetailPage';
import ThriftPaymentHistoryPage from './pages/thrift/ThriftPaymentHistoryPage';
import AccountPage from './pages/account/AccountPage';

const router = createBrowserRouter([
  {
    element: <App />,
    path: '/',
    children: [
      // Public routes
      { path: 'login',      element: <LoginPage /> },
      { path: 'register',   element: <RegisterPage /> },
      { path: 'verify-otp', element: <OTPPage /> },

      // Protected routes — wrapped in sidebar layout + auth guard
      {
        element: <ProtectedLayout />,
        children: [
          { index: true,                        element: <DashboardPage /> },
          { path: 'dashboard',                  element: <DashboardPage /> },
          { path: 'inventory',                  element: <InventoryDashboardPage /> },
          { path: 'inventory/analytics',        element: <InventoryAnalyticsPage /> },
          { path: 'inventory/sales',            element: <InventorySalesPage /> },
          { path: 'inventory/categories',       element: <InventoryCategoriesPage /> },
          { path: 'inventory/products/:catId',  element: <InventoryProductsPage /> },
          { path: 'inventory/expenses',         element: <InventoryExpensesPage /> },
          { path: 'inventory/customers',        element: <InventoryCustomersPage /> },
          { path: 'ajo',                        element: <AjoGroupsPage /> },
          { path: 'ajo/history',                element: <AjoPaymentHistoryPage /> },
          { path: 'ajo/:id',                    element: <AjoGroupDetailPage /> },
          { path: 'thrift',                     element: <ThriftPage /> },
          { path: 'thrift/history',             element: <ThriftPaymentHistoryPage /> },
          { path: 'thrift/:id',                 element: <ThriftGroupDetailPage /> },
          { path: 'account',                    element: <AccountPage /> },
          { path: '*',                          element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
