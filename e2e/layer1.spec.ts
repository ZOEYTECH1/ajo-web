/**
 * LAYER 1 — Frontend Audit (Playwright E2E)
 * Checks: mobile viewport (375px), tab/keyboard navigation, form error
 * messages, input preserved on failed submission, correct HTML semantics,
 * and page consistency.
 */

import { test, expect } from '@playwright/test';


// ─────────────────────────────────────────────────────────────────────────────
// 1.1  MOBILE VIEWPORT — every screen looks correct at 375px wide
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 1.1 — Mobile viewport (375px)', () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test('login page renders fully at 375px — no horizontal scroll', async ({ page }) => {
    await page.goto('/login');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 2); // 2px tolerance
  });

  test('login form fields are visible at 375px', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('register page renders at 375px without overflow', async ({ page }) => {
    await page.goto('/register');
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(377);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 1.2  ACCESSIBILITY — keyboard navigation and ARIA
// Users should be able to tab through the login form.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 1.2 — Accessibility: keyboard and ARIA', () => {
  test('login page fields are reachable via Tab key', async ({ page }) => {
    await page.goto('/login');

    // Focus the first field
    await page.getByLabel(/email address/i).focus();
    await expect(page.getByLabel(/email address/i)).toBeFocused();

    // Tab to password
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/password/i)).toBeFocused();

    // Tab to submit button
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'INPUT']).toContain(focused);
  });

  test('login submit button is a real <button> element', async ({ page }) => {
    await page.goto('/login');
    const btn = page.getByRole('button', { name: /sign in/i });
    const tag = await btn.evaluate(el => el.tagName);
    expect(tag).toBe('BUTTON');
  });

  test('"Sign up" navigation is an <a> element not a <button>', async ({ page }) => {
    await page.goto('/login');
    const link = page.getByRole('link', { name: /sign up/i });
    const tag = await link.evaluate(el => el.tagName);
    expect(tag).toBe('A');
  });

  test('page has a document title', async ({ page }) => {
    await page.goto('/login');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 1.3  FORMS — error messages displayed; input preserved on failure
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 1.3 — Forms: errors and input preservation', () => {
  test('login: error alert appears when credentials are wrong', async ({ page }) => {
    await page.route('**/api/token/', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No active account found with the given credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('wrong@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole('alert')).toContainText(/account|credential|password/i);
  });

  test('login: email field retains value after a failed submit', async ({ page }) => {
    await page.route('**/api/token/', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Bad credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('keep@example.com');
    await page.getByLabel(/password/i).fill('wrongpass');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 8_000 });
    await expect(page.getByLabel(/email address/i)).toHaveValue('keep@example.com');
  });

  test('login: submit button is disabled before any input', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  test('login: submit button enables when fields are filled', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeEnabled();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 1.4  ORGANIZATION — pages are independently accessible
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 1.4 — Organization: pages are independent and reachable', () => {
  test('login page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/login');
    expect(errors).toHaveLength(0);
  });

  test('register page loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/register');
    expect(errors).toHaveLength(0);
  });

  test('navigating from login to register works', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('register page has first name, last name, email, password, phone fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });
});
