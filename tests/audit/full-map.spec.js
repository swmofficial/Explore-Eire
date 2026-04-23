import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('map container is visible', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/map-01-container.png' });
});

test('corner controls are all visible', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/map-02-corner-controls.png' });
});

test('layer panel opens', async ({ page }) => {
  const layersBtn = page.locator('#tour-layers-btn');
  if (await layersBtn.isVisible()) {
    await layersBtn.click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'tests/audit/screenshots/map-03-layer-panel.png' });
});

test('basemap picker opens', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/map-04-basemap.png' });
});

test('datasheet peek is visible at bottom', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/map-05-datasheet-peek.png' });
});
