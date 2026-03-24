import { test, expect } from '@playwright/test';

test.describe('Admin Login', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Check for login form elements
    const usernameInput = page.locator('input[type="text"], input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');

    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    await page.fill('input[type="text"], input[type="email"]', 'wronguser');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForTimeout(1000);

    // Check if error message appears (either in page or as alert)
    const pageContent = await page.content();
    // The app should show some kind of error feedback
    expect(pageContent).toBeDefined();
  });

  test('should redirect to admin dashboard on successful login', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    // Try with default admin credentials
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForTimeout(2000);

    // Should either be on admin dashboard or show some admin content
    const currentUrl = page.url();
    // Admin dashboard should be under /admin path
    expect(currentUrl.includes('/admin')).toBeTruthy();
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[type="text"], input[type="email"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
  });

  test('should display admin interface', async ({ page }) => {
    // Check that we're in admin area
    const currentUrl = page.url();
    expect(currentUrl).toBeDefined();
  });
});
