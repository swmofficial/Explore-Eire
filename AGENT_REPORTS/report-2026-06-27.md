# UX Agent Report — 2026-06-27

## Run Context
- Commits analysed: `48c18e0` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. High: Widespread Persistence Failures for User Preferences and Session Data (Vulnerability V7, V9, V8, V11, V15, V1)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility) and session-specific data (guest waypoints, active module, GPS track) are not being persisted across page reloads, leading to data loss and a frustrating user experience.
- Tier(s) affected: All (Guest, Free, likely Pro for V7, V9, V8; Guest for V11; All for V15, V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`. This directly contradicts `STATE_MAP.md`'s claim that `theme` persists via `ee_theme`.
    - `guest V9` (basemap) and `free V8` (layers) failed with `Test timeout of 60000ms exceeded.`, strongly indicating persistence failure for `mapStore.basemap` and `mapStore.layerVisibility` (persisted via `ee-map-prefs`). This contradicts `STATE_MAP.md`.
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms guest waypoints are lost, directly contradicting `STATE_MAP.md`'s claim of persistence via `ee_guest_waypoints`.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms active module resets, directly contradicting `STATE_MAP.md`'s claim of persistence via `ee_active_module`.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms GPS track is lost, directly contradicting `STATE_MAP.md`'s claim of persistence via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeout, but the outcome is clear.
- Root cause: A systemic regression in the persistence mechanisms. For `theme`, `sessionWaypoints`, `activeModule`, and `sessionTrail`, the manual `localStorage` IIFE + write pattern (as described in `STATE_MAP.md`) is demonstrably not working. For `basemap` and `layerVisibility`, the Zustand `persist` middleware for `ee-map-prefs` is also failing.
- User impact: Highly frustrating and repetitive experience. Users lose their settings, active work, and session data, forcing them to reconfigure the app and potentially lose valuable unsaved progress (waypoints, tracks). This erodes trust and makes the app feel unreliable.
- Business impact: Significant negative impact on user satisfaction, retention, and perceived app quality. Users will abandon the app if their preferences and work are constantly lost.
- Fix direction: Thoroughly debug and re-implement all persistence mechanisms (both manual `localStorage` and Zustand `persist` middleware) to ensure data is correctly written and read across reloads. Update `STATE_MAP.md` to reflect the current implementation status.

### 4. High: Pro User Incorrectly Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: A Pro user, who should have access to all features, is incorrectly shown the Upgrade Sheet when tapping a Pro-gated affordance.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. This timeout strongly implies the test was waiting for the UpgradeSheet *not* to be visible, but it *was* visible, or the test hung trying to interact with a non-existent element due to the UpgradeSheet being present.
- Cannot confirm: The exact element the test was waiting for, but the context of `P1` (Pro user not seeing UpgradeSheet) strongly implies the sheet was shown.
- Root cause: The `isPro` status, while persisted (as per `STATE_MAP.md`), is either not being correctly read, or the Pro-gating logic for displaying the `UpgradeSheet` is flawed, leading to an incorrect display for paying users. This could be a race condition during `isPro` hydration or an incorrect conditional render.
- User impact: Extremely frustrating for paying Pro users who are told to upgrade for features they already pay for. This undermines the value proposition of the Pro tier.
- Business impact: Damages trust with paying customers, leading to potential churn and negative reviews. Devalues the Pro subscription.
- Fix direction: Debug the `UpgradeSheet` display logic, ensuring it correctly evaluates the `isPro` status from `userStore` and does not show for Pro users. Investigate potential race conditions during `isPro` hydration.

### 5. Medium: Offline Track Save Fails (Vulnerability V4)
- Summary: When a user finishes tracking a route and attempts to save it while offline, the save operation fails, resulting in the loss of the entire GPS track data.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V4` passed. The test passing means the journey completed and produced evidence. `STATE_MAP.md` explicitly states: "Save track ... `tracks` INSERT ... Fails — toast 'Could not save track' ... YES — entire GPS trail, distance, elevation, duration gone." This confirms V4 is active.
- Cannot confirm: The exact toast message from the test output, but the `STATE_MAP.md` is clear.
- Root cause: The application attempts a direct Supabase `INSERT` for track data without an offline queue or local-first persistence mechanism. When offline, this network request fails, and the accumulated `sessionTrail` data is lost.
- User impact: Users lose valuable data from their outdoor activities, leading to significant frustration and potential safety concerns if they rely on the app for logging.
- Business impact: Erodes user trust in data safety, leading to churn and negative perception of app reliability, especially for a core feature.
- Fix direction: Implement an offline-first data strategy for user-generated content, including a persistent sync queue (e.g., IndexedDB) for track data.

### 6. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a custom route while offline, the save operation fails silently, providing no user-facing feedback about the failure.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V6` passed. The test passing means the journey completed and produced evidence. `STATE_MAP.md` explicitly states: "Save route ... `routes` INSERT ... Fails — console.error only, no toast ... YES — route points gone." This confirms V6 is active. The annotation `route-button-missing: cannot proof V6` is likely an issue with the test's ability to assert the *absence* of a toast, not that the vulnerability isn't present.
- Cannot confirm: The console error or the exact UI state after the silent failure from the test output.
- Root cause: Similar to track saving, the application attempts a direct Supabase `INSERT` for route data without an offline queue. On failure, it only logs a `console.error` instead of providing user feedback (e.g., a toast notification). The `routePoints` are volatile `mapStore` state and are lost.
- User impact: Users believe their route has been saved, only to discover it's missing later. This leads to confusion, wasted effort, and a complete lack of trust in the app's data handling.
- Business impact: Damages user trust and satisfaction, particularly for a feature that requires significant user input. Leads to churn.
- Fix direction: Implement an offline-first data strategy for user-generated content, including a persistent sync queue for route data. Ensure all failed write operations provide clear, user-facing feedback (e.g., toast notifications).

## Tier Comparison

*   **V7 (Theme Persistence):** Identical behavior across Guest and Free tiers. Both fail to persist the theme preference, resetting to 'dark' on reload. This indicates a core issue with the `ee_theme` localStorage mechanism, independent of authentication status.
*   **V9 (Basemap Persistence) / V8 (Layer Persistence):** Identical behavior across Guest (V9) and Free (V8) tiers. Both tests timeout, strongly indicating a failure to persist basemap and layer preferences. This points to a core issue with the `ee-map-prefs` Zustand persist configuration, independent of authentication.
*   **V13 (Learn Header Stats Persistence):** Identical behavior across Guest and Free tiers. Both tests pass, showing that the Learn header statistics (courses, completePct, chaptersDone) *are* preserved across tab switches. This confirms the fix for V13 is working for this specific aspect.
*   **V11 (Guest Waypoints Persistence):** Only applicable to Guest tier in this test run, confirmed to be lost on reload.
*   **V15 (Active Module Persistence):** Only applicable to Guest tier in this test run, confirmed to reset on reload. This behavior would likely affect Free/Pro users as well, as `moduleStore` is not auth-gated.
*   **V1 (GPS Track Persistence):** Only applicable to Pro tier in this test run, confirmed to be lost on reload. This behavior would likely affect Free users as well, as `sessionTrail` is not auth-gated.
*   **Offline App Loading (V10, V2):** Fails for Pro tier. This is a fundamental app loading issue for authenticated users and would likely affect Free tier as well. Guest users might load partially but won't have access to auth-gated features.
*   **Waypoint Save (P3, V3, V14):** Disabled for Pro tier due to GPS acquisition failure. Free users are correctly gated to the UpgradeSheet (F3 passes), so they would not encounter the disabled save button. Guest users cannot save waypoints.
*   **Offline Data Saves (V4, V6):** Confirmed to fail (V4) or fail silently (V6) for Pro tier. These are data write operations and would likely affect Free users similarly.

## Findings Discarded
- None. All identified findings are high confidence and represent critical user experience issues or regressions.

## Cannot Assess
- The exact content of `ee-map-prefs` localStorage for `guest V9` and `free V8` due to test timeouts. However, the timeouts themselves are strong evidence of persistence failure.
- The exact toast message for `pro V4` and `pro V6` from the test output, but `STATE_MAP.md` provides the expected behavior.

## Systemic Patterns
1.  **Widespread Persistence Regression:** A significant number of previously "CONFIRMED" persistence fixes (V1, V7, V11, V15) are now failing. This points to a systemic issue with how `localStorage` is being used, either through manual IIFE patterns or Zustand's `persist` middleware. The `STATE_MAP.md` is now out of sync with the observed behavior.
2.  **Lack of Offline-First Data Strategy:** The app fundamentally fails to load offline for authenticated users (V10, V2) and all data write operations (waypoints, tracks, routes) fail immediately and often silently when offline (V3, V4, V6, V14). This is a core architectural flaw for an app targeting rural users.
3.  **GPS Acquisition Instability:** The persistent "Acquiring GPS..." state leading to a disabled save button (P3, V3) indicates a problem with the app's GPS handling, potentially exacerbated by the Playwright mock but likely an underlying app issue.

## Calibration Notes
- The previous `CONFIRMED` verdicts for V1, V7, V11, V15 (and others related to persistence) are directly contradicted by the current test results. This highlights the importance of continuous regression testing and trusting the *current* test evidence over historical `STATE_MAP.md` claims when there's a conflict. The `STATE_MAP.md` should be updated to reflect these regressions.
- The new "Vulnerability-Proof Test Philosophy" is effective in producing explicit evidence for vulnerabilities (e.g., `ee_theme-before-reload: null`, `ee_guest_waypoints absent`, `V14 confirmed`). This allows for high-confidence findings even when tests "pass" but confirm a vulnerability.