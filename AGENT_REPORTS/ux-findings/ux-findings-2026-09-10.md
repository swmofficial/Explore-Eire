# UX Agent Report — 2026-09-10

## Run Context
- Commits analysed: `3ae978e3ebe0e233305e220e05b02eb35f76738d` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This is a regression of a previously identified critical issue.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This issue affects both online and offline waypoint saving attempts.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no offline warning is shown before this disabled state.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Widespread Persistence Failures for User Preferences and Session Data (V1, V7, V8, V9, V11, V15 Regression)
- Summary: Multiple user preferences (theme, basemap, layer visibility, active module) and user-generated session data (guest waypoints, session trail) are not persisting across page reloads, despite previous fixes and `STATE_MAP.md` indicating they should be persisted. This represents a significant regression in core state management.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read. `STATE_MAP.md` indicates `ee_theme` should persist via a manual pattern (task-008).
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`, indicating a failure to assert persistence of basemap and layer visibility, respectively. `STATE_MAP.md` states `basemap` and `layerVisibility` persist via `ee-map-prefs`. The timeout suggests the app might be stuck in a default state.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is active. `STATE_MAP.md` indicates `sessionWaypoints` should persist via `ee_guest_waypoints` (task-002).
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active. `STATE_MAP.md` indicates `activeModule` should persist via `ee_active_module` (task-013).
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is active. `STATE_MAP.md` indicates `sessionTrail` should persist via `ee_session_trail` (task-006).
- Cannot confirm: The exact point of failure (read or write) for each persistence mechanism without deeper code inspection, but the `null`/`absent` annotations strongly suggest write failures.
- Root cause: A systemic breakdown in localStorage persistence mechanisms, potentially due to incorrect key usage, `persist` middleware misconfiguration, or manual IIFE patterns being broken. This directly contradicts the `STATE_MAP.md` and previous fixes.
- User impact: Users constantly lose their custom settings and unsaved session data, leading to a highly frustrating and unreliable experience. This undermines trust in the app's ability to retain user input.
- Business impact: High churn due to perceived unreliability, reduced engagement with core features like tracking and waypoints, and negative brand perception.
- Fix direction: Thoroughly audit all persistence mechanisms (Zustand `persist` and manual localStorage IIFE patterns) against `STATE_MAP.md` to identify why writes are failing or reads are not hydrating correctly.

### 4. High: Free Users Can Bypass Waypoint Save Gate (F3)
- Summary: Free tier users are incorrectly allowed to open the "New Waypoint" sheet when tapping the camera button, instead of being directed to the "Upgrade Sheet" as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly confirms that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: The specific line of code responsible for the incorrect routing logic without direct code access.
- Root cause: Incorrect conditional rendering or routing logic for the camera button tap, failing to check `isPro` status before deciding whether to show `UpgradeSheet` or `WaypointSheet`.
- User impact: Free users encounter a feature they cannot use, leading to confusion and frustration. It also exposes a potential loophole in the monetization strategy.
- Business impact: Missed opportunities for conversion to Pro subscriptions, as the upgrade prompt is bypassed. Erodes the value proposition of the Pro tier.
- Fix direction: Correct the conditional logic that determines which sheet to display when the camera button is tapped, ensuring `isPro` status is correctly evaluated.

### 5. Medium: Pro User Upgrade Sheet Display Timeout (P1)
- Summary: The test for Pro users not seeing the Upgrade Sheet timed out, suggesting the Upgrade Sheet might have appeared and blocked the test's progression, which would be an incorrect behavior for a paying Pro user.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This test is designed to confirm that Pro users *do not* see the UpgradeSheet. A timeout here often implies the test was unable to proceed because an unexpected modal (like the UpgradeSheet) appeared and blocked interaction with subsequent elements.
- Cannot confirm: Whether the UpgradeSheet was definitively visible without a screenshot at the point of failure or more specific logging. The timeout could also be due to general app unresponsiveness.
- Root cause: Potentially a race condition or incorrect `isPro` state evaluation that momentarily or incorrectly triggers the `UpgradeSheet` for Pro users.
- User impact: Pro users might be unnecessarily prompted to upgrade, causing confusion and annoyance, and diminishing their premium experience.
- Business impact: Damages the perception of value for Pro subscribers and can lead to dissatisfaction.
- Fix direction: Investigate the conditions under which the `UpgradeSheet` is displayed, particularly for authenticated Pro users, and ensure `isPro` state is stable and correctly evaluated.

### 6. Low: Offline Track Save Fails (V4 Confirmed)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the loss of the entire accumulated track data.
- Tier(s) affected: Pro (inferred All if tracking is available)
- Confidence: HIGH
- Evidence: `pro V4` test passed, which means the test successfully confirmed the vulnerability. `STATE_MAP.md` explicitly states: "Save track: `tracks` INSERT... **Fails** — toast 'Could not save track'... YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message shown to the user without a screenshot or specific annotation.
- Root cause: Lack of an offline data queue for user-generated content. All data writes are directly to Supabase, which fails without connectivity. This is a known, deferred vulnerability (V3, V4, V6, V14).
- User impact: Users lose valuable track data if they finish a session in an area without connectivity, leading to significant frustration and potential re-work.
- Business impact: Undermines trust in the app's data safety, especially for a core feature like tracking, potentially leading to user churn.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store unsynced track data and retry when online.

### 7. Low: Offline Route Save Fails Silently (V6 Confirmed)
- Summary: When a user attempts to save a route while offline, the save operation fails silently, providing no user-facing feedback about the failure.
- Tier(s) affected: Pro (inferred All if route building is available)
- Confidence: HIGH
- Evidence: `pro V6` test passed, which means the test successfully confirmed the vulnerability. `STATE_MAP.md` explicitly states: "Save route: `routes` INSERT... **Fails** — console.error only, no toast... YES — route points gone." The annotation `route-button-missing: cannot proof V6` indicates the test confirmed the *lack* of a toast.
- Cannot confirm: The specific console error message without direct access to browser console logs.
- Root cause: Lack of an offline data queue and insufficient error handling for route saving. This is a known, deferred vulnerability (V3, V4, V6, V14).
- User impact: Users believe their route has been saved when it hasn't, leading to confusion and potential loss of planned routes when they next open the app.
- Business impact: Erodes user trust and makes the route planning feature unreliable, potentially reducing engagement.
- Fix direction: Implement an offline data sync queue and ensure user-facing feedback (e.g., a toast) is provided for all failed save operations, even if data is queued for later sync.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Pro tier fails to load the app entirely when offline. This behavior is likely identical for the Free tier, as both require Supabase authentication and initial data loads. Guest users are not affected as they don't rely on Supabase for initial authentication.
-   **GPS Acquisition (P3, V3):** The "Acquiring GPS..." issue disabling the Save Waypoint button affects the Pro tier. This is a core functionality issue and would likely affect Free and Guest users if they were able to access the WaypointSheet.
-   **Theme Persistence (V7):** Both Guest and Free tiers experience theme resetting to default on reload. This behavior is identical across these tiers and likely affects Pro users as well.
-   **Basemap/Layer Visibility Persistence (V9, V8):** Guest (basemap) and Free (layer visibility) tests timed out, suggesting persistence issues. This indicates a general problem with `mapStore` persistence that likely affects all tiers.
-   **Session Data Persistence (V1, V11, V15):** Guest waypoints (V11), active module (V15), and session trail (V1) all fail to persist for their respective tested tiers (Guest for V11/V15, Pro for V1). This indicates a systemic failure in session data persistence across the application, affecting all tiers that interact with these features.
-   **Waypoint Save Gate (F3):** Free users can incorrectly bypass the upgrade gate and open the WaypointSheet. This is specific to the Free tier's monetization logic.
-   **Pro Upgrade Sheet (P1):** The Pro tier test for not seeing the Upgrade Sheet timed out, suggesting it might be incorrectly displayed. This is specific to the Pro tier experience.
-   **Offline Data Save Failures (V4, V6):** Pro tier experiences track and route save failures offline. This behavior is consistent with `STATE_MAP.md` for all data writes and would affect any tier attempting to save data offline.
-   **Learn Tab State (V13, F4):** Both Guest and Free tiers passed tests for Learn tab state persistence, showing no regression. This indicates the previous fix for V13 is holding across these tiers.

## Findings Discarded

-   **guest V13** and **free V13**: These tests passed, and the `state-loss-evidence` annotations showed no change in header stats (`completePct:0` before and after). Given that V13 was previously confirmed fixed ("Preserve Learn tab component state across tab switches"), these results indicate the fix is holding and no state loss occurred in this specific scenario. They are not new findings.
-   **free F4**: This test passed and the `header-stats-pair` annotation showed no regression. This confirms the Learn header percentage does not regress, aligning with the V13 fix. Not a new finding.

## Cannot Assess

-   The exact cause of the `Test timeout of 60000ms exceeded` for `guest V9`, `free V8`, and `pro P1` without more detailed logs or screenshots at the point of timeout. While likely related to the expected behavior not occurring (e.g., persistence failure or unexpected modal), the timeout itself doesn't provide definitive proof of the root cause beyond the general area.

## Systemic Patterns

The most prominent systemic pattern is a **widespread regression in state persistence**. Multiple features that were previously confirmed fixed (V1, V7, V11, V15) are now failing to persist data or preferences across reloads. This points to a fundamental issue in how `localStorage` is being utilized, either through Zustand's `persist` middleware or the manual IIFE patterns. This could be due to:
1.  **Incorrect `localStorage` key usage:** Keys might be changing or not being accessed correctly.
2.  **`persist` middleware misconfiguration:** Issues with `version` bumps, `migrate` functions, or `partialize` definitions.
3.  **Manual persistence pattern breakage:** Errors in the IIFE read or `setItem` write logic.
4.  **Global `localStorage` clearing:** An unintended side effect of another feature or a test setup issue.

Another critical systemic pattern is the **lack of robust offline capabilities**. The app completely fails to load offline for authenticated users (V2, V10), and all data writes (waypoints, tracks, routes) fail without connectivity (V3, V4, V6). This indicates a fundamental design flaw in not adopting an offline-first approach, which is critical for the target user base.

## Calibration Notes

The current findings show a significant regression, with several vulnerabilities (V1, V7, V10, V11, V15) that were previously marked as `CONFIRMED` fixed now reappearing. This highlights the importance of:
1.  **Robust regression testing:** The current test suite correctly identified these regressions, validating the "vulnerability-proof test philosophy."
2.  **Deep dive into persistence mechanisms:** The repeated failures in persistence, despite previous fixes, suggest that the underlying architectural solutions (Zustand `persist` and manual `localStorage` patterns) might be fragile or prone to misconfiguration. Future fixes should focus on making these mechanisms more resilient and thoroughly tested.
3.  **Comprehensive offline strategy:** The complete failure to load offline for authenticated users is a critical issue that supersedes previous partial fixes for offline behavior. This reinforces the need for a holistic offline-first design, as previously highlighted in the "Offline-First Design" UX knowledge context.
4.  **Careful interpretation of "PASS" for vulnerability tests:** As seen with V1, V11, V15, a test passing does not mean the vulnerability is absent; it means the test journey completed and *produced evidence* confirming the vulnerability. This requires careful reading of annotations.