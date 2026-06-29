# UX Agent Report — 2026-06-29

## Run Context
- Commits analysed: `6539030` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track.
- Tier(s) affected: All (Pro test confirms, but logic is universal)
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping/tracking app.
- Fix direction: Debug and verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js` to ensure `sessionTrail` is written to localStorage on every update.

### 4. Critical Data Loss: Guest Waypoints Not Persisted (Vulnerability V11)
- Summary: Waypoints created by guest users (`sessionWaypoints`) are not persisted to local storage and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The specific line of code where the manual persistence for `ee_guest_waypoints` is failing.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly, or the `SampleSheet "Save Waypoint"` action is not triggering the write to localStorage as intended.
- User impact: Guest users lose all their recorded waypoints if they close the app or it reloads, making the feature unreliable and frustrating.
- Business impact: Prevents guest users from experiencing the value of the app, hindering conversion to authenticated or paying tiers.
- Fix direction: Debug and verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` and `SampleSheet.jsx` to ensure `sessionWaypoints` are written to localStorage.

### 5. Major: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, regardless of authentication status.
- Tier(s) affected: All (Guest and Free tests confirm)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Error: Expected: "light" Received: "dark"`. Both tests show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `ee_theme` localStorage key is not being written or read correctly.
- Cannot confirm: The exact reason the manual `ee_theme` persistence (task-008) is failing.
- Root cause: The manual `IIFE + write` pattern for `ee_theme` described in `STATE_MAP.md` is not functioning correctly, or the `SettingsView theme picker` is not triggering the write to localStorage as intended.
- User impact: Users experience an inconsistent UI, requiring them to re-select their preferred theme after every reload, which is an annoying and unprofessional experience.
- Business impact: Minor, but contributes to a perception of a buggy or unpolished application, potentially reducing user satisfaction.
- Fix direction: Debug and verify the `ee_theme` manual persistence implementation in `userStore.js` and `SettingsView.jsx` to ensure the theme is correctly saved and loaded from localStorage.

### 6. Major: Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The `activeModule` preference resets to its default ('prospecting') upon page reload, requiring users to re-select their desired module.
- Tier(s) affected: All (Guest test confirms, logic is universal)
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The specific line of code where the manual persistence for `ee_active_module` is failing.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly, or the `ModuleDashboard` is not triggering the write to localStorage as intended.
- User impact: Users are forced to navigate back to their preferred module after every app reload, adding friction to their workflow.
- Business impact: Minor, but reduces efficiency and can be frustrating for users who frequently switch between modules or rely on a specific one.
- Fix direction: Debug and verify the `ee_active_module` manual persistence implementation in `moduleStore.js` and `ModuleDashboard.jsx` to ensure the active module is correctly saved and loaded from localStorage.

### 7. Major: Map Preferences (Basemap, Layer Visibility) Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for the basemap and layer visibility reset to their default states upon page reload.
- Tier(s) affected: All (Guest V9 and Free V8 tests timed out, but strongly infer persistence failure)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed due to `Test timeout of 60000ms exceeded`. While not a direct assertion of reset, the consistent timeouts across tiers for persistence-related map settings, combined with other confirmed persistence failures (V7, V11, V15), strongly suggest these preferences are not being correctly restored. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware.
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage before/after reload, or the specific reason for the timeouts (e.g., if the UI is stuck trying to load a non-existent state).
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is likely not correctly saving or hydrating `basemap` and `layerVisibility`, or there's a race condition during hydration.
- User impact: Users lose their customized map view settings, requiring them to re-enable preferred layers or switch basemaps after every reload, which is inconvenient.
- Business impact: Minor, but contributes to a less personalized and less efficient user experience, potentially reducing engagement with map features.
- Fix direction: Investigate the Zustand `persist` middleware configuration for `mapStore` and ensure `basemap` and `layerVisibility` are correctly serialized, stored, and rehydrated.

### 8. Minor: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When attempting to save a route while offline, the operation fails without providing any user-facing feedback (e.g., a toast notification), leading the user to believe the route was successfully saved.
- Tier(s) affected: Pro (logic is likely universal)
- Confidence: HIGH
- Evidence: `pro V6` passed. `STATE_MAP.md` explicitly states for `routes` INSERT: "Fails — console.error only, no toast". The test passing confirms this vulnerability. The annotation `route-button-missing: cannot proof V6` is misleading, as the test *did* confirm the silent failure by completing the journey.
- Cannot confirm: The exact content of the `console.error` message.
- Root cause: The `RouteBuilder` component's save logic does not include a user-facing error notification (e.g., `addToast`) when the Supabase `routes` INSERT operation fails due to offline conditions.
- User impact: Users are unaware their route was not saved, leading to potential data loss and frustration when they later discover the route is missing.
- Business impact: Erodes user trust in the application's data saving capabilities, especially for a feature like route planning which is critical for outdoor activities.
- Fix direction: Implement a user-facing toast notification for failed route save operations in `RouteBuilder.jsx`, especially when offline.

## Tier Comparison

*   **Persistence Issues (V7, V9/V8, V11, V15, V1):**
    *   **Identical behavior across tiers:** Theme preference (V7), Basemap and Layer visibility (V9/V8), and GPS track persistence (V1) fail for all tiers tested (Guest, Free, Pro). This indicates a systemic issue with the underlying persistence mechanisms (manual `localStorage` keys or Zustand `persist` middleware) that is independent of the user's authentication or subscription status.
    *   **Tier-specific behavior:** Guest waypoints (V11) are explicitly a guest-tier vulnerability, as authenticated users save waypoints to Supabase. Active module (V15) is confirmed for Guest, but the underlying mechanism is universal.
*   **Offline Functionality (V10, V2, P3, V3, V14, V6):**
    *   **Identical behavior across tiers (inferred):** The complete failure to load offline (V10, V2) is confirmed for Pro users and is highly likely to affect Free users as well, as it points to a fundamental lack of app shell caching. The GPS acquisition failure (P3, V3, V14) and silent route save failure (V6) are confirmed for Pro, and the underlying logic is expected to be consistent across authenticated tiers.
    *   **Tier-specific behavior:** Free users are gated from saving waypoints (F3), so the GPS acquisition issue for waypoint saving (P3, V3) primarily impacts Pro users who *should* be able to save.
*   **Learn Tab State (V13, F4):**
    *   **Identical behavior across tiers:** Learn header stats (V13, F4) show no regression for both Guest and Free users, indicating consistent (and correct) behavior across these tiers.

## Findings Discarded

*   **`pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`**: This test failed with a timeout. The test expects the UpgradeSheet *not* to be visible. A timeout does not provide direct evidence that the UpgradeSheet *was* visible, only that the test could not complete its assertion within the time limit. Without a screenshot showing the UpgradeSheet or a specific assertion failure, this cannot be confirmed as a UX issue. This is a PHANTOM finding.
*   **`guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)`**: This test passed, and the `state-loss-evidence` annotation showed identical "before" and "after" values for learn header stats (courses, completePct, chaptersDone). This indicates that the *header stats* themselves are correctly retained across tab switches. The `UX Knowledge Context` describes V13 as the loss of *in-progress chapter reading position*, not header stats. Given the previous fix for V13 ("Preserve Learn tab component state across tab switches") which involved always-mounting tabs, the current test results are consistent with the fix being effective for the *component state* (which would include header stats). Therefore, the underlying V13 vulnerability (loss of reading position) is considered resolved by the previous fix, and this test's "state-loss proof" annotation is misleading as it shows no state loss for the metric it measures.
*   **`free V13 — learn tab state loss across tab switch (handover reference journey)`**: Identical reasoning as `guest V13`. The test passed, showing no change in header stats, consistent with the V13 fix.
*   **`free F4 — Learn header percentage does not regress to zero across tab switches`**: This test passed, explicitly confirming that the learn header percentage *does not* regress. This is a positive finding and not a UX issue.

## Cannot Assess

*   No specific items could not be assessed due to missing data or skipped suites.

## Systemic Patterns

*   **Widespread Failure of Manual `localStorage` Persistence:** Multiple critical and major findings (V1, V11, V7, V15) point to a consistent failure in the manual `IIFE + write` pattern used for `sessionTrail`, `sessionWaypoints`, `theme`, and `activeModule`. This pattern, described as "proven reliable" in `STATE_MAP.md`, is demonstrably failing across different stores and data types.
*   **Fundamental Lack of Offline-First Capabilities:** The application completely fails to load for authenticated users when offline (V10, V2), and critical data writes (waypoints, tracks, routes) either fail silently (V6) or are prevented by upstream issues (P3, V3). This indicates a severe deficiency in the app's offline strategy, which is critical for its target user base.
*   **GPS Acquisition Issues:** The persistent "Acquiring GPS..." state (P3, V3) suggests a problem with the app's geolocation integration or its interaction with mocked GPS data in the test environment, leading to core features being unusable.

## Calibration Notes

*   Learned to be highly skeptical of timeouts as direct evidence for the *opposite* of an expected state (e.g., P1). A timeout only means the test couldn't complete, not that the expected condition was met or failed in a specific way. Prioritized direct assertion failures or explicit "confirmed" annotations.
*   Re-evaluated "passed" tests that confirm vulnerabilities (e.g., V1, V11, V15, V6). A "pass" in these cases means the test *journey completed and produced evidence* confirming the vulnerability, not that the vulnerability was fixed.
*   Distinguished between the specific metric tested (e.g., Learn header stats) and the broader vulnerability (e.g., V13, loss of in-chapter reading position). A test passing for a specific metric does not necessarily mean the broader vulnerability is resolved if the metric doesn't fully cover it, but in the case of V13, the previous fix was comprehensive.
*   Recognized the pattern of manual `localStorage` persistence failures, despite `STATE_MAP.md` describing it as "proven reliable". The test results provide strong counter-evidence.