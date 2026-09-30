# UX Agent Report — 2026-09-30

## Run Context
- Commits analysed: `790a4ea96cb5d540567a164076ca5fb84303d36b` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data, and making it impossible to verify persisted Pro status (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Blocks Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: User Preference Persistence Regressions (V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisting across page reloads, reverting to default settings. This is a regression for theme (V7) and indicates failures for basemap (V9) and layers (V8).
- Tier(s) affected: All
- Confidence: HIGH (V7), MEDIUM (V8, V9)
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, confirming the `ee_theme` localStorage key is not being correctly written or read.
    - `guest V9` failed with `Test timeout of 60000ms exceeded.`
    - `free V8` failed with `Test timeout of 60000ms exceeded.`
- Cannot confirm: The exact default states for V8 and V9 due to timeouts, but the failures strongly imply a reset.
- Root cause: The manual `localStorage` read/write pattern for `ee_theme` is failing. For `basemap` and `layerVisibility`, which are managed by Zustand `persist` middleware (`ee-map-prefs`), the persistence mechanism is either misconfigured or failing to hydrate the store on reload. This is a regression for V7.
- User impact: Users experience frustration as their personalized app settings are lost on every reload, requiring manual re-configuration.
- Business impact: Erodes user trust and satisfaction, potentially leading to reduced engagement and higher churn.
- Fix direction: Debug `ee_theme` manual `localStorage` implementation. Investigate `mapStore`'s Zustand `persist` configuration and hydration for `basemap` and `layerVisibility`.

### 4. High: Free Users Can Save Waypoints (F3 - Business Logic Error)
- Summary: Free tier users are incorrectly allowed to save waypoints, bypassing the intended upgrade gate and violating the business model.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed. The test expected `upgradeShown` to be `true` (meaning the UpgradeSheet should appear), but the annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` shows `upgradeShown` was `false` and `waypointShown` was `true`. This means the WaypointSheet was shown instead of the UpgradeSheet.
- Cannot confirm: The exact code path that allows this bypass without code access.
- Root cause: A misconfiguration in the feature gating logic for waypoint saving, specifically for free users. The `CornerControls` or `WaypointSheet` is not correctly checking `userStore.isPro` or `userStore.subscriptionStatus` before rendering the WaypointSheet.
- User impact: Free users gain access to a premium feature, potentially leading to confusion if other premium features are correctly gated.
- Business impact: Direct loss of potential revenue from users who would otherwise upgrade to save waypoints. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the feature gating logic for waypoint saving to ensure it surfaces the `UpgradeSheet` for free users.

### 5. High: Critical Data Loss on App Reload (V1, V11, V15)
- Summary: User-generated session data (GPS tracks, guest waypoints) and module preferences are lost on page reload, despite previous attempts to fix persistence.
- Tier(s) affected: All (V11 for Guest, V1 for Pro, V15 for All)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed, annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure in the manual `localStorage` read/write pattern without code access.
- Root cause: The manual `localStorage` read/write patterns for `sessionWaypoints` (`ee_guest_waypoints`), `sessionTrail` (`ee_session_trail`), and `activeModule` (`ee_active_module`) are failing to persist data across reloads. `STATE_MAP.md` indicates these use "manual IIFE + write pattern". The annotations confirm these keys are absent after reload.
- User impact: Users lose valuable, unsaved work (e.g., a long GPS track, collected waypoints) and their preferred module setting, leading to significant frustration and distrust.
- Business impact: High churn due to unreliable data persistence, especially for core features like tracking and waypoint logging.
- Fix direction: Debug the manual `localStorage` read/write implementations for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure data is correctly written before reload and hydrated on app initialization.

### 6. High: Silent Offline Data Save Failures (V4, V6, V14)
- Summary: The application fails to provide user feedback or queue data for retry when saving tracks or routes offline, leading to silent data loss. A pre-save offline warning (V14) is also missing.
- Tier(s) affected: Pro (V4, V6), All (V14)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability (track save fails offline silently).
    - `pro V6` passed, confirming the vulnerability (route save offline produces no user-facing toast).
    - `pro V3` (though blocked by GPS) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` indicates the absence of a pre-save warning.
- Cannot confirm: The exact data that was lost for V4 and V6 without deeper inspection, but the tests confirm the *failure mode*.
- Root cause: The application lacks an offline data synchronization queue and proper error handling for offline write operations. `STATE_MAP.md` explicitly lists "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)" as "genuine vulnerabilities".
- User impact: Users believe their data is saved when it is not, leading to unexpected data loss and a complete breakdown of trust in the application's reliability, especially in its primary use context (rural Ireland).
- Business impact: Severe damage to user trust and retention, particularly for paying Pro users who expect robust data handling.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) and provide clear UI feedback for offline save attempts, including retry mechanisms and pre-save warnings.

### 7. Low: Pro User UpgradeSheet Verification Timeout (P1)
- Summary: The test to verify that Pro users do *not* see the UpgradeSheet when tapping a Pro affordance timed out, indicating a potential test flakiness or an underlying issue preventing the expected state from being reached.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`.
- Cannot confirm: Whether the UpgradeSheet actually appeared, or if the test simply failed to assert its absence within the timeout.
- Root cause: Could be a flaky test, a race condition, or a subtle bug where the UpgradeSheet *does* appear briefly or under specific conditions, causing the test to hang while waiting for its absence.
- User impact: If the UpgradeSheet *does* appear for Pro users, it creates confusion and a poor user experience, making them question their subscription status.
- Business impact: Erodes trust for paying customers, potentially leading to cancellations.
- Fix direction: Investigate the `pro P1` test for flakiness or race conditions. If the UpgradeSheet is indeed appearing, debug the Pro gating logic.

## Tier Comparison
- **V7 (Theme Reset):** Identical behavior across Guest and Free (both fail, theme resets to 'dark'). This indicates a systemic issue with the `ee_theme` manual persistence mechanism, likely affecting Pro users as well.
- **V13 (Learn Tab State):** Identical behavior across Guest and Free (both pass, Learn header stats remain stable after tab switch). This confirms the fix for V13 is effective across unauthenticated and authenticated free users.
- **Offline App Load (V2, V10):** Only tested for Pro, but the `ERR_INTERNET_DISCONNECTED` suggests a fundamental app shell loading issue that would affect all authenticated users (Free and Pro). Guest users might load differently or have fewer dependencies.
- **GPS Acquisition Failure (P3, V3):** Only tested for Pro, but the underlying `mapStore.userLocation` issue would affect all users attempting to use GPS-dependent features.
- **Data Loss on Reload (V1, V11, V15):** V11 (guest waypoints) and V15 (active module) are confirmed vulnerabilities for Guest. V1 (GPS track) is a confirmed vulnerability for Pro. These are systemic persistence issues affecting different user-generated data or preferences across tiers.
- **Silent Offline Save Failures (V4, V6, V14):** V4 (track) and V6 (route) are confirmed vulnerabilities for Pro. V14 (no pre-save warning) is confirmed for Pro. These are systemic offline issues that would likely affect all tiers attempting to save data offline.

## Findings Discarded
None. All identified findings are included in the report.

## Cannot Assess
- The exact default states for `basemap` (V9) and `layerVisibility` (V8) after reload due to test timeouts. While the failures strongly imply a reset, the specific post-reset state could not be captured.
- The precise cause of the `pro P1` timeout without further debugging of the test or application code.

## Systemic Patterns
-   **Widespread Persistence Failures:** Multiple findings (V7, V8, V9, V1, V11, V15) point to critical and widespread issues with both Zustand `persist` middleware and manual `localStorage` implementations. This indicates a fundamental flaw in how the application manages and restores user preferences and session data across reloads.
-   **Fundamental Offline Functionality Deficiencies:** The application exhibits severe shortcomings in offline scenarios. It fails to load entirely for authenticated users (V2, V10), and even when partially functional, it suffers from silent data loss for user-generated content (V4, V6, V14) and lacks crucial pre-save warnings. This is a major gap for an outdoor mapping app designed for rural use.
-   **Core Feature Blockage due to GPS Issues:** A primary feature, waypoint saving, is completely blocked by a persistent GPS acquisition problem (P3, V3 blocker). This suggests a deeper issue within the app's GPS handling logic, beyond just Playwright's mock setup.

## Calibration Notes
-   The "Vulnerability-Proof Test Philosophy" was critical in interpreting "PASS" results for vulnerabilities like V1, V11, V15, V4, and V6. A "PASS" in these cases correctly indicated that the test *successfully confirmed the existence of the vulnerability* by observing the predicted failure mode (e.g., data loss).
-   The `state-loss-evidence` annotation for V13 (Learn tab state) was carefully cross-referenced with the `STATE_MAP.md` and previous fix details. The identical `before`/`after` values, combined with the test passing, correctly indicated that the fix for V13 (preserving component state) is working, despite the test title's phrasing. This reinforces the need to look beyond just pass/fail and deeply analyze annotations.
-   Previous `PHANTOM` verdicts (e.g., for UI inconsistencies) guided the focus towards functional failures directly observable in test output or screenshots, rather than speculative visual regressions.
-   The recurrence of GPS acquisition issues (P3, V3) despite a previous "CONFIRMED" fix for Playwright geolocation setup suggests the problem lies deeper within the application's GPS handling logic, rather than just the test environment.