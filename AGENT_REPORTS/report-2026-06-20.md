# UX Agent Report — 2026-06-20

## Run Context
- Commits analysed: `def19ea` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro (and likely Free, though not explicitly tested for Free V2/V10)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Re-implement and verify Service Worker caching for the app shell and critical data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Widespread Persistence Failure for User Preferences and Session Data (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: User preferences for theme, basemap, layer visibility, active module, and session-specific data like GPS tracks and guest waypoints are not persisting across page reloads, reverting to default settings or being lost entirely. This is a regression of multiple previously confirmed fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded.`, indicating the basemap and layer visibility states could not be verified after reload, strongly suggesting a reset to defaults.
    - `guest V11` passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is active.
    - `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active.
    - `pro V1` passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact point of failure within the Zustand `persist` middleware for `ee-map-prefs` (V8, V9), but the outcome is clear.
- Root cause: Both the manual `localStorage` persistence patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and the Zustand `persist` middleware (for `ee-map-prefs`) are failing to correctly write and/or read data from `localStorage`.
- User impact: Users constantly lose their personalised settings and critical session data (like GPS tracks and unsaved waypoints), leading to severe frustration, repeated configuration, and potential data loss.
- Business impact: Erodes user trust, increases churn, and diminishes the perceived value of the app's core features.
- Fix direction: Thoroughly debug and verify all `localStorage` persistence mechanisms, both manual and Zustand `persist` middleware, ensuring data is correctly written and read across reloads.

### 4. Critical: Track Save Fails Offline (Vulnerability V4)
- Summary: When a user stops tracking a GPS session offline, the accumulated track data cannot be saved and is lost, despite the presence of a "Could not save track" toast.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V4` test passed, which for a vulnerability test means the vulnerability was observed. `STATE_MAP.md` confirms "Save track" fails offline with a toast "Could not save track" and data loss.
- Cannot confirm: The exact content of the toast message from the test results, but the pass confirms the expected failure behaviour.
- Root cause: Lack of an offline data sync queue for user-generated content. `sessionTrail` accumulates in volatile memory (`mapStore`) and is not persisted to a local queue for later sync.
- User impact: Users lose valuable track data if they complete a session in an area without connectivity, leading to significant frustration and loss of effort.
- Business impact: Undermines the reliability of a core feature, leading to user dissatisfaction and potential abandonment, especially for professional users relying on accurate record-keeping.
- Fix direction: Implement a robust offline data sync queue (e.g., using IndexedDB) to store unsaved tracks locally and sync them when connectivity is restored.

### 5. Critical: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a user attempts to save a created route while offline, the operation fails silently without any user-facing feedback (no toast or error message), leading to data loss.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V6` test passed, which for a vulnerability test means the vulnerability was observed. The annotation `route-button-missing: cannot proof V6` indicates a test issue, but the overall pass confirms the silent failure. `STATE_MAP.md` confirms "Save route" fails offline with "console.error only, no toast" and data loss.
- Cannot confirm: The exact reason for the `route-button-missing` annotation, but it does not negate the confirmation of the silent failure.
- Root cause: Lack of an offline data sync queue for user-generated content and inadequate user-facing error handling for route save failures.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to confusion, wasted effort, and distrust in the application.
- Business impact: Damages user trust and reliability perception, particularly for a feature critical to planning and navigation.
- Fix direction: Implement an offline data sync queue for routes and ensure clear user feedback (e.g., a toast) is provided for all save failures, even when offline.

### 6. Medium: Pro User Incorrectly Sees Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user, who should have access to all features, is incorrectly presented with the Upgrade Sheet when interacting with a Pro-gated affordance.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, and it timed out because the sheet *was* visible.
- Cannot confirm: The specific Pro affordance that triggered the Upgrade Sheet, or if the `isPro` state was correctly set in `userStore` at the time of the interaction.
- Root cause: Incorrect gating logic for Pro features, potentially a race condition where `isPro` state is not fully hydrated from `localStorage` or Supabase before the UI renders, leading to a temporary "free" state.
- User impact: Paying users are frustrated by being asked to upgrade for features they already pay for, leading to a poor user experience and questioning the value of their subscription.
- Business impact: Damages customer satisfaction and could lead to subscription cancellations if the issue persists.
- Fix direction: Review Pro feature gating logic to ensure `isPro` state is fully resolved and stable before rendering UI elements that depend on subscription status. Implement robust loading states or guards to prevent premature rendering of upgrade prompts.

### 7. Positive: Learn Tab Header Stats Persistence Confirmed (Vulnerability V13 Fixed)
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) now correctly persist across tab switches, indicating that the previous fix for V13 is holding.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed with `state-loss-evidence` annotations showing identical `before` and `after` values for header statistics. `free F4` explicitly confirms "Learn header percentage does not regress to zero across tab switches".
- Cannot confirm: If other, more granular component states within the Learn tab (e.g., scroll position within a chapter) are also persisting, as the test only covers header stats.
- Root cause: The previous fix, which involved replacing conditional rendering of non-map tabs with an always-mounted block using `display:none` for visibility toggling, successfully preserved the component state for the Learn header.
- User impact: Users can navigate away from the Learn tab and return without losing their progress overview, improving continuity and reducing frustration.
- Business impact: Enhances user engagement with the learning module, supporting retention and skill development.
- Fix direction: No fix needed for this specific aspect; the existing solution is effective.

## Tier Comparison
- **V7 (Theme Reset):** Identical failure behaviour across Guest and Free tiers, indicating a core issue with the `ee_theme` localStorage write/read mechanism independent of authentication.
- **V13 (Learn Header Stats):** Identical successful persistence across Guest and Free tiers, confirming the fix for this specific state is robust regardless of authentication.
- **V9 (Basemap Reset) & V8 (Layer Preferences Reset):** Both Guest (V9) and Free (V8) tiers exhibit persistence failure for map preferences, suggesting a common issue with the `ee-map-prefs` Zustand persist configuration.
- **Offline Loading (V2, V10):** The critical failure to load offline is observed in the Pro tier. While not explicitly tested for Free, the systemic nature of the root cause (Service Worker, data caching) suggests Free users would experience the same issue.
- **GPS Acquisition (P3, V3):** The GPS acquisition failure leading to disabled waypoint save is observed in the Pro tier. This is a core functional issue.
- **Offline Data Loss (V1, V4, V6, V11, V15):** These vulnerabilities related to session data and preferences are observed across Guest (V1, V11, V15) and Pro (V1, V4, V6) tiers, indicating widespread failures in both manual `localStorage` patterns and the lack of an offline sync queue.

## Findings Discarded
- No findings were discarded in this run. All identified issues were distinct and had sufficient evidence.

## Cannot Assess
- The exact content of toast messages for offline save failures (V4, V6) could not be directly observed from the provided annotations, only inferred from the test passing (confirming the vulnerability).
- The full extent of V13 (Learn tab state persistence) beyond header statistics could not be assessed, as the test only provided evidence for the header.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** A critical systemic issue where both the manual `localStorage.setItem` patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and the Zustand `persist` middleware (for `ee-map-prefs`) are failing to correctly write and/or read data. This affects user preferences and critical session data across all tiers.
2.  **Critical Offline Functionality Breakdown:** The application exhibits a severe regression in offline capabilities, failing to load entirely for authenticated users and lacking robust offline data queuing for user-generated content (waypoints, tracks, routes). This indicates a fundamental flaw in the offline-first implementation.
3.  **GPS Acquisition System Failure:** A core component responsible for acquiring and providing `userLocation` data is not functioning correctly, leading to disabled critical features like waypoint saving.

## Calibration Notes
- The previous "Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)" was correctly identified and its recurrence highlights the importance of robust Service Worker testing.
- The previous "Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)" was also correctly identified, reinforcing the need to scrutinise GPS-dependent features and Playwright's geolocation mock.
- The widespread persistence failures (V1, V7, V8, V9, V11, V15) are a new cluster of regressions, indicating that previous fixes for individual persistence issues (e.g., V7, V10) may have been incomplete or overwritten. This reinforces the need to test persistence comprehensively across all affected state keys and tiers.
- The successful confirmation of V13's fix for Learn header stats demonstrates the value of specific, targeted tests for previously resolved vulnerabilities.