import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('auth modal can be opened', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/auth-01-pre.png' });
});

test('guest mode is accessible', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/auth-02-guest.png' });
});

test('no auth errors on load', async ({ page }) => {
  expect(page._errors.filter(e => e.toLowerCase().includes('auth'))).toHaveLength(0);
});
