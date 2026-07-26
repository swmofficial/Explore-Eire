# UX Agent Report — 2026-07-26

## Run Context
- Commits analysed: `e9e5ed4599396faff75a3d79751b37252d883387` (latest) and 19 preceding commits.
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
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". Additionally, `v14-pre-save-offline-warning: no (V14 confirmed)` indicates no offline warning was shown.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to save waypoints directly via the camera button, bypassing the expected upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: The specific code change that introduced this regression.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check the user's `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users access a premium feature without paying, diminishing the value proposition of the Pro subscription.
- Business impact: Direct revenue loss, devalues the Pro subscription, and creates an unfair advantage for free users.
- Fix direction: Correct the conditional logic that determines whether to show the `UpgradeSheet` or `WaypointSheet` when the camera button is tapped, ensuring `isPro` status is correctly evaluated.

### 4. High: User-Generated Data (Tracks, Guest Waypoints) Lost on Reload (Vulnerability V1, V11 Regression)
- Summary: Actively tracked GPS trails and guest waypoints are lost on page reload, despite previous fixes, indicating a regression in manual `localStorage` persistence.
- Tier(s) affected: Guest (V11), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact commit that caused the regression, but `STATE_MAP.md` indicates these *should* be persisted via manual `localStorage` patterns (task-002, task-006).
- Root cause: Regression in the manual `localStorage` IIFE + write patterns for `sessionWaypoints` (`ee_guest_waypoints`) and `sessionTrail` (`ee_session_trail`).
- User impact: Loss of critical user-generated data (hike tracks, saved locations), leading to severe frustration and distrust in the app's reliability.
- Business impact: High churn, negative reviews, loss of user-contributed content.
- Fix direction: Re-verify and fix the manual `localStorage` persistence logic for `sessionWaypoints` and `sessionTrail`.

### 5. High: Active Module Resets to Default on Reload (Vulnerability V15 Regression)
- Summary: The user's selected active module resets to 'prospecting' on page reload, despite previous fixes, indicating a regression in manual `localStorage` persistence.
- Tier(s) affected: Guest (inferred all)
- Confidence: HIGH
- Evidence: `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
- Cannot confirm: The exact commit that caused the regression, but `STATE_MAP.md` indicates `activeModule` *should* be persisted via `ee_active_module` (task-013).
- Root cause: Regression in the manual `localStorage` IIFE + write pattern for `moduleStore.activeModule` (`ee_active_module`).
- User impact: Users constantly lose their context and have to re-select their module, leading to annoyance and inefficiency.
- Business impact: Reduced user engagement, perceived lack of polish.
- Fix direction: Re-verify and fix the manual `localStorage` persistence logic for `activeModule`.

### 6. Medium: Theme Preference Resets to Default on Reload (Vulnerability V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme on page reload, despite previous fixes, indicating a regression in manual `localStorage` persistence.
- Tier(s) affected: Guest, Free (inferred Pro)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both reported `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, confirming the `ee_theme` key is not being written or read.
- Cannot confirm: The exact commit that caused the regression, but `STATE_MAP.md` indicates `theme` *should* be persisted via `ee_theme` (task-008).
- Root cause: Regression in the manual `localStorage` IIFE + write pattern for `userStore.theme` (`ee_theme`).
- User impact: Annoyance as preferred theme is not remembered, requiring repetitive manual selection.
- Business impact: Minor, but contributes to a perception of an unreliable and unpolished application.
- Fix direction: Re-verify and fix the manual `localStorage` persistence logic for `theme`.

### 7. Medium: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected basemap and layer visibility preferences are likely resetting to defaults on page reload, as indicated by test timeouts.
- Tier(s) affected: Guest (V9), Free (V8) (inferred all)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded`. While direct assertion failure is not present, the timeout in tests specifically designed to check persistence strongly suggests a failure to retain state. `STATE_MAP.md` indicates `basemap` and `layerVisibility` are persisted via Zustand `persist` middleware (`ee-map-prefs`).
- Cannot confirm: The exact state of the basemap or layer visibility after reload due to the timeout.
- Root cause: Potential issue with the Zustand `persist` middleware for `mapStore` or a race condition during hydration that causes preferences to be overwritten by defaults.
- User impact: Users lose their preferred map view and layer selections, requiring repetitive setup and reducing efficiency.
- Business impact: Reduced user efficiency, minor frustration, and perceived lack of app intelligence.
- Fix direction: Investigate the Zustand `persist` middleware configuration for `mapStore` and potential race conditions during state hydration.

### 8. Low: Offline Track Save Fails (Vulnerability V4)
- Summary: The application fails to save a GPS track when the user is offline, leading to data loss if not explicitly saved online later.
- Tier(s) affected: Pro (inferred all authenticated users)
- Confidence: HIGH
- Evidence: `pro V4` test passed, which confirms the vulnerability (the test is designed to pass if the save fails offline). `STATE_MAP.md` explicitly lists `V4` as "Any form of offline write queue... deferred".
- Cannot confirm: The exact user experience beyond the save failure (e.g., specific error message, if any).
- Root cause: Lack of an offline write queue for user-generated data. Supabase `tracks` INSERT operation fails silently offline.
- User impact: Loss of valuable GPS track data if the user attempts to save while offline and does not retry when connectivity is restored.
- Business impact: Data loss, user distrust, and reduced utility for users in rural areas.
- Fix direction: Implement an offline write queue (e.g., using IndexedDB) to store and sync track data when connectivity is restored.

## Tier Comparison

-   **V13 (Learn tab state persistence):** Identical behavior across Guest and Free tiers. Both tests passed, indicating that the fix for V13 is working and tab state is preserved for both unauthenticated and authenticated free users.
-   **V7 (Theme preference reset):** Identical behavior across Guest and Free tiers. Both tests failed, confirming that the theme preference resets to default 'dark' on reload for both unauthenticated and authenticated free users. This indicates a systemic regression in `localStorage` persistence for this key.
-   **Offline Loading (V2, V10):** Pro tier explicitly failed to load offline. This behavior is inferred to affect the Free tier as well, as both are authenticated and rely on similar initial loading mechanisms and Supabase data hydration. Guest tier is not tested for this, but would likely load the app shell, albeit without user-specific data.
-   **GPS Acquisition Failure (P3, V3):** Pro tier experienced a critical failure in GPS acquisition, disabling the waypoint save button. This is a core map functionality and is highly likely to affect Free and Guest tiers if they were to attempt actions gated by GPS.
-   **`localStorage` Persistence Regressions (V1, V7, V11, V15):** These issues (track loss, theme reset, guest waypoint loss, active module reset) are observed across different tiers (V11, V15, V7 for Guest; V7 for Free; V1 for Pro). This indicates a systemic problem with the manual `localStorage` persistence patterns, affecting various state keys regardless of authentication status.
-   **F3 (Upgrade Gate Bypass):** This issue is specific to the Free tier, where users can bypass a Pro-gated feature (saving waypoints). Guest users are correctly routed to the upgrade sheet (C3 test passed).

## Findings Discarded

-   **`pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap):** Discarded due to `Test timeout of 60000ms exceeded`. The timeout prevents direct observation of whether the `UpgradeSheet` was shown or not, making confidence too low for a definitive finding.
-   **`pro V6` (route save offline produces no user-facing toast):** Discarded due to the annotation `route-button-missing: cannot proof V6`. While the test passed, the explicit inability to proof the vulnerability means there is insufficient evidence to confirm the UX behavior.

## Cannot Assess

-   The exact state of basemap and layer preferences after reload (V9, V8) due to test timeouts.
-   The specific error message or user feedback for `pro V4` (track save fails offline).

## Systemic Patterns

-   **Widespread Regression in Manual `localStorage` Persistence:** Multiple vulnerabilities (V1, V7, V11, V15) that were previously marked as `CONFIRMED` fixed are now active again. The test annotations explicitly report `localStorage` keys as `null` or `absent` after reload. This points to a systemic regression in the manual IIFE + `localStorage.setItem` pattern used for critical user preferences and user-generated data.
-   **Fundamental Offline App Shell Failure:** The application completely fails to load offline for authenticated users (V2, V10), indicating a critical gap in Service Worker caching for the core application shell and initial data hydration. This is a foundational issue for an "offline-first" app.
-   **Consistent GPS Acquisition Failure:** A critical dependency (GPS location) is consistently failing across multiple tests (P3, V3), preventing core features like waypoint saving. This suggests an issue with the `useTracks` hook's `watchPosition` implementation or its interaction with the Playwright geolocation mock.

## Calibration Notes

-   The "vulnerability-proof test philosophy" is effective: tests passing while explicitly confirming a vulnerability (e.g., `V11 confirmed`) provides clear evidence that the vulnerability *exists*, even if the test's `ok` status is `true`. This is crucial for identifying regressions.
-   Timeouts continue to be a challenge for high-confidence findings. When a test times out, it often means the application is in an unexpected state, preventing further assertions. This necessitates a `MEDIUM` or `LOW` confidence score for the specific UX issue the test aimed to verify.
-   The recurrence of previously `CONFIRMED` fixed vulnerabilities (V1, V7, V11, V15) highlights the importance of robust regression testing and the need to investigate the root cause of these regressions (e.g., accidental reverts, refactoring side effects).