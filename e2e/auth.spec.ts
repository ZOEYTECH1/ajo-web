import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('navigates to login page and shows form fields', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ajo');
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('shows error when submitting invalid credentials', async ({ page }) => {
    // Mock the backend to return 401
    await page.route('**/api/token/', async (route) => {
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

    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('alert')).toContainText(/account/i);
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.route('**/api/token/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access: 'e2e-access-token', refresh: 'e2e-refresh-token' }),
      });
    });

    await page.route('**/api/auth/me/', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          phone_number: '+2348000000000',
          role: 'member',
          is_email_verified: true,
          selectedModules: ['ajo', 'inventory', 'thrift'],
        }),
      });
    });

    await page.route('**/api/notifications/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  });

  test('redirects unauthenticated users from protected routes to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('register page is accessible from login page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(page.getByLabel(/first name/i)).toBeVisible();
  });
});
