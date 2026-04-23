import { test, expect } from '@playwright/test';

test('home page loads with map', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Explore Eire/);

  const mapContainer = page.locator('#map');
  await expect(mapContainer).toBeVisible();

  await page.screenshot({ path: 'test-results/home.png', fullPage: true });
});
