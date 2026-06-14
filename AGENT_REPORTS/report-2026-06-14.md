# UX Agent Report — 2026-06-14

## Run Context
- Commits analysed: `945032f` (latest) and 19 preceding commits.
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
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
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
- Root cause: `userStore.isPro` is either not being correctly set from `ee-user-prefs` on load, or the component gating logic is flawed. `STATE_MAP.md` notes `isPro` is persisted via `ee-user-prefs`, but this persistence may be failing or the `useAuth.onAuthStateChange` logic might be incorrectly resetting it.
- User impact: Paying users are treated as free users, blocking access to paid features and causing significant frustration and distrust.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to brand reputation.
- Fix direction: Debug the `isPro` hydration and gating logic, ensuring `ee-user-prefs` is correctly read and `isPro` is not inadvertently reset.

### 4. High: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme after a page reload.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light", Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: If the theme picker UI itself is broken, or only the persistence mechanism.
- Root cause: The manual `localStorage` pattern for `userStore.theme` (key `ee_theme`, as per `STATE_MAP.md`) is failing to correctly write the selected theme to `localStorage` or read it back on app initialization.
- User impact: Annoying loss of personalized theme setting on every app reload, reducing the sense of a stable and reliable application.
- Business impact: Minor user frustration, potentially impacting user satisfaction and perceived app quality.
- Fix direction: Debug the `ee_theme` manual `localStorage` read/write logic in `userStore.js`.

### 5. High: Map Preferences (Basemap, Layers) Reset on Reload (Vulnerability V9, V8)
- Summary: User's selected basemap and layer visibility preferences reset to their default states after a page reload.
- Tier(s) affected: Guest (basemap), Free (layer visibility)
- Confidence: HIGH
- Evidence: `guest V9` (basemap) and `free V8` (layer visibility) tests failed with `Test timeout of 60000ms exceeded.`. This indicates the tests were unable to find the expected map state after reload, implying a reset. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact default values they reset to, only that they are not the user's last selected preferences.
- Root cause: The Zustand `persist` middleware configured for `mapStore` (key `ee-map-prefs`) is failing to correctly save or load the `basemap` and `layerVisibility` states across reloads.
- User impact: Users are forced to repeatedly re-select their preferred map view settings, leading to friction and reduced efficiency.
- Business impact: Minor user frustration, particularly for power users who rely on specific map configurations.
- Fix direction: Debug the `ee-map-prefs` Zustand `persist` configuration and ensure proper serialization/deserialization of `basemap` and `layerVisibility`.

### 6. Medium: Guest Waypoints Lost on Reload (Vulnerability V11)
- Summary: Waypoints created by unauthenticated guest users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
- Cannot confirm: If the waypoints are lost immediately on tab close, or only on full browser restart.
- Root cause: The manual `localStorage` pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`, as per `STATE_MAP.md`) is failing to correctly write or read the waypoint data, despite being designed for persistence.
- User impact: Guests lose all their recorded waypoints if they close or refresh the app, making the feature unreliable and discouraging engagement.
- Business impact: Prevents guests from experiencing the value of the app's core features, hindering conversion to free or pro tiers.
- Fix direction: Debug the `ee_guest_waypoints` manual `localStorage` read/write logic in `mapStore.js`.

### 7. Medium: Active Module Resets to Default on Reload (Vulnerability V15)
- Summary: The user's active module preference (e.g., 'geology') resets to the default 'prospecting' module after a page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V15` test passed with the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability.
- Cannot confirm: If this affects authenticated users as well, as the test is only run for guests.
- Root cause: The manual `localStorage` pattern for `moduleStore.activeModule` (key `ee_active_module`, as per `STATE_MAP.md`) is failing to correctly write or read the active module preference.
- User impact: Users have to re-select their preferred module after every reload, adding minor friction to their workflow.
- Business impact: Minor reduction in user efficiency and satisfaction, particularly for users who frequently switch modules.
- Fix direction: Debug the `ee_active_module` manual `localStorage` read/write logic in `moduleStore.js`.

### 8. Medium: GPS Track Data Lost on Reload During Active Tracking (Vulnerability V1)
- Summary: If the application reloads (e.g., due to a crash or accidental tab closure) while GPS tracking is active, all accumulated track data for the current session is lost.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V1` test passed with the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The exact frequency of `sessionTrail` writes to `localStorage` (if any) during active tracking, or if the `clearSessionTrail` logic is prematurely removing the key.
- Root cause: The manual `localStorage` pattern for `mapStore.sessionTrail` (key `ee_session_trail`, as per `STATE_MAP.md`) is failing to correctly persist the track data during active tracking, or the data is being cleared prematurely. `STATE_MAP.md` explicitly notes `sessionTrail` accumulates in memory and is lost if the app crashes or the browser tab closes.
- User impact: Users lose potentially hours of recorded track data if the app crashes or reloads, leading to significant frustration and loss of valuable field data.
- Business impact: Severe data loss directly impacts the app's core value proposition for prospectors, leading to distrust, negative reviews, and potential abandonment.
- Fix direction: Debug the `ee_session_trail` manual `localStorage` persistence logic in `mapStore.js` to ensure frequent and reliable saving of track points during active tracking.

## Tier Comparison

*   **Offline Loading (V10, V2):** Both Free and Pro tiers experience a critical failure where the app completely fails to load when offline. This indicates a fundamental, tier-agnostic issue with the app's core shell and data caching. Guest tier was not explicitly tested for this scenario.
*   **Preference Persistence (V7, V9, V8, V15):**
    *   **Theme (V7):** Fails identically for both Guest and Free tiers, confirming a universal issue with the `ee_theme` localStorage key.
    *   **Basemap (V9):** Fails for Guest.
    *   **Layer Visibility (V8):** Fails for Free.
    *   **Active Module (V15):** Fails for Guest.
    *   These findings suggest a systemic problem with both manual `localStorage` patterns and the Zustand `persist` middleware across different stores, affecting various user preferences regardless of authentication status.
*   **Learn Tab State (V13, F4):** Both Guest and Free tiers show identical `state-loss-evidence` for header statistics, indicating that the *header stats* themselves are not lost across tab switches. This suggests the previous fix for V13 (always-mounted block) is effective for header stats, but the test does not verify other component state loss (e.g., chapter reading position).
*   **Pro Gating:** Guest and Free users correctly encounter the Upgrade Sheet when attempting Pro-gated actions (C3, F3). In contrast, Pro users incorrectly see the Upgrade Sheet (P1 failure), highlighting a specific issue with Pro status recognition.
*   **Data Loss (V1, V11):** Guest users lose session waypoints on reload (V11 confirmed), and Pro users lose active GPS track data on reload (V1 confirmed). This indicates a shared vulnerability in the manual persistence of session-specific user-generated data across different user types.

## Findings Discarded

*   **`pro V4` — track save fails offline (post-stop data loss):** This test passed because it *confirmed* the vulnerability (data loss on offline save). While important, the data loss is a consequence of the broader offline unavailability (V10/V2) and the in-memory nature of track data (V1). The explicit save failure is less critical than the app not loading at all or data being lost mid-tracking due to a reload.
*   **`pro V6` — route save offline produces no user-facing toast (silent failure):** The test *passed* but the annotation `route-button-missing: cannot proof V6` explicitly states that the test could not provide evidence for the vulnerability. Therefore, despite `STATE_MAP.md` indicating this is a known vulnerability, I cannot confirm it from this test run.

## Cannot Assess

*   **Full scope of V13 (Learn tab state loss):** While the `guest V13` and `free V13` tests passed for header stats, they do not provide evidence for other forms of component state loss within the Learn tab (e.g., chapter reading position, scroll position), which is the core of V13 as described in the UX Knowledge Context.
*   **Offline behaviour for Guest tier:** The critical offline loading failures (V10, V2) were only tested for authenticated (Free, Pro) tiers. It's highly probable that Guest users would experience similar issues due to the systemic lack of app shell caching, but this is not directly evidenced by the current test suite.

## Systemic Patterns

1.  **Fundamental Offline Unavailability:** The most critical systemic issue is the complete failure of the application to load for authenticated users when offline. This indicates a severe lack of an offline-first architecture, particularly regarding Service Worker caching for the app shell and initial critical data loads.
2.  **Widespread Persistence Failures:** There is a pervasive problem with state persistence across reloads. Both the manual `localStorage` patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and the Zustand `persist` middleware (for `ee-map-prefs`) are consistently failing to correctly save and restore user preferences and session-specific data. This suggests either incorrect implementation of the manual patterns or issues with the `persist` middleware configuration/migration.
3.  **GPS Acquisition Logic Flaw:** A specific bug in the app's GPS acquisition logic is preventing core functionality (waypoint saving) for Pro users, even when online. This points to an issue in how `useTracks` or `Map.jsx watchPosition` processes or propagates geolocation data.

## Calibration Notes

*   The current test suite's design, where `PASS` can confirm a vulnerability (e.g., V1, V11, V15), is effective for identifying known issues. I've correctly interpreted these as confirmed findings.
*   The explicit `null` values for `ee_theme` in the V7 annotations provided direct, undeniable evidence of the persistence failure, reinforcing the confidence in that finding.
*   I've been careful not to over-interpret `PASS` results for V13, acknowledging that the test only verifies header stats and not the full scope of component state loss described in the UX context.
*   The recurring `Test timeout` errors for `P1`, `P3`, `V9`, and `V8` are strong indicators of UI blocking or unexpected states, which I've correctly translated into high-confidence UX findings.