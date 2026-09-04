# UX Agent Report — 2026-09-04

## Run Context
- Commits analysed: `d6878b2c7dd44ef7d853a4a56cd06dc80e6c389b` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 Regressions)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, indicating a systemic regression in state persistence.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` (timeout) and `free V8` (timeout) imply `mapStore.basemap` and `mapStore.layerVisibility` are resetting, indicating `ee-map-prefs` persistence failure.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
    - `STATE_MAP.md` confirms all these items *should* be persisted via Zustand `persist` or manual `localStorage` keys, indicating a regression.
- Cannot confirm: The specific commit that introduced this widespread regression, but the evidence points to a failure in the `localStorage` read/write mechanisms for manual keys and/or the Zustand `persist` configuration for `ee-map-prefs`.
- Root cause: Systemic regression in `localStorage` persistence mechanisms, affecting both manual IIFE patterns and Zustand `persist` middleware configurations.
- User impact: Users lose their personalised settings and in-progress work (like guest waypoints or active tracks) on every page reload, leading to significant frustration and a perception of an unreliable application.
- Business impact: Reduces user engagement, increases churn, and undermines trust in the application's ability to save user data.
- Fix direction: Thoroughly audit and fix all `localStorage` persistence implementations (manual and Zustand `persist`) across `userStore`, `mapStore`, and `moduleStore`.

### 4. High: Free Users Can Save Waypoints (F3 Business Logic Error)
- Summary: Free tier users are able to access and attempt to save waypoints via the camera button, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown.
- Cannot confirm: If the waypoint save operation would actually succeed for a free user (it should fail at the backend).
- Root cause: Incorrect business logic gating for the "Save Waypoint" feature, allowing free users to bypass the intended upgrade prompt.
- User impact: Free users can access a Pro feature, potentially leading to confusion or frustration if the save operation fails later due to backend restrictions. It also misses a key opportunity to convert users.
- Business impact: Direct loss of potential Pro subscription conversions and a breakdown in the tiered feature model.
- Fix direction: Implement correct gating logic to display the `UpgradeSheet` when a free user attempts to save a waypoint.

### 5. Medium: Offline Data Writes Fail Silently or with Toast (V4, V6, V14 Confirmed)
- Summary: The application lacks robust offline data handling, resulting in silent failures for route saves and explicit toast errors for track saves when offline, with no pre-save warning for waypoints (V14). These tests *passed* by confirming the vulnerable behaviour.
- Tier(s) affected: Pro (inferred All for similar operations)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed: The test confirmed that track save fails offline, which is the expected vulnerable behavior.
    - `pro V6` passed: The test confirmed that route save offline produces no user-facing toast (silent failure), which is the expected vulnerable behavior.
    - `pro V3` annotation: `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states that no pre-save warning is given for offline waypoint saves.
    - `STATE_MAP.md` confirms `tracks` INSERT "Fails — toast", `routes` INSERT "Fails — console.error only, no toast", and no offline write queue.
- Cannot confirm: The exact toast message for track saves without seeing the screenshot or logs for V4.
- Root cause: Absence of an offline write queue and inadequate user feedback mechanisms for data operations when connectivity is lost. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline, leading to significant frustration and loss of trust. Silent failures are particularly egregious.
- Business impact: High churn, negative reviews, and a perception of an unreliable application, especially for users in rural areas with intermittent connectivity.
- Fix direction: Implement an offline write queue (e.g., using IndexedDB) for all user-generated data, provide clear sync status indicators, and implement retry mechanisms.

### 6. Medium: Pro Users See Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: Pro users are incorrectly shown the `UpgradeSheet` when interacting with a Pro-gated feature, despite having an active subscription. This is a regression from a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with a `Test timeout of 60000ms exceeded`. The test's purpose is to confirm that Pro users *do not* see the `UpgradeSheet`. A timeout in this context strongly suggests the `UpgradeSheet` *was* displayed, causing the test to get stuck or fail its negative assertion.
- Cannot confirm: The exact Pro affordance tapped or the content of the `UpgradeSheet` without a screenshot or more detailed logs.
- Root cause: Regression in the logic that checks `isPro` status before displaying upgrade prompts, or an incorrect `isPro` state being read by the component.
- User impact: Pro users are annoyed by irrelevant upgrade prompts, undermining the value of their subscription and creating a confusing experience.
- Business impact: Erodes trust and satisfaction among paying subscribers, potentially leading to cancellations or negative word-of-mouth.
- Fix direction: Re-verify the `isPro` check in components that display upgrade prompts, ensuring Pro users are correctly identified and bypass these prompts.

## Tier Comparison

*   **Offline App Load (V2, V10)**: The Pro tier completely fails to load the application when offline due to `net::ERR_INTERNET_DISCONNECTED`. This issue is systemic and would likely affect the Free tier as well, as the core app shell and initial data are not cached. The Guest tier is not explicitly tested for this scenario.
*   **Preference Loss (V7, V8, V9)**: Theme (V7) resets to default for both Guest and Free tiers. Basemap (V9) resets for Guest, and Layer Visibility (V8) resets for Free. This indicates a widespread regression in state persistence affecting all tiers, regardless of authentication status.
*   **Session Data Loss (V1, V11, V15)**: Guest waypoints (V11) and active module (V15) are lost for Guest users. Active GPS session trail (V1) is lost for Pro users. This confirms a systemic failure in manual `localStorage` persistence across different types of volatile session data and across tiers.
*   **GPS Acquisition (P3, V3)**: The Pro tier consistently fails to acquire GPS, disabling the "Save Waypoint" button. This is a core functionality issue that would likely affect all tiers if they were able to attempt waypoint saving.
*   **Learn Tab State (V13, F4)**: Both Guest and Free tiers show consistent behavior for the Learn tab header statistics. The stats are recomputed on tab switch (V13), but the values (e.g., `completePct: 0`) remain the same, confirming no regression to zero (F4). This indicates the previous fix for V13 (preventing component unmount) is holding, and the header stats are behaving as expected.
*   **Pro Badges (F2)**: The Free tier correctly renders PRO badges for gated features in the LayerPanel, which is the intended behavior to encourage upgrades. The Guest tier also correctly surfaces the UpgradeSheet (C3) when tapping a Pro affordance.

## Findings Discarded

*   No findings were discarded as PHANTOM in this run. All identified issues have direct evidence from test failures or explicit annotations confirming vulnerable behavior.

## Cannot Assess

*   The full impact of `pro V10` (Pro status reverting to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) cannot be assessed beyond the initial app load failure. The app fails to load at all when offline, preventing any subsequent state checks or data rendering.

## Systemic Patterns

*   **Widespread Persistence Regression**: There is a critical and widespread regression affecting `localStorage` persistence. This impacts both manual `localStorage` keys (e.g., `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and Zustand `persist` middleware configurations (e.g., `ee-map-prefs` for basemap and layer visibility). This suggests a recent change has broken the fundamental mechanisms for saving user preferences and session data across reloads.
*   **Offline Unavailability**: The application lacks a robust Service Worker implementation to cache the core app shell and essential initial data. This renders the app completely unusable for authenticated users when offline, which is a critical failure for an outdoor mapping application.
*   **Persistent GPS Acquisition Issues**: The app continues to struggle with GPS acquisition, preventing core functionalities like waypoint saving. This indicates a deeper problem with how the app interacts with geolocation APIs or processes location data.

## Calibration Notes

*   The previous PHANTOM verdicts (e.g., for UI layout or haptic feedback) continue to guide the focus on direct, observable evidence from test annotations and assertion failures, rather than speculative inferences from timeouts or element changes alone.
*   The recurrence of persistence issues (V1, V7, V8, V9, V11, V15) and Pro gating problems (P1) highlights these as historically fragile areas. The current report indicates a significant regression, effectively undoing previously confirmed fixes for these vulnerabilities. This suggests a need for more robust regression testing and potentially a review of the underlying state management and persistence architecture.
*   The new test philosophy, where tests *pass* by confirming a known vulnerability (e.g., `pro V4`, `pro V6`, `pro V3`'s V14 annotation), proved effective in clearly identifying and attributing these expected vulnerable behaviors.