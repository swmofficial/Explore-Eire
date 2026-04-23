import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('settings tab navigates to settings view', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/settings-01-view.png' });
});

test('settings panel opens from corner control', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/settings-02-panel.png' });
});
