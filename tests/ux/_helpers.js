// _helpers.js — shared utilities for the three-account UX test suites.
//
// These tests are vulnerability proofs, not smoke tests. Every journey ends
// with an assertion that either confirms the app worked correctly OR confirms
// a known vulnerability (V1–V15 in BRAIN/STATE_MAP.md) produced the expected
// failure. Both outcomes are valid evidence for the UX Agent.
//
// Helpers exported here:
//   - bypassOnboarding(page)       — set the ee_onboarded localStorage flag
//                                    BEFORE the page loads so the onboarding
//                                    overlay does not block the test.
//   - waitForAppReady(page)        — past the 1.8s splash screen + first paint.
//   - tierScreenshot(page, tier, name)
//                                    — write a screenshot to test-results/<tier>/
//                                    so the UX Agent can group findings by
//                                    account tier.
//   - readLearnHeaderStats(page)   — extract { courses, completePct, chaptersDone }
//                                    from the LearnView header tile.
//   - attachConsoleCapture(page)   — collect console errors + page errors onto
//                                    page._consoleErrors so individual tests can
//                                    assert against them when relevant.
//
// The localStorage key `ee_onboarded` is the actual key set by Onboarding.jsx
// (verified against src/components/Onboarding.jsx line 160 and src/App.jsx
// line 46). The handover doc guessed `onboarding_complete` and `legal_accepted`
// — both are wrong. The legal disclaimer modal currently `return null`s before
// reading any state, so no client-side bypass is required for it; once it is
// re-enabled, free/pro suites will rely on the test-account profile having
// `legal_accepted: true` server-side in the profiles table.

export const TIERS = {
  GUEST: 'guest',
  FREE:  'free',
  PRO:   'pro',
};

// Set the ee_onboarded flag before any page script runs. Call this in
// beforeEach before page.goto(). addInitScript persists across page loads
// in the same context, which is what we want for multi-step journeys.
export async function bypassOnboarding(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('ee_onboarded', 'true');
    } catch (_) { /* ignore — private mode etc. */ }
  });
}

// Wait for the splash screen (1.8s hold + 300ms fade in SplashScreen.jsx) to
// clear and the BottomNav to be present. The DashboardView is the default
// landing tab. Returns when the nav is visible.
export async function waitForAppReady(page) {
  // Splash is 1.8s + 300ms fade. Add a small buffer for slow CI runs.
  await page.waitForTimeout(2400);
  await page.locator('nav').first().waitFor({ state: 'visible', timeout: 10000 });
}

// Write a screenshot under test-results/<tier>/ so the UX Agent's
// screenshot walker can attribute every image to the correct account
// tier. Playwright's default fixture-named screenshot directories scatter
// images across many sub-paths; this helper is the canonical evidence path.
export async function tierScreenshot(page, tier, name) {
  const safe = name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const path = `test-results/${tier}/${safe}.png`;
  await page.screenshot({ path, fullPage: false });
  return path;
}

// Read the three values from the Learn header summary tile. The tile is
// rendered by LearnView.jsx and contains three columns: Courses, Complete,
// Chapters Done. Returns numeric values (Complete is the integer % from
// the "<n>%" string). Returns null fields if the tile is not visible.
export async function readLearnHeaderStats(page) {
  // Wait for the tile to mount (LearnView is unmounted on tab switch, so it
  // re-renders fresh every time we navigate to Learn).
  const tile = page.locator('text=Courses').first();
  await tile.waitFor({ state: 'visible', timeout: 5000 });

  // The tile is a sibling structure; pull its text content from the
  // surrounding container. Use a structural query rather than relying on
  // exact class names, which are not stable.
  const stats = await page.evaluate(() => {
    // Find the three labels and pull the value div above each one.
    const labels = ['Courses', 'Complete', 'Chapters Done'];
    const result = {};
    for (const lbl of labels) {
      const labelEls = Array.from(document.querySelectorAll('div'))
        .filter((d) => d.textContent && d.textContent.trim() === lbl);
      // The value sits in the previous sibling — same parent column.
      const valEl = labelEls[0]?.previousElementSibling;
      result[lbl] = valEl ? valEl.textContent.trim() : null;
    }
    return result;
  });

  return {
    courses: parseInt(stats['Courses'] || '0', 10),
    completePct: parseInt((stats['Complete'] || '0').replace('%', ''), 10),
    chaptersDone: parseInt(stats['Chapters Done'] || '0', 10),
    raw: stats,
  };
}

// Subscribe to console.error and pageerror so individual tests can read
// page._consoleErrors when they need to assert silent failures.
// (Many vulnerabilities are "fails silently with only console.error" —
// these tests must capture that signal.)
export function attachConsoleCapture(page) {
  page._consoleErrors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') page._consoleErrors.push(m.text());
  });
  page.on('pageerror', (e) => page._consoleErrors.push(e.message));
}

// Helper used by free/pro suites: try to dismiss any post-login modal that
// might appear (e.g. notification pre-prompt). Best-effort — does not fail
// the test if no modal is visible.
export async function dismissTransientModals(page) {
  for (const label of ['Not Now', 'Maybe later', 'Close', 'Got it']) {
    const btn = page.getByRole('button', { name: label, exact: true }).first();
    if (await btn.isVisible().catch(() => false)) {
      await btn.click().catch(() => {});
      await page.waitForTimeout(200);
    }
  }
}
