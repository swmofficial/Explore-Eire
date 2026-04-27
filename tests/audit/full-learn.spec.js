import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._errors = [];
  page.on('console', m => { if (m.type() === 'error') page._errors.push(m.text()); });
  page.on('pageerror', e => page._errors.push(e.message));
  await page.goto('/');
  await page.waitForTimeout(3000);
});

test('learn tab navigates to learn view', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/learn-01-view.png' });
});

test('course cards are visible', async ({ page }) => {
  await page.screenshot({ path: 'tests/audit/screenshots/learn-02-courses.png' });
});
