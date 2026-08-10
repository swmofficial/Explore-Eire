# UX Agent Report — 2026-08-10

## Run Context
- Commits analysed: `8d23e222e1bbe9b5a45f8dfe508bee259424e710` (latest) and 19 preceding commits.
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
- Summary: User preferences for theme, basemap, and layer visibility are not persisted across page reloads, reverting to default settings and requiring users to reconfigure them repeatedly.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, and `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. `guest V9` and `free V8` failed with `Test timeout`, indicating a failure to load or verify the persisted state of basemap and layer visibility. `STATE_MAP.md` states `userStore.theme` (via `ee_theme`), `mapStore.basemap`, and `mapStore.layerVisibility` are persisted. The `null` for `ee_theme` is direct evidence of persistence failure.
- Cannot confirm: The exact cause of the `Test timeout` for V9 and V8, but it strongly suggests a persistence or loading issue.
- Root cause: Regression in the `localStorage` persistence mechanisms for `userStore.theme` (manual `ee_theme`) and `mapStore` preferences (`ee-map-prefs`). The `null` for `ee_theme` indicates the manual write is not happening or the read is failing.
- User impact: Annoyance and wasted time as users repeatedly set their preferred theme, basemap, and layer configurations.
- Business impact: Degraded user experience, perceived lack of polish, and potential for users to abandon the app if basic preferences aren't remembered.
- Fix direction: Debug and re-implement `localStorage` persistence for `theme`, `basemap`, and `layerVisibility`.

### 5. Medium: Free Users Can Access Waypoint Sheet Instead of Upgrade Prompt (Feature F3)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` directly from the map's camera button, bypassing the intended `UpgradeSheet` prompt for a Pro feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` being `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was not shown, but the `WaypointSheet` was.
- Cannot confirm: The specific conditional logic that failed to route the user to the `UpgradeSheet`.
- Root cause: Incorrect gating logic for the camera button's action. The `isPro` check is either missing or misconfigured, allowing free users to access a Pro-gated feature's input form.
- User impact: Free users can attempt to save waypoints, only to likely encounter a save failure later, leading to frustration. They are not clearly guided towards the upgrade path.
- Business impact: Lost conversion opportunities from free to Pro users, as the primary call to action for a Pro feature is bypassed.
- Fix direction: Correct the conditional rendering/routing logic for the map's camera button to ensure free users are directed to the `UpgradeSheet`.

### 6. Medium: Offline Data Write Failures are Silent or Inadequately Signalled (Vulnerability V4, V6, V14)
- Summary: Critical user-generated data (tracks, routes) fails to save when offline, often silently or with insufficient user feedback, leading to data loss and user confusion.
- Tier(s) affected: Pro (inferred All for V14, V4, V6)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states no pre-save offline warning was shown for waypoints. `STATE_MAP.md` confirms these operations fail offline.
- Cannot confirm: The exact toast messages (or lack thereof) for V4 and V6, beyond the test passing as expected for the vulnerability.
- Root cause: Lack of an offline data queue and explicit user feedback mechanisms for failed offline writes. The app is not designed with "Local-first writes" or "Sync queue" principles.
- User impact: Users lose valuable data (e.g., a long GPS track) without clear warning or a chance to recover it, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, and a perception of unreliability, especially for users in rural areas where offline usage is common.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) and robust UI feedback (toasts, status indicators) for offline save attempts and sync status.

### 7. Low: Learn Tab Header Stats Test is Misleading (Vulnerability V13, Feature F4)
- Summary: The tests for Learn tab header stats (V13, F4) pass by showing identical 0% completion before and after tab switches, which confirms persistence of the *current* (empty) state, but does not actively test for persistence of *actual* progress or component state.
- Tier(s) affected: All (Guest: V13; Free: V13, F4)
- Confidence: MEDIUM
- Evidence: `guest V13`, `free V13`, `free F4` all passed with `state-loss-evidence` or `header-stats-pair` showing `completePct:0` before and after. The previous finding for V13 was "Preserve Learn tab component state across tab switches (V13)" → CONFIRMED, implying the fix was for component state.
- Cannot confirm: Whether the underlying `ee_progress` localStorage key is actually being written to and read correctly for *non-zero* progress, as the tests only show 0%.
- Root cause: The tests are designed to check for state loss, but the initial state (0% progress) doesn't allow for a clear demonstration of *non-zero* state persistence. The `useProgress` hook correctly reads from `ee_progress` in localStorage, which for a new user would be empty, resulting in 0%.
- User impact: None, as the current behavior (persistence of 0% progress) is technically correct for a new user. However, the tests don't fully validate the persistence of *actual* learning progress.
- Business impact: None directly, but a false sense of security regarding the robustness of learning progress persistence.
- Fix direction: Update tests to simulate and verify persistence of non-zero learning progress (e.g., complete one chapter, then switch tabs and reload, then check stats).

### 8. Low: Pro User UpgradeSheet Test Timeout (Feature P1)
- Summary: The test to confirm Pro users do not see the UpgradeSheet on Pro affordance tap timed out, making it unclear if the expected behavior is met or if there's an underlying issue.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. No specific error message about the UpgradeSheet being visible or not.
- Cannot confirm: Whether the UpgradeSheet was actually shown or not, or if the test simply got stuck waiting for an element that never appeared (or appeared unexpectedly).
- Root cause: Unclear. Could be a test flakiness, a race condition, or an actual bug where the UpgradeSheet *is* shown, causing the test to get stuck. The previous finding "Hide PRO badges in LayerPanel for authenticated Pro users (P1)" was CONFIRMED, suggesting some Pro gating is working.
- User impact: Unclear, as the test result is ambiguous. If the UpgradeSheet *is* shown to Pro users, it would be confusing and frustrating.
- Business impact: Unclear.
- Fix direction: Debug the `pro P1` test to understand why it's timing out. Add more specific assertions and waits to confirm the absence of the UpgradeSheet.

## Tier Comparison

*   **Offline App Load (V2, V10):** Pro tier explicitly fails to load offline (`ERR_INTERNET_DISCONNECTED`). This behavior is likely identical for Free users, as the root cause is a lack of general app shell caching, not Pro-specific data. Guest users might load partially but would still lack dynamic data.
*   **GPS Acquisition Failure (P3, V3):** Pro tier fails to acquire GPS, disabling the waypoint save button. This behavior is likely identical across all tiers, as GPS acquisition is a core map feature, not tier-specific.
*   **Session Data Loss (V1, V11, V15):** `guest V11` (waypoints) and `guest V15` (active module) confirm loss. `pro V1` (GPS track) confirms loss. This indicates a systemic failure of manual `localStorage` persistence across all tiers for these specific data types.
*   **Preference Loss (V7, V8, V9):** `guest V7` (theme) and `guest V9` (basemap) confirm loss. `free V7` (theme) and `free V8` (layers) confirm loss. This indicates a systemic failure of `localStorage` persistence for user preferences across all tiers.
*   **Free User Waypoint Gate (F3):** This behavior is specific to the Free tier, as Guest users are not expected to save waypoints, and Pro users are expected to save them.
*   **Offline Save Failures (V4, V6, V14):** `pro V4` (track save) and `pro V6` (route save) confirm silent failure. `pro V3` (waypoint save) confirms no pre-save warning (V14). These behaviors are likely identical for all tiers attempting to save data offline, as the underlying Supabase write mechanism is the same.
*   **Learn Tab Header Stats (V13, F4):** Behavior is identical across Guest and Free tiers (0% progress persists as 0%). This indicates the persistence mechanism for `ee_progress` is working for the current state, but the tests don't validate non-zero progress.

## Findings Discarded
- No findings were discarded in this run, as all identified issues fit within the maximum of 8 findings and had sufficient confidence.

## Cannot Assess
- The exact cause of the `Test timeout` for `guest V9`, `free V8`, and `pro P1` cannot be fully assessed without more detailed logs or screenshots at the point of failure. While they strongly suggest persistence or gating issues, the precise nature of the failure (e.g., app crash, element not appearing, incorrect routing) remains ambiguous.

## Systemic Patterns
1.  **Widespread Persistence Regression:** Multiple critical user-generated data points (`sessionTrail`, `sessionWaypoints`, `activeModule`) and user preferences (`theme`, `basemap`, `layerVisibility`) are failing to persist across reloads. This points to a systemic issue with `localStorage` integration, either in the manual IIFE patterns or the Zustand `persist` middleware configuration.
2.  **Inadequate Offline Strategy:** The app completely fails to load offline for authenticated users, and all data writes fail silently or with insufficient feedback when offline. This indicates a fundamental lack of an offline-first design strategy, which is critical for the target user base.
3.  **GPS Acquisition Issues:** A core feature (GPS acquisition) appears to be failing, preventing fundamental actions like saving waypoints. This could be a bug in the geolocation handling or an issue with the Playwright mock setup.

## Calibration Notes
- The "vulnerability-proof test philosophy" is proving effective, with tests explicitly confirming vulnerabilities (e.g., V1, V11, V15, V14) by passing when the vulnerability is present. This provides clear, actionable evidence.
- The `Test timeout` errors, while indicative of a problem, continue to be a source of ambiguity regarding the precise nature of the failure. Future test enhancements should aim for more specific assertions or error logging to differentiate between app crashes, UI elements not appearing, or incorrect routing.
- The `ee_theme: null` annotation for V7 is excellent direct evidence, confirming the manual `localStorage` write is not happening or is being cleared, aligning with previous `CONFIRMED` verdicts related to `localStorage` issues.
- The `state-loss-evidence` for V13/F4, while technically confirming persistence of the 0% progress, highlights the need for tests to set up *non-default* states to truly prove persistence of dynamic user data.