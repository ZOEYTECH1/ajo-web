/**
 * Thrift Group E2E Tests (Playwright)
 *
 * Covers: collector approve-payment flow, payer confirm/dispute flow,
 * member management, and access-control redirects.
 *
 * All API calls are intercepted via page.route() — no backend required.
 */

import { test, expect, type Page } from '@playwright/test';

// ─── Shared fixtures ───────────────────────────────────────────────────────────

const COLLECTOR_USER = {
  id: 1,
  email: 'collector@example.com',
  first_name: 'Alice',
  last_name: 'Collector',
  full_name: 'Alice Collector',
  phone_number: '+2341111111111',
  role: 'member',
  is_email_verified: true,
  selectedModules: ['ajo'],
};

const PAYER_USER = {
  id: 2,
  email: 'payer@example.com',
  first_name: 'Bob',
  last_name: 'Payer',
  full_name: 'Bob Payer',
  phone_number: '+2342222222222',
  role: 'member',
  is_email_verified: true,
  selectedModules: ['ajo'],
};

const GROUP_BASE = {
  id: 1,
  name: 'Test Thrift Group',
  description: 'A test group',
  frequency: 'monthly',
  cycle_type: 'rolling',
  collector: { id: 1, full_name: 'Alice Collector', email: 'collector@example.com' },
  organization: null,
  invite_code: 'TESTCODE',
  member_count: 2,
  is_on_trial: true,
  is_subscription_active: false,
  active_cycle: null,
  created_at: '2024-01-01T00:00:00Z',
  my_removal_request: null,
};

const COLLECTOR_GROUP = { ...GROUP_BASE, is_collector: true, is_org_admin: false };
const PAYER_GROUP    = { ...GROUP_BASE, is_collector: false, is_org_admin: false };

const APPROVED_MEMBER = {
  id: 10,
  user: { id: 2, full_name: 'Bob Payer', email: 'payer@example.com', is_kyc_verified: false },
  personal_amount: '5000',
  status: 'approved',
  flag_reason: '',
  joined_at: '2024-02-01T00:00:00Z',
  total_saved: '15000',
  created_at: '2024-01-15T00:00:00Z',
};

const PENDING_MEMBER = {
  id: 11,
  user: { id: 3, full_name: 'Carol Pending', email: 'carol@example.com', is_kyc_verified: false },
  personal_amount: '3000',
  status: 'pending',
  flag_reason: '',
  joined_at: null,
  total_saved: '0',
  created_at: '2024-03-01T00:00:00Z',
};

const MY_MEMBER_RECORD = {
  id: 20,
  user: { id: 2, full_name: 'Bob Payer', email: 'payer@example.com', is_kyc_verified: false },
  personal_amount: '5000',
  status: 'approved',
  flag_reason: '',
  joined_at: '2024-02-01T00:00:00Z',
  total_saved: '15000',
  created_at: '2024-01-15T00:00:00Z',
};

const PENDING_PAYMENT = {
  id: 100,
  member: 20,
  member_name: 'Bob Payer',
  cycle_id: null,
  amount: '5000',
  period_date: '2024-09-01',
  notes: '',
  marked_at: '2024-09-01T10:00:00Z',
  status: 'pending',
  payer_confirmed: false,
  dispute_reason: '',
  dispute_audio: null,
  disputed_at: null,
  resolved_at: null,
};

const CONFIRMED_PAYMENT = { ...PENDING_PAYMENT, id: 101, status: 'confirmed' };

// ─── Helper: seed auth and mock the /auth/me/ endpoint ─────────────────────────

async function seedAuth(page: Page, user: typeof COLLECTOR_USER) {
  await page.addInitScript((u) => {
    localStorage.setItem('access', 'fake-access-token');
    localStorage.setItem('refresh', 'fake-refresh-token');
    // Pre-seed the Zustand auth store via localStorage key if the app persists it
    // (belt-and-suspenders: the /auth/me/ mock below is the canonical path)
    localStorage.setItem('auth-user', JSON.stringify(u));
  }, user);

  await page.route('**/api/auth/me/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(user),
    });
  });
}

async function mockThriftEndpoints(
  page: Page,
  {
    group,
    members,
    payments,
    cycles,
  }: {
    group: object;
    members?: object[];
    payments?: object[];
    cycles?: object[];
  },
) {
  await page.route('**/api/thrift/1/', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(group) });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/thrift/1/members/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(members ?? []),
    });
  });

  await page.route('**/api/thrift/1/payments/', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(payments ?? []),
      });
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/thrift/1/cycles/', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(cycles ?? []),
    });
  });
}


// ─────────────────────────────────────────────────────────────────────────────
// T1 — REDIRECT: unauthenticated users cannot access thrift detail
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T1 — Unauthenticated redirect', () => {
  test('/thrift/1 redirects to /login without auth token', async ({ page }) => {
    await page.goto('/thrift/1');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// T2 — COLLECTOR VIEW: Approve Payments section
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T2 — Collector: Approve Payments section', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, COLLECTOR_USER);
    await mockThriftEndpoints(page, {
      group: COLLECTOR_GROUP,
      members: [APPROVED_MEMBER, PENDING_MEMBER],
      payments: [],
      cycles: [],
    });
    await page.goto('/thrift/1');
  });

  test('collector sees the "Collector" badge in the header', async ({ page }) => {
    await expect(page.getByText('Collector', { exact: true })).toBeVisible({ timeout: 10_000 });
  });

  test('"Approve Payments" section is visible in the Payments tab', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /approve payments/i })).toBeVisible({ timeout: 10_000 });
  });

  test('approved member appears in the Approve Payments table', async ({ page }) => {
    // Bob Payer should be in the table
    const rows = page.locator('table').first().locator('tbody tr');
    await expect(rows.first()).toContainText('Bob Payer', { timeout: 10_000 });
  });

  test('clicking Approve shows amount input pre-filled with member\'s usual amount', async ({ page }) => {
    // Wait for the Approve Payments table to appear
    await expect(page.getByRole('heading', { name: /approve payments/i })).toBeVisible({ timeout: 10_000 });

    // Click the first Approve button
    await page.getByRole('button', { name: 'Approve' }).first().click();

    // Amount input should appear with pre-filled value
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible({ timeout: 5_000 });
    await expect(amountInput).toHaveValue('5000');
  });

  test('Confirm button posts payment to the API', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /approve payments/i })).toBeVisible({ timeout: 10_000 });

    let captured: Record<string, unknown> | null = null;
    await page.route('**/api/thrift/1/payments/', async route => {
      if (route.request().method() === 'POST') {
        captured = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', { name: 'Approve' }).first().click();

    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible({ timeout: 5_000 });

    // Change the amount
    await amountInput.fill('4500');
    await page.getByRole('button', { name: 'Confirm' }).click();

    // Wait for the POST to happen
    await page.waitForTimeout(1000);
    expect(captured).not.toBeNull();
    expect(captured!.member_id).toBe(10);
    expect(captured!.amount).toBe('4500');
  });

  test('pressing Enter in amount field submits the payment', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /approve payments/i })).toBeVisible({ timeout: 10_000 });

    let postCalled = false;
    await page.route('**/api/thrift/1/payments/', async route => {
      if (route.request().method() === 'POST') {
        postCalled = true;
        await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({}) });
      } else {
        await route.continue();
      }
    });

    await page.getByRole('button', { name: 'Approve' }).first().click();
    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible({ timeout: 5_000 });
    await amountInput.press('Enter');

    await page.waitForTimeout(800);
    expect(postCalled).toBe(true);
  });

  test('pressing Escape cancels the inline input', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /approve payments/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Approve' }).first().click();

    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible({ timeout: 5_000 });

    await amountInput.press('Escape');

    // Input should be gone, Approve button should be back
    await expect(amountInput).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible();
  });

  test('clicking Cancel closes the inline input', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /approve payments/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Approve' }).first().click();

    const amountInput = page.locator('input[type="number"]');
    await expect(amountInput).toBeVisible({ timeout: 5_000 });

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(amountInput).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible();
  });

  test('invite code is visible for collector', async ({ page }) => {
    await expect(page.getByText('TESTCODE')).toBeVisible({ timeout: 10_000 });
  });

  test('Report Collector button is NOT visible for collector', async ({ page }) => {
    // Collector should not see this button
    const reportBtn = page.getByRole('button', { name: /report collector/i });
    await expect(reportBtn).not.toBeVisible();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// T3 — PAYER VIEW: Payment confirm / dispute
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T3 — Payer: Confirm and Dispute payments', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, PAYER_USER);
    await mockThriftEndpoints(page, {
      group: PAYER_GROUP,
      members: [MY_MEMBER_RECORD],
      payments: [PENDING_PAYMENT, CONFIRMED_PAYMENT],
      cycles: [],
    });
    await page.goto('/thrift/1');
  });

  test('"Approve Payments" section is NOT shown for payer', async ({ page }) => {
    // Wait for page to load
    await expect(page.getByText('Test Thrift Group')).toBeVisible({ timeout: 10_000 });
    const heading = page.getByRole('heading', { name: /approve payments/i });
    await expect(heading).not.toBeVisible();
  });

  test('pending payment shows Confirm and Dispute buttons for payer', async ({ page }) => {
    await expect(page.getByText('Bob Payer').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /dispute/i })).toBeVisible();
  });

  test('clicking Confirm calls the confirm endpoint', async ({ page }) => {
    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible({ timeout: 10_000 });

    let confirmCalled = false;
    await page.route('**/api/thrift/1/payments/100/confirm/', async route => {
      confirmCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.getByRole('button', { name: /confirm/i }).click();
    await page.waitForTimeout(800);
    expect(confirmCalled).toBe(true);
  });

  test('clicking Dispute opens the dispute modal', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dispute/i })).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /dispute/i }).click();

    // DisputeModal heading
    await expect(page.getByRole('heading', { name: /dispute payment/i })).toBeVisible({ timeout: 5_000 });
  });

  test('confirmed payment does NOT show Confirm / Dispute buttons', async ({ page }) => {
    await expect(page.getByText('Bob Payer').first()).toBeVisible({ timeout: 10_000 });

    // There should be exactly one Confirm button (for the pending payment only)
    const confirmBtns = page.getByRole('button', { name: /^confirm$/i });
    await expect(confirmBtns).toHaveCount(1);
  });

  test('"Collector" badge is NOT shown for payer', async ({ page }) => {
    await expect(page.getByText('Test Thrift Group')).toBeVisible({ timeout: 10_000 });
    // The "Collector" chip is only shown when is_collector = true
    const collectorBadge = page.locator('span', { hasText: /^Collector$/ });
    await expect(collectorBadge).not.toBeVisible();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// T4 — COLLECTOR: Delete pending payment, cannot delete confirmed
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T4 — Collector: Delete payment', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, COLLECTOR_USER);
  });

  test('Delete button shown for pending payment in Payment History', async ({ page }) => {
    await mockThriftEndpoints(page, {
      group: COLLECTOR_GROUP,
      members: [APPROVED_MEMBER],
      payments: [PENDING_PAYMENT],
      cycles: [],
    });
    await page.goto('/thrift/1');
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible({ timeout: 10_000 });
  });

  test('Delete button NOT shown for confirmed payment', async ({ page }) => {
    await mockThriftEndpoints(page, {
      group: COLLECTOR_GROUP,
      members: [APPROVED_MEMBER],
      payments: [CONFIRMED_PAYMENT],
      cycles: [],
    });
    await page.goto('/thrift/1');
    await expect(page.getByText('Test Thrift Group')).toBeVisible({ timeout: 10_000 });
    const deleteBtn = page.getByRole('button', { name: 'Delete' });
    await expect(deleteBtn).not.toBeVisible();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// T5 — COLLECTOR: Member management (pending tab Approve/Reject)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T5 — Collector: Member management', () => {
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, COLLECTOR_USER);
    await mockThriftEndpoints(page, {
      group: COLLECTOR_GROUP,
      members: [APPROVED_MEMBER, PENDING_MEMBER],
      payments: [],
      cycles: [],
    });
    await page.goto('/thrift/1');
    // Switch to Members tab
    await page.getByRole('button', { name: /members/i }).click();
  });

  test('pending sub-tab shows Approve and Reject buttons', async ({ page }) => {
    // Click Pending sub-tab (exact start-anchor avoids matching "Members (1 + 1 pending)")
    await page.getByRole('button', { name: /^Pending/i }).click();
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeVisible();
  });

  test('approved sub-tab does NOT show Approve/Reject buttons', async ({ page }) => {
    // The approved sub-tab is selected by default
    const approveBtn = page.getByRole('button', { name: 'Approve' });
    // In the approved sub-tab there should be no member action buttons
    await expect(approveBtn).not.toBeVisible({ timeout: 5_000 });
  });

  test('clicking Approve on pending member calls the patch endpoint', async ({ page }) => {
    await page.getByRole('button', { name: /^Pending/i }).click();
    await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible({ timeout: 8_000 });

    let captured: Record<string, unknown> | null = null;
    await page.route('**/api/thrift/1/members/11/', async route => {
      captured = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await page.waitForTimeout(800);

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe('approve');
  });

  test('clicking Reject on pending member calls the patch endpoint', async ({ page }) => {
    await page.getByRole('button', { name: /^Pending/i }).click();
    await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeVisible({ timeout: 8_000 });

    let captured: Record<string, unknown> | null = null;
    await page.route('**/api/thrift/1/members/11/', async route => {
      captured = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await page.getByRole('button', { name: 'Reject' }).click();
    await page.waitForTimeout(800);

    expect(captured).not.toBeNull();
    expect(captured!.action).toBe('reject');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// T6 — PAYER: Report Collector (org-linked group)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T6 — Payer: Report Collector button (org group)', () => {
  test('Report Collector button is visible when group has an org', async ({ page }) => {
    await seedAuth(page, PAYER_USER);
    await mockThriftEndpoints(page, {
      group: {
        ...PAYER_GROUP,
        organization: { id: 5, name: 'Test Org' },
      },
      members: [MY_MEMBER_RECORD],
      payments: [],
      cycles: [],
    });

    await page.goto('/thrift/1');
    await expect(page.getByRole('button', { name: /report collector/i })).toBeVisible({ timeout: 10_000 });
  });

  test('Report Collector button opens the report modal', async ({ page }) => {
    await seedAuth(page, PAYER_USER);
    await mockThriftEndpoints(page, {
      group: { ...PAYER_GROUP, organization: { id: 5, name: 'Test Org' } },
      members: [MY_MEMBER_RECORD],
      payments: [],
      cycles: [],
    });

    await page.goto('/thrift/1');
    await page.getByRole('button', { name: /report collector/i }).click();
    await expect(page.getByRole('heading', { name: /report collector/i })).toBeVisible({ timeout: 5_000 });
  });

  test('Report Collector button NOT shown for non-org group', async ({ page }) => {
    await seedAuth(page, PAYER_USER);
    await mockThriftEndpoints(page, {
      group: PAYER_GROUP, // organization: null
      members: [MY_MEMBER_RECORD],
      payments: [],
      cycles: [],
    });

    await page.goto('/thrift/1');
    await expect(page.getByText('Test Thrift Group')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: /report collector/i })).not.toBeVisible();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// T7 — ERROR STATE: non-existent group shows error message
// ─────────────────────────────────────────────────────────────────────────────

test.describe('T7 — Error state: group not found', () => {
  test('404 from group endpoint shows "Group not found" message', async ({ page }) => {
    await seedAuth(page, PAYER_USER);

    // Members/payments/cycles return empty arrays (they may 200 or fail gracefully).
    // Only the group itself returns 404.
    await mockThriftEndpoints(page, {
      group: {},  // will be overridden below
      members: [],
      payments: [],
      cycles: [],
    });

    // Override: group endpoint returns 404
    await page.route('**/api/thrift/1/', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Not found.' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('/thrift/1');

    await expect(page.getByText(/group not found|do not have access/i)).toBeVisible({ timeout: 10_000 });
  });
});
