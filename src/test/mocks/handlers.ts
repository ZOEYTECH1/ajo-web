import { http, HttpResponse } from 'msw';

const BASE = '/api';

const sampleUser = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  phone_number: '+2348000000000',
  role: 'member',
  is_email_verified: true,
  selectedModules: ['ajo', 'inventory', 'thrift'],
};

const sampleDashboard = {
  total_revenue: 500000,
  total_expenses: 200000,
  profit: 300000,
  total_products: 45,
  low_stock_count: 5,
  out_of_stock_count: 2,
  revenue_by_period: [
    { period: 'Jan', revenue: 80000, expenses: 40000 },
    { period: 'Feb', revenue: 100000, expenses: 45000 },
    { period: 'Mar', revenue: 120000, expenses: 50000 },
    { period: 'Apr', revenue: 90000, expenses: 35000 },
    { period: 'May', revenue: 110000, expenses: 30000 },
  ],
  low_stock_products: [
    { id: 1, name: 'Rice (50kg)', quantity: 3, reorder_level: 10, category: 'Grains' },
    { id: 2, name: 'Palm Oil (5L)', quantity: 2, reorder_level: 5, category: 'Oils' },
  ],
  businesses: [{ id: 1, name: 'Main Store' }],
};

export const handlers = [
  // Auth: login
  http.post(`${BASE}/token/`, () => {
    return HttpResponse.json({
      access: 'test-access-token',
      refresh: 'test-refresh-token',
    });
  }),

  // Auth: token refresh
  http.post(`${BASE}/token/refresh/`, () => {
    return HttpResponse.json({ access: 'new-test-access-token' });
  }),

  // Auth: get current user
  http.get(`${BASE}/auth/me/`, () => {
    return HttpResponse.json(sampleUser);
  }),

  // Auth: register
  http.post(`${BASE}/auth/register/`, () => {
    return HttpResponse.json({ message: 'Registration successful. Check your email for OTP.' });
  }),

  // Auth: verify OTP
  http.post(`${BASE}/auth/verify-otp/`, () => {
    return HttpResponse.json({
      access: 'test-access-token',
      refresh: 'test-refresh-token',
    });
  }),

  // Auth: logout
  http.post(`${BASE}/auth/logout/`, () => {
    return HttpResponse.json({ message: 'Logged out.' });
  }),

  // Inventory dashboard
  http.get(`${BASE}/inventory/dashboard/`, () => {
    return HttpResponse.json(sampleDashboard);
  }),

  // Ajo groups
  http.get(`${BASE}/groups/`, () => {
    return HttpResponse.json([]);
  }),

  // Notifications
  http.get(`${BASE}/notifications/`, () => {
    return HttpResponse.json([]);
  }),
];
