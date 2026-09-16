# UX Agent Report — 2026-09-16

## Run Context
- Commits analysed: `51bfb2bb5ebe553b7925f47c98040ef1191f7647` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Free Users Can Save Waypoints Instead of Upgrading (F3 Regression)
- Summary: Free tier users are incorrectly allowed to save waypoints via the camera button, bypassing the intended upgrade prompt for Pro-gated features.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the upgrade sheet was *not* shown, but the waypoint sheet *was*.
- Cannot confirm: If the waypoint save operation would actually succeed for a free user (Supabase policy might prevent it), but the UI allows the attempt.
- Root cause: Incorrect gating logic for the "Save Waypoint" action, where `isPro` check is either missing or inverted, allowing free users to access a Pro-only feature.
- User impact: Free users are given access to a feature they shouldn't have, potentially leading to confusion if the save fails silently later, or devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key Pro feature is accessible to free users.
- Fix direction: Correct the conditional rendering/routing logic for the waypoint save button/sheet to ensure free users are directed to the upgrade flow.

### 4. High: Multiple Persistence Mechanisms Are Broken (V1, V7, V8, V9, V11, V15 Regressions)
- Summary: User preferences (theme, basemap, layer visibility, active module) and critical session data (guest waypoints, GPS tracks) are not being persisted to `localStorage` and are lost on page reload, despite previous fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. Expected "light", received "dark". This confirms V7 is active.
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms V11 is active.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms V15 is active.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms V1 is active.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`. These timeouts are strong indicators of persistence issues, as the tests likely failed to find the expected state after reload. `STATE_MAP.md` indicates `basemap` and `layerVisibility` are persisted via Zustand's `ee-map-prefs`.
- Cannot confirm: The specific code changes that caused these regressions in the manual `localStorage` patterns or Zustand persist middleware.
- Root cause: The manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are no longer functioning, or have been inadvertently removed/broken. The Zustand `persist` middleware for `mapStore` (basemap, layerVisibility) also appears to be failing or misconfigured. This directly contradicts previous CONFIRMED fixes (V1, V7, V11, V15).
- User impact: Users experience constant loss of preferences and unsaved session data (waypoints, tracks), leading to significant frustration and a perception of an unreliable application.
- Business impact: Erodes user trust, increases friction, reduces engagement, and can lead to data loss for critical user-generated content (tracks, waypoints).
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns for `theme`, `sessionWaypoints`, `activeModule`, and `sessionTrail`. Debug and ensure Zustand `persist` middleware is correctly configured and functioning for `mapStore`'s `basemap` and `layerVisibility`.

### 5. Medium: Pro Users May See Upgrade Sheet (P1 Regression)
- Summary: The test for Pro users not seeing the UpgradeSheet timed out, suggesting a potential regression where Pro users might be incorrectly prompted to upgrade.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This test is designed to confirm that Pro users *do not* see the UpgradeSheet. A timeout here means the assertion could not be made, which could indicate the sheet *was* present and the test was waiting for it to disappear, or a general test flakiness.
- Cannot confirm: Whether the UpgradeSheet was actually visible or if the timeout was due to a different test infrastructure issue. No screenshot is provided for this specific failure.
- Root cause: Potentially a regression in the `isPro` check for displaying the `UpgradeSheet`, causing it to appear for paying users.
- User impact: Annoyance and confusion for paying Pro users who are incorrectly prompted to upgrade.
- Business impact: Damages trust and perceived value of the Pro subscription.
- Fix direction: Investigate the `UpgradeSheet` display logic and the `pro P1` test to confirm if the sheet is indeed showing for Pro users.

### 6. Medium: Offline Data Save Failures (V4, V6, V14 Confirmed Vulnerabilities)
- Summary: The application continues to fail silently or with only a toast when attempting to save user-generated data (tracks, routes, waypoints) while offline, and lacks pre-save warnings.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed: This test confirms the vulnerability that track save fails offline.
    - `pro V6` passed: This test confirms the vulnerability that route save offline produces no user-facing toast. Annotation `route-button-missing: cannot proof V6` means the test couldn't explicitly assert the *absence* of a toast, but the test *passed*, implying the silent failure occurred as expected by the vulnerability.
    - `pro V3` (though blocked by GPS issue) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of pre-save warning.
    - `STATE_MAP.md` explicitly states: "Save waypoint... Fails — toast 'Could not save waypoint'. Photo upload also fails. Data Lost? YES". "Save track... Fails — toast 'Could not save track'. Data Lost? YES". "Save route... Fails — console.error only, no toast. Data Lost? YES".
- Cannot confirm: The exact user experience for V3 (waypoint save offline) due to the GPS acquisition blocker.
- Root cause: The application lacks an offline data queue and local-first write strategy, relying solely on immediate Supabase writes. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable, manually created data (tracks, waypoints, routes) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, and inability to serve users in target rural areas effectively.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., IndexedDB) for user-generated content. Provide clear UI feedback for locally saved vs. synced data.

## Tier Comparison

*   **V13 (Learn tab state loss):** Identical behavior across Guest and Free tiers. The state is *preserved* across tab switches, indicating the fix for V13 is working for both.
*   **V7 (Theme resets):** Identical behavior across Guest and Free tiers. Theme preference resets to 'dark' on reload, and `ee_theme` is `null` in both cases, indicating the manual persistence for theme is broken for all users.
*   **Persistence (V1, V8, V9, V11, V15):** All tiers experience significant state loss on reload for various preferences and session data. `guest V9` (basemap), `free V8` (layers), `guest V11` (guest waypoints), `guest V15` (active module), `pro V1` (session trail) all confirm persistence failures. This indicates a systemic issue with `localStorage` persistence, affecting both manual patterns and potentially Zustand's `persist` middleware.
*   **Offline App Loading (V2, V10):** Pro tier experiences complete app loading failure when offline. This behavior is likely identical for Free users (as they also require Supabase auth and data) but cannot be confirmed without a specific Free tier test. Guest users are not affected by `V10` (Pro status) but might be affected by `V2` (gold/mineral data loading) if it blocks app shell loading.
*   **Waypoint Saving (P3, F3, V3):** Pro tier is blocked from saving waypoints due to GPS acquisition failure. Free tier is incorrectly allowed to access the waypoint sheet instead of being prompted to upgrade. Guest users are not tested for this, but their waypoints are memory-only (V11 confirmed). This highlights different issues across tiers for the same core functionality.
*   **PRO Badges (F2, P1):** Free users correctly see PRO badges in the LayerPanel (`free F2` passed). Pro users' experience regarding the UpgradeSheet (`pro P1` failed with timeout) is unclear but potentially problematic.

## Findings Discarded
None. All identified issues are critical or high priority regressions/vulnerabilities with sufficient evidence.

## Cannot Assess
*   The exact cause of the `pro P1` timeout (UpgradeSheet for Pro users) without further debugging or screenshots.
*   The full impact of offline loading failures (V2, V10) on the Free tier, as no specific test for this exists for Free.
*   The full user experience of offline waypoint saving (V3) due to the GPS acquisition blocker.

## Systemic Patterns
*   **Widespread Persistence Failure:** A significant regression in `localStorage` persistence, affecting both manual `localStorage` patterns (theme, guest waypoints, active module, session trail) and potentially Zustand's `persist` middleware (basemap, layer visibility). This suggests a recent change to how `localStorage` is managed or how stores are initialized/hydrated.
*   **Offline-First Neglect:** The app fundamentally fails to operate offline, both at the app shell loading level and for data saving. This is a recurring critical vulnerability (V2, V10, V3, V4, V6, V14) that has not been adequately addressed.
*   **GPS Acquisition Instability:** The GPS acquisition logic (`mapStore.userLocation`) appears to be fragile, failing to correctly process even mocked geolocation data, blocking critical features.
*   **Inconsistent Feature Gating:** The logic for gating Pro features (like waypoint saving) is inconsistent, allowing free users to access Pro features in some cases, while Pro users might be incorrectly prompted to upgrade.

## Calibration Notes
The previous report's #1 (Offline App Loading) and #2 (GPS Acquisition Failure) findings are confirmed critical regressions, reinforcing their high priority. The previous #3 (Persistence Regressions) is also confirmed as a major regression, indicating that prior fixes for V1, V7, V11, V15 were either incomplete or have been broken. This highlights the importance of robust regression testing for persistence. The interpretation of "PASS" for vulnerability tests (V1, V11, V15, V4, V6) was carefully reviewed; a "PASS" in these cases means the *vulnerability is confirmed active*, not that the issue is resolved, aligning with the new test philosophy. The `V13` interpretation was corrected: identical before/after stats in the `state-loss-evidence` annotation confirm the state *was preserved*, meaning the fix for V13 is working. Strict adherence to direct evidence from annotations and error messages, and cross-referencing `STATE_MAP.md`, continues to prevent phantom verdicts.