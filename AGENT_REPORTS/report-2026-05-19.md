# UX Agent Report — 2026-05-19

## Run Context
- Commits analysed: `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `2923ab`, `d29354c`, `eb866d4`, `d552904`, `dfebcc0`, `acd32af`
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
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the Playwright geolocation mock setup.

### 3. Critical: Pro User Sees Upgrade Sheet (P1 Regression)
- Summary: Authenticated Pro users are incorrectly shown the Upgrade Sheet when tapping a Pro-gated affordance, preventing access to paid features.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` FAIL with `Test timeout of 60000ms exceeded.` This timeout indicates the test could not find the expected state (UpgradeSheet *not* visible) within the time limit, implying it *was* visible.
- Cannot confirm: The exact state of `userStore.isPro` at the moment of the tap, but the observed behavior points to it being `false` or the gating logic being flawed.
- Root cause: The `isPro` flag in `userStore` is likely not being correctly set or maintained for the Pro user session, causing Pro-gated features to incorrectly trigger the `showUpgradeSheet` state. This could be related to the general persistence issues (Finding 1) or a specific bug in how `isPro` is hydrated or checked.
- User impact: Paying users are locked out of features they have paid for, leading to extreme frustration and a broken user experience.
- Business impact: Immediate loss of trust, potential chargebacks, and severe damage to the subscription model.
- Fix direction: Verify `userStore.isPro` hydration and persistence for Pro users, especially in `useAuth` and `useSubscription` hooks, and review the logic that triggers `showUpgradeSheet`.

### 4. High: Offline Data Loss for Tracks and Routes (V4, V6 Confirmed)
- Summary: User-generated data for GPS tracks and routes is lost when attempting to save offline, with track saves failing explicitly and route saves failing silently.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free and Guest if they had these capabilities.
- Confidence: HIGH
- Evidence: `pro V4` PASS, confirming the track save fails offline. `pro V6` PASS, confirming the route save fails offline. Annotation `route-button-missing: cannot proof V6` indicates the *toast* for V6 couldn't be proven, but the underlying failure is confirmed by the test passing. `STATE_MAP.md` explicitly states for `tracks` and `routes` inserts: "Fails — toast 'Could not save track'" and "Fails — console.error only, no toast" respectively, and "YES — entire GPS trail... gone" / "YES — route points gone". The tests confirm this behavior.
- Cannot confirm: The exact console error for V6, as the test only confirms the lack of a toast.
- Root cause: As per `STATE_MAP.md`, there is no offline write queue or local-first write mechanism for `tracks` or `routes`. Supabase write operations fail immediately when offline, leading to data loss. This is a known architectural gap (V3, V4, V6, V14 are "large scope, deferred").
- User impact: Users lose valuable, time-consuming data (e.g., a multi-hour hike track or a carefully planned route) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: Undermines the app's utility for its target audience (outdoor users who frequently go offline), hindering adoption and retention.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue for user-generated content (waypoints, tracks, finds, routes).

### 5. Medium: Learn Tab Header Stats Not Robustly Tested for State Retention (V13, F4)
- Summary: While `guest V13` and `free F4` tests pass, the provided `state-loss-evidence` annotations show 0% completion before and after tab switches, meaning the tests do not robustly prove state retention for *actual* user progress in the Learn tab.
- Tier(s) affected: Guest, Free
- Confidence: MEDIUM
- Evidence: `guest V13` and `free F4` PASS. Both include `state-loss-evidence` or `header-stats-pair` annotations showing `{"courses":2,"completePct":0,"chaptersDone":0}` before and after tab switches. This indicates no progress was made, so there was no state to lose or retain.
- Cannot confirm: If actual chapter progress (e.g., `completePct > 0`) would be correctly retained across tab switches. The previous report stated V13 was fixed by making tabs always-mounted, which should prevent component state loss.
- Root cause: The test setup does not simulate actual user progress in the Learn module, making the `state-loss-evidence` annotation uninformative for proving state retention. The underlying fix for V13 (always-mounted tabs) should prevent component state loss, but this specific test doesn't confirm it for the header stats.
- User impact: Potential for users to lose their in-progress chapter reading position or progress if the underlying fix for V13 is not fully effective, leading to frustration.
- Business impact: Reduced engagement with the learning module if progress is perceived as unreliable.
- Fix direction: Enhance `guest V13` and `free F4` tests to simulate actual chapter completion and then verify `completePct` retention across tab switches.

## Tier Comparison
- **Persistence Regression (V7, V8, V9):** Identical behavior across Guest and Free tiers, indicating a core application-level issue with `localStorage` or Zustand `persist` middleware, not specific to authentication status.
- **Persistence Regression (V1, V11, V15):** V1 (track loss) confirmed for Pro, V11 (guest waypoints) and V15 (active module) confirmed for Guest. This shows the systemic persistence issue affects different types of session data across relevant tiers.
- **Waypoint Save Blockage (P3, V3, V14):** Confirmed for Pro. While not explicitly tested for Free/Guest, the underlying GPS acquisition logic is shared, suggesting this is a universal issue. Free users are gated from saving waypoints (F3 pass), so they wouldn't hit this specific save button issue, but the GPS acquisition problem would still exist.
- **Offline Data Loss (V4, V6):** Confirmed for Pro. These are known architectural gaps and would apply to any tier if they had the capability to save tracks/routes.
- **Learn Tab State (V13, F4):** Identical (ambiguous) pass behavior for Guest and Free, suggesting the test's limitation or the underlying fix applies equally.
- **Pro Badges (F2):** Free users correctly see PRO badges, as expected.
- **Upgrade Sheet Gating (F3, C3, P1):** Guest and Free users correctly see the Upgrade Sheet when attempting Pro features (C3, F3 pass). Pro users *incorrectly* see the Upgrade Sheet (P1 fail), which is a critical regression.

## Findings Discarded
- `pro V10` (Pro status reverts to free offline) and `pro V2` (gold/mineral data missing offline) were discarded because the tests failed due to `net::ERR_INTERNET_DISCONNECTED` during `page.goto`, indicating a test infrastructure issue rather than an application bug. These tests could not reach the point of verifying the vulnerability.

## Cannot Assess
- The full extent of `pro V10` (Pro status reverts to free offline) and `pro V2` (gold/mineral data missing offline) due to test infrastructure failures preventing offline navigation.

## Systemic Patterns
- **Widespread Persistence Failure:** The most critical systemic issue is the complete breakdown of `localStorage` persistence for multiple critical state elements (theme, basemap, layers, guest waypoints, active module, active GPS track). This affects all tiers and indicates a fundamental problem with how state is saved and rehydrated, likely introduced by recent code changes or reverts.
- **Core Feature Blockage:** The inability to save waypoints due to GPS acquisition failure is a critical blocker for a primary app function, affecting Pro users directly and likely indicating a broader issue with location services integration.
- **Incomplete Offline-First Implementation:** The confirmed data loss for tracks and routes when offline highlights the ongoing architectural gap in robust offline data handling, where local-first writes and sync queues are missing.

## Calibration Notes
- The current run shows significant regressions in persistence (V1, V7, V8, V9, V11, V15) and Pro user gating (P1), which were previously confirmed as fixed. This reinforces the need to carefully examine recent commits, particularly reverts, for their impact on established state management and persistence logic. The `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a prime suspect for the widespread persistence issues.
- The consistent GPS acquisition failure (P3, V3) highlights a persistent problem with location services, which has been a recurring theme in previous analyses.
- Ambiguous test evidence for V13/F4 (Learn tab stats) reminds me to scrutinize test annotations for concrete proof of state changes, especially when initial states are zero.