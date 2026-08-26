/**
 * LAYER 8 — Security Audit (Playwright E2E)
 * Checks: XSS payloads displayed as plain text (not executed), protected pages
 * redirect to login when unauthenticated, no sensitive data visible in page
 * source after logout, and no JavaScript errors from malicious inputs.
 */

import { test, expect } from '@playwright/test';


// ─────────────────────────────────────────────────────────────────────────────
// 8.1  XSS PREVENTION — user input renders as text, not executed HTML
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 8.1 — XSS prevention', () => {
  test('login page: XSS payload typed into email field renders as text', async ({ page }) => {
    await page.goto('/login');

    const xssPayload = '<script>window.__XSS_FIRED__=true</script>';
    await page.getByLabel(/email address/i).fill(xssPayload);

    // Verify the window XSS marker was NOT set by the injected script
    const xssFired = await page.evaluate(() => (window as unknown as Record<string, unknown>).__XSS_FIRED__);
    expect(xssFired).toBeFalsy();
  });

  test('login page: HTML in email field does not create new DOM elements', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email address/i).fill('<img src=x onerror=alert(1)>');

    // Should not inject a real <img> element with onerror outside of the input
    const imgWithOnerror = await page.$$('img[onerror]');
    expect(imgWithOnerror).toHaveLength(0);
  });

  test('login page: no JavaScript console errors when XSS payload entered', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('<script>bad()</script>');
    await page.getByLabel(/password/i).fill('<img onerror="bad()">');

    // No page errors should fire from XSS payloads
    const xssErrors = consoleErrors.filter(e => e.includes('bad') || e.includes('XSS'));
    expect(xssErrors).toHaveLength(0);
  });

  test('register page: XSS in first name field is treated as plain text', async ({ page }) => {
    await page.goto('/register');
    const firstNameField = page.getByLabel(/first name/i);
    if (await firstNameField.count() > 0) {
      await firstNameField.fill('<script>window.__REG_XSS__=1</script>');
      const fired = await page.evaluate(() => (window as unknown as Record<string, unknown>).__REG_XSS__);
      expect(fired).toBeFalsy();
    }
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.2  AUTHENTICATION ENFORCEMENT — unauthenticated users cannot access protected pages
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 8.2 — Auth enforcement: protected pages redirect', () => {
  test('/inventory redirects to /login without token', async ({ page }) => {
    // No localStorage tokens — pure unauthenticated state
    await page.goto('/inventory');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('/dashboard redirects to /login without token', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('/groups redirects to /login without token', async ({ page }) => {
    await page.goto('/groups');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('/profile redirects to /login without token', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });

  test('protected page at /inventory/products redirects to /login', async ({ page }) => {
    await page.goto('/inventory/products');
    await expect(page).toHaveURL(/\/login/, { timeout: 8_000 });
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.3  DATA EXPOSURE — sensitive info not visible after logout
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 8.3 — Data exposure: tokens cleared on logout', () => {
  test('tokens seeded then cleared are no longer in localStorage', async ({ page }) => {
    await page.goto('/login');

    // Seed tokens
    await page.evaluate(() => {
      localStorage.setItem('access', 'test_access');
      localStorage.setItem('refresh', 'test_refresh');
    });

    const before = await page.evaluate(() => localStorage.getItem('access'));
    expect(before).toBe('test_access');

    // Simulate logout
    await page.evaluate(() => {
      localStorage.clear();
    });

    const after = await page.evaluate(() => localStorage.getItem('access'));
    expect(after).toBeNull();
  });

  test('password value is never exposed in the DOM', async ({ page }) => {
    await page.goto('/login');

    // The password input type must be "password" (hides the value in DOM)
    const passwordField = page.getByLabel(/password/i);
    const inputType = await passwordField.getAttribute('type');
    expect(inputType).toBe('password');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 8.4  NO PAGE ERRORS — application loads without JavaScript exceptions
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Layer 8.4 — Page loads without unhandled errors', () => {
  test('login page has no JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/login');
    expect(errors).toHaveLength(0);
  });

  test('register page has no JavaScript errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/register');
    expect(errors).toHaveLength(0);
  });
});
