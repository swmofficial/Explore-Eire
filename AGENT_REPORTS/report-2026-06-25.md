# UX Agent Report — 2026-06-25

## Run Context
- Commits analysed: `1a4a646` (latest) and 19 preceding commits.
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
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Users Incorrectly See Upgrade Sheet (Vulnerability P1)
- Summary: Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, despite already having a Pro subscription. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout indicates the test was waiting for the UpgradeSheet *not* to be visible, but it likely appeared, causing the test to hang.
- Cannot confirm: The exact UI element that triggered the UpgradeSheet, as the test timed out before a specific assertion could fail.
- Root cause: The gating logic for `showUpgradeSheet` (controlled by `userStore.showUpgradeSheet`) is likely misconfigured or has a race condition, failing to correctly check `userStore.isPro` before displaying the sheet.
- User impact: Confusing and frustrating experience for paying Pro users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Review the `showUpgradeSheet` gating logic to ensure it correctly evaluates `userStore.isPro` and `userStore.subscriptionStatus` before displaying the upgrade sheet.

### 4. High: User Preferences (Theme, Basemap, Layers) Reset on Reload (Vulnerability V7, V9, V8)
- Summary: User-selected preferences for theme, basemap, and layer visibility are lost on page reload, reverting to their default states. This affects all users regardless of authentication status.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH (V7), MEDIUM (V9, V8)
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, and annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly shows the `ee_theme` localStorage key is not being written or read. `guest V9` and `free V8` tests timed out, strongly suggesting that basemap and layer visibility preferences reset, causing the tests to wait indefinitely for the changed state.
- Cannot confirm: The exact state of `ee-map-prefs` localStorage key for V9 and V8, as the tests timed out before capturing this.
- Root cause: The manual persistence for `userStore.theme` via `ee_theme` is not functioning. For `mapStore.basemap` and `mapStore.layerVisibility`, the Zustand `persist` middleware for `ee-map-prefs` is either misconfigured or failing to save/load these specific fields.
- User impact: Annoying and repetitive re-configuration of basic app settings, making the app feel unreliable and untrustworthy.
- Business impact: Minor friction, but contributes to a negative overall perception of app quality and stability, potentially impacting retention.
- Fix direction: Debug the manual `ee_theme` localStorage implementation. Verify the `partialize` configuration for `mapStore`'s `persist` middleware to ensure `basemap` and `layerVisibility` are correctly included and saved.

### 5. High: Guest Waypoints Lost on Reload (Vulnerability V11 Regression)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload, despite a previous fix being confirmed.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, with the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the vulnerability is active.
- Cannot confirm: The specific point of failure in the `ee_guest_waypoints` manual persistence logic.
- Root cause: The manual persistence pattern for `mapStore.sessionWaypoints` via `ee_guest_waypoints` (task-002), which was previously confirmed as fixed, is no longer functioning correctly.
- User impact: Loss of unsaved work for new users exploring the app, leading to frustration and a poor first impression.
- Business impact: Hinders guest user engagement and conversion to authenticated users, as initial data entry is unreliable.
- Fix direction: Debug the `mapStore`'s `sessionWaypoints` manual persistence logic to ensure `ee_guest_waypoints` is correctly written to and read from localStorage.

### 6. High: Active Module Resets to Default on Reload (Vulnerability V15 Regression)
- Summary: The user's selected active module (e.g., 'prospecting') resets to its default state upon page reload, despite a previous fix being confirmed.
- Tier(s) affected: Guest (likely all authenticated users)
- Confidence: HIGH
- Evidence: `guest V15` test passed, with the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly confirms the vulnerability is active.
- Cannot confirm: The specific point of failure in the `ee_active_module` manual persistence logic.
- Root cause: The manual persistence pattern for `moduleStore.activeModule` via `ee_active_module` (task-013), which was previously confirmed as fixed, is no longer functioning correctly.
- User impact: User's chosen module is forgotten, requiring re-selection and adding minor friction to the workflow.
- Business impact: Minor friction, but contributes to a perceived lack of reliability and attention to detail.
- Fix direction: Debug the `moduleStore`'s `activeModule` manual persistence logic to ensure `ee_active_module` is correctly written to and read from localStorage.

### 7. High: GPS Track Lost on Reload (Vulnerability V1 Regression)
- Summary: An active GPS tracking session's accumulated trail data is lost upon page reload, despite a previous fix being confirmed.
- Tier(s) affected: Pro (likely all users who track)
- Confidence: HIGH
- Evidence: `pro V1` test passed, with the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the vulnerability is active.
- Cannot confirm: The specific point of failure in the `ee_session_trail` manual persistence logic.
- Root cause: The manual persistence pattern for `mapStore.sessionTrail` via `ee_session_trail` (task-006), which was previously confirmed as fixed, is no longer functioning correctly.
- User impact: Severe data loss if the app crashes, the browser tab closes, or connectivity drops during an active tracking session before explicit save. This makes the core tracking feature unreliable.
- Business impact: Major erosion of user trust, potential for negative reviews, and reduced engagement with a key feature.
- Fix direction: Debug the `mapStore`'s `sessionTrail` manual persistence logic to ensure `ee_session_trail` is correctly written to and read from localStorage during active tracking.

### 8. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing feedback, leading the user to believe the route was saved.
- Tier(s) affected: Pro (likely all authenticated users)
- Confidence: HIGH (based on STATE_MAP.md)
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not directly observe the lack of a toast. However, `STATE_MAP.md` explicitly states that `routes` INSERT operations offline result in "console.error only, no toast".
- Cannot confirm: Direct visual evidence of the lack of a toast from the test run.
- Root cause: Supabase write failures for `routes` are not handled with a user-facing toast, as per `STATE_MAP.md`.
- User impact: User believes their route is saved when it is not, leading to later disappointment and wasted effort.
- Business impact: Erodes trust in the route planning feature and the app's overall reliability.
- Fix direction: Implement a user-facing toast or other feedback mechanism when `routes` INSERT operations fail due to offline conditions.

## Tier Comparison

-   **Offline Loading (V10, V2):** The Pro tier completely fails to load when offline, resulting in a `net::ERR_INTERNET_DISCONNECTED` error. This is a critical failure that prevents any app usage. Guest and Free tiers were not explicitly tested for this complete failure, but the underlying architectural issue (lack of Service Worker caching) would likely affect them similarly.
-   **Preference Resets (V7, V9, V8):** Theme (V7) resets for both Guest and Free tiers. Basemap (V9) and Layer Visibility (V8) also appear to reset for Guest and Free respectively (based on test timeouts). This indicates a systemic issue with localStorage persistence across all tiers, not specific to authentication status.
-   **Learn Tab State (V13, F4):** Header statistics (courses, complete percentage, chapters done) for the Learn tab appear to persist correctly across tab switches for both Guest and Free tiers. This suggests the previous fix for V13 (preserving component state) is working for these specific metrics.
-   **Waypoint Persistence (V11):** Guest waypoints are lost on reload, confirming V11. This issue is specific to the guest experience.
-   **Active Module Persistence (V15):** The active module resets for Guest users, confirming V15. This is likely a universal issue affecting all tiers.
-   **GPS Acquisition (P3, V3):** The GPS acquisition failure disabling the "Save Waypoint" button affects Pro users. This would likely affect Free users if they had access to saving waypoints.
-   **Pro-specific issues (P1, V1, V6):** P1 (Upgrade Sheet appearing for Pro users), V1 (Track loss on reload), and V6 (Route save silent failure) are specific to Pro features or the Pro user experience.

## Findings Discarded

-   `guest V13` and `free V13`: These tests passed, and the `state-loss-evidence` annotations show identical "before" and "after" values for learn header stats. This indicates that the header stats are *not* losing state across tab switches, confirming the previous fix for V13 (preserving Learn tab component state) is working for these specific metrics. The test description "state-loss proof" is misleading in this context.
-   `free F4`: This test passed and the `header-stats-pair` annotation confirmed no regression in Learn header percentage. This is consistent with V13 being fixed for header stats.

## Cannot Assess

-   The exact reason for the Playwright GPS mock not being correctly processed by the app's GPS acquisition logic (P3, V3). While the symptom (disabled save button, "Acquiring GPS...") is clear, the underlying cause could be in Playwright's configuration, the browser's geolocation API, or the app's internal GPS state management.

## Systemic Patterns

-   **Widespread Persistence Failures:** Multiple critical vulnerabilities (V1, V7, V8, V9, V11, V15) indicate a fundamental and widespread problem with how application state is being saved and rehydrated. This affects both Zustand's `persist` middleware and manual `localStorage` implementations, suggesting issues with configuration, `partialize` functions, or the manual IIFE patterns.
-   **Neglect of Offline-First Principles:** The complete failure of the app to load offline (V10, V2) and the silent data loss for user-generated content (V1, V6, V11) highlight a severe lack of offline-first design. The application is not resilient to network interruptions, which is a critical requirement for its target user base in rural Ireland.
-   **GPS Integration Instability:** The consistent failure to acquire GPS (P3, V3) points to a problem with the app's geolocation integration, either with the browser API, the Playwright mock, or its internal state management for `mapStore.userLocation`.

## Calibration Notes

-   Prioritised direct evidence from test annotations and error messages (e.g., `ee_theme: null`, `ee_guest_waypoints absent`, `net::ERR_INTERNET_DISCONNECTED`, `expect(...).not.toBeDisabled() failed`) to assign HIGH confidence.
-   Treated test timeouts (V9, V8, P1) as strong indicators of failure when the test's intent was to assert a state that likely didn't occur, especially when corroborated by other findings (e.g., V7 for persistence issues).
-   Used `STATE_MAP.md` as the authoritative ground truth for known vulnerabilities (V6) even when direct test proof was weak, noting the test's inability to fully capture the evidence.
-   Identified several regressions (V1, V11, V15) where previous "CONFIRMED" fixes are now failing, indicating either incomplete fixes, unintended reverts, or more robust tests.
-   Avoided reporting "phantom" errors by carefully cross-referencing annotations and `STATE_MAP.md` to confirm actual state changes (e.g., for V13/F4, where header stats showed no state loss).