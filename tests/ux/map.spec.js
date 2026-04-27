import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._mapMessages = [];
  page.on('console', m => {
    if (m.type() === 'error' || m.type() === 'warning') {
      page._mapMessages.push(m.text());
    }
  });
  page.on('pageerror', e => page._mapMessages.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('map canvas renders with non-zero size', async ({ page }) => {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  expect(box.width).toBeGreaterThan(0);
  expect(box.height).toBeGreaterThan(0);
  await page.screenshot({ path: 'tests/ux/screenshots/map-01.png' });
});

test('no MapLibre paint parse errors', async ({ page }) => {
  const paintErrors = page._mapMessages.filter(m =>
    m.toLowerCase().includes('color expected') ||
    m.toLowerCase().includes('number expected') ||
    m.toLowerCase().includes('expression parse error')
  );
  expect(paintErrors).toHaveLength(0);
});

test('no map layer errors on load', async ({ page }) => {
  const layerErrors = page._mapMessages.filter(m =>
    m.toLowerCase().includes('layer') && m.toLowerCase().includes('error')
  );
  expect(layerErrors).toHaveLength(0);
});
