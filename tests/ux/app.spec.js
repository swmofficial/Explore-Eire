import { test, expect } from '@playwright/test';

test('app loads and shows splash screen', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'tests/ux/screenshots/01-load.png', fullPage: true });
  await expect(page).toHaveTitle(/Explore Eire/i);
});

test('splash screen transitions to app', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/ux/screenshots/02-after-splash.png', fullPage: true });
});

test('bottom nav is visible', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2500);
  const nav = await page.locator('nav').first();
  await expect(nav).toBeVisible();
  await page.screenshot({ path: 'tests/ux/screenshots/03-nav.png', fullPage: true });
});

test('map container is present', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/ux/screenshots/04-map.png', fullPage: true });
});
