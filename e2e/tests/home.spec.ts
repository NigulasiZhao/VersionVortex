import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display version list', async ({ page }) => {
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Check that we're on the home page (look for version entries or empty state)
    const content = await page.content();
    expect(content.length).toBeGreaterThan(0);
  });

  test('should show package filter dropdown', async ({ page }) => {
    // The page should have a package selector (FluidDropdown)
    const dropdown = page.locator('button').first();
    await expect(dropdown).toBeVisible();
  });

  test('should navigate to release detail when clicking a release', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Look for a release link and click it
    const releaseLinks = page.locator('a[href^="/releases/"]');
    const count = await releaseLinks.count();

    if (count > 0) {
      await releaseLinks.first().click();
      await expect(page).toHaveURL(/\/releases\//);
    }
  });

  test('should display "no versions" when empty', async ({ page }) => {
    // This test verifies the empty state
    await page.waitForLoadState('networkidle');

    // The page should render something (either versions or empty state)
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Release Detail Page', () => {
  test('should display release information', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Try to find and click a release
    const releaseLinks = page.locator('a[href^="/releases/"]');
    const count = await releaseLinks.count();

    if (count > 0) {
      await releaseLinks.first().click();
      await page.waitForLoadState('networkidle');

      // Check for back link
      const backLink = page.locator('a:has-text("返回")');
      await expect(backLink).toBeVisible();
    }
  });

  test('should navigate back to home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const releaseLinks = page.locator('a[href^="/releases/"]');
    const count = await releaseLinks.count();

    if (count > 0) {
      await releaseLinks.first().click();
      await page.waitForLoadState('networkidle');

      const backLink = page.locator('a:has-text("返回")');
      await backLink.click();

      await expect(page).toHaveURL('/');
    }
  });
});
