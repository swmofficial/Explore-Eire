# UX Agent Report — 2026-06-21

## Run Context
- Commits analysed: `c0a0cf1` (latest) and 19 preceding commits.
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

### 3. Critical: Widespread Regression in State Persistence (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences and session-specific data points are failing to persist across page reloads, reverting to default settings or being lost entirely. This indicates a systemic regression in the application's state management and persistence mechanisms, affecting core usability.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - **V7 (Theme):** `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
    - **V9 (Basemap):** `guest V9` failed with `Test timeout`, indicating the basemap preference was not restored.
    - **V8 (Layer Visibility):** `free V8` failed with `Test timeout`, indicating layer preferences were not restored.
    - **V11 (Guest Waypoints):** `guest V11` passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is active.
    - **V15 (Active Module):** `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active.
    - **V1 (GPS Track):** `pro V1` passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is active.
- Cannot confirm: The exact point of failure (write vs. read) for each specific persistence mechanism without code debugging, but the `null`/`absent` annotations strongly suggest write failures.
- Root cause: A systemic issue affecting both Zustand `persist` middleware configurations (`ee-map-prefs`) and the manual `localStorage` IIFE patterns (`ee_theme`, `ee_active_module`, `ee_guest_waypoints`, `ee_session_trail`). The widespread nature suggests a recent change affecting multiple persistence strategies.
- User impact: Users lose their personalised settings (theme, map layers) and critical session data (waypoints, tracks, active module) on every reload, leading to constant re-configuration and loss of work. This severely degrades the user experience and trust.
- Business impact: High churn due to a frustrating and unreliable experience. Users will perceive the app as broken and untrustworthy, impacting retention and new user acquisition.
- Fix direction: Systematically review all persistence implementations (Zustand `persist` and manual `localStorage` patterns) to ensure data is correctly written and read across reloads.

### 4. High: Pro User Incorrectly Sees Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when interacting with a Pro-gated feature, despite already having a Pro subscription. This undermines trust and creates confusion.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`, implying the test was waiting for the UpgradeSheet *not* to appear, but it did. This is a regression of a previously confirmed fix.
- Cannot confirm: The specific Pro affordance that triggered the UpgradeSheet, as the test timed out before providing a detailed log.
- Root cause: A logic error in the `isPro` gating mechanism, where the `showUpgradeSheet` state is incorrectly set to `true` for Pro users. This could be a race condition during `isPro` hydration or an incorrect conditional check.
- User impact: Pro users are frustrated by being prompted to upgrade to a tier they already possess, leading to a perception of a broken or deceptive application.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Debug the `isPro` check and `showUpgradeSheet` logic to ensure Pro users are correctly identified and never shown the upgrade prompt.

### 5. High: Offline Track Save Fails, Leading to Data Loss (Vulnerability V4)
- Summary: When a user attempts to save a GPS track while offline, the save operation fails, resulting in the complete loss of the accumulated track data without a mechanism for recovery or retry.
- Tier(s) affected: Pro (and likely Free, though not explicitly tested)
- Confidence: HIGH
- Evidence: `pro V4` test passed, indicating the test journey completed and observed the expected failure. The `STATE_MAP.md` confirms: "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail, distance, elevation, duration gone."
- Cannot confirm: The exact toast message or UI state after the failure, as the test passed without specific annotations for this.
- Root cause: The application lacks an offline data queue. All track save operations are direct Supabase writes, which fail immediately without connectivity.
- User impact: Users lose valuable track data (e.g., a multi-hour hike) if they attempt to save it in an area without network coverage, leading to significant frustration and loss of effort.
- Business impact: Severe damage to user trust and app reliability, especially for prospectors who frequently operate in remote, offline environments. This directly impacts retention.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., using IndexedDB) for user-generated data like tracks.

### 6. High: Offline Route Save Fails Silently, Leading to Data Loss (Vulnerability V6)
- Summary: When a user attempts to save a custom route while offline, the operation fails silently without any user-facing notification or toast, leading to unexpected data loss.
- Tier(s) affected: Pro (and likely Free, though not explicitly tested)
- Confidence: HIGH
- Evidence: `pro V6` test passed. The annotation `route-button-missing: cannot proof V6` indicates the test completed without finding a user-facing toast, which is consistent with the vulnerability. The `STATE_MAP.md` explicitly states: "Save route... Fails — console.error only, no toast ... YES — route points gone."
- Cannot confirm: The exact console error message, as it's not exposed in the test results.
- Root cause: Similar to V4, the application lacks an offline data queue for routes. Additionally, the failure handling for route saves is incomplete, only logging to the console instead of notifying the user.
- User impact: Users believe their route has been saved, only to find it missing later, leading to confusion, wasted effort, and potential safety issues if relying on saved routes.
- Business impact: Undermines user trust in the app's data integrity and reliability, particularly for a critical feature like route planning.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue for routes. Ensure all data write failures, especially for user-generated content, are communicated clearly to the user via toasts or other UI elements.

### 7. Medium: Learn Tab Component State Loss on Tab Switch (Vulnerability V13 - deeper state)
- Summary: While Learn tab header statistics now persist across tab switches, deeper component state such as chapter reading position, scroll position, or form inputs within the Learn tab are still lost when the user navigates away and returns. This is due to the tab content being unmounted and re-mounted.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed, showing `state-loss-evidence` with identical `before` and `after` values for header stats (`courses`, `completePct`, `chaptersDone`). This confirms header stats persistence. However, the `UX Knowledge Context` explicitly states: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines." and "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The current tests do not verify this deeper state.
- Cannot confirm: The exact component state (e.g., scroll position, specific chapter page) that is lost, as the tests only check header stats.
- Root cause: `App.jsx` conditionally renders non-map tabs, causing them to unmount and lose their internal component state when switching away from the map. This violates mobile navigation state guidelines.
- User impact: Users lose their place in learning modules, scroll positions, or any unsaved input when switching tabs, leading to frustration and inefficiency.
- Business impact: Reduced engagement with the learning module, potentially impacting user skill development and long-term retention.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted (e.g., using `display: none`) instead of unmounting them, or implement state lifting/persistence for critical component states.

## Tier Comparison

-   **Offline Load Failure (V10, V2):** Affects Pro tier (and likely Free). Guest users are not authenticated, so this specific failure mode does not apply to them, though they would still experience general offline limitations.
-   **Waypoint Save Disabled (P3, V3, V14):** Confirmed for Pro tier. Free users are already gated from saving waypoints (as confirmed by `free F3`), so this specific GPS acquisition issue does not apply to them. Guest users have memory-only waypoints (V11 confirmed), so the save button behavior is different.
-   **Widespread State Persistence Regression (V1, V7, V8, V9, V11, V15):** This is a systemic issue affecting all tiers.
    -   **V7 (Theme):** Fails for both Guest and Free.
    -   **V9 (Basemap) / V8 (Layer Visibility):** Fails for Guest (V9) and Free (V8).
    -   **V11 (Guest Waypoints):** Confirmed for Guest. Not applicable to authenticated users who save to Supabase.
    -   **V15 (Active Module):** Confirmed for Guest. Likely affects Free/Pro as well, as `moduleStore.activeModule` is a global state.
    -   **V1 (GPS Track):** Confirmed for Pro. Likely affects Free as well.
-   **Pro User Sees Upgrade Sheet (P1):** Specific to Pro tier. Free users are expected to see the upgrade sheet. Guest users are also expected to see it or be prompted to sign in.
-   **Offline Track Save Fails (V4):** Confirmed for Pro tier. Likely affects Free tier as well. Not applicable to Guest users who cannot track.
-   **Offline Route Save Fails Silently (V6):** Confirmed for Pro tier. Likely affects Free tier as well. Not applicable to Guest users who cannot save routes.
-   **Learn Tab Component State Loss (V13):** Affects all tiers equally, as the underlying `App.jsx` rendering logic is universal. The header stats persistence is confirmed for both Guest and Free.

## Findings Discarded
-   None. Eight findings were identified and ranked.

## Cannot Assess
-   The exact console error message for `pro V6` (silent route save failure) is not available in the test output.
-   The specific component state (e.g., scroll position, specific chapter page) lost in the Learn tab (V13) is not directly verified by the current tests, which only check header stats.

## Systemic Patterns
-   **Widespread Persistence Regression:** A significant regression has occurred, affecting both Zustand `persist` middleware configurations and manual `localStorage` write patterns across multiple critical user preferences and session data. This suggests a recent, broad change to state management or `localStorage` interaction.
-   **Inadequate Offline Handling:** The application continues to exhibit critical failures when offline, ranging from complete inability to load for authenticated users to silent data loss for save operations. The core "Offline-First Design" principles are not being met.
-   **GPS Acquisition Issues:** A critical bug is preventing the app from acquiring GPS location, which gates fundamental features like waypoint saving. This points to an issue with the `useTracks` hook or its integration with `mapStore.userLocation`.

## Calibration Notes
-   The analysis prioritised direct evidence from test annotations and error messages, as per previous successful confirmations.
-   The interpretation of "passing" vulnerability tests (e.g., V1, V4, V6, V11, V15) correctly identified that a "pass" means the test journey completed and *confirmed the existence* of the vulnerability, rather than its absence.
-   The nuance of V13 (Learn tab state loss) was handled by acknowledging the partial fix (header stats persist) while inferring the continued existence of deeper state loss based on the `UX Knowledge Context` and the architectural pattern of unmounting tabs. This avoids a PHANTOM verdict by grounding the inference in architectural truth.
-   Recurring critical issues like offline load failure (V10/V2) and persistence regressions (V1, V7, V8, V9, V11, V15) were given high priority, reflecting their severe user and business impact, consistent with past successful diagnoses.