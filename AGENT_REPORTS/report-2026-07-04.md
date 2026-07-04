# UX Agent Report — 2026-07-04

## Run Context
- Commits analysed: `7e01836` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical initial data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` due to a failure in GPS acquisition, preventing users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro (likely all tiers that can save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical Data Loss: GPS Track Not Persisted During Active Tracking (Vulnerability V1 - Regression)
- Summary: The active GPS track (`sessionTrail`) is not persisted to local storage during tracking, leading to complete data loss if the app is reloaded or crashes before the user explicitly saves the track. This is a regression from a previously confirmed fix.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006) and a previous finding that confirmed its fix.
- Cannot confirm: The exact point of failure in the `useTracks` hook or `mapStore`'s manual persistence implementation for `sessionTrail`.
- Root cause: The manual `IIFE + write` pattern for `ee_session_trail` described in `STATE_MAP.md` is not functioning correctly, or the `appendSessionTrailPoint` callback is not triggering the write to localStorage as intended. This is a regression.
- User impact: Users lose valuable, irreplaceable data (their entire GPS track) if the app is interrupted, leading to extreme frustration and distrust.
- Business impact: Severe damage to user trust and retention, especially for a core feature of a mapping app.
- Fix direction: Re-verify and debug the `sessionTrail` persistence logic in `mapStore.js` and `useTracks.js` to ensure `ee_session_trail` is written to localStorage on every point update.

### 4. Major: Camera Button Surfaces WaypointSheet Instead of UpgradeSheet for Free Users (Vulnerability F3)
- Summary: Free users attempting to save a waypoint by tapping the camera button are incorrectly shown the `WaypointSheet` instead of the `UpgradeSheet`, allowing them to attempt an action they are not permitted to complete.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: If the "Save Waypoint" button would be disabled for free users (it's already disabled due to GPS issues in P3/V3, so this specific test doesn't clarify).
- Root cause: The logic gating the camera button tap for free users is incorrect. Instead of routing to `showUpgradeSheet`, it's routing to `waypointSheet`. This is a business logic error in `CornerControls` or `Map.jsx` where the camera button's `onClick` handler is defined.
- User impact: Free users are led down a path they cannot complete, creating frustration and a poor first impression of premium features. It's a "dead end" experience.
- Business impact: Missed opportunity for conversion. Instead of a clear "upgrade to save waypoints" message, users hit a functional wall, potentially leading to abandonment rather than upgrade.
- Fix direction: Correct the conditional rendering or click handler logic for the camera button to display `UpgradeSheet` for free users.

### 5. Major: Theme Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads, reverting to the default 'dark' theme.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `theme-initial: dark`, `theme-after-flip: light`, `theme-after-reload: dark` (guest) and `theme-evidence: {"flipped":true,"tFlipped":"light","tReloaded":"dark"}` (free) confirm the flip and subsequent reset. `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being written or read.
- Cannot confirm: If the `userStore.theme` state itself is being correctly updated before the reload, but the localStorage evidence strongly suggests the persistence mechanism is broken.
- Root cause: The `ee_theme` manual localStorage pattern (task-008) is not correctly implemented or is being overwritten. `STATE_MAP.md` states `theme` uses manual `ee_theme` key, but the test annotations show it's `null`. This is a regression or an incomplete fix.
- User impact: Minor annoyance, but erodes trust in the app's ability to remember preferences, leading to a less personalized experience.
- Business impact: Small negative impact on user satisfaction and perceived polish.
- Fix direction: Debug the manual `ee_theme` localStorage read/write logic in `userStore.js` to ensure theme preference is correctly saved and loaded.

### 6. Major: Map Preferences (Basemap, Layers) Reset to Defaults on Reload (Vulnerability V9, V8)
- Summary: The user's selected basemap and layer visibility preferences are not persisted across page reloads, reverting to their default states.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While a timeout, this often indicates the assertion condition was never met. Given the context of other persistence failures (V7, V15), it's highly probable the map preferences reset. `STATE_MAP.md` states `mapStore` uses `persist` middleware for `basemap` and `layerVisibility` (key: `ee-map-prefs`). The timeout suggests the expected state (e.g., a specific basemap or layer visibility) was not found after reload.
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage due to the timeout, but the pattern of preference loss is consistent.
- Root cause: The `mapStore`'s Zustand `persist` middleware for `basemap` and `layerVisibility` (key: `ee-map-prefs`) is either not configured correctly, or there's an issue with its hydration on reload.
- User impact: Users constantly have to re-select their preferred map view and layers, leading to frustration and inefficiency, especially for power users.
- Business impact: Reduces user satisfaction and makes the app feel less "smart" or reliable, potentially impacting long-term engagement.
- Fix direction: Verify the `mapStore`'s Zustand `persist` middleware configuration and ensure `ee-map-prefs` is correctly saving and loading `basemap` and `layerVisibility`.

### 7. Minor: Active Module Resets to Prospecting on Reload (Vulnerability V15)
- Summary: The `activeModule` preference is not persisted across page reloads, reverting to the default 'prospecting' module.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly confirms the module reset. `STATE_MAP.md` states `moduleStore.activeModule` persists via `ee_active_module` (manual pattern, task-013). The annotation indicates this manual pattern is failing.
- Cannot confirm: The exact state of `ee_active_module` in localStorage before/after reload, but the "absent" annotation is strong evidence.
- Root cause: The manual `IIFE + write` pattern for `ee_active_module` described in `STATE_MAP.md` is not functioning correctly, or the `setActiveModule` action is not triggering the write to localStorage as intended.
- User impact: Users have to re-select their desired module (e.g., 'geology', 'hydrology') after every reload, disrupting their workflow.
- Business impact: Minor negative impact on user efficiency and perceived app polish.
- Fix direction: Debug the manual `ee_active_module` localStorage read/write logic in `moduleStore.js` to ensure the active module preference is correctly saved and loaded.

### 8. Minor: Guest Waypoints Are Memory-Only and Vanish on Reload (Vulnerability V11)
- Summary: Waypoints created by guest users (`sessionWaypoints`) are not persisted to local storage and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the loss. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002). The annotation indicates this manual pattern is failing.
- Cannot confirm: The exact state of `ee_guest_waypoints` in localStorage before/after reload, but the "absent" annotation is strong evidence.
- Root cause: The manual `IIFE + write` pattern for `ee_guest_waypoints` described in `STATE_MAP.md` is not functioning correctly, or the `addWaypoint` action is not triggering the write to localStorage as intended.
- User impact: Guest users lose any waypoints they've created, making the "guest" experience unreliable for data collection and potentially discouraging sign-up.
- Business impact: Reduces the value proposition of the guest experience, potentially hindering conversion to free/pro users if initial data collection is lost.
- Fix direction: Debug the manual `ee_guest_waypoints` localStorage read/write logic in `mapStore.js` to ensure guest waypoints are correctly saved and loaded.

## Tier Comparison
- **V13 (Learn Tab State Preservation):** Both `guest V13` and `free V13` passed, with identical `state-loss-evidence` annotations showing no change in header stats after tab switching. This indicates the fix for V13 (preserving Learn tab header stats) is effective and consistent across authenticated and unauthenticated users.
- **V7 (Theme Reset):** Both `guest V7` and `free V7` failed with the same error (`Expected: "light" Received: "dark"`) and similar annotations (`ee_theme` null, theme reverting to dark). This indicates the theme persistence issue is systemic and affects all users regardless of authentication status.
- **V9/V8 (Map Preferences Reset):** `guest V9` and `free V8` both failed with timeouts, suggesting a similar issue with map preference persistence across tiers. This points to a systemic problem in `mapStore`'s persistence.
- **V1 (GPS Track Loss):** `pro V1` passed, confirming the loss of GPS track on reload. While only tested for Pro, the nature of `sessionTrail` in `mapStore` suggests this would affect all tiers equally, as it's not gated by authentication.
- **Offline App Load (V10/V2):** Only tested for Pro, but the `net::ERR_INTERNET_DISCONNECTED` error suggests a fundamental app shell loading issue that would likely affect Free users as well, as both require authentication and potentially similar initial data fetches. Guest users might fare differently if their initial load is simpler.

## Findings Discarded
- `free F2 — LayerPanel renders PRO badges for free user`: While a minor UI issue (PRO badges visible to free users), it's less critical than data loss, app unavailability, or core feature blocking. It's confusing but doesn't prevent functionality.
- `pro V4 — track save fails offline (post-stop data loss)`: This is a specific instance of the broader offline data loss problem. V1 (track lost on reload) and the general offline app failure (V10/V2) cover the severity.
- `pro V6 — route save offline produces no user-facing toast (silent failure)`: This is also a specific instance of offline data loss/silent failure. The `route-button-missing: cannot proof V6` annotation also indicates the test couldn't fully confirm the *silent* part, only that it failed. The GPS issue (P3/V3) and general offline app failure (V10/V2) are higher priority.
- `guest V13`, `free V13`, `free F4`: These tests passed, indicating that the Learn tab header stats are being preserved across tab switches. While the UX Knowledge Context notes that granular chapter page position might still be lost, the tests provided no evidence for this specific sub-vulnerability, and the tested aspect (header stats) passed.

## Cannot Assess
- The exact state of `ee-map-prefs`, `ee_theme`, `ee_active_module`, and `ee_guest_waypoints` in localStorage for the failing persistence tests (V7, V9, V8, V15, V11) due to the nature of the test annotations (e.g., "null" or "absent" rather than the full JSON content). However, the annotations are sufficient to confirm the *loss* of persistence.

## Systemic Patterns
1.  **Broken Manual LocalStorage Persistence:** Several critical preferences and user-generated data points (`sessionTrail` (V1), `theme` (V7), `activeModule` (V15), `sessionWaypoints` (V11)) that are explicitly stated in `STATE_MAP.md` to use a "manual IIFE + write pattern" are failing to persist. This suggests a widespread issue with the implementation or invocation of this manual persistence pattern across multiple stores.
2.  **Offline Unavailability:** The app completely fails to load for authenticated users when offline (V10, V2), indicating a fundamental lack of Service Worker caching for the application shell and critical initial data. This is a severe breach of offline-first principles.
3.  **GPS Acquisition Issues:** The `WaypointSheet` is consistently blocked by "Acquiring GPS..." (P3, V3), preventing core functionality. This points to a problem with the app's geolocation integration or its interaction with Playwright's mock.

## Calibration Notes
- Prioritizing Data Loss and App Unavailability: Past "CONFIRMED" verdicts for data loss (like V1) and critical functionality issues reinforced the high priority given to `pro V10/V2` (app fails offline), `pro P3/V3` (waypoint save blocked), and `pro V1` (GPS track loss). These directly impact user trust and core utility.
- Distinguishing Phantom Errors: I carefully avoided interpreting timeouts (like V9/V8) as definitive proof of *what* failed, but rather as strong indicators of *a* failure, especially when combined with other persistence issues. I did not assume a UI element was "obstructed" or "misaligned" without direct visual evidence or explicit error messages, learning from past "PHANTOM" verdicts.
- Regression Detection: The `pro V1` finding is a regression, which is a high-priority signal. The `STATE_MAP.md` explicitly states `sessionTrail` should persist, and a previous task confirmed this fix. The current test result directly contradicts this, indicating a regression.
- Tier-Attributed Analysis: Explicitly calling out when issues affect "all tiers" or "guest/free/pro" helped narrow down the scope of the root cause (e.g., if it's auth-related or a general app bug). The consistent failure of V7 across guest/free is a good example.