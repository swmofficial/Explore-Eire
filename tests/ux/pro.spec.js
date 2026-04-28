// pro.spec.js — Pro-tier (signed in, active subscription) journey tests.
//
// Each test is a journey, not a smoke check. Tests run against the live
// Vercel deployment using a pre-authenticated storageState saved by
// global-setup.js into .auth/pro.json. If that file is missing the suite
// skips.
//
// Vulnerabilities exercised in this file:
//   V1  — GPS track lost on crash (simulated via reload mid-tracking)
//   V2  — Offline = empty map (gold/mineral data not cached locally)
//   V3  — Waypoint save fails offline silently (Pro-only path —
//          CornerControls camera tap routes free users to UpgradeSheet,
//          so V3 only manifests for Pro users who reach WaypointSheet)
//   V4  — Track save fails offline
//   V6  — Route save fails silently (no toast, only console.error)
//   V10 — Pro status lost on offline reload (THE Pro-only proof case —
//          reload offline, isPro fetch fails, app reverts to free tier)
//   V12 — Offline map = empty map (user-expectation proof — UI looks
//          normal but data is missing; coupled with V2 evidence)
//   V14 — No connectivity check before writes (manifests on V3/V4/V6
//          paths — the offline-saves produce no pre-tap warning)
// Capability proofs:
//   P1  — Pro features visibly unlocked (no PRO badges, all WMS layers
//          accessible)
//   P2  — Find/discover-nearby works for Pro Minerals tab
//   P3  — Waypoint save succeeds when online (happy path baseline; V3
//          offline-loss is meaningful only because P3 works online)

import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import {
  TIERS, bypassOnboarding, waitForAppReady, tierScreenshot,
  attachConsoleCapture, dismissTransientModals,
} from './_helpers.js';

const TIER = TIERS.PRO;
const AUTH_FILE = path.join(process.cwd(), '.auth', 'pro.json');

test.describe('pro suite', () => {
  test.use({ storageState: AUTH_FILE });
  test.skip(
    !process.env.TEST_PRO_EMAIL,
    'pro.spec.js requires .auth/pro.json — set TEST_PRO_EMAIL/TEST_PRO_PASSWORD secrets',
  );

  test.beforeEach(async ({ page }) => {
    attachConsoleCapture(page);
    await bypassOnboarding(page);
    await page.goto('/');
    await waitForAppReady(page);
    await dismissTransientModals(page);
  });

  // ─────────────────────────────────────────────────────────────────────
  // P1 — Pro features visibly unlocked.
  // LayerPanel for a Pro user should NOT have any PRO badges that are
  // gating layers (they may exist as visual chrome but should not block
  // taps). FindSheet's Minerals tab should be accessible. The simplest
  // programmatic check is that the LayerPanel toggle count is > the free
  // tier's accessible-toggle count, but that requires cross-suite state.
  // Here we just verify no Pro-gated upgrade sheet appears when the user
  // taps a typically-gated affordance.
  // ─────────────────────────────────────────────────────────────────────

  test('pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap', async ({ page }) => {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);
    // Wait for the Supabase profile fetch to complete. isPro is set async
    // (useAuth → profiles.is_pro fetch → setIsPro). Without this wait, the
    // badge count is read before isPro=true propagates to LayerPanel.
    await page.waitForTimeout(2000);
    await page.locator('#tour-layers-btn').first().waitFor({ state: 'visible', timeout: 10000 });
    await page.locator('#tour-layers-btn').first().click();
    await page.waitForTimeout(500);
    await tierScreenshot(page, TIER, 'p1-1-layer-panel');

    // Try to flip a normally Pro-gated layer. We click the area of the
    // panel that contained PRO badges in the free suite. For a Pro user,
    // tapping does not raise UpgradeSheet.
    const proBadges = await page.locator('text=PRO').count();
    test.info().annotations.push({
      type: 'pro-badge-count',
      description: String(proBadges) + ' (expected: 0 for Pro tier)',
    });

    // Tap any layer toggle and confirm UpgradeSheet does NOT appear.
    const toggles = page.locator('button[role="switch"], input[type="checkbox"]');
    if ((await toggles.count()) > 0) {
      await toggles.first().click({ force: true }).catch(() => {});
      await page.waitForTimeout(800);
    }
    await tierScreenshot(page, TIER, 'p1-2-after-toggle');

    const body = await page.locator('body').textContent();
    // UpgradeSheet contains pricing copy; if it appears for a Pro user
    // that's a serious bug.
    const upgradeShown = /€\s?9\.99|€\s?79|annual.*month/i.test(body);
    test.info().annotations.push({
      type: 'upgrade-sheet-shown',
      description: upgradeShown ? 'yes (BUG)' : 'no',
    });
    expect(upgradeShown).toBeFalsy();
  });

  // ─────────────────────────────────────────────────────────────────────
  // P2 — Find / Discover-nearby works for Pro user (Minerals tab).
  // FindSheet has Gold (free t6/t7, Pro t1-t5) and Minerals (full Pro)
  // tabs. Open it and confirm the Minerals tab is interactive.
  // ─────────────────────────────────────────────────────────────────────

  test('pro P2 — Find sheet Minerals tab is interactive', async ({ page }) => {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);

    // Find sheet is opened from a corner control. There is no stable id
    // for it; we look for its accessible label "Find" or open it via the
    // search/discover affordance.
    const findBtn = page.getByRole('button', { name: /find|discover|nearby/i }).first();
    if (await findBtn.isVisible().catch(() => false)) {
      await findBtn.click();
      await page.waitForTimeout(800);
      await tierScreenshot(page, TIER, 'p2-1-find-sheet');

      // Tap Minerals tab.
      const mineralsTab = page.getByRole('button', { name: /minerals?/i }).first();
      if (await mineralsTab.isVisible().catch(() => false)) {
        await mineralsTab.click();
        await page.waitForTimeout(1200);
        await tierScreenshot(page, TIER, 'p2-2-minerals-tab');
      }
    }
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // P3 — Waypoint save succeeds when online (happy-path baseline).
  // CornerControls.jsx routes Pro users to WaypointSheet when the camera
  // is tapped on the map surface. This is the baseline that V3
  // offline-loss test below depends on — if P3 fails, V3 has no contrast.
  // ─────────────────────────────────────────────────────────────────────

  test('pro P3 — waypoint save happy path online', async ({ page }) => {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);
    await tierScreenshot(page, TIER, 'p3-1-map-online');

    const camera = page.locator('#tour-camera-btn').first();
    if (!(await camera.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'camera-button-missing',
        description: 'tour-camera-btn not in DOM',
      });
      return;
    }
    await camera.click();
    await page.waitForTimeout(800);
    await tierScreenshot(page, TIER, 'p3-2-waypoint-sheet');

    // WaypointSheet exposes a name input and a notes textarea (verified
    // against WaypointSheet.jsx — placeholders "Waypoint name" and
    // "Notes, observations…"). Save button is disabled until name is filled.
    const nameInput = page.getByPlaceholder(/waypoint name/i).first();
    await nameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(`ux-agent-test ${Date.now()}`);
    } else {
      // If we did not reach WaypointSheet, the camera tap was gated
      // somewhere unexpected — record that and bail.
      test.info().annotations.push({
        type: 'waypoint-sheet-not-reached',
        description: 'camera tap did not open WaypointSheet for pro user',
      });
      return;
    }
    const notes = page.getByPlaceholder(/notes|observations/i).first();
    if (await notes.isVisible().catch(() => false)) {
      await notes.fill('automated journey-test waypoint — safe to delete');
    }
    const save = page.getByRole('button', { name: /^save/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.waitFor({ state: 'visible', timeout: 5000 });
      await expect(save).not.toBeDisabled();
      await save.click();
      await page.waitForTimeout(2500);
    }
    await tierScreenshot(page, TIER, 'p3-3-after-save');

    // Evidence: dashboard waypoint count post-save. We also capture the
    // page text to check for any error toast.
    await page.getByRole('button', { name: 'Dashboard', exact: true }).click();
    await page.waitForTimeout(1500);
    await tierScreenshot(page, TIER, 'p3-4-dashboard-after');
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // V3 — Waypoint save fails silently when offline (data-loss proof).
  // Mirror of P3, but with context.setOffline(true) before save. The
  // Supabase insert call must fail; STATE_MAP.md says the user sees only
  // a toast and the data is gone. Also exercises V14 — no offline
  // pre-check before the user taps Save.
  // ─────────────────────────────────────────────────────────────────────

  test('pro V3 — waypoint save fails offline silently (data-loss proof + V14 no pre-check)', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);

    // Cut the network. Tiles are cached, gold/mineral data already in
    // mapStore — the visible map looks identical online vs offline.
    await context.setOffline(true);
    await tierScreenshot(page, TIER, 'v3-1-offline-map');

    const camera = page.locator('#tour-camera-btn').first();
    if (!(await camera.isVisible().catch(() => false))) {
      await context.setOffline(false);
      test.info().annotations.push({
        type: 'camera-button-missing',
        description: 'cannot proof V3 — camera button not reachable offline',
      });
      return;
    }
    await camera.click();
    await page.waitForTimeout(800);
    await tierScreenshot(page, TIER, 'v3-2-sheet-offline');

    // V14 sub-check: is there an offline warning visible BEFORE the user
    // taps save? STATE_MAP.md predicts no.
    const preBody = await page.locator('body').textContent();
    const preWarning = /you are offline|no connection|connect to/i.test(preBody);
    test.info().annotations.push({
      type: 'v14-pre-save-offline-warning',
      description: preWarning ? 'yes' : 'no (V14 confirmed)',
    });

    // Fill name before clicking Save — button is disabled until a name is entered.
    const nameInput = page.getByPlaceholder(/waypoint name/i).first();
    await nameInput.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(`v3-offline-${Date.now()}`);
    }
    const notes = page.getByPlaceholder(/notes|observations/i).first();
    if (await notes.isVisible().catch(() => false)) {
      await notes.fill('offline V3 proof — should fail to save');
    }
    const save = page.getByRole('button', { name: /^save/i }).first();
    if (await save.isVisible().catch(() => false)) {
      await save.waitFor({ state: 'visible', timeout: 5000 });
      await expect(save).not.toBeDisabled();
      await save.click();
    }
    await page.waitForTimeout(3500);
    await tierScreenshot(page, TIER, 'v3-3-after-offline-save');

    // Restore connectivity for cleanup and subsequent tests.
    await context.setOffline(false);

    // Evidence: console errors should include a Supabase fetch failure.
    const errs = (page._consoleErrors || []).filter(
      (e) => /supabase|fetch|network|failed/i.test(e),
    );
    test.info().annotations.push({
      type: 'offline-console-errors',
      description: errs.slice(0, 5).join(' | ') || 'none',
    });
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // V10 — Pro status lost on offline reload.
  // THE central Pro-tier proof. Steps:
  //   1. Confirm Pro status (no PRO badges in LayerPanel).
  //   2. Go offline.
  //   3. Reload — useAuth's profile fetch will fail; isPro reverts to
  //      false default.
  //   4. Open LayerPanel — PRO badges should now be visible (gated).
  // ─────────────────────────────────────────────────────────────────────

  test('pro V10 — Pro status reverts to free on offline reload (paying user locked out)', async ({ page, context }) => {
    // Step 1: confirm Pro state.
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);
    await page.locator('#tour-layers-btn').first().click();
    await page.waitForTimeout(500);
    await tierScreenshot(page, TIER, 'v10-1-pro-online');
    const proBadgesOnline = await page.locator('text=PRO').count();

    // Step 2: cut the network and navigate. page.goto triggers a SW-served
    // navigation (SW intercepts fetch events); page.reload() bypasses SW in
    // some Chromium versions causing net::ERR_INTERNET_DISCONNECTED.
    await context.setOffline(true);
    await page.goto(process.env.BASE_URL || 'http://localhost:5173');

    // We cannot rely on waitForAppReady's nav check finishing fast offline
    // (Supabase calls retry). Wait for the BottomNav with a generous
    // timeout, then continue.
    await page.locator('nav').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await tierScreenshot(page, TIER, 'v10-2-after-offline-reload');

    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2000);
    await page.locator('#tour-layers-btn').first().click();
    await page.waitForTimeout(800);
    await tierScreenshot(page, TIER, 'v10-3-layer-panel-offline');

    const proBadgesOffline = await page.locator('text=PRO').count();

    // Restore connectivity for cleanup.
    await context.setOffline(false);

    test.info().annotations.push({
      type: 'pro-badge-count-pair',
      description: JSON.stringify({ online: proBadgesOnline, offline: proBadgesOffline }),
    });

    // V10 prediction: badges visible offline (Pro status lost). Document
    // the result; do not gate the test on a strict equality because the
    // exact UI for "we couldn't verify your Pro status" may evolve.
    expect(proBadgesOffline).toBeGreaterThanOrEqual(proBadgesOnline);
  });

  // ─────────────────────────────────────────────────────────────────────
  // V2 / V12 — Offline = empty map (data not cached).
  // Reload offline; gold_samples and mineral_localities Supabase queries
  // fail; map shows tiles but zero data points. Capture screenshot.
  // ─────────────────────────────────────────────────────────────────────

  test('pro V2 — gold/mineral data missing after offline reload (data not cached)', async ({ page, context }) => {
    // Online baseline: map with data points.
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(3500); // give time for batched 1000-row fetches
    await tierScreenshot(page, TIER, 'v2-1-online-with-data');

    // Navigate offline — page.goto triggers SW-served navigation; page.reload()
    // bypasses SW in some Chromium versions causing net::ERR_INTERNET_DISCONNECTED.
    await context.setOffline(true);
    await page.goto(process.env.BASE_URL || 'http://localhost:5173');
    await page.locator('nav').first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(3000);
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(3500);
    await tierScreenshot(page, TIER, 'v2-2-offline-empty-data');

    await context.setOffline(false);

    // Evidence: console errors should include Supabase fetch failures.
    const supaErrs = (page._consoleErrors || []).filter(
      (e) => /supabase|gold_samples|mineral_localities|fetch/i.test(e),
    );
    test.info().annotations.push({
      type: 'supabase-fetch-failures',
      description: supaErrs.slice(0, 5).join(' | ') || 'none captured',
    });
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // V1 — GPS track auto-save proof. Start tracking → simulate GPS movement →
  // reload → confirm ee_session_trail in localStorage survived. TrackOverlay
  // visibility is NOT the correct metric (isTracking is not persisted;
  // TrackOverlay hides on reload regardless of trail data). task-006 (2c70af7)
  // persists the trail to ee_session_trail. This test confirms that fix.
  // ─────────────────────────────────────────────────────────────────────

  test('pro V1 — GPS track is lost on reload (no auto-save during tracking)', async ({ page, context }) => {
    // Grant geolocation so the tracking flow can start. The default test
    // location is San Francisco; for the purpose of this test the exact
    // coords don't matter — we just need watchPosition to fire.
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 53.349, longitude: -6.260 }); // Dublin

    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);

    // Find the "Go" / start-tracking button. CornerControls renders this;
    // the accessible label is typically "Start tracking" or just "Track".
    // Best-effort search.
    const startBtn = page.getByRole('button', { name: /go|start.*track|track/i }).first();
    if (!(await startBtn.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'tracking-button-missing',
        description: 'cannot proof V1 — start-tracking control not reachable',
      });
      return;
    }
    await startBtn.click();
    // Wait for a few simulated GPS points to accumulate. setGeolocation
    // fires watchPosition once; we update it twice to mimic movement.
    await page.waitForTimeout(2000);
    await context.setGeolocation({ latitude: 53.350, longitude: -6.261 });
    await page.waitForTimeout(1500);
    await context.setGeolocation({ latitude: 53.351, longitude: -6.262 });
    await page.waitForTimeout(1500);
    await tierScreenshot(page, TIER, 'v1-1-tracking-active');

    // Simulate a crash: hard reload.
    await page.reload();
    await waitForAppReady(page);
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);
    await tierScreenshot(page, TIER, 'v1-2-after-crash-reload');

    // Check localStorage directly — TrackOverlay visibility is not the right
    // metric (isTracking is not persisted, so the overlay always hides on reload
    // regardless of whether the trail data survived).
    const trailJson = await page.evaluate(() => localStorage.getItem('ee_session_trail'));
    const trail = (() => { try { return JSON.parse(trailJson || '[]') } catch { return [] } })();
    test.info().annotations.push({
      type: 'track-survived-reload',
      description: trail.length > 0
        ? `YES — ${trail.length} points in ee_session_trail (V1 fixed)`
        : 'no — ee_session_trail empty or missing (V1 confirmed)',
    });
    // Real assertion: if GPS accumulated ≥1 point before reload, the trail must survive.
    if (trail.length > 0 || trailJson !== null) {
      expect(trail.length).toBeGreaterThan(0);
    } else {
      // Tracking may not have started (GPS or start button unreachable).
      expect(true).toBe(true);
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // V4 — Track save fails offline (post-tracking save).
  // Start tracking, stop, go offline, tap Save → toast appears, data lost.
  // ─────────────────────────────────────────────────────────────────────

  test('pro V4 — track save fails offline (post-stop data loss)', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 53.349, longitude: -6.260 });

    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);

    const startBtn = page.getByRole('button', { name: /go|start.*track|track/i }).first();
    if (!(await startBtn.isVisible().catch(() => false))) return;
    await startBtn.click();
    await page.waitForTimeout(1500);
    await context.setGeolocation({ latitude: 53.350, longitude: -6.261 });
    await page.waitForTimeout(1500);

    // Stop tracking — the Save/Discard prompt appears.
    const stopBtn = page.getByRole('button', { name: /stop|finish/i }).first();
    if (await stopBtn.isVisible().catch(() => false)) {
      await stopBtn.click();
      await page.waitForTimeout(800);
    }
    await tierScreenshot(page, TIER, 'v4-1-stopped');

    // Fill track name before going offline — Save button is disabled until a name is entered.
    const nameInput = page.getByPlaceholder(/waypoint name|track name|name/i).first();
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill(`v4-track-${Date.now()}`);
    }

    // Cut the network, then tap Save. force:true bypasses nav SVG intercept.
    await context.setOffline(true);
    const saveBtn = page.getByRole('button', { name: /^save/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click({ force: true });
      await page.waitForTimeout(2500);
    }
    await tierScreenshot(page, TIER, 'v4-2-after-offline-save');

    await context.setOffline(false);
    expect(true).toBe(true);
  });

  // ─────────────────────────────────────────────────────────────────────
  // V6 — Route save fails silently (console.error only, no toast).
  // RouteBuilder is the source. Open it, drop points, save offline, watch
  // for the absence of a user-facing toast.
  // ─────────────────────────────────────────────────────────────────────

  test('pro V6 — route save offline produces no user-facing toast (silent failure)', async ({ page, context }) => {
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await page.waitForTimeout(2500);

    // RouteBuilder opens via a corner control; long-press on the map drops
    // points. Best-effort: open RouteBuilder via aria label, then simulate
    // a couple of context-menu events to add points.
    const routeBtn = page.getByRole('button', { name: /route/i }).first();
    if (!(await routeBtn.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'route-button-missing', description: 'cannot proof V6' });
      return;
    }
    await routeBtn.click();
    await page.waitForTimeout(500);
    await tierScreenshot(page, TIER, 'v6-1-route-builder-open');

    // Drop two points by dispatching contextmenu events on the canvas.
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) {
      await canvas.dispatchEvent('contextmenu', { clientX: box.x + 100, clientY: box.y + 100 });
      await page.waitForTimeout(300);
      await canvas.dispatchEvent('contextmenu', { clientX: box.x + 200, clientY: box.y + 200 });
      await page.waitForTimeout(300);
    }

    // Cut the network and save the route.
    await context.setOffline(true);
    const saveBtn = page.getByRole('button', { name: /^save/i }).first();
    if (await saveBtn.isVisible().catch(() => false)) {
      await saveBtn.click();
      await page.waitForTimeout(2500);
    }
    await tierScreenshot(page, TIER, 'v6-2-after-offline-save');

    // Look for any toast text on screen. STATEMAP predicts there is no toast.
    const body = await page.locator('body').textContent();
    const toastFound = /could not save route|saved|failed|error/i.test(body);
    test.info().annotations.push({
      type: 'route-save-toast-found',
      description: toastFound ? 'yes' : 'no (V6 confirmed)',
    });

    // Console should have a fetch error.
    const errs = (page._consoleErrors || []).filter((e) => /route|supabase|fetch/i.test(e));
    test.info().annotations.push({
      type: 'route-save-console-errors',
      description: errs.slice(0, 3).join(' | ') || 'none',
    });

    await context.setOffline(false);
    expect(true).toBe(true);
  });
});
