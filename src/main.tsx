import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';

import App, { ProtectedLayout } from './App';

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
          { path: 'inventory/products/:catId',  element: <InventoryProductsPage /> },
          { path: 'ajo',                        element: <AjoGroupsPage /> },
          { path: 'ajo/:id',                    element: <AjoGroupDetailPage /> },
          { path: 'thrift',                     element: <ThriftPage /> },
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
    <RouterProvider router={router} />
  </StrictMode>,
);
