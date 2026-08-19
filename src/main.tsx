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
import AjoSubscriptionPage from './pages/ajo/AjoSubscriptionPage';
import ThriftPage from './pages/thrift/ThriftPage';
import ThriftGroupDetailPage from './pages/thrift/ThriftGroupDetailPage';
import ThriftPaymentHistoryPage from './pages/thrift/ThriftPaymentHistoryPage';
import ThriftQueuePage from './pages/thrift/ThriftQueuePage';
import ThriftBillingPage from './pages/thrift/ThriftBillingPage';
import ThriftOrgPage from './pages/thrift/ThriftOrgPage';
import NotificationsPage from './pages/NotificationsPage';
import AccountPage from './pages/account/AccountPage';
import PrivacyPage from './pages/account/PrivacyPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import InventoryBusinessPage from './pages/inventory/InventoryBusinessPage';
import InventoryTransfersPage from './pages/inventory/InventoryTransfersPage';
import InventoryWarehouseReceivePage from './pages/inventory/InventoryWarehouseReceivePage';
import InventoryWarehouseDispatchPage from './pages/inventory/InventoryWarehouseDispatchPage';
import InventoryProductRequestsPage from './pages/inventory/InventoryProductRequestsPage';
import InventorySubscriptionPage from './pages/inventory/InventorySubscriptionPage';

const router = createBrowserRouter([
  {
    element: <App />,
    path: '/',
    children: [
      // Public routes
      { path: 'login',            element: <LoginPage /> },
      { path: 'register',         element: <RegisterPage /> },
      { path: 'verify-otp',       element: <OTPPage /> },
      { path: 'forgot-password',  element: <ForgotPasswordPage /> },

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
          { path: 'inventory/business',         element: <InventoryBusinessPage /> },
          { path: 'inventory/transfers',        element: <InventoryTransfersPage /> },
          { path: 'notifications',                    element: <NotificationsPage /> },
          { path: 'ajo',                              element: <AjoGroupsPage /> },
          { path: 'ajo/history',                      element: <AjoPaymentHistoryPage /> },
          { path: 'ajo/:id',                          element: <AjoGroupDetailPage /> },
          { path: 'ajo/:id/subscription',             element: <AjoSubscriptionPage /> },
          { path: 'thrift',                           element: <ThriftPage /> },
          { path: 'thrift/history',                   element: <ThriftPaymentHistoryPage /> },
          { path: 'thrift/queue',                     element: <ThriftQueuePage /> },
          { path: 'thrift/billing',                   element: <ThriftBillingPage /> },
          { path: 'thrift/org/:id',                   element: <ThriftOrgPage /> },
          { path: 'thrift/:id',                       element: <ThriftGroupDetailPage /> },
          { path: 'account',                          element: <AccountPage /> },
          { path: 'account/privacy',                  element: <PrivacyPage /> },
          { path: 'inventory/warehouse/receive',       element: <InventoryWarehouseReceivePage /> },
          { path: 'inventory/warehouse/dispatch',      element: <InventoryWarehouseDispatchPage /> },
          { path: 'inventory/product-requests',        element: <InventoryProductRequestsPage /> },
          { path: 'inventory/subscription',            element: <InventorySubscriptionPage /> },
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
