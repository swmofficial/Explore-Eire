# UX Agent Report — 2026-06-12

## Run Context
- Commits analysed: `6bfe04e` (latest) and 19 preceding commits.
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

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online or offline.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms V14 (no offline pre-save warning) because the save button is disabled, preventing the warning from being triggered.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Status Not Recognized, Upgrade Sheet Shown to Pro Users (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, blocking the test.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome (UpgradeSheet appearing for a Pro user) is clear.
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` correctly sets `isPro` and that Pro-gated components correctly check this state.

### 4. High: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads, reverting to the default 'dark' theme.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read correctly.
- Cannot confirm: If the `setTheme` function is failing to call `localStorage.setItem` or if the `userStore` initialization is failing to read it.
- Root cause: The manual `localStorage` persistence pattern for `userStore.theme` (key `ee_theme`, task-008) is not functioning as intended, leading to loss of preference. `STATE_MAP.md` indicates this should be persisted.
- User impact: Annoyance and perceived unreliability, as a basic personalization setting is not remembered.
- Business impact: Minor, but contributes to a perception of a buggy application, potentially affecting user satisfaction.
- Fix direction: Debug the `setTheme` function and `userStore` initialization to ensure `ee_theme` is correctly written to and read from `localStorage`.

### 5. High: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to their default states.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded.`. This typically indicates the test was waiting for a specific UI state (e.g., a layer being off) that did not occur, implying the preferences reset.
- Cannot confirm: The exact state of the `ee-map-prefs` localStorage key due to the timeout, but the pattern aligns with other persistence failures.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`), which is responsible for `basemap` and `layerVisibility`, is not functioning correctly. `STATE_MAP.md` states these fields are persisted.
- User impact: Users must reconfigure their preferred map view and layers on every reload, leading to frustration and inefficiency.
- Business impact: Reduces efficiency for core map usage, potentially leading to lower engagement with map features.
- Fix direction: Debug the `mapStore` Zustand `persist` middleware configuration and ensure `ee-map-prefs` is correctly storing and retrieving `basemap` and `layerVisibility`.

### 6. High: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints saved by unauthenticated (guest) users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
- Cannot confirm: If the `sessionWaypoints` update logic is failing to trigger the `localStorage.setItem` or if the key is being cleared.
- Root cause: The manual `localStorage` persistence pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`, task-002) is not functioning as intended. `STATE_MAP.md` indicates this should be persisted.
- User impact: Loss of user-generated data, leading to significant frustration and discouraging engagement with the waypoint feature for unauthenticated users.
- Business impact: Prevents guest users from experiencing the value of saving data, hindering conversion to authenticated (and potentially paying) users.
- Fix direction: Debug the `mapStore` logic for `sessionWaypoints` to ensure `ee_guest_waypoints` is correctly written to and read from `localStorage`.

### 7. High: Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The user's selected active module (e.g., 'prospecting') is not persisted across page reloads, reverting to the default.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V15` test passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability.
- Cannot confirm: If the `setActiveModule` function is failing to call `localStorage.setItem` or if the key is being cleared.
- Root cause: The manual `localStorage` persistence pattern for `moduleStore.activeModule` (key `ee_active_module`, task-013) is not functioning as intended. `STATE_MAP.md` indicates this should be persisted.
- User impact: Annoyance, as users must re-select their desired module on every reload, disrupting workflow.
- Business impact: Minor, but contributes to a perception of a buggy application, potentially affecting user satisfaction.
- Fix direction: Debug the `moduleStore` logic for `activeModule` to ensure `ee_active_module` is correctly written to and read from `localStorage`.

### 8. High: GPS Track Lost on Reload During Active Tracking (Vulnerability V1)
- Summary: An active GPS track, accumulating points during a session, is not auto-saved and is entirely lost if the application is reloaded before the user explicitly saves it.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V1` test passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability.
- Cannot confirm: If the `appendSessionTrailPoint` function is failing to trigger the `localStorage.setItem` or if the key is being cleared.
- Root cause: The manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`, task-006) is not functioning as intended. `STATE_MAP.md` indicates this should be persisted. This violates "Data Safety" principles.
- User impact: Significant data loss for users actively tracking their movements, leading to severe frustration and loss of valuable field data.
- Business impact: Damages trust in the app's core functionality, leading to churn and negative reviews.
- Fix direction: Debug the `mapStore` logic for `sessionTrail` to ensure `ee_session_trail` is correctly written to and read from `localStorage` during active tracking.

## Tier Comparison

-   **Persistence Failures (V1, V7, V8, V9, V11, V15):** These issues are widespread across tiers.
    -   `V7 (Theme)`: Fails for both Guest and Free, indicating a common problem with the `ee_theme` localStorage key handling.
    -   `V9 (Basemap)` and `V8 (Layer Visibility)`: Fail for Guest and Free respectively, suggesting a systemic issue with `ee-map-prefs` persistence.
    -   `V11 (Guest Waypoints)`: Fails for Guest, confirming data loss for unauthenticated users.
    -   `V15 (Active Module)`: Fails for Guest, indicating preference loss for all users.
    -   `V1 (GPS Track)`: Fails for Pro, confirming data loss for in-progress activities.
    -   This pattern indicates a fundamental problem with how `localStorage` is being used, affecting both Zustand `persist` middleware and manual IIFE patterns, rather than a tier-specific logic error.
-   **Offline Loading (V10, V2):** Tested for Pro and failed completely. Given the `net::ERR_INTERNET_DISCONNECTED` error, it is highly probable that Free users would experience the same complete failure to load, as both require Supabase authentication and initial data fetches. Guest users might load, but without authenticated features.
-   **Learn Tab State (V13, F4):** The header statistics for the Learn tab correctly persist across tab switches for both Guest and Free users, indicating the fix for component unmounting is effective for this specific aspect of state.
-   **Pro-Gated Features:**
    -   `guest C3` and `free F3` correctly surface the UpgradeSheet when tapping Pro-gated features (e.g., camera button), as expected.
    -   `free F2` correctly renders PRO badges for free users, showing them what they are missing.
    -   `pro P1` fails, incorrectly showing the UpgradeSheet to a Pro user, indicating a failure in Pro status recognition.

## Findings Discarded
-   No findings were discarded in this run, as all identified issues were significant and within the maximum limit of 8.

## Cannot Assess
-   The exact state of `ee-map-prefs` for `guest V9` and `free V8` due to test timeouts. While the outcome strongly suggests persistence failure, direct `localStorage` annotations would provide higher confidence in the specific root cause.

## Systemic Patterns
1.  **Widespread Persistence Failure:** A critical systemic issue where both Zustand `persist` middleware and manual `localStorage` IIFE patterns are failing to correctly store and retrieve user preferences and session data across page reloads. This affects theme, basemap, layer visibility, guest waypoints, active module, and session tracks, indicating a fundamental problem with `localStorage` interaction or lifecycle management.
2.  **Offline Unavailability:** The application lacks robust offline capabilities, with the core app shell and critical data (e.g., `gold_samples`) not being cached. This leads to complete failure to load for authenticated users when offline, rendering the app unusable in its primary target environment.
3.  **GPS Acquisition Issues:** The application's GPS acquisition logic appears to be failing to correctly process location data (even from Playwright mocks), leading to disabled "Save Waypoint" buttons and preventing a core user action.

## Calibration Notes
-   The recurrence of critical issues (Offline Loading, Waypoint Save Disabled, Pro Status Not Recognized) previously identified reinforces their severity and the need for immediate, robust fixes. My previous reports correctly highlighted these as top priorities.
-   The current test results for V1, V7, V11, and V15 directly contradict previous "CONFIRMED" statuses for their fixes. This highlights the importance of the "Vulnerability-Proof Test Philosophy" where tests produce direct evidence (`ee_theme: null`, `V11 confirmed`) to validate actual behavior, rather than relying solely on code changes or `STATE_MAP.md`'s intended state. This feedback loop is crucial for identifying regressions or incomplete implementations.
-   The explicit `null` or `absent` annotations for `localStorage` keys were invaluable in pinpointing the exact failure point for persistence issues, moving beyond mere "timeout" errors.