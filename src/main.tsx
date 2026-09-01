import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import './index.css';

import App, { ProtectedLayout } from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { initSentry } from './lib/sentry';

// Initialise Sentry as early as possible.
// Safe to call with an empty/missing VITE_SENTRY_DSN — it will skip initialisation.
initSentry();

// Org portal (public, no auth required)
const OrgLoginPage                  = lazy(() => import('./pages/org/OrgLoginPage'));

// Auth pages
const LoginPage                     = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage                  = lazy(() => import('./pages/auth/RegisterPage'));
const OTPPage                       = lazy(() => import('./pages/auth/OTPPage'));
const ForgotPasswordPage            = lazy(() => import('./pages/auth/ForgotPasswordPage'));

// App pages
const DashboardPage                 = lazy(() => import('./pages/DashboardPage'));
const NotificationsPage             = lazy(() => import('./pages/NotificationsPage'));
const AccountPage                   = lazy(() => import('./pages/account/AccountPage'));
const PrivacyPage                   = lazy(() => import('./pages/account/PrivacyPage'));

// Ajo pages
const AjoGroupsPage                 = lazy(() => import('./pages/ajo/AjoGroupsPage'));
const AjoGroupDetailPage            = lazy(() => import('./pages/ajo/AjoGroupDetailPage'));
const AjoPaymentHistoryPage         = lazy(() => import('./pages/ajo/AjoPaymentHistoryPage'));
const AjoSubscriptionPage           = lazy(() => import('./pages/ajo/AjoSubscriptionPage'));

// Thrift pages
const ThriftPage                    = lazy(() => import('./pages/thrift/ThriftPage'));
const ThriftGroupDetailPage         = lazy(() => import('./pages/thrift/ThriftGroupDetailPage'));
const ThriftPaymentHistoryPage      = lazy(() => import('./pages/thrift/ThriftPaymentHistoryPage'));
const ThriftQueuePage               = lazy(() => import('./pages/thrift/ThriftQueuePage'));
const ThriftBillingPage             = lazy(() => import('./pages/thrift/ThriftBillingPage'));
const ThriftOrgPage                 = lazy(() => import('./pages/thrift/ThriftOrgPage'));
const ThriftOrgBillingPage          = lazy(() => import('./pages/thrift/ThriftOrgBillingPage'));
const ThriftOrgCreatePage           = lazy(() => import('./pages/thrift/ThriftOrgCreatePage'));

// Inventory pages
const InventoryDashboardPage        = lazy(() => import('./pages/inventory/InventoryDashboardPage'));
const InventoryAnalyticsPage        = lazy(() => import('./pages/inventory/InventoryAnalyticsPage'));
const InventorySalesPage            = lazy(() => import('./pages/inventory/InventorySalesPage'));
const InventoryCategoriesPage       = lazy(() => import('./pages/inventory/InventoryCategoriesPage'));
const InventoryProductsPage         = lazy(() => import('./pages/inventory/InventoryProductsPage'));
const InventoryExpensesPage         = lazy(() => import('./pages/inventory/InventoryExpensesPage'));
const InventoryCustomersPage        = lazy(() => import('./pages/inventory/InventoryCustomersPage'));
const InventoryBusinessPage         = lazy(() => import('./pages/inventory/InventoryBusinessPage'));
const InventoryTransfersPage        = lazy(() => import('./pages/inventory/InventoryTransfersPage'));
const InventoryWarehouseReceivePage = lazy(() => import('./pages/inventory/InventoryWarehouseReceivePage'));
const InventoryWarehouseDispatchPage= lazy(() => import('./pages/inventory/InventoryWarehouseDispatchPage'));
const InventoryProductRequestsPage  = lazy(() => import('./pages/inventory/InventoryProductRequestsPage'));
const InventorySubscriptionPage     = lazy(() => import('./pages/inventory/InventorySubscriptionPage'));
const InventoryBestSellersPage      = lazy(() => import('./pages/inventory/InventoryBestSellersPage'));

const router = createBrowserRouter([
  {
    element: <App />,
    path: '/',
    children: [
      // Public routes
      { path: 'org/:slug',        element: <OrgLoginPage /> },
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
          { path: 'thrift/org/create',                 element: <ThriftOrgCreatePage /> },
          { path: 'thrift/org/:id',                   element: <ThriftOrgPage /> },
          { path: 'thrift/org/:id/billing',           element: <ThriftOrgBillingPage /> },
          { path: 'thrift/:id',                       element: <ThriftGroupDetailPage /> },
          { path: 'account',                          element: <AccountPage /> },
          { path: 'account/privacy',                  element: <PrivacyPage /> },
          { path: 'inventory/warehouse/receive',       element: <InventoryWarehouseReceivePage /> },
          { path: 'inventory/warehouse/dispatch',      element: <InventoryWarehouseDispatchPage /> },
          { path: 'inventory/product-requests',        element: <InventoryProductRequestsPage /> },
          { path: 'inventory/subscription',            element: <InventorySubscriptionPage /> },
          { path: 'inventory/best-sellers',            element: <InventoryBestSellersPage /> },
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
      <ErrorBoundary>
        <Suspense fallback={null}>
          <RouterProvider router={router} />
        </Suspense>
      </ErrorBoundary>
    </ThemeProvider>
  </StrictMode>,
);
