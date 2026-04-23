import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('no stripe errors on load', async ({ page }) => {
  expect(page._errors.filter(e =>
    e.toLowerCase().includes('stripe') ||
    e.toLowerCase().includes('payment')
  )).toHaveLength(0);
});
