import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'Learn' }).click();
  await page.waitForTimeout(1500);
});

test('learn surface renders', async ({ page }) => {
  await page.screenshot({ path: 'tests/ux/screenshots/learn-01.png' });
  const nav = page.locator('nav').first();
  await expect(nav).toBeVisible();
});

test('no learn errors on navigation', async ({ page }) => {
  expect(page._errors.filter(e =>
    e.toLowerCase().includes('learn') ||
    e.toLowerCase().includes('course')
  )).toHaveLength(0);
});
