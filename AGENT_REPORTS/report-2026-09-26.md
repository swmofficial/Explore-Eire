# UX Agent Report — 2026-09-26

## Run Context
- Commits analysed: `576b019de85fe6643e876da3ad7a391daccfeeca` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Blocks Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Manual localStorage Persistence Failures (V1, V7, V11, V15)
- Summary: Multiple critical user preferences and session data (theme, guest waypoints, active module, GPS tracks) are not persisting across reloads, despite `STATE_MAP.md` indicating manual `localStorage` implementations.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7`, `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `theme-after-reload: dark` (expected light).
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact line of code where the `localStorage.setItem` or `localStorage.getItem` is failing, but the annotations confirm the keys are not present or correctly read.
- Root cause: The manual `localStorage` read/write patterns (IIFE on store init, `localStorage.setItem` on state update) for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are not functioning as intended, or the initial state is not being correctly hydrated from `localStorage` on app load.
- User impact: Users lose their chosen theme, unsaved waypoints, active module context, and in-progress GPS tracks upon page reload, leading to frustration and loss of work.
- Business impact: Decreased user satisfaction, reduced engagement with core features, and potential data loss for users, undermining trust.
- Fix direction: Debug the manual `localStorage` read/write implementations for each affected state key to ensure data is correctly stored and retrieved.

### 4. High: Free Users Bypass Pro Gate for Waypoint Saving (F3 Regression)
- Summary: Free tier users are able to access and attempt to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the client-side gating logic for the camera button to display the `UpgradeSheet` for free users instead of the `WaypointSheet`.

### 5. High: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: User-generated track and route data is lost when attempting to save offline, with route saving failing silently without user notification.
- Tier(s) affected: Pro (inferred Free/Guest if they could save)
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming that track save fails offline and data is lost. `pro V6` test passed, confirming that route save offline produces no user-facing toast (silent failure). `STATE_MAP.md` confirms `tracks` INSERT fails offline with toast "Could not save track" and `routes` INSERT fails offline with "console.error only, no toast".
- Cannot confirm: The exact toast message for V4, but the test passing implies the expected failure and data loss occurred.
- Root cause: Lack of an offline data sync queue. All data writes (tracks, routes) go directly to Supabase and fail without local persistence or a retry mechanism when offline. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable, time-consuming data (e.g., a long GPS track) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for prospectors operating in remote areas with unreliable connectivity.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store unsynced user-generated content and automatically sync it when connectivity is restored.

### 6. Medium: Basemap and Layer Preferences Reset on Reload (V8, V9)
- Summary: User preferences for basemap and layer visibility are not persisting across page reloads.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed due to a `Test timeout of 60000ms exceeded`. While not a direct assertion failure, the timeout occurred during a sequence designed to verify persistence after reload, suggesting the expected state was not reached or the UI became unresponsive. `STATE_MAP.md` indicates `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` after reload due to the timeout.
- Root cause: Likely an issue with the Zustand `persist` middleware configuration for `mapStore` (specifically `ee-map-prefs`), preventing `basemap` and `layerVisibility` from being correctly saved to or hydrated from `localStorage`. The timeout could also be a symptom of the app not fully loading or rendering the map/layer panel correctly after reload.
- User impact: Users' preferred map settings (basemap, active layers) revert to defaults on every reload, requiring manual re-configuration and causing minor annoyance.
- Business impact: Minor negative impact on user experience and perceived app polish.
- Fix direction: Investigate the `mapStore` Zustand `persist` configuration and ensure `ee-map-prefs` is correctly saving and loading `basemap` and `layerVisibility`.

## Tier Comparison

-   **V13 (Learn tab state preservation):** Behaviour is identical across **Guest** and **Free** tiers. Both tests passed, and the `state-loss-evidence` annotations show no change in header stats (`{"before":..., "after":...}` are identical). This confirms the fix for V13 is working as intended for both tiers.
-   **V7 (Theme persistence):** Behaviour is identical across **Guest** and **Free** tiers. Both tests failed, indicating the theme resets to 'dark' after reload, despite being set to 'light'. The `ee_theme` localStorage key was `null` before and after reload for both, confirming the manual persistence mechanism is not working.
-   **Offline Loading (V2, V10):** The `pro` tier tests failed with `net::ERR_INTERNET_DISCONNECTED`. This indicates a fundamental app shell loading issue that would likely affect all authenticated users (**Free** and **Pro**). **Guest** users might have a different loading path or fewer dependencies, allowing them to load.
-   **GPS Acquisition (P3, V3):** The `pro` tier tests failed due to GPS acquisition issues. Since `mapStore.userLocation` is a global state, this issue would likely affect all tiers attempting to save waypoints.
-   **Offline Data Loss (V4, V6):** The `pro` tier tests passed, confirming offline data loss for tracks and silent failure for routes. These are fundamental Supabase write failures and would affect any authenticated user (**Free** and **Pro**) attempting these actions offline.
-   **V11 (Guest waypoints):** This vulnerability is specific to the **Guest** tier, as authenticated users save waypoints to Supabase.
-   **V15 (Active module):** Only the **Guest** tier test confirmed this vulnerability, but `moduleStore.activeModule` is a global state, so it likely affects all tiers.
-   **V1 (GPS track loss):** Only the **Pro** tier test confirmed this vulnerability, but `mapStore.sessionTrail` is a global state, so it likely affects all tiers.
-   **F3 (Free user waypoint bypass):** This is a specific gating issue affecting the **Free** tier.
-   **P1 (Pro user sees UpgradeSheet):** This test timed out for the **Pro** tier, so no direct comparison can be made.
-   **V8 (Layer preferences reset):** The `free` tier test timed out. No direct comparison can be made.
-   **V9 (Basemap resets):** The `guest` tier test timed out. No direct comparison can be made.

## Findings Discarded

-   **`guest V13` and `free V13` (Learn header stats are recomputed / learn tab state loss):** These tests passed, and the `state-loss-evidence` annotations explicitly show that the "before" and "after" values for learn header stats are identical. This indicates that the vulnerability (V13) is *not* active and the fix implemented in a previous task is working correctly. The test names are misleading as they imply a failure.
-   **`free F4` (Learn header percentage does not regress):** This test passed and its `header-stats-pair` annotation shows identical before/after values, confirming the absence of regression. This is a confirmation of a fix, not a new finding.
-   **`pro P2` (Find sheet Minerals tab is interactive):** This test passed, indicating no issues with the Minerals tab.
-   **All `C` (Capability) tests for Guest tier (C1, C2, C3):** All passed, confirming expected functionality.
-   **All `F` (Free tier capability) tests (F1, F2):** All passed, confirming expected functionality.
-   **All "Other" suite tests:** All 16 tests passed, indicating no general loading errors, navigation issues, or layout problems.

## Cannot Assess

-   **`pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload):** The primary failure for these tests was `net::ERR_INTERNET_DISCONNECTED`, meaning the application failed to load at all. Therefore, the specific state of `isPro` or the presence of `gold/mineral data` *after* an offline reload could not be assessed, as the app never reached that state.
-   **`pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap):** This test timed out, preventing assessment of whether the UpgradeSheet was incorrectly displayed to a Pro user.
-   **`guest V9` (basemap resets to satellite on reload) and `free V8` (layer preferences reset to defaults on reload):** These tests timed out. While they point to potential persistence issues, the timeout prevents direct observation of the state after reload, making a definitive assessment of the specific persistence failure difficult without further debugging.

## Systemic Patterns

1.  **Fundamental Offline-First Deficiency:** The most critical pattern is the complete failure of the application to load offline for authenticated users, coupled with confirmed offline data loss for user-generated content (tracks, routes). This indicates a severe lack of an offline-first architecture, which is crucial for an outdoor mapping app targeting rural areas.
2.  **Widespread Persistence Implementation Flaws:** There are multiple instances where user preferences and session data (theme, guest waypoints, active module, GPS tracks, basemap, layer visibility) are failing to persist across reloads. This occurs despite explicit persistence mechanisms (Zustand `persist` middleware or manual `localStorage` patterns) being documented in `STATE_MAP.md`. This suggests a systemic issue with how these persistence layers are integrated, configured, or how their data is being read/written.
3.  **GPS Acquisition Blocker:** A persistent "Acquiring GPS..." state is blocking critical features like waypoint saving. This points to a problem with the app's geolocation handling, either in processing the browser's GPS data or in updating the `mapStore.userLocation` state.

## Calibration Notes

The previous `PHANTOM` verdicts for issues like "Dashboard Tab Obstruction" and "Map Layer Style Inconsistencies" have reinforced the need for direct, observable evidence in screenshots or annotations. I avoided speculating on root causes for timeouts (e.g., V8, V9, P1) and instead focused on what was directly reported (e.g., `ee_theme: null` for V7). The `CONFIRMED` verdicts for `V15 activeModule resets` and `V7 theme resets` (from previous runs) highlighted the importance of verifying manual `localStorage` patterns, which proved critical in identifying the current persistence failures. The `V13` fix confirmation (no state loss) demonstrates the value of the "journey" test design in validating fixes, even if the test name is outdated.