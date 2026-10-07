# UX Agent Report — 2026-10-07

## Run Context
- Commits analysed: `c449591c63a224634cbe0c07b6f868d47fb4a890` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free/Guest, as it's an app-level loading issue)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' (V10) or if gold/mineral data would be missing (V2) *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by Persistent GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also masks offline save failures.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` confirms the lack of an offline warning, but the primary issue is the disabled button.
- Cannot confirm: If the offline save would truly fail silently (V3) or if the pre-save warning (V14) would appear, as the button is never enabled to trigger these paths.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated and the save button enables when location is acquired.

### 3. Critical: Free Users Can Create Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to create waypoints, bypassing the intended upgrade gate for a Pro feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was `false` and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet is visible.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the gate.
- Root cause: The logic gating waypoint creation for free users is flawed. Instead of showing the `UpgradeSheet`, the app proceeds to show the `WaypointSheet`. This is a business logic error in the `useWaypoints` hook or the `CornerControls` component.
- User impact: Free users can attempt to use a premium feature, only to potentially hit a failure later, leading to frustration and a poor user experience.
- Business impact: Direct loss of potential conversions from free to Pro users, as the primary upgrade incentive (saving waypoints) is bypassed.

### 4. Theme Preference Resets to Default on Reload (V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads, reverting to the default 'dark' theme.
- Tier(s) affected: Guest, Free (likely Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm that the `ee_theme` localStorage key is not being written or read correctly.
- Cannot confirm: If Pro users are also affected, but the root cause (manual `localStorage` handling for `ee_theme`) suggests it's a universal issue.
- Root cause: The manual `localStorage` pattern for `userStore.theme` (key `ee_theme`) is failing to write the theme preference to `localStorage` or read it back on initialization. `STATE_MAP.md` indicates `ee_theme` is a manual pattern (task-008).
- User impact: Minor annoyance, requiring users to re-select their preferred theme after every reload.
- Business impact: Contributes to a perception of an unreliable or unpolished application, potentially reducing user satisfaction and trust.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_theme` key in `userStore.js` to ensure theme preference is correctly persisted.

### 5. Map Preferences (Basemap, Layer Visibility) Reset on Reload (V8, V9)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: Guest (V9), Free (V8) (likely Pro too, but not explicitly tested)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout, this strongly suggests the expected state (persisted preferences) was not met, or the UI became unresponsive. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via Zustand `persist` middleware (`ee-map-prefs`). The fact that V7 (theme) is failing for a similar reason (persistence) strengthens the inference that these are also persistence failures.
- Cannot confirm: The exact default state they revert to due to the timeout, but the test's intent is to prove a reset.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is either failing to save `basemap` and `layerVisibility` to `localStorage` or failing to rehydrate them on store initialization.
- User impact: Users must reconfigure their preferred map view (basemap, visible layers) after every reload, leading to repeated minor frustration.
- Business impact: Degrades user experience, especially for power users who customize their map view, potentially reducing engagement.
- Fix direction: Debug the Zustand `persist` configuration for `mapStore` to ensure `basemap` and `layerVisibility` are correctly saved and rehydrated.

### 6. Guest Waypoints are Lost on Page Reload (V11)
- Summary: Waypoints created by guest users are stored only in volatile memory and are permanently lost if the page is reloaded or the browser tab is closed.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This explicitly confirms the vulnerability.
- Cannot confirm: The exact content of the lost waypoints, but the fact of their loss is confirmed.
- Root cause: `mapStore.sessionWaypoints` is designed to be memory-only for guests and is not persisted to `localStorage` or any other storage mechanism. `STATE_MAP.md` notes `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002), but the test evidence contradicts this, indicating the fix is not active or correctly implemented.
- User impact: Guests lose any valuable waypoints they've marked, leading to significant frustration and distrust in the application's ability to retain their data.
- Business impact: Prevents guest users from experiencing the value of the app, hindering conversion to authenticated or paying users. Leads to negative first impressions.
- Fix direction: Implement the manual `localStorage` persistence for `sessionWaypoints` using the `ee_guest_waypoints` key as described in `STATE_MAP.md` (task-002), ensuring it correctly saves and rehydrates.

### 7. Active Module Resets to Default on Reload (V15)
- Summary: The user's selected active module (e.g., 'prospecting') is not persisted across page reloads, reverting to the default.
- Tier(s) affected: Guest (likely Free/Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly confirms the vulnerability.
- Cannot confirm: If Free/Pro users are also affected, but the root cause (manual `localStorage` handling for `ee_active_module`) suggests it's a universal issue.
- Root cause: The manual `localStorage` pattern for `moduleStore.activeModule` (key `ee_active_module`) is failing to write the active module preference to `localStorage` or read it back on initialization. `STATE_MAP.md` indicates `ee_active_module` is a manual pattern (task-013).
- User impact: Minor annoyance, requiring users to re-select their desired module after every reload.
- Business impact: Degrades user experience, especially for users who frequently switch modules, making the app feel less personalized and efficient.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_active_module` key in `moduleStore.js` to ensure active module preference is correctly persisted.

### 8. Unsaved GPS Tracks are Lost on Page Reload (V1)
- Summary: Any active GPS tracking session and its accumulated trail data are entirely lost if the page is reloaded before the user explicitly saves the track.
- Tier(s) affected: Pro (likely all tiers if tracking is available)
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This explicitly confirms the vulnerability.
- Cannot confirm: If the `elevationProfile` or `routePoints` (also volatile in `mapStore`) are similarly lost, but it's highly probable given the shared volatility.
- Root cause: `mapStore.sessionTrail` accumulates GPS points in volatile memory during tracking. Despite `STATE_MAP.md` noting `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006), the test evidence contradicts this, indicating the fix is not active or correctly implemented.
- User impact: Users lose potentially hours of valuable tracking data if the app crashes, the browser tab is accidentally closed, or connectivity is lost before they can save. This is a major data loss scenario.
- Business impact: Severe erosion of user trust and confidence in the application's reliability, leading to high churn and negative reviews. This is a core feature for prospectors.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_session_trail` key in `mapStore.js` to ensure active track data is periodically persisted to `localStorage` during a session, providing a recovery mechanism.

## Tier Comparison
- **Offline App Loading (V2, V10):** The `pro` tier explicitly fails with `net::ERR_INTERNET_DISCONNECTED`. This is an app-level loading issue, strongly indicating that `Free` and `Guest` tiers would experience the same complete failure to load if tested under identical offline conditions.
- **Waypoint Save Button Disabled (P3, V3):** The `pro` tier experiences a disabled "Save Waypoint" button due to GPS acquisition failure. This is a core functionality issue that would affect any tier attempting to save waypoints, regardless of authentication status.
- **Theme Preference Reset (V7):** This issue affects both `Guest` and `Free` tiers, indicating a universal problem with the `ee_theme` localStorage mechanism, independent of authentication.
- **Map Preferences Reset (V8, V9):** Both `Guest` (basemap) and `Free` (layers) tiers experience timeouts when testing map preference persistence. This suggests a common underlying issue with the `ee-map-prefs` Zustand persistence, or a broader app loading/interactivity problem.
- **Learn Tab State Loss (V13):** Both `Guest` and `Free` tiers pass the test, showing identical (0% complete) header stats before and after tab switching. This indicates the header stats themselves do not regress, but the test does not provide evidence for the original V13 vulnerability (in-chapter reading position loss).
- **Guest Waypoints Lost (V11):** This vulnerability is specific to the `Guest` tier, as authenticated users save waypoints to Supabase.
- **Active Module Resets (V15):** Confirmed for the `Guest` tier. Given the manual `localStorage` implementation, it is highly probable this affects `Free` and `Pro` tiers identically.
- **Unsaved GPS Tracks Lost (V1):** Confirmed for the `Pro` tier. This is a general data loss vulnerability for any user tracking, regardless of tier, if the track is not explicitly saved.
- **Offline Save Failures (V4, V6):** Confirmed for the `Pro` tier. These are general offline data write vulnerabilities that would affect any authenticated user attempting to save data offline.

## Findings Discarded
- **`pro P1` (Pro user does not see UpgradeSheet):** Discarded as "Cannot Assess". The test timed out, likely due to the broader app loading issues when offline or GPS acquisition failures preventing the app from becoming fully interactive. It's impossible to confirm if the UpgradeSheet was shown or not from this result.
- **`guest V13` and `free V13` (Learn tab state loss):** Discarded as "Cannot Assess" for the *original vulnerability*. Both tests passed, and the `state-loss-evidence` showed identical (0% complete) header stats before and after tab switching. While the test passed, it does not provide evidence for the *original* V13 vulnerability, which concerned the loss of *in-chapter reading position* (component state) when switching tabs. The previous fix for V13 addressed this component state, but this test does not verify it.

## Cannot Assess
- **`pro V10` (Pro status reverts to free on offline reload):** Cannot assess the specific `isPro` status reversion because the app failed to load entirely due to `net::ERR_INTERNET_DISCONNECTED`. The underlying app loading issue is a blocker.
- **`pro V2` (gold/mineral data missing after offline reload):** Cannot assess the specific data loading issue because the app failed to load entirely due to `net::ERR_INTERNET_DISCONNECTED`. The underlying app loading issue is a blocker.
- **`pro V14` (no pre-save offline warning):** The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation is present for `pro V3`. However, the primary failure for `pro V3` is the disabled "Save Waypoint" button due to GPS acquisition failure. This prevents the user from even attempting to save, thus masking whether a pre-save warning would appear. While the annotation *states* V14 is confirmed, the context of the disabled button makes it impossible for the user to encounter this warning. Therefore, I cannot confirm the *user experience* of V14 in this specific test run.

## Systemic Patterns
1.  **Critical Offline Functionality Gap:** The application fundamentally fails to load or operate offline for authenticated users, rendering it unusable in its primary target environment (rural areas with poor connectivity). This is a major violation of offline-first design principles.
2.  **Widespread Persistence Mechanism Failures:** Multiple user preferences (theme, basemap, layer visibility, active module) are not persisting correctly across reloads. This indicates issues with both manual `localStorage` keys (`ee_theme`, `ee_active_module`) and the Zustand `persist` middleware (`ee-map-prefs`), suggesting a lack of robust state management for user preferences.
3.  **Persistent GPS Acquisition Failure:** A critical failure to acquire GPS coordinates is blocking core functionality (waypoint saving) even when online. This points to a fundamental problem with geolocation integration or its interaction with the testing environment.
4.  **Unprotected Volatile Data:** User-generated data (guest waypoints, active GPS tracks) is lost on reload if not explicitly saved, and there is no auto-save or crash recovery mechanism. This creates significant data loss risks and erodes user trust.

## Calibration Notes
- The `net::ERR_INTERNET_DISCONNECTED` error for `page.goto` is a strong, high-confidence indicator of a critical app-level loading failure, consistent with previous "Confirmed" verdicts for offline issues.
- Failures involving `expect(...).toBeDisabled()` for interactive elements provide direct, high-confidence evidence of UI state issues, aligning with past successful diagnoses.
- The explicit `gate-routing` annotation for `free F3` directly confirms a business logic flaw in feature gating, reinforcing the reliability of such annotations for high-confidence findings.
- The `null` values for `ee_theme` in `localStorage` annotations for V7 are crucial diagnostic evidence, directly pointing to a failure in the manual persistence mechanism.
- I have carefully interpreted "PASS" results for vulnerability tests (V1, V11, V15, V4, V6), understanding that a "PASS" means the *vulnerability was confirmed* (i.e., the expected vulnerable behavior occurred), as indicated by the test annotations.
- The `V13` test's scope (header stats vs. in-chapter progress) was carefully re-evaluated based on previous fix context, leading to a "Cannot Assess" verdict for the original vulnerability despite the test passing.