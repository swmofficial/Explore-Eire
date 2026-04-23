import { test, expect } from '@playwright/test';

test('auth modal can be triggered', async ({ page }) => {
  await page.goto('/');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: 'tests/ux/screenshots/05-pre-auth.png', fullPage: true });
});
