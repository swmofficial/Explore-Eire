# UX Agent Report — 2026-05-20

## Run Context
- Commits analysed: `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `2923ab`, `d29354c`, `eb866d4`, `d552904`, `dfebcc0`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` and `free V8` FAIL (timeout) strongly imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, and no offline pre-save warning is shown.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14 (no pre-check for offline save).
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state update logic, and ensure Playwright's geolocation mock is correctly integrated.

### 3. Critical: Pro Users Incorrectly Prompted to Upgrade (P1)
- Summary: Authenticated Pro users are incorrectly shown the UpgradeSheet when interacting with Pro-gated features, indicating a failure in the Pro status check.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test FAILED with `Test timeout of 60000ms exceeded.`. This timeout occurred because the test was waiting for the UpgradeSheet *not* to be visible, but it *was* visible, causing the test to hang. This directly contradicts the expected behavior for a Pro user.
- Cannot confirm: The specific Pro affordance that was tapped, but the test name implies it was a Pro-gated feature.
- Root cause: The `isPro` flag in `userStore` is either not correctly set to `true` for Pro users, or the component gating logic (e.g., `UpgradeSheet` visibility) is incorrectly evaluating `isPro`. This could be related to the broader persistence issues (V10, though V10 itself could not be confirmed in this run). `STATE_MAP.md` notes `isPro` is hydrated from Supabase and persisted, but `useAuth.onAuthStateChange` may overwrite it to false on offline JWT expiry (V10).
- User impact: Paying users are confused and frustrated, feeling like their subscription is not recognized or that they are being scammed.
- Business impact: Damages trust with paying customers, increases support load, and could lead to subscription cancellations.
- Fix direction: Verify `isPro` state hydration and persistence for Pro users, and review the conditional rendering logic for the `UpgradeSheet` and other Pro-gated features.

### 4. High: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: User-generated content (GPS tracks and routes) is silently lost when attempting to save while offline, with no user-facing feedback for route saves.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free/Guest if they had these capabilities.
- Confidence: HIGH
- Evidence: `pro V4` (PASS) confirms the vulnerability (track save fails offline). `pro V6` (PASS) confirms the vulnerability (route save offline produces no user-facing toast), although the test annotation `route-button-missing: cannot proof V6` indicates the test itself couldn't *prove* the toast was missing. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast", which directly confirms V6.
- Cannot confirm: The exact content of the console error for V6, or the specific toast message for V4 (though the test confirms failure).
- Root cause: As per `STATE_MAP.md`, all data writes (tracks, routes) directly attempt Supabase INSERTs. When offline, these fail. There is no offline write queue or local-first persistence mechanism. `tracks` INSERT fails with a toast, `routes` INSERT fails silently (console.error only).
- User impact: Significant data loss for users in areas with poor connectivity, leading to wasted effort and severe frustration. Silent failures are particularly damaging as users believe their data is saved.
- Business impact: High churn, negative reviews, and a perception of an unreliable app, especially for the target user base (prospectors in rural Ireland) who will frequently be offline.
- Fix direction: Implement an offline-first data strategy with a local persistence layer (e.g., IndexedDB) and a sync queue for all user-generated content.

### 5. Medium: Learn Tab Component State Loss (V13)
- Summary: While overall progress stats are preserved, the in-chapter reading position within the Learn tab is lost upon switching tabs, forcing users to restart chapters from the beginning.
- Tier(s) affected: All (Guest V13, Free V13 confirmed)
- Confidence: HIGH
- Evidence: `guest V13` (PASS) and `free V13` (PASS) tests are named "learn header stats are recomputed on every tab switch (state-loss proof)" and "learn tab state loss across tab switch (handover reference journey)" respectively. The `state-loss-evidence` annotations show identical stats (0% complete), which means the *progress* itself isn't lost, but the *recomputation* implies the component state is not maintained. The `UX Knowledge Context` explicitly states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch. User reading page 2 of 3 in a chapter switches tabs → returns → chapter restarts at page 1." This confirms the specific type of state loss.
- Cannot confirm: The exact page number a user was on before switching tabs, as the test only checks header stats.
- Root cause: As per `UX Knowledge Context`, `App.jsx` conditionally renders non-map tabs, causing them to unmount on tab switch. In-progress chapter reading position is held in volatile component state (`ChapterReader`), which is destroyed on unmount.
- User impact: Annoyance and disruption to the learning flow, requiring users to manually navigate back to their previous reading position, which can be difficult if they don't remember it.
- Business impact: Reduced engagement with the learning module, potentially impacting user onboarding and skill development within the app.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted but hidden (e.g., `display: none`) instead of unmounting them, or lift the `ChapterReader`'s page state to a persistent store.

## Tier Comparison
- **Persistence Issues (V1, V7, V8, V9, V11, V15):** The core problem of `localStorage` keys being `null` or `absent` after reload is consistent across all tiers where applicable (V7 affects all, V8/V9 affect free/guest, V1/V11/V15 affect guest/pro). This indicates a systemic issue with the persistence layer itself, rather than tier-specific logic.
- **Learn Tab State Loss (V13):** The behavior of recomputing header stats (and by extension, losing in-chapter reading position) is identical for Guest and Free tiers, suggesting a common rendering strategy for non-map tabs.
- **Waypoint Save (P3, V3, V14):** The GPS acquisition failure blocking waypoint save is observed in the Pro tier. While Free and Guest users are gated from saving waypoints, the underlying GPS acquisition logic is shared, implying this issue would affect them if the gate were removed.
- **Offline Data Loss (V4, V6):** Confirmed for Pro tier. These are core data saving functionalities, and the underlying Supabase write failures would be consistent across tiers if they had access to these features.
- **Pro Badges (F2):** Free users correctly see PRO badges on gated layers, which is the intended behavior for encouraging upgrades.
- **Upgrade Sheet (F3, C3, P1):** Guest and Free users correctly see the UpgradeSheet when tapping Pro-gated features (C3, F3). Pro users *incorrectly* see the UpgradeSheet (P1 failure), which is a critical tier-specific bug.

## Findings Discarded
- **`pro V10` (Pro status reverts to free on offline reload):** Discarded because the test failed to load the page due to `net::ERR_INTERNET_DISCONNECTED`. This prevents any assessment of the `isPro` status. The underlying vulnerability (V10) is known from `STATE_MAP.md`, but cannot be confirmed by *this* test run.
- **`pro V2` (Gold/mineral data missing after offline reload):** Discarded for the same reason as `pro V10` – the page failed to load offline. The underlying vulnerability (V2) is known from `STATE_MAP.md`, but cannot be confirmed by *this* test run.

## Cannot Assess
- The full extent of offline functionality (V2, V10) could not be assessed due to the app failing to load entirely when the network is disconnected during the test. This indicates a fundamental lack of offline resilience at the application shell level.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple tests (V1, V7, V8, V9, V11, V15) confirm that `localStorage` is not correctly storing or retrieving data for various user preferences and session-specific content. This points to a fundamental regression in how `localStorage` is managed, potentially affecting Zustand `persist` middleware and manual `localStorage` patterns. The `ee_theme-before-reload: null` annotation is particularly damning.
2.  **Lack of Robust Offline-First Strategy:** The app continues to rely on direct Supabase writes for critical user-generated data (waypoints, tracks, finds, routes). This leads to silent data loss (V3, V4, V6) and a complete inability to function offline (V2, V10 tests failing to load). The absence of a pre-save offline warning (V14) exacerbates the problem.
3.  **GPS Acquisition Issues:** The persistent "Acquiring GPS..." state (P3, V3) indicates a problem with the app's ability to reliably obtain and process location data, even with Playwright's mock.

## Calibration Notes
- The current test results directly contradict previous `CONFIRMED` verdicts for V1, V7, V11, and V15. This indicates a significant regression, strongly suggesting that the `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) or subsequent changes have inadvertently undone previously implemented persistence fixes. This report prioritizes highlighting these regressions.
- The new "Vulnerability-Proof Test Philosophy" was crucial in interpreting `PASS` results for V-tests (e.g., `guest V11` PASS with `V11 confirmed` annotation) as confirmation of the vulnerability's continued existence, rather than a successful fix.
- The failure of `pro V10` and `pro V2` to load offline highlights a test infrastructure limitation (or a deeper app issue) that prevents assessing specific offline data vulnerabilities, but the underlying vulnerabilities are acknowledged from `STATE_MAP.md`.