import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(2500);
  // Navigate to map tab — DataSheet only renders inside MapView
  await page.getByRole('button', { name: 'Map' }).click();
  await page.waitForTimeout(3000);
});

test('map canvas renders before DataSheet check', async ({ page }) => {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.screenshot({ path: 'tests/ux/screenshots/sheets-01.png' });
});

test('datasheet container is present in DOM', async ({ page }) => {
  const sheet = page.locator('[data-testid="datasheet"]');
  await expect(sheet).toBeAttached();
});

test('datasheet peek is within viewport at bottom', async ({ page }) => {
  const sheet = page.locator('[data-testid="datasheet"]');
  const box = await sheet.boundingBox();
  expect(box).not.toBeNull();
  // Outer wrapper bottom edge should reach the nav bar (64px from bottom)
  const viewportHeight = page.viewportSize().height;
  expect(box.y + box.height).toBeGreaterThanOrEqual(viewportHeight - 80);
  await page.screenshot({ path: 'tests/ux/screenshots/sheets-02.png' });
});

test('no sheet errors on map tab', async ({ page }) => {
  expect(page._errors).toHaveLength(0);
});
