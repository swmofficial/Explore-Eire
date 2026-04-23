import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('datasheet peek visible at bottom', async ({ page }) => {
  await page.screenshot({ path: 'tests/ux/screenshots/sheets-01.png' });
});

test('no sheet errors on load', async ({ page }) => {
  expect(page._errors).toHaveLength(0);
});
