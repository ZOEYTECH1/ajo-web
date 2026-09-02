/**
 * E2E tests for the Organisation Portal (/org) and related features.
 *
 * Tests:
 *  O1 — /org login page renders without auth
 *  O2 — Login with non-org account shows error message
 *  O3 — Login with org admin (1 org) redirects to org dashboard
 *  O4 — Login with org admin (multiple orgs) shows org picker
 *  O5 — Org picker button navigates to the selected org
 *  O6 — ThriftPage nav links: payer sees My Payment History, not Collector Queue
 *  O7 — ThriftPage nav links: collector sees Collector Queue and Organisation, not My Payment History
 *  O8 — ThriftPage nav links: org admin (not collector) sees Organisation link pointing to their org UUID
 */

import { test, expect, type Page } from '@playwright/test';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_URL = 'http://localhost:5173';

const ORG_UUID_1 = '3b7f4a12-0000-0000-0000-000000000001';
const ORG_UUID_2 = '3b7f4a12-0000-0000-0000-000000000002';

const PAYER_USER = {
  id: 10, email: 'payer@test.com', first_name: 'Payer', last_name: 'User',
  full_name: 'Payer User', profile_photo: null, phone: '', has_used_trial: false,
  is_verified: true,
};

const COLLECTOR_USER = {
  id: 20, email: 'collector@test.com', first_name: 'Collector', last_name: 'User',
  full_name: 'Collector User', profile_photo: null, phone: '', has_used_trial: false,
  is_verified: true,
};

const ORG_ADMIN_USER = {
  id: 30, email: 'orgadmin@test.com', first_name: 'Org', last_name: 'Admin',
  full_name: 'Org Admin', profile_photo: null, phone: '', has_used_trial: false,
  is_verified: true,
};

const PAYER_GROUP = {
  id: 1, name: 'Payer Group', description: '', frequency: 'monthly', cycle_type: 'rolling',
  invite_code: 'PAY001', member_count: 5,
  is_on_trial: false, is_subscription_active: true,
  collector: { id: 99, full_name: 'Someone Else', email: 'other@test.com' },
  organization: null,
  trial_start: null, trial_end: null, subscription_expires: null, active_cycle: null,
  created_at: '2024-01-01T00:00:00Z',
};

const COLLECTOR_GROUP = {
  id: 2, name: 'Collector Group', description: '', frequency: 'weekly', cycle_type: 'rolling',
  invite_code: 'COL001', member_count: 3,
  is_on_trial: false, is_subscription_active: true,
  collector: { id: 20, full_name: 'Collector User', email: 'collector@test.com' },
  organization: null,
  trial_start: null, trial_end: null, subscription_expires: null, active_cycle: null,
  created_at: '2024-01-01T00:00:00Z',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedAuth(page: Page, user: typeof PAYER_USER) {
  await page.addInitScript((u) => {
    localStorage.setItem('access', 'fake-access-token');
    localStorage.setItem('refresh', 'fake-refresh-token');
    localStorage.setItem('auth-user', JSON.stringify(u));
  }, user);
  await page.route('**/api/auth/me/', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) });
  });
}

async function mockLoginEndpoint(page: Page, user: typeof PAYER_USER) {
  await page.route('**/api/auth/login/', async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ access: 'fake-token', refresh: 'fake-refresh', user }),
    });
  });
}

async function mockOrgsEndpoint(page: Page, orgs: { uuid: string; name: string }[]) {
  await page.route('**/api/thrift/orgs/', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(orgs) });
  });
}

// ── O1: /org page renders without auth ───────────────────────────────────────

test('O1 — /org login page renders without authentication', async ({ page }) => {
  await page.goto(`${BASE_URL}/org`);
  await expect(page.getByRole('heading', { name: 'Organisation Portal', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sign in here/ })).toBeVisible();
});

// ── O2: Login with non-org account shows error ────────────────────────────────

test('O2 — non-org account login shows "not linked" error', async ({ page }) => {
  await mockLoginEndpoint(page, PAYER_USER);
  await mockOrgsEndpoint(page, []); // no orgs for this user

  await page.goto(`${BASE_URL}/org`);
  await page.getByLabel('Email address').fill('payer@test.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('alert')).toContainText('not linked to any organisation');
});

// ── O3: Org admin with 1 org goes straight to dashboard ──────────────────────

test('O3 — org admin with 1 org is redirected to org dashboard', async ({ page }) => {
  await mockLoginEndpoint(page, ORG_ADMIN_USER);
  await mockOrgsEndpoint(page, [{ uuid: ORG_UUID_1, name: 'LAPO MFB' }]);

  // Mock the org dashboard endpoint so the page loads
  await page.route(`**/api/thrift/orgs/${ORG_UUID_1}/dashboard/`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        organization: { uuid: ORG_UUID_1, name: 'LAPO MFB', org_type: 'mfb', is_verified: true },
        collectors: [], pending_collectors: [], groups: [],
        payment_stats: { total: 0, confirmed: 0, disputed: 0, pending: 0, total_collected: 0, savings_mobilization: 0 },
        recent_reports: [], collector_stats: {},
      }),
    });
  });
  await page.route('**/api/auth/me/', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ORG_ADMIN_USER) });
  });

  await page.goto(`${BASE_URL}/org`);
  await page.getByLabel('Email address').fill('orgadmin@test.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page).toHaveURL(new RegExp(`/thrift/org/${ORG_UUID_1}`));
  await expect(page.getByText('LAPO MFB')).toBeVisible();
});

// ── O4: Org admin with multiple orgs sees picker ──────────────────────────────

test('O4 — org admin with multiple orgs sees org picker', async ({ page }) => {
  await mockLoginEndpoint(page, ORG_ADMIN_USER);
  await mockOrgsEndpoint(page, [
    { uuid: ORG_UUID_1, name: 'LAPO MFB' },
    { uuid: ORG_UUID_2, name: 'AB Microfinance Bank' },
  ]);

  await page.goto(`${BASE_URL}/org`);
  await page.getByLabel('Email address').fill('orgadmin@test.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.getByRole('heading', { name: 'Select Organisation', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'LAPO MFB' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'AB Microfinance Bank' })).toBeVisible();
});

// ── O5: Org picker button navigates to the selected org ──────────────────────

test('O5 — org picker button navigates to correct org UUID', async ({ page }) => {
  await mockLoginEndpoint(page, ORG_ADMIN_USER);
  await mockOrgsEndpoint(page, [
    { uuid: ORG_UUID_1, name: 'LAPO MFB' },
    { uuid: ORG_UUID_2, name: 'AB Microfinance Bank' },
  ]);
  await page.route(`**/api/thrift/orgs/${ORG_UUID_2}/dashboard/`, async route => {
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({
        organization: { uuid: ORG_UUID_2, name: 'AB Microfinance Bank', org_type: 'mfb', is_verified: false },
        collectors: [], pending_collectors: [], groups: [],
        payment_stats: { total: 0, confirmed: 0, disputed: 0, pending: 0, total_collected: 0, savings_mobilization: 0 },
        recent_reports: [], collector_stats: {},
      }),
    });
  });
  await page.route('**/api/auth/me/', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ORG_ADMIN_USER) });
  });

  await page.goto(`${BASE_URL}/org`);
  await page.getByLabel('Email address').fill('orgadmin@test.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await page.getByRole('button', { name: 'AB Microfinance Bank' }).click();

  await expect(page).toHaveURL(new RegExp(`/thrift/org/${ORG_UUID_2}`));
  await expect(page.getByText('AB Microfinance Bank')).toBeVisible();
});

// ── O6: Payer sees My Payment History, not Collector Queue ────────────────────

test('O6 — payer sees My Payment History, not Collector Queue or Organisation', async ({ page }) => {
  await seedAuth(page, PAYER_USER);
  await page.route('**/api/thrift/', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([PAYER_GROUP]) });
  });
  await mockOrgsEndpoint(page, []);

  await page.goto(`${BASE_URL}/thrift`);

  await expect(page.getByRole('link', { name: /My Payment History/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Collector Queue/ })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /Organisation/ })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /Billing/ })).not.toBeVisible();
});

// ── O7: Collector sees Collector Queue and Organisation, not Payment History ──

test('O7 — collector sees Collector Queue and Organisation, not My Payment History', async ({ page }) => {
  await seedAuth(page, COLLECTOR_USER);
  await page.route('**/api/thrift/', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([COLLECTOR_GROUP]) });
  });
  await mockOrgsEndpoint(page, []);

  await page.goto(`${BASE_URL}/thrift`);

  await expect(page.getByRole('link', { name: /My Payment History/ })).not.toBeVisible();
  await expect(page.getByRole('link', { name: /Collector Queue/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Organisation/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Billing/ })).toBeVisible();
});

// ── O8: Org admin Organisation link points to their org UUID ─────────────────

test('O8 — org admin Organisation link points to their org UUID', async ({ page }) => {
  await seedAuth(page, ORG_ADMIN_USER);
  await page.route('**/api/thrift/', async route => {
    // Org admin has no groups as collector or payer
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await mockOrgsEndpoint(page, [{ uuid: ORG_UUID_1, name: 'LAPO MFB' }]);

  await page.goto(`${BASE_URL}/thrift`);

  const orgLink = page.getByRole('link', { name: /Organisation/ });
  await expect(orgLink).toBeVisible();
  await expect(orgLink).toHaveAttribute('href', `/thrift/org/${ORG_UUID_1}`);
});
