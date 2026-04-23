import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page._consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      page._consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    page._consoleErrors.push(err.message);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  if (page._consoleErrors.length > 0) {
    testInfo.annotations.push({
      type: 'console-errors',
      description: page._consoleErrors.join('\n')
    });
  }
});

test('auth modal can be triggered', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/ux/screenshots/05-pre-auth.png', fullPage: true });
});
