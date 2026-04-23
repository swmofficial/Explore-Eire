import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('no horizontal scroll at 390px', async ({ page }) => {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  await page.screenshot({ path: 'tests/ux/screenshots/mobile-01.png' });
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
});

test('bottom nav visible on mobile', async ({ page }) => {
  const nav = page.locator('nav').first();
  await expect(nav).toBeVisible();
  await page.screenshot({ path: 'tests/ux/screenshots/mobile-02.png' });
});
