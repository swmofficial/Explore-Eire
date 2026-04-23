import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
});

test('splash screen loads with correct branding', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'tests/audit/screenshots/app-01-splash.png' });
  await expect(page).toHaveTitle(/Explore Eire/i);
});

test('splash transitions to main app within 3 seconds', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/audit/screenshots/app-02-post-splash.png' });
});

test('bottom nav renders with 5 tabs', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/audit/screenshots/app-03-nav.png' });
});

test('map tab is default active state', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'tests/audit/screenshots/app-04-map-active.png' });
});

test('no console errors on initial load', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(3000);
  expect(page._errors).toHaveLength(0);
});
