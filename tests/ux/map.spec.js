import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('map container renders', async ({ page }) => {
  await page.screenshot({ path: 'tests/ux/screenshots/map-01.png' });
});

test('no map errors on load', async ({ page }) => {
  const mapErrors = page._errors.filter(e =>
    e.toLowerCase().includes('maplibre') ||
    e.toLowerCase().includes('map') ||
    e.toLowerCase().includes('layer')
  );
  expect(mapErrors).toHaveLength(0);
});
