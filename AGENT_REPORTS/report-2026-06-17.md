# UX Agent Report — 2026-06-17

## Run Context
- Commits analysed: `944dc51` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data (like `gold_samples` for V2). The app relies on network connectivity for initial load, failing the "Offline-First Design" principle. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement a Service Worker to cache the app shell and critical data for offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Status Not Recognized, Upgrade Sheet Shown to Pro Users (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test from proceeding.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it even when online.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` is correctly read and `isPro` is set before Pro affordances are evaluated.

### 4. High: Manual Preferences (Theme, Waypoints, Active Module, GPS Track) Lost on Reload (Vulnerability V7, V11, V15, V1)
- Summary: User preferences for theme, guest waypoints, active module, and active GPS track are not persisted across app reloads, leading to a loss of user configuration and data.
- Tier(s) affected: All (V7, V15), Guest (V11), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` fail: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `theme-after-reload: dark` (expected light).
    - `guest V11` passes: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passes: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passes: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure in the "manual IIFE + write pattern" (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing).
- Root cause: The "manual IIFE + write pattern" described in `STATE_MAP.md` for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` is not functioning correctly, resulting in these keys being `null` or `absent` in `localStorage` after a reload. This contradicts the `STATE_MAP.md`'s assertion of reliability for this pattern.
- User impact: Users lose their chosen theme, unsaved guest waypoints, their active module context, and any in-progress GPS tracks, leading to repeated setup, data loss, and frustration.
- Business impact: Reduces user engagement, trust, and perceived reliability of the app, potentially leading to churn.
- Fix direction: Debug and fix the manual `localStorage` read/write implementations for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail`.

### 5. High: Map Preferences (Basemap, Layer Visibility) Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for the selected basemap and layer visibility are not persisted across app reloads, forcing users to reconfigure their map view every session.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V9` fails: `Test timeout of 60000ms exceeded.` (implies basemap not found after reload).
    - `free V8` fails: `Test timeout of 60000ms exceeded.` (implies layer preferences not found after reload).
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after reload, as the tests timed out before providing explicit `localStorage` annotations for this key.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`), which is supposed to persist `basemap` and `layerVisibility`, is not functioning correctly.
- User impact: Users must repeatedly set up their preferred basemap and layer configurations, leading to inefficiency and annoyance.
- Business impact: Degrades user experience, making the app feel less "smart" and personalised, potentially impacting long-term retention.
- Fix direction: Debug the Zustand `persist` middleware configuration and implementation for `mapStore` to ensure `basemap` and `layerVisibility` are correctly saved to and loaded from `ee-map-prefs`.

### 6. Medium: Offline Track Save Fails (Vulnerability V4)
- Summary: When a Pro user attempts to save a GPS track while offline, the save operation fails, resulting in the loss of the entire track data.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V4` test passes, confirming the vulnerability. `STATE_MAP.md` explicitly states that `tracks` INSERT operations "Fails — toast 'Could not save track'" and results in "YES — entire GPS trail... gone."
- Cannot confirm: The exact toast message or UI state, as the test only confirms the failure.
- Root cause: The application lacks an offline data queue for user-generated content. Supabase `tracks` INSERT operations require an active network connection and fail when offline.
- User impact: Users lose valuable track data if they complete a session in an area without connectivity, leading to frustration and potential loss of important field records.
- Business impact: Undermines the app's utility for its target audience (prospectors in rural areas), leading to dissatisfaction and reduced trust in data safety.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue for track data, ensuring local-first writes and eventual consistency.

### 7. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a Pro user attempts to save a route while offline, the save operation fails silently without any user-facing feedback, leading to unexpected data loss.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V6` test passes, confirming the vulnerability. The annotation `route-button-missing: cannot proof V6` indicates the test confirmed the silent failure, but couldn't capture specific UI elements. `STATE_MAP.md` explicitly states that `routes` INSERT operations "Fails — console.error only, no toast" and results in "YES — route points gone."
- Cannot confirm: The exact console error message or the precise moment of data loss.
- Root cause: The application lacks an offline data queue for user-generated content and fails to provide user feedback on network-dependent operations. Supabase `routes` INSERT operations fail silently when offline.
- User impact: Users believe their route has been saved, only to discover it's missing later, leading to confusion, wasted effort, and distrust in the app's reliability.
- Business impact: Damages user trust and perceived data integrity, potentially leading to churn and negative word-of-mouth.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue for route data, and ensure user-facing feedback (e.g., a toast) is provided for all failed save operations.

## Tier Comparison

-   **Offline App Load (V10, V2):** Fails for Free and Pro users, preventing the app from loading at all. Guest tier not explicitly tested for this specific failure, but likely affected by the same underlying lack of app shell caching.
-   **Theme Preference Reset (V7):** Affects Guest and Free users, reverting to default 'dark' theme on reload. This is due to a failure in the manual `ee_theme` persistence, which is a universal issue across all tiers.
-   **Map Preferences Reset (V9, V8):** Basemap resets for Guest (V9) and layer visibility for Free (V8). This is due to a failure in the `ee-map-prefs` Zustand persistence, indicating a universal issue affecting all tiers.
-   **Guest Waypoints Lost (V11):** Specific to Guest users, as authenticated users save waypoints to Supabase.
-   **Active Module Reset (V15):** Observed for Guest users, due to a failure in `ee_active_module` manual persistence. This is a universal issue likely affecting Free and Pro users as well.
-   **GPS Track Lost (V1):** Observed for Pro users, due to a failure in `ee_session_trail` manual persistence. This is a universal issue likely affecting Free and Guest users if they were able to initiate tracking.
-   **Waypoint Save Disabled (P3, V3, V14):** Affects Pro users due to GPS acquisition failure. Free users are gated from saving waypoints, and Guest users do not save to the database.
-   **Pro Status Not Recognized (P1):** Specific to Pro users, leading to the Upgrade Sheet being shown incorrectly.
-   **Offline Track Save Fails (V4):** Specific to Pro users, as only Pro users can save tracks to the database.
-   **Offline Route Save Fails Silently (V6):** Specific to Pro users, as only Pro users can save routes to the database.
-   **Learn Header Stats (V13, F4):** Header statistics (courses, completion percentage, chapters done) remain stable across tab switches for both Guest and Free users. This indicates the previous fix for V13 (keeping tabs mounted) is working for this specific aspect of state.

## Findings Discarded
-   No findings were discarded in this run, as all identified issues were significant and within the 8-finding limit.

## Cannot Assess
-   The exact state of `ee-map-prefs` in `localStorage` after reload for V9 and V8, as the tests timed out before capturing this specific annotation.
-   The specific in-progress chapter reading position state (page within a chapter) for V13, as the current test only verifies the stability of the Learn tab header statistics, not granular component state within a chapter.

## Systemic Patterns
1.  **Lack of Offline-First Architecture:** The core application shell and critical data are not cached, leading to complete failure when authenticated users attempt to load the app offline (V10, V2). This is a fundamental design flaw for an outdoor mapping application.
2.  **Widespread Persistence Mechanism Failures:** Both the Zustand `persist` middleware (for `ee-map-prefs` affecting V9, V8) and the "manual IIFE + write pattern" (for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail` affecting V7, V11, V15, V1) are failing. This indicates a deep-seated issue with how state is being saved and restored across the application, contradicting the `STATE_MAP.md`'s assertion of reliability for the manual pattern.
3.  **Consistent GPS Acquisition Issues:** The application consistently fails to acquire GPS coordinates, disabling critical functionality like saving waypoints (P3, V3, V14). This suggests a problem with the `watchPosition` implementation or its interaction with the Playwright geolocation mock.

## Calibration Notes
-   The persistence of the top three critical findings from the previous report (V10/V2, P3/V3/V14, P1) highlights their severity and indicates they remain unaddressed.
-   The re-evaluation of V13 based on the `state-loss-evidence` annotation was crucial. The test *passing* and showing *no change* in header stats confirms that the previous fix for V13 (keeping tabs mounted) is effective for this specific aspect, preventing state loss for the Learn tab's header. This reinforces the importance of precise interpretation of test annotations.
-   The direct contradiction between `STATE_MAP.md`'s description of "manual IIFE + write pattern" as "proven reliable" and the test evidence (showing `null` or `absent` for these keys) is a strong signal that the `STATE_MAP.md` needs updating or the implementation of these patterns is flawed despite the description. Trusting the test evidence over the descriptive text in the `STATE_MAP.md` was key here.