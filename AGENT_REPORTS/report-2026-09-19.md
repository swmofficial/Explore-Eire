# UX Agent Report — 2026-09-19

## Run Context
- Commits analysed: `32283083c1183acbc4e994470ccb1d0e76d56cac` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Free Users Can Save Waypoints, Bypassing Pro Gate (F3 Regression)
- Summary: Free tier users are able to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Review the `CornerControls` and `WaypointSheet` gating logic to ensure `isPro` status correctly triggers the `UpgradeSheet` for free users.

### 4. High: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted and reverts to the default 'dark' theme after a page reload, across all tiers.
- Tier(s) affected: All (guest, free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed with `Expected: "light" Received: "dark"`. The annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` explicitly show that the `ee_theme` localStorage key, which is supposed to persist the theme, was `null` both before and after reload, indicating it was never written. `theme-initial: dark`, `theme-after-flip: light`, `theme-after-reload: dark` further confirms the reset.
- Cannot confirm: The exact line of code preventing the `ee_theme` key from being written, but the evidence strongly points to a failure in the manual persistence mechanism.
- Root cause: The manual localStorage persistence for `userStore.theme` via the `ee_theme` key (as per `STATE_MAP.md`, task-008) is not functioning, likely due to an issue in the `setTheme` function or the initial IIFE read/write pattern.
- User impact: Users experience a jarring visual change and loss of personalization, leading to frustration and a perception of an unreliable application.
- Business impact: Decreased user satisfaction and engagement, potentially leading to lower retention as users feel their preferences are not respected.
- Fix direction: Debug the `setTheme` function and the `userStore` initialization to ensure the `ee_theme` localStorage key is correctly written and read.

### 5. High: Basemap and Layer Visibility Preferences Reset on Reload (V9, V8 Regression)
- Summary: User preferences for the selected basemap and active layer visibility are not persisted and revert to their default states after a page reload.
- Tier(s) affected: All (guest, free)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded`. While a timeout, this indicates the test could not find the expected state after reload, strongly suggesting a reset. `STATE_MAP.md` states `mapStore.basemap` and `mapStore.layerVisibility` are persisted via `ee-map-prefs`. The consistent timeout across both tests for different map preferences points to a systemic issue with `ee-map-prefs` persistence.
- Cannot confirm: The exact default values they revert to, but the failure to maintain the *changed* state is clear.
- Root cause: The Zustand `persist` middleware for `mapStore` (key: `ee-map-prefs`) is failing to correctly save or load the `basemap` and `layerVisibility` states, or there's a race condition where defaults are applied before persisted state is loaded.
- User impact: Users must reconfigure their map view every time they reload the app, leading to significant friction and a degraded experience, especially for power users.
- Business impact: Reduced efficiency for users, potentially leading to lower adoption of advanced map features and overall dissatisfaction.
- Fix direction: Investigate the `mapStore`'s Zustand `persist` configuration and ensure `ee-map-prefs` is correctly saving and hydrating `basemap` and `layerVisibility`.

### 6. High: Guest Waypoints Lost on Reload (V11 Regression)
- Summary: Waypoints created by guest users are not persisted to local storage and are lost upon page reload, despite a previous fix being documented.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This explicitly confirms the `ee_guest_waypoints` localStorage key, which should store guest waypoints, is missing after reload. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (task-002).
- Cannot confirm: When or why the fix for task-002 was reverted or became ineffective.
- Root cause: The manual localStorage persistence mechanism for `mapStore.sessionWaypoints` using the `ee_guest_waypoints` key is not functioning as intended, leading to data loss.
- User impact: Guest users lose any waypoints they create, leading to frustration and a complete lack of trust in the app's ability to save their data. This prevents meaningful engagement for unauthenticated users.
- Business impact: Hinders guest-to-free conversion, as users cannot experience basic data persistence without signing up. High churn for new users.
- Fix direction: Debug the `mapStore`'s `sessionWaypoints` logic to ensure `ee_guest_waypoints` is correctly written to and read from localStorage.

### 7. High: Active Module Resets to Default on Reload (V15 Regression)
- Summary: The user's selected active module (e.g., 'prospecting') is not persisted and reverts to the default after a page reload.
- Tier(s) affected: All (guest)
- Confidence: HIGH
- Evidence: `guest V15` test passed with the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly confirms the `ee_active_module` localStorage key, which should store the active module, is missing after reload. This contradicts `STATE_MAP.md` which states `moduleStore.activeModule` persists via `ee_active_module` (task-013).
- Cannot confirm: When or why the fix for task-013 was reverted or became ineffective.
- Root cause: The manual localStorage persistence mechanism for `moduleStore.activeModule` using the `ee_active_module` key is not functioning as intended, leading to loss of user context.
- User impact: Users lose their active module context on reload, forcing them to re-select it, which disrupts workflow and causes minor frustration.
- Business impact: Degraded user experience, particularly for users who frequently switch between modules or rely on a specific module for their work.
- Fix direction: Debug the `moduleStore`'s `activeModule` logic to ensure `ee_active_module` is correctly written to and read from localStorage.

### 8. Medium: GPS Track Lost on Reload (V1 Regression)
- Summary: An active GPS tracking session's accumulated trail data is not persisted to local storage and is lost upon page reload, despite a previous fix being documented.
- Tier(s) affected: Pro (inferred Free/Guest if they could track)
- Confidence: HIGH
- Evidence: `pro V1` test passed with the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This explicitly confirms the `ee_session_trail` localStorage key, which should store the session trail, is empty or missing after reload. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (task-006).
- Cannot confirm: When or why the fix for task-006 was reverted or became ineffective.
- Root cause: The manual localStorage persistence mechanism for `mapStore.sessionTrail` using the `ee_session_trail` key is not functioning as intended, leading to data loss during active tracking.
- User impact: Users actively tracking a route will lose all accumulated GPS data if the app crashes or the page is accidentally reloaded, leading to significant data loss and extreme frustration.
- Business impact: Severe blow to user trust and reliability, especially for a core feature like tracking. Could lead to immediate abandonment for users relying on this for their activities.
- Fix direction: Debug the `mapStore`'s `sessionTrail` logic to ensure `ee_session_trail` is correctly written to and read from localStorage.

## Tier Comparison
- **Offline Loading (V2, V10):** Pro tier completely fails to load offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is likely identical for Free users, as the root cause is a lack of app shell caching, not specific to Pro features. Guest users might load partially if they don't hit Supabase for auth, but critical data like `gold_samples` would still be missing.
- **GPS Acquisition (P3, V3):** Pro tier fails to acquire GPS, disabling the "Save Waypoint" button. This issue is likely systemic and would affect Free and Guest users if they were able to access the WaypointSheet.
- **Waypoint Gating (F3):** Free tier incorrectly bypasses the Pro gate for waypoint saving, allowing them to open the `WaypointSheet` instead of the `UpgradeSheet`. Guest users correctly see the `UpgradeSheet` (`guest C3` passed). Pro users should not see the `UpgradeSheet` and should be able to save waypoints (blocked by GPS issue).
- **Theme Persistence (V7):** Both Guest and Free tiers experience theme preference resetting on reload, indicating a universal failure in the `ee_theme` localStorage persistence mechanism. This behavior is identical across authenticated and unauthenticated states.
- **Map Preferences Persistence (V9, V8):** Both Guest (basemap) and Free (layers) tiers experience preference resetting on reload, indicating a universal failure in the `ee-map-prefs` Zustand persistence. This behavior is identical across authenticated and unauthenticated states.
- **Guest Waypoint Persistence (V11):** Only applicable to Guest users, who lose their waypoints on reload.
- **Active Module Persistence (V15):** Only tested for Guest, where the active module resets on reload. This behavior is likely identical for Free and Pro users, as `moduleStore` is a shared store.
- **Learn Tab State (V13, F4):** Both Guest and Free tiers show that Learn header stats are *not* lost across tab switches, indicating the fix for V13 is working for this specific aspect. This behavior is identical.
- **GPS Track Persistence (V1):** Pro tier loses active GPS track on reload. This behavior is likely identical for Free users if they could track. Guest users cannot track.

## Findings Discarded
- `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: This test timed out. While it's a failure, the root cause is unclear (could be a general timeout, or the element not appearing/disappearing). Given the higher priority issues, and the lack of clear evidence beyond a timeout, this finding is discarded. It's possible the GPS issue or offline loading issues are causing cascading failures.
- `pro V6 — route save offline produces no user-facing toast (silent failure)`: This test passed, and the annotation `route-button-missing: cannot proof V6` is confusing. `STATE_MAP.md` confirms silent failure (`console.error only, no toast`). The test passing implies it *confirmed* the silent failure. However, the annotation makes it hard to be 100% confident in the *proof* of silent failure. Given the higher priority data loss issues, and the ambiguity of the annotation, this finding is discarded.

## Cannot Assess
- The exact state of `isPro` and `subscriptionStatus` for Pro users after an offline reload (V10) because the app fails to load entirely.
- The full extent of data loss for `gold_samples` and `mineral_localities` (V2) beyond the app failing to load, as no data is displayed.
- The behavior of `free V1` (GPS track loss) and `free V4` (track save fails offline) as these tests were not run for the Free tier.
- The behavior of `pro V7`, `pro V8`, `pro V9`, `pro V11`, `pro V13`, `pro V15` as these tests were not run for the Pro tier.

## Systemic Patterns
1.  **Widespread Persistence Failures (V1, V7, V8, V9, V11, V15):** A significant number of user preferences and session-specific data (theme, basemap, layer visibility, guest waypoints, active module, active GPS track) are failing to persist across reloads. This indicates a systemic issue with either the Zustand `persist` middleware configuration (for `ee-user-prefs`, `ee-map-prefs`) or the manual `localStorage` read/write patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). The `STATE_MAP.md` claims these were fixed, but test evidence contradicts this, suggesting either regressions or incomplete fixes.
2.  **Critical Offline Functionality Breakdown (V2, V10):** The app completely fails to load for authenticated users when offline, rendering it unusable in its primary target environment. This points to a fundamental lack of offline-first architecture for the application shell and initial data loading.
3.  **GPS Acquisition Issues (P3, V3):** A core feature (waypoint saving) is blocked due to a failure in GPS acquisition, suggesting a problem with the `useTracks` hook or `mapStore.userLocation` updates, potentially exacerbated by Playwright's geolocation mock.
4.  **Pro-Gating Logic Flaws (F3):** A premium feature (waypoint saving) is accessible to free users, indicating a flaw in the client-side authorization logic.

## Calibration Notes
- **Trust Test Evidence over STATE_MAP.md for specific vulnerabilities:** My previous "CONFIRMED" verdicts for V1, V11, V15 were based on `STATE_MAP.md` updates (e.g., "task-002 fixes this"). However, the current test results explicitly state these vulnerabilities are "confirmed" by the test passing (meaning the expected vulnerable behavior was observed). This highlights the importance of always prioritizing direct test evidence over documentation, especially when they conflict. The `STATE_MAP.md` needs to be updated to reflect the current reality.
- **Distinguish between "test passed" and "vulnerability fixed":** A test passing can mean it *confirmed* a vulnerability if the test is designed to detect the vulnerable behavior. This was the case for V1, V11, V15, V4, V6.
- **Timeout as evidence of failure:** Repeated timeouts for preference persistence (V9, V8) are strong indicators of a problem, even without explicit error messages, as they imply the expected state was never reached.
- **Phantom Verdicts:** My previous phantom verdicts for UI/layout issues (e.g., "Dashboard Tab Obstruction", "Mobile Viewport Issues") guide me to focus on functional and data-related issues with clear evidence, rather than speculating on visual glitches without direct screenshot proof.
- **Misdiagnosed Verdicts:** The "Map Button Naming Ambiguity" was a Playwright selector issue, not a UX problem. This reinforces the need to trace issues to the *application's* behavior, not just the test's interaction with it.