import { test, expect } from '@playwright/test';
import { bypassOnboarding, waitForAppReady, TIERS } from '../_helpers.js';

test.describe('rvsv-str-011 — Client-side subscription bypass', () => {
  test.beforeEach(async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('https://explore-eire.vercel.app');
    await waitForAppReady(page);
  });

  test('Free user can bypass subscription check by manipulating localStorage', async ({ page }) => {
    // Verify we start as a guest/free user (no auth)
    const initialTier = await page.evaluate(() => {
      const store = localStorage.getItem('user-store');
      if (!store) return 'guest';
      const parsed = JSON.parse(store);
      return parsed.state?.isPro ? 'pro' : 'free';
    });
    expect(['guest', 'free']).toContain(initialTier);

    // Attempt client-side bypass: force isPro to true in userStore
    await page.evaluate(() => {
      const store = localStorage.getItem('user-store');
      if (store) {
        const parsed = JSON.parse(store);
        if (parsed.state) {
          parsed.state.isPro = true;
          parsed.state.isGuest = false;
          parsed.state.tier = 'pro';
          localStorage.setItem('user-store', JSON.stringify(parsed));
        }
      }
    });

    // Reload to apply the manipulated state
    await page.reload();
    await waitForAppReady(page);

    // Navigate to Map view (Gold module)
    await page.locator('nav button').filter({ hasText: /map/i }).click();
    await page.waitForTimeout(1000);

    // Attempt to add a waypoint (Pro feature according to CornerControls.jsx)
    const waypointBtn = page.locator('button[aria-label="Add waypoint"]');
    if (await waypointBtn.isVisible()) {
      await waypointBtn.click();
      await page.waitForTimeout(500);
    }

    // Try to access Track feature (Pro-gated in CategoryHeader.jsx)
    // Look for track/stopwatch button if it exists in the UI
    const trackBtn = page.locator('button').filter({ hasText: /track|go/i }).first();
    if (await trackBtn.count() > 0 && await trackBtn.isVisible()) {
      await trackBtn.click();
      await page.waitForTimeout(500);
    }

    // Attempt API call to create a waypoint with manipulated client state
    const response = await page.request.post('https://lxnnlebfyrjmlvhrmxvo.supabase.co/rest/v1/waypoints', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4bm5sZWJmeXJqbWx2aHJteHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NDM4MTUsImV4cCI6MjA0OTQxOTgxNX0.wlp3Sxqv3ppFUIL31HqnlLiF3WQJI8BpY4oVHXo0xHU',
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Bypass Test Waypoint',
        latitude: 53.3498,
        longitude: -6.2603,
        module: 'gold',
      },
      failOnStatusCode: false,
    });

    // VULNERABILITY TEST:
    // If server has proper RLS, this should fail (401/403)
    // If vulnerable, it will succeed (200/201) despite client-side manipulation
    if (response.status() === 200 || response.status() === 201) {
      throw new Error(
        `VULNERABILITY CONFIRMED: Free user bypassed subscription check via localStorage manipulation. ` +
        `API accepted waypoint creation with status ${response.status()} despite no valid pro subscription.`
      );
    }

    // Expected: 401 Unauthorized or 403 Forbidden
    expect([401, 403]).toContain(response.status());
  });

  test('Free user accessing pro features via direct Supabase client calls', async ({ page, context }) => {
    // Start as guest/free
    await page.evaluate(() => {
      const store = localStorage.getItem('user-store');
      if (store) {
        const parsed = JSON.parse(store);
        if (parsed.state) {
          parsed.state.isPro = false;
          parsed.state.isGuest = true;
          localStorage.setItem('user-store', JSON.stringify(parsed));
        }
      }
    });

    await page.reload();
    await waitForAppReady(page);

    // Attempt to fetch pro-gated gold samples (au_ppb >= 100) via API
    const samplesResponse = await page.request.get(
      'https://lxnnlebfyrjmlvhrmxvo.supabase.co/rest/v1/gold_samples?au_ppb=gte.100&select=*&order=au_ppb.desc&limit=10',
      {
        headers: {
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4bm5sZWJmeXJqbWx2aHJteHZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NDM4MTUsImV4cCI6MjA0OTQxOTgxNX0.wlp3Sxqv3ppFUIL31HqnlLiF3WQJI8BpY4oVHXo0xHU',
        },
        failOnStatusCode: false,
      }
    );

    // VULNERABILITY TEST:
    // If RLS is properly configured, free users should not access pro-tier samples
    // If vulnerable, query succeeds and returns data
    if (samplesResponse.status() === 200) {
      const data = await samplesResponse.json();
      if (Array.isArray(data) && data.length > 0) {
        throw new Error(
          `VULNERABILITY CONFIRMED: Free user accessed ${data.length} pro-gated gold samples ` +
          `(au_ppb >= 100) without subscription. Server-side RLS not enforcing tier restrictions.`
        );
      }
    }

    // Expected: either 403 Forbidden, or 200 with empty array (RLS filtering)
    expect([200, 403]).toContain(samplesResponse.status());
    if (samplesResponse.status() === 200) {
      const data = await samplesResponse.json();
      expect(data).toEqual([]);
    }
  });

  test('Pro features accessible after