# UX Agent Report — 2026-06-19

## Run Context
- Commits analysed: `7ee6aca` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state. This is a regression of a previously confirmed fix.
- Tier(s) affected: Free, Pro
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` would revert to free *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Re-implement and verify Service Worker caching for the app shell and critical data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Persistence of User Preferences (Theme, Basemap, Layers, Active Module) is Failing (Vulnerability V7, V8, V9, V15)
- Summary: User preferences for theme, basemap, layer visibility, and active module are not persisting across page reloads, reverting to default settings. This is a regression of multiple previously confirmed fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded.`, indicating the basemap and layer visibility states could not be verified after reload, strongly suggesting a reset to defaults.
    - `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact point of failure within the Zustand `persist` middleware for `ee-map-prefs` (V8, V9).
- Root cause: The manual `localStorage` persistence patterns for `ee_theme` (V7) and `ee_active_module` (V15) are failing to write to `localStorage`. The Zustand `persist` middleware for `ee-map-prefs` (basemap, layerVisibility - V8, V9) also appears to be failing or misconfigured.
- User impact: Users constantly lose their personalized settings, leading to frustration and a perception of an unreliable application.
- Business impact: Reduced user satisfaction, potential for churn, and increased support requests related to preference resets.
- Fix direction: Debug and re-implement `localStorage.setItem` calls for `ee_theme` and `ee_active_module`. Investigate and fix the Zustand `persist` middleware configuration for `ee-map-prefs`.

### 4. Critical: Session Data (Guest Waypoints, GPS Track) Lost on Reload (Vulnerability V11, V1)
- Summary: User-generated session data, specifically guest waypoints and active GPS tracks, are lost upon page reload. This is a regression of previously confirmed fixes.
- Tier(s) affected: All (Guest for waypoints, all for tracks)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the loss of guest waypoints.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the loss of active GPS tracks.
- Cannot confirm: The exact line of code where the `localStorage.setItem` call for `ee_guest_waypoints` or `ee_session_trail` is being skipped or overwritten.
- Root cause: The manual `localStorage` persistence patterns for `sessionWaypoints` (`ee_guest_waypoints`, task-002) and `sessionTrail` (`ee_session_trail`, task-006) are failing to write or rehydrate data correctly.
- User impact: Significant data loss for users who are actively exploring or tracking, leading to severe frustration and loss of trust in the app's ability to safeguard their efforts.
- Business impact: Direct loss of user-generated content, which is core to the app's value proposition, leading to high churn and negative reviews.
- Fix direction: Debug and re-implement `localStorage.setItem` calls within `mapStore` for `sessionWaypoints` and `sessionTrail` to ensure data is written and read correctly.

### 5. Major: Pro User Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1)
- Summary: Pro users are incorrectly shown the Upgrade Sheet when interacting with Pro-gated features, despite having an active subscription. This is a regression.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. This test is designed to verify the *absence* of the Upgrade Sheet for Pro users. A timeout strongly suggests the Upgrade Sheet *was* displayed, causing the test to hang while waiting for it to disappear or for a different element to appear.
- Cannot confirm: The exact Pro-gated feature that was tapped, or the precise state of the `isPro` flag at the moment of the tap.
- Root cause: The conditional rendering logic for the `UpgradeSheet` is not correctly evaluating the `userStore.isPro` state, or `isPro` is being incorrectly set to `false` at the time of the interaction.
- User impact: Confusing and frustrating experience for paying subscribers, making them question the value of their subscription.
- Business impact: Undermines the perceived value of the Pro subscription, potentially leading to cancellations and reduced conversion rates.
- Fix direction: Review the logic that gates the `UpgradeSheet` and ensure it correctly checks `userStore.isPro` before rendering. Verify `isPro` state is stable and accurate for Pro users.

### 6. Major: Offline Data Saves Fail Silently (Vulnerability V4, V6)
- Summary: When offline, saving a GPS track results in data loss, and saving a route fails silently without user feedback. These are known vulnerabilities that remain active.
- Tier(s) affected: Pro (and Free for tracks/routes if they could save them)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms: "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone."
    - `pro V6` passed, confirming the vulnerability "route save offline produces no user-facing toast (silent failure)". Annotation `route-button-missing: cannot proof V6` indicates the test passed because no toast was found, confirming the silent failure. `STATE_MAP.md` confirms: "Save route... Fails — console.error only, no toast".
- Cannot confirm: The exact content of the console error for route saves, as it's not exposed to the user.
- Root cause: Lack of an offline write queue for user-generated data. All Supabase write operations fail directly when offline, leading to data loss. Route saves specifically lack a user-facing toast for failure.
- User impact: Users lose valuable data (tracks, routes) without clear indication, leading to significant frustration and loss of trust.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Implement an offline write queue (e.g., using IndexedDB) to store failed write operations for later synchronization. Ensure all data save operations provide clear user feedback (toasts) on success or failure.

## Tier Comparison

-   **Persistence Failures (V7, V8, V9, V15):** The issues with theme, basemap, layer visibility, and active module persistence are observed identically across **Guest** and **Free** tiers. This indicates a universal problem with the underlying persistence mechanisms (manual `localStorage` writes and Zustand `persist` middleware) that affects all users regardless of authentication status.
-   **Learn Tab Header Stats (V13, F4):** The learn header statistics (courses, complete percentage, chapters done) appear to persist correctly across tab switches for both **Guest** and **Free** tiers. This suggests the fix for *header stats* is working, but the deeper V13 vulnerability (in-progress chapter reading position) is not covered by these tests.
-   **Waypoint Save/GPS Issues (P3, V3, V14):** These failures are observed in the **Pro** tier. **Free** and **Guest** users are prevented from saving waypoints (as confirmed by `free F3` showing the UpgradeSheet), so this specific issue does not manifest for them in the same way.
-   **Offline App Load (V10, V2):** The complete failure to load the app offline is observed in the **Pro** tier. This is a fundamental app shell caching issue that would affect all authenticated users, including **Free** users.
-   **Session Data Loss (V1, V11):** Loss of guest waypoints is confirmed for the **Guest** tier. Loss of GPS tracks is confirmed for the **Pro** tier. Both issues stem from failing manual `localStorage` persistence and would affect any user generating such data.
-   **Offline Data Save Failures (V4, V6):** Confirmed for the **Pro** tier. These vulnerabilities (track data loss, silent route save failure) would apply to any user attempting these actions offline.
-   **Pro Upgrade Sheet (P1):** This issue is specific to the **Pro** tier, where a paying user is incorrectly shown an upgrade prompt.
-   **PRO Badges (F2):** The `free F2` test correctly shows 10 PRO badges for a free user, which is the expected behavior to encourage upgrades.

## Findings Discarded
-   No findings were discarded in this run.

## Cannot Assess
-   The full extent of V13 (Learn tab state loss) cannot be assessed, as the current tests only verify the persistence of header statistics, not the in-progress chapter reading position.

## Systemic Patterns
-   **Widespread Persistence Failures:** A critical systemic issue exists with state persistence. Both the manual `localStorage` write patterns (for `theme`, `activeModule`, `sessionWaypoints`, `sessionTrail`) and the Zustand `persist` middleware (for `basemap`, `layerVisibility`) are failing to correctly save and rehydrate user preferences and session data across reloads. This indicates a fundamental breakdown in the application's state management and data durability.
-   **Fundamental Offline Inaccessibility:** The application's inability to load at all for authenticated users when offline points to a severe deficiency in the Service Worker's caching strategy for the core application shell. This renders the app unusable in its primary target environment.
-   **Persistent Offline Data Loss:** The continued confirmation of V4 and V6 highlights the absence of an offline write queue, which is a critical component for any robust offline-first application. This leads to unrecoverable data loss and poor user experience in disconnected environments.
-   **GPS Acquisition Instability:** The consistent failure of GPS acquisition, even when online, suggests a deeper problem with the `useTracks` hook, its interaction with the browser's geolocation API, or the Playwright mock setup.

## Calibration Notes
-   This run reinforced the importance of carefully interpreting "PASS" results for vulnerability tests, as they often confirm the *presence* of the vulnerability rather than its absence (e.g., V1, V4, V6, V11, V15).
-   Timeout errors (e.g., V8, V9, P1) continue to be strong indicators of unexpected UI states or logic failures, especially when the test expects a specific element to be absent or in a particular state.
-   The regression of previously "CONFIRMED" fixes (e.g., V10, V7, V1, V11, V15) underscores the need for comprehensive regression testing and robust, isolated persistence mechanisms. The previous V10 fix was for `isPro` state *after* loading, but the current issue is the app *not loading at all*.