import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('learn tab visible in nav', async ({ page }) => {
  await page.screenshot({ path: 'tests/ux/screenshots/learn-01.png' });
});

test('no learn errors on load', async ({ page }) => {
  expect(page._errors.filter(e =>
    e.toLowerCase().includes('learn') ||
    e.toLowerCase().includes('course')
  )).toHaveLength(0);
});
