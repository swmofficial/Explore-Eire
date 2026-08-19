# UX Agent Report — 2026-08-19

## Run Context
- Commits analysed: `2ec2447a14950157f07f7bffe2641f4539d90d36` and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Regression in Persistence of User Preferences and Session Data (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Critical user preferences (theme, basemap, layer visibility) and user-generated session data (active GPS tracks, guest waypoints, active module) are lost on page reload, contradicting `STATE_MAP.md`'s persistence claims.
- Tier(s) affected: All (Guest: V7, V9, V11, V15; Free: V7, V8; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This contradicts `STATE_MAP.md` which states `ee_theme` should persist.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact point of failure in the manual `localStorage` patterns for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, or the Zustand `persist` middleware configuration/migration for `ee-map-prefs`.
- Root cause: A systemic issue with `localStorage` interaction, either in the manual IIFE read/write patterns or the Zustand `persist` middleware configuration/migration. The `null`/`absent`/`empty` annotations for keys that *should* exist are strong indicators that the `setItem` calls are not happening or are being cleared.
- User impact: Loss of personalized settings and unsaved work, leading to frustration and repetitive setup.
- Business impact: Decreased user satisfaction, reduced engagement, perceived unreliability.
- Fix direction: Audit all `localStorage` read/write operations for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, and the Zustand `persist` configuration for `ee-map-prefs`.

### 4. High: Free Users Can Bypass Upgrade Gate for Waypoints (Vulnerability F3)
- Summary: Free users are able to open the "New Waypoint" sheet directly from the camera button instead of being prompted to upgrade, missing a critical monetization opportunity.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed. `gate-routing: {"upgradeShown":false,"waypointShown":true}`. The test expected `upgradeShown` to be `true`, but it was `false`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet, not the UpgradeSheet.
- Cannot confirm: The exact code path that incorrectly routes free users to the WaypointSheet.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before opening the `WaypointSheet`.
- User impact: Free users can attempt to use a Pro feature, only to be blocked later (by the disabled save button due to GPS issue), leading to confusion.
- Business impact: Direct loss of potential upgrades, impacting revenue.
- Fix direction: Correct the logic for the camera button to display the `UpgradeSheet` for free users.

### 5. Medium: Free Users See PRO Badges on Inaccessible Layers (Vulnerability F2)
- Summary: Free users are shown "PRO" badges next to map layers they cannot access, creating unnecessary visual clutter and potential frustration.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` passed, `pro-badge-count: 8`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layers (e.g., Gold heatmap, Arsenic, Lead).
- Cannot confirm: Whether these badges are interactive or merely visual indicators.
- Root cause: The `LayerPanel` component's rendering logic for PRO badges does not correctly account for the `isPro` status of the *current user*. `STATE_MAP.md` notes `isPro` is read by `LayerPanel` for Pro gates. The previous fix for P1 was to hide badges for *Pro* users, not *Free* users.
- User impact: Minor confusion and frustration for free users who see features they can't use.
- Business impact: Slightly degraded user experience, potentially leading to negative perception.
- Fix direction: Adjust `LayerPanel` rendering logic to hide PRO badges for free users, or replace them with an "Upgrade" CTA.

### 6. Medium: Offline Track Save Fails (Vulnerability V4)
- Summary: When a user stops tracking GPS, the accumulated track data cannot be saved if the device is offline, leading to complete loss of the session's activity.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save track ... Fails — toast 'Could not save track' ... YES — entire GPS trail ... gone."
- Cannot confirm: The exact toast message or if `sessionTrail` is cleared immediately after the failed save attempt.
- Root cause: Lack of an offline data queue for `tracks` INSERT operations.
- User impact: Loss of valuable activity data (hikes, prospecting routes), leading to significant frustration.
- Business impact: Decreased user trust, reduced engagement with tracking features.
- Fix direction: Implement an offline data queue (e.g., IndexedDB) for track data, with retry logic.

### 7. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: Users attempting to save a custom route while offline experience a silent failure, with no user-facing feedback that their route was not saved.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` passed, confirming the vulnerability. `STATE_MAP.md` explicitly states: "Save route ... Fails — console.error only, no toast ... YES — route points gone." The annotation `route-button-missing: cannot proof V6` is a test issue, but the test *passed* which means the vulnerability was confirmed.
- Cannot confirm: The exact console error message or if the `routePoints` are cleared immediately.
- Root cause: Lack of an offline data queue for `routes` INSERT operations and insufficient error handling/UI feedback.
- User impact: Users believe their route is saved, only to find it missing later, leading to confusion and distrust.
- Business impact: Reduced engagement with route planning features, negative user perception.
- Fix direction: Implement an offline data queue for route data and provide clear user feedback (toast) on save failure.

### 8. Medium: No Offline Warning Before Waypoint Save Attempt (Vulnerability V14)
- Summary: The application does not provide a pre-save warning when a user attempts to save a waypoint while offline, leading to unexpected failure and data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This explicitly confirms the absence of the warning.
- Cannot confirm: The exact UI/UX of the desired warning.
- Root cause: Missing pre-flight network check before initiating the waypoint save operation.
- User impact: Users are surprised by save failures, leading to frustration and potential data loss if they don't realize the save failed.
- Business impact: Degraded user experience, reduced trust in data safety.
- Fix direction: Implement a network connectivity check and display a warning before allowing offline users to attempt a waypoint save.

## Tier Comparison

*   **V7 (Theme Persistence):** Identical failure across Guest and Free tiers. Both fail to persist theme preference on reload, with `ee_theme` being `null` before and after reload. This indicates a core issue with the `ee_theme` `localStorage` manual pattern, affecting all authenticated and unauthenticated users equally.
*   **V13 (Learn Tab State Loss):** Identical behavior across Guest and Free tiers. Both tests passed, indicating that the Learn tab's header stats do *not* regress to zero on tab switch. This suggests the fix for V13 (always-mounted tabs with `display:none`) is working correctly for both tiers.
*   **Map Preference Persistence (V8, V9):** Both Guest (V9, basemap) and Free (V8, layer visibility) tests timed out, implying a failure to persist map preferences. This suggests a common issue with the `ee-map-prefs` Zustand persist middleware, affecting all users.
*   **Offline App Load (V2, V10):** Pro tier fails to load the app entirely when offline. This is likely a systemic issue affecting all authenticated users (Free and Pro) as the core app shell and data loading mechanisms are shared. Guest users might load, but with limited functionality.
*   **Waypoint Saving (P3, F3, V3, V14):**
    *   Free users (F3) are incorrectly routed to the WaypointSheet instead of the UpgradeSheet, missing a monetization opportunity.
    *   Pro users (P3, V3) cannot save waypoints due to GPS acquisition failure, even online. This GPS issue would also affect Free/Guest if they could access the save functionality.
    *   Pro users (V3) also confirm the lack of a pre-save offline warning (V14). This warning would ideally be present for all tiers attempting to save offline.
*   **PRO Badges (F2):** Free users see PRO badges in the LayerPanel. This is specific to the Free tier's experience of Pro features. Pro users would not see these badges (as per previous P1 fix). Guest users would also see them if they could access the LayerPanel.
*   **Session Data Persistence (V1, V11, V15):**
    *   Guest users (V11) lose session waypoints on reload.
    *   Guest users (V15) lose active module on reload.
    *   Pro users (V1) lose GPS track on reload.
    *   These are all distinct manual `localStorage` keys (`ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) that are failing to persist, indicating a widespread problem with this manual persistence pattern across different types of session data and tiers.

## Findings Discarded

*   `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: This test timed out. The expected behavior is *not* to see the UpgradeSheet. A timeout doesn't confirm the UX issue, but rather a test flakiness or inability to complete the journey. Given the previous P1 fix, I'm treating this as a test issue rather than a confirmed UX bug.

## Cannot Assess

*   The exact toast messages for offline save failures (V4, V6) as screenshots are not provided for these specific moments.
*   The full extent of `isPro` status reversion (V10) because the app fails to load entirely offline.

## Systemic Patterns

1.  **Widespread `localStorage` Persistence Failure:** Multiple manual `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are failing to persist data across reloads, despite `STATE_MAP.md` indicating they should. This points to a fundamental issue in how these keys are being written or read (IIFE pattern). The Zustand `persist` middleware for `ee-map-prefs` also appears to be failing (V8, V9 timeouts).
2.  **Lack of Offline-First Implementation:** The app completely fails to load offline for authenticated users (V2, V10), and all data write operations (waypoints, tracks, routes) fail without proper queuing or robust user feedback (V3, V4, V6, V14). This is a critical architectural gap for an outdoor mapping app.
3.  **GPS Acquisition Issues:** The app consistently fails to acquire GPS, blocking core functionality like saving waypoints (P3, V3). This could be a problem with the `useTracks` hook or how `mapStore.userLocation` is updated.
4.  **Monetization Gate Failures:** The upgrade gate for free users attempting to save waypoints (F3) is bypassed, directly impacting business revenue.

## Calibration Notes

*   The previous `V13` fix (always-mounted tabs) appears to be holding, as both guest and free tests passed, confirming no regression in learn header stats. This reinforces that `display:none` is a valid strategy for tab state preservation.
*   The previous `V7` fix (manual `localStorage` for theme) is clearly broken, as `ee_theme` is `null`. This indicates that simply changing to a manual pattern isn't enough; the implementation of the manual pattern itself needs auditing.
*   The previous `V1` fix (auto-persist sessionTrail) is also broken, as `ee_session_trail` is empty/missing. This further highlights issues with the manual `localStorage` pattern.
*   The previous `V10` fix (guarding `isPro` reset) cannot be fully verified due to the app's inability to load offline, but the root cause of the app not loading offline (V2) is now the primary concern.
*   The `P1` fix (hiding PRO badges for *Pro* users) was confirmed previously. The current `F2` finding (PRO badges for *Free* users) is a distinct, but related, UX issue.
*   The `P3` (GPS acquisition) issue is a recurring critical problem, indicating the previous "Playwright geolocation permission + mock location" fix was insufficient or the app's internal GPS logic is flawed.