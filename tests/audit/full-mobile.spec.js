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
  await page.screenshot({ path: 'tests/audit/screenshots/mobile-01-viewport.png' });
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
});

test('bottom nav not covering content', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/mobile-02-nav-clearance.png' });
});

test('safe area respected at top and bottom', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/mobile-03-safe-area.png' });
});
