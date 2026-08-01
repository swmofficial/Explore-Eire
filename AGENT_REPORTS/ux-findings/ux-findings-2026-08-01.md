# UX Agent Report — 2026-08-01

## Run Context
- Commits analysed: `d66259917249fbf68d6b94170156e06110044b92` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Loss of User-Generated Session Data on Reload (V1, V11, V15 Regressions)
- Summary: User-generated session data (GPS tracks, guest waypoints) and the active module preference are lost on page reload, indicating a regression in their manual `localStorage` persistence mechanisms.
- Tier(s) affected: Guest (V11, V15), Pro (V1), (inferred Free for V1, V15)
- Confidence: HIGH
- Evidence: `guest V11` annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `guest V15` annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. These directly contradict `STATE_MAP.md`'s claim that these keys persist via manual patterns.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for these keys.
- Root cause: The manual `localStorage` keys (`ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are either not being written to or read from `localStorage` correctly, despite `STATE_MAP.md` indicating they should be. This is a regression from previous fixes.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) and user workflow preferences, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core features.
- Fix direction: Debug the manual `localStorage` write/read patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure data persistence across reloads.

### 4. High: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, indicating a failure in the `ee_theme` manual `localStorage` persistence.
- Tier(s) affected: Guest, Free (inferred Pro)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read correctly. `STATE_MAP.md` states `ee_theme` should persist `userStore.theme` via a manual pattern.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for `ee_theme`.
- Root cause: The manual `localStorage` persistence for `userStore.theme` via the `ee_theme` key is not functioning, causing the theme to revert to its default on every reload. This is a regression from a previous fix (task-008, task-012).
- User impact: Annoying and disruptive user experience, as a fundamental personalization setting is not retained, leading to a perception of an unreliable or buggy application.
- Business impact: Minor negative impact on user satisfaction and brand perception; could contribute to overall churn if combined with other issues.
- Fix direction: Debug the manual `localStorage` write/read pattern for `ee_theme` in `userStore.js`.

### 5. Medium: Basemap and Layer Preferences Reset on Reload (V9, V8 Regressions)
- Summary: User preferences for basemap and layer visibility reset to their default states upon page reload, indicating a failure in the `ee-map-prefs` Zustand persist middleware.
- Tier(s) affected: Guest (V9), Free (V8) (inferred Pro)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both timed out. While not direct assertion failures, timeouts in persistence tests often indicate the expected state was not found, implying a reset. `STATE_MAP.md` states `mapStore`'s `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware. Given the `ee_theme` manual persistence failure, it's plausible the Zustand `persist` middleware is also failing or misconfigured for `mapStore`.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` before and after reload, as no annotations were provided for these specific keys.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is likely failing to correctly save or hydrate `basemap` and `layerVisibility` preferences, causing them to revert to defaults on reload. This is a regression from a previous fix (task-001).
- User impact: Users lose their preferred map view settings, requiring them to reconfigure layers and basemap after every reload, which is frustrating and inefficient.
- Business impact: Minor negative impact on user satisfaction and efficiency, potentially contributing to a perception of a low-quality application.
- Fix direction: Investigate the Zustand `persist` middleware configuration and functionality for `mapStore` and the `ee-map-prefs` key.

### 6. High: Free Users Can Save Waypoints, Bypassing Pro Gate (Feature F3)
- Summary: Free tier users are able to save waypoints, which appears to bypass an intended Pro-gated feature, as the test expects an `UpgradeSheet` to be shown instead.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed because `expect(upgradeShown).toBeTruthy()` was `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown. The test description "free users cannot save waypoints" implies this is a Pro feature.
- Cannot confirm: The exact business requirement for waypoint saving (is it *always* Pro-gated, or only certain types/quantities?).
- Root cause: The logic gating the "Save Waypoint" functionality or the display of the `UpgradeSheet` for free users is incorrect, allowing them to access a feature intended for Pro subscribers. This is a business logic error.
- User impact: Free users gain access to a premium feature, potentially reducing their incentive to upgrade.
- Business impact: Direct loss of potential revenue from free users who would otherwise upgrade for waypoint saving, and devaluation of the Pro subscription.
- Fix direction: Review and correct the `isPro` gating logic for the waypoint saving feature to ensure it correctly surfaces the `UpgradeSheet` for free users.

### 7. Medium: Offline Data Loss for Tracks and Routes Unverified by Tests (Vulnerability V4, V6)
- Summary: Despite `STATE_MAP.md` confirming data loss for offline track and route saves, the corresponding tests either pass inconclusively or fail to verify the vulnerability, indicating inadequate test coverage for these critical offline scenarios.
- Tier(s) affected: Pro (V4, V6) (inferred Free/Guest if they could save tracks/routes)
- Confidence: MEDIUM
- Evidence: `pro V4` test passed, but `STATE_MAP.md` explicitly states "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone." `pro V6` test passed, but annotation `route-button-missing: cannot proof V6` and `STATE_MAP.md` states "Save route... Fails — console.error only, no toast ... YES — route points gone." The tests do not confirm the *absence* of data after these operations.
- Cannot confirm: The exact state of the `tracks` or `routes` tables/stores after these "passing" tests, or what the tests are actually asserting.
- Root cause: The test assertions for `pro V4` and `pro V6` are insufficient to confirm the data loss vulnerabilities. They likely only check for the completion of the UI interaction rather than the persistence of data.
- User impact: Users will experience silent data loss when attempting to save tracks or routes offline, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, and perceived data insecurity, especially for a core outdoor mapping app.
- Fix direction: Enhance `pro V4` and `pro V6` tests to explicitly verify the absence of saved data in the relevant stores or `localStorage` after an offline save attempt.

### 8. Medium: Pro User Upgrade Sheet Test Timeout (Vulnerability P1 Regression)
- Summary: The test verifying that Pro users do not see the `UpgradeSheet` when tapping a Pro-gated affordance timed out, suggesting a regression in the Pro status detection or a new blocking UI issue.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.` This test is designed to ensure Pro users *don't* see the `UpgradeSheet`. A timeout implies the test got stuck, possibly waiting for an element that never appeared or a state that was never reached.
- Cannot confirm: Whether the `UpgradeSheet` *did* appear (which would be a failure) or if some other UI element blocked the test's progression.
- Root cause: Potentially a regression of the "Pro badge race" condition (P1) that was previously fixed, where the app's `isPro` status is not correctly or quickly detected, leading to unexpected UI behavior or test blocking.
- User impact: Pro users might experience unexpected delays or incorrect UI elements (e.g., seeing upgrade prompts) when interacting with Pro features, leading to confusion and frustration.
- Business impact: Erodes trust in the Pro subscription value and could lead to support tickets or cancellations.
- Fix direction: Investigate the `isPro` status hydration and the timing of Pro-gated UI elements, potentially re-evaluating the `global-setup` or test `waitFor` conditions for P1.

## Tier Comparison
- **Offline App Load (V2, V10):** The application completely fails to load offline for Pro users. This behaviour is inferred for Free users due to shared authentication and data loading mechanisms. Guest users are not explicitly tested for this, but would likely experience similar issues if core app components rely on online Supabase access.
- **Waypoint Save Disabled (P3, V3):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition failure. This issue would prevent waypoint saving for Free and Guest users as well, if they were able to access the WaypointSheet.
- **Data Loss on Reload (V1, V11, V15):** Guest users experience loss of session waypoints (V11) and active module preference (V15) on reload. Pro users experience loss of GPS tracks (V1) on reload. This indicates widespread regressions in manual `localStorage` persistence across different data types and tiers.
- **Theme Preference Resets (V7):** Theme preference resets to default on reload for both Guest and Free users, indicating a universal regression in the `ee_theme` manual persistence. This is inferred to affect Pro users as well.
- **Basemap and Layer Preferences Reset (V9, V8):** Basemap preference resets for Guest users (V9) and layer preferences reset for Free users (V8). These are likely related to a common issue with `mapStore`'s `ee-map-prefs` persistence and are inferred to affect all tiers.
- **Free User Waypoint Save (F3):** This is a specific business logic error where Free users can save waypoints, bypassing an intended Pro gate. This behaviour is unique to the Free tier.
- **Offline Data Loss Unverified (V4, V6):** Tests for offline track (V4) and route (V6) saving pass inconclusively for Pro users. The underlying data loss vulnerabilities are confirmed by `STATE_MAP.md` but not adequately verified by the tests across any tier.
- **Pro User Upgrade Sheet Timeout (P1):** This timeout is specific to the Pro tier, indicating a potential issue with Pro status detection or UI rendering for paying users.

## Findings Discarded
- **PHANTOM: Learn Tab State Loss (V13) Test Misinterpretation:** The `guest V13` and `free V13` tests are labeled as "state-loss proof" but their annotations show identical "before" and "after" header stats. This indicates state *preservation*, not loss. The test is actually confirming a previous fix for V13, not identifying a new vulnerability. This finding is discarded as it's a misinterpretation of the test's current purpose.

## Cannot Assess
- The exact state of `ee-map-prefs` in `localStorage` before and after reload for `guest V9` and `free V8` tests, as no annotations were provided for these specific keys. This would help confirm the root cause of the persistence failure with higher confidence.
- The specific code change that caused the widespread regressions in manual `localStorage` persistence for V1, V7, V11, V15.

## Systemic Patterns
- **Widespread Persistence Regressions:** There is a systemic failure in state persistence across multiple user preferences and user-generated data. Both manual `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and Zustand `persist` middleware (`ee-map-prefs`) are failing to retain state across reloads. This indicates a significant regression or a fundamental flaw in the persistence architecture.
- **Critical Offline Functionality Breakdown:** The application completely fails to load offline for authenticated users, and core data saving operations (waypoints, tracks, routes) are either blocked by other issues or silently fail without proper user feedback or data queuing. This highlights a severe lack of offline-first design implementation, which is critical for the target user base.
- **GPS Acquisition Issues:** The consistent inability to acquire GPS coordinates blocks core features like waypoint saving, indicating a problem with the `useTracks` hook or its interaction with the browser's geolocation API/Playwright mock. This impacts a fundamental capability of a mapping app.
- **Inadequate Test Assertions:** Several tests pass despite known vulnerabilities (V4, V6) or misinterpret their own results (V13), indicating that the test suite needs refinement to truly confirm the presence or absence of specific UX issues and prevent false positives.

## Calibration Notes
- The previous report correctly identified the critical offline app load failure (V2, V10) and the GPS acquisition issue (P3, V3), which remain active and high-priority.
- The previous report confirmed V13 (Learn tab state preservation) was fixed. The current test results for V13 (guest and free) show identical before/after stats, which *confirms* the fix, despite the test being named "state-loss proof". This reinforces the need to carefully interpret test annotations and names, and to recognize when a "state-loss proof" test is actually proving state *preservation*.
- Several vulnerabilities previously marked as CONFIRMED fixed (V1, V7, V8, V9, V11, V15) are now showing as active regressions. This highlights the importance of continuous regression testing and indicates that previous fixes were either reverted, broken by subsequent changes, or not robust enough to withstand further development. This pattern was prioritized in the current analysis.
- The analysis avoided marking findings as PHANTOM unless there was no evidence at all. For V9 and V8, the timeouts, combined with the clear V7 persistence failure, were considered sufficient evidence to infer a persistence issue.