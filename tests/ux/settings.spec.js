import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.waitForTimeout(1500);
});

test('settings surface renders', async ({ page }) => {
  await page.screenshot({ path: 'tests/ux/screenshots/settings-01.png' });
  const nav = page.locator('nav').first();
  await expect(nav).toBeVisible();
});

test('no settings errors on navigation', async ({ page }) => {
  expect(page._errors).toHaveLength(0);
});
