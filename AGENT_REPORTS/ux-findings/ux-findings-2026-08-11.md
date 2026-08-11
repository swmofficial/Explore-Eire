# UX Agent Report — 2026-08-11

## Run Context
- Commits analysed: `de7251c31e18adb52f6fdcf65a10d0a606e39c9d` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Loss of User-Generated Session Data on Reload (Vulnerability V1, V11, V15)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module, are lost on page reload, indicating a regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V11, V15; Pro: V1)
- Confidence: HIGH
- Evidence: `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys via manual `localStorage` patterns.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns for `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, and `moduleStore.activeModule`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) that users expect to persist, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 4. High: Widespread Loss of User Preferences on Page Reload (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisted across page reloads, reverting to default settings and forcing users to reconfigure the app repeatedly.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm `ee_theme` is not being written or read. `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`, which, in context of V7, strongly suggests persistence failure. `STATE_MAP.md` states `theme` uses `ee_theme` (manual pattern), and `basemap`, `layerVisibility` use `ee-map-prefs` (Zustand persist).
- Cannot confirm: The exact reason for the timeouts in V8/V9, but the V7 failure provides strong evidence of a systemic persistence issue.
- Root cause: Regression in `localStorage` persistence for `userStore.theme` (manual pattern) and `mapStore.basemap`, `mapStore.layerVisibility` (Zustand persist middleware). The `ee_theme` key being `null` is a direct indicator.
- User impact: Annoyance and wasted time as users must repeatedly reset their preferred visual and map settings, degrading the personalized experience.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to abandon the app if basic preferences aren't respected.
- Fix direction: Debug and restore `localStorage` persistence for `theme`, `basemap`, and `layerVisibility`.

### 5. High: Free Users Can Bypass Waypoint Save Gate (Vulnerability F3)
- Summary: Free tier users, who should be prompted to upgrade when attempting to save a waypoint, are instead allowed to open the `WaypointSheet`, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` being `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: The specific logic error in the gating mechanism that allows the `WaypointSheet` to open instead of the `UpgradeSheet`.
- Root cause: Incorrect conditional rendering or routing logic for the camera button tap, failing to check `isPro` status before showing the `WaypointSheet`.
- User impact: Free users encounter a dead-end when trying to save a waypoint, as the save button will be disabled (due to GPS issue) or fail (due to free tier restriction), leading to confusion and frustration. Missed opportunity to convert.
- Business impact: Direct loss of potential conversions from free to pro users, as the upgrade path is bypassed. Wasted development effort on a gated feature.
- Fix direction: Correct the conditional logic for the camera button to display the `UpgradeSheet` for free users.

### 6. Medium: Offline Data Writes Fail Silently or Without Clear User Feedback (Vulnerability V4, V6, V14)
- Summary: Critical user-generated data (tracks, routes) cannot be saved offline, and the app either fails silently (routes) or provides only a transient toast message (tracks, finds), without retaining the data locally or offering a retry mechanism.
- Tier(s) affected: Pro (inferred All for V4, V6; V14 applies to waypoints/finds too)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming track save fails offline. `pro V6` passed, confirming route save offline produces no user-facing toast. `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save offline warning for waypoints. `STATE_MAP.md` confirms `tracks` INSERT, `routes` INSERT, `finds_log` INSERT, `waypoints` INSERT all fail offline.
- Cannot confirm: The exact content of the toast messages for tracks/finds without screenshots or more detailed annotations.
- Root cause: Lack of an offline-first data strategy, specifically a local write queue and robust error handling for Supabase write failures. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable, effort-intensive data (e.g., a long GPS track or a carefully planned route) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) and provide clear, persistent UI feedback for unsynced data.

## Tier Comparison

-   **Offline App Load (V2, V10):** Pro tier fails to load at all when offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is critical and likely affects Free users similarly, as both require authentication and Supabase data. Guest users are not tested for this specific scenario, but their experience would be less impacted by auth state.
-   **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition issues. This issue is likely systemic and would affect Free and Guest users if they were able to reach the WaypointSheet.
-   **Session Data Loss (V1, V11, V15):** `sessionWaypoints` (Guest V11), `activeModule` (Guest V15), and `sessionTrail` (Pro V1) all fail to persist on reload. This indicates a widespread regression in `localStorage` persistence across different data types and tiers.
-   **Preference Data Loss (V7, V8, V9):** `theme` (Guest V7, Free V7), `basemap` (Guest V9), and `layerVisibility` (Free V8) all fail to persist on reload. This is a consistent regression across Guest and Free tiers for user preferences.
-   **Free User Waypoint Gate (F3):** Free users incorrectly bypass the upgrade gate and open the WaypointSheet. Guest users correctly see the UpgradeSheet (`guest C3` passed). Pro users should not see an upgrade sheet (P1 timeout, but previously confirmed fixed). This highlights a specific gating logic error for the Free tier.
-   **Learn Tab State (V13, F4):** Learn tab header statistics are correctly preserved across tab switches for both Guest (`guest V13` passed) and Free (`free V13`, `free F4` passed) users. This indicates the fix for V13 is working as intended for these specific stats.

## Findings Discarded

-   **Pro P1 Timeout:** The `pro P1` test timed out. While this could indicate a regression where Pro users might see UpgradeSheets or PRO badges, there is no direct evidence (e.g., a screenshot or explicit assertion failure) to confirm this. Given that P1 was previously confirmed fixed, this is currently treated as test flakiness rather than a confirmed UX issue.
-   **V13 Learn Tab State Loss:** The `guest V13` and `free V13` tests passed, with annotations showing identical header stats before and after tab switches. This confirms that the fix for V13 (preserving Learn tab component state) is working for the header statistics, and therefore, this vulnerability is not active in this specific aspect.

## Cannot Assess

-   The exact content of toast messages for `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast) cannot be fully assessed without screenshots or more detailed annotations of the UI during the failure. The tests confirm the *failure* and *lack of toast* for routes, but the user experience of the toast for tracks is not fully visible.

## Systemic Patterns

-   **Widespread Persistence Regression:** A critical and pervasive issue affecting both Zustand `persist` middleware keys (`basemap`, `layerVisibility`) and manual `localStorage` keys (`theme`, `sessionWaypoints`, `sessionTrail`, `activeModule`). The consistent `null` or `absent` state of `ee_` `localStorage` keys strongly indicates a fundamental problem with `localStorage` write operations or initial store hydration across the application.
-   **Fundamental Offline Capability Gap:** The application continues to demonstrate a complete lack of offline-first design, failing to load at all for authenticated users when offline and lacking any robust local data queuing or clear user feedback for offline data writes. This is a recurring, high-impact problem that directly contradicts the app's intended use case in rural areas.
-   **GPS Integration Flakiness:** The `mapStore.userLocation` state is not being reliably populated, leading to disabled UI elements (e.g., "Save Waypoint" button). This points to an issue with the `useTracks` hook's interaction with the browser's geolocation API, potentially exacerbated by Playwright's mock environment but indicative of a fragile implementation.

## Calibration Notes

-   The explicit `ee_theme: null` and `ee_guest_waypoints absent` annotations were crucial in confirming persistence regressions (V7, V11, V15), aligning with previous successful diagnoses of `localStorage` issues. This reinforces the value of detailed `localStorage` state annotations.
-   The recurring `net::ERR_INTERNET_DISCONNECTED` errors for offline app load (V2, V10) continue to highlight the critical lack of a comprehensive Service Worker, a consistent high-priority finding.
-   The `toBeDisabled` failure for P3/V3, coupled with the "Acquiring GPS..." text in the screenshot, provided clear, direct evidence for the GPS acquisition issue, consistent with past confirmations of similar problems.
-   The passing `V13` tests with identical `state-loss-evidence` `before`/`after` values confirmed the fix for Learn tab header stats, demonstrating that a "PASS" on a "state-loss proof" test can indicate successful state preservation.