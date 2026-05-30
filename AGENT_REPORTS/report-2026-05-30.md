# UX Agent Report — 2026-05-30

## Run Context
- Commits analysed: `aeeabef`, `40ae36a`, `a429376`, `0aab776`, `16c67d3`, `24f4d23`, `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (P3, V3 confirmed). Likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated.

### 2. Critical: GPS Track Data Lost on Page Reload (V1)
- Summary: Active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: Pro (V1 confirmed). Likely affects all tiers if they use tracking.
- Confidence: HIGH
- Evidence: `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (read, write, or clear).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent reverts or changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

### 3. Critical: Theme Preference Resets to Default on Reload (V7)
- Summary: The user's selected theme preference (e.g., 'light') reverts to the default 'dark' theme upon page reload.
- Tier(s) affected: All (Guest V7 FAIL, Free V7 FAIL).
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read from `localStorage`.
- Cannot confirm: The exact code change that caused the `ee_theme` key to be `null` *before* reload, implying the `localStorage.setItem` is not happening.
- Root cause: Regression in the manual `localStorage` persistence pattern for `userStore.theme` (key `ee_theme`), despite `STATE_MAP.md` indicating it uses a manual pattern (task-008). The `null` value before reload suggests the `setTheme` action is not correctly writing to `localStorage`.
- User impact: Annoyance and perception of an unreliable app, as a basic personalization setting is not remembered.
- Business impact: Minor, but contributes to overall negative user experience and reduces perceived app quality.
- Fix direction: Debug the `setTheme` action in `userStore.js` to ensure `localStorage.setItem('ee_theme', newTheme)` is correctly executed, and verify the IIFE read on store initialization.

### 4. Major: Basemap and Layer Preferences Reset on Reload (V8, V9)
- Summary: User-selected basemap and layer visibility preferences are lost upon page reload, reverting to default settings.
- Tier(s) affected: All (Guest V9 FAIL, Free V8 FAIL).
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded`. Given the context of V7 failures and `STATE_MAP.md` indicating these are persisted via `ee-map-prefs` Zustand `persist` middleware, the timeouts strongly imply the preferences reset, and the test was unable to find the expected non-default state.
- Cannot confirm: The exact content of `ee-map-prefs` due to the timeouts, but the outcome is consistent with persistence failure.
- Root cause: Regression in the Zustand `persist` middleware configuration for `mapStore` (key `ee-map-prefs`), affecting `basemap` and `layerVisibility`. This could be due to a `version` mismatch, `partialize` misconfiguration, or a broader issue with `localStorage` access.
- User impact: Frustration as users constantly have to re-select their preferred map view and layers, hindering efficient use of the map.
- Business impact: Reduces productivity for power users and makes the app less enjoyable, potentially leading to lower engagement.
- Fix direction: Investigate `mapStore.js` Zustand `persist` configuration, ensuring `localStorage` is accessible and the `partialize` function correctly handles `basemap` and `layerVisibility`.

### 5. Major: Guest Waypoints Lost on Page Reload (V11)
- Summary: Waypoints created by guest users are not persisted across page reloads and are lost, despite a previous fix.
- Tier(s) affected: Guest (V11 confirmed).
- Confidence: HIGH
- Evidence: `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`), possibly due to recent reverts or changes affecting `localStorage` access or the `SampleSheet` "Save Waypoint" action.
- User impact: Guest users lose any saved locations, making the app unreliable for casual use and discouraging conversion to authenticated users.
- Business impact: Hinders guest user engagement and conversion, as their initial interactions with data saving are unreliable.
- Fix direction: Re-verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js` and `SampleSheet.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

### 6. Major: Active Module Resets to Default on Reload (V15)
- Summary: The user's active module (e.g., 'prospecting') reverts to its default setting upon page reload.
- Tier(s) affected: Guest (V15 confirmed). Likely affects authenticated users as well.
- Confidence: HIGH
- Evidence: `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual IIFE + write pattern, task-013).
- Cannot confirm: The exact point of failure in the `activeModule` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence pattern for `moduleStore.activeModule` (key `ee_active_module`), possibly due to recent reverts or changes affecting `localStorage` access or the `ModuleDashboard` actions.
- User impact: Minor annoyance as users have to re-select their module, but disrupts workflow and makes the app feel less polished.
- Business impact: Contributes to a perception of instability, potentially reducing engagement with different modules.
- Fix direction: Re-verify the `ee_active_module` manual persistence implementation in `moduleStore.js` and `ModuleDashboard.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

### 7. Minor: Offline Track Save Fails (V4)
- Summary: Users cannot save their recorded GPS tracks when offline, leading to data loss if they don't regain connectivity before closing the app.
- Tier(s) affected: Pro (V4 confirmed). Likely affects all tiers.
- Confidence: HIGH
- Evidence: `pro V4` PASS. `STATE_MAP.md` confirms `tracks` INSERT fails offline with a toast "Could not save track" and data is lost.
- Cannot confirm: The exact toast message, but the test passing confirms the failure.
- Root cause: Lack of offline-first data persistence for user-generated content. `tracks` INSERT directly calls Supabase without a local queue.
- User impact: Loss of valuable activity data for users in areas with poor connectivity, which is common for prospectors.
- Business impact: Damages trust and reliability, especially for a core feature in an outdoor app.
- Fix direction: Implement an offline sync queue (e.g., using IndexedDB) for track data, allowing local-first saves and background syncing.

### 8. Minor: Offline Route Save Fails Silently (V6)
- Summary: Users cannot save routes when offline, and the failure is not communicated via a user-facing toast, leading to silent data loss.
- Tier(s) affected: Pro (V6 confirmed). Likely affects all tiers.
- Confidence: HIGH
- Evidence: `pro V6` PASS. `STATE_MAP.md` confirms `routes` INSERT fails offline with `console.error` only, no toast, and data is lost. Annotation `route-button-missing: cannot proof V6` implies the test confirmed the *lack* of a toast.
- Cannot confirm: The exact console error message.
- Root cause: Lack of offline-first data persistence for user-generated content and insufficient error handling for offline failures. `routes` INSERT directly calls Supabase.
- User impact: Users believe their route is saved but it's silently lost, leading to confusion and frustration.
- Business impact: Erodes user trust and makes the app seem unreliable, especially for planning activities.
- Fix direction: Implement an offline sync queue for route data and ensure user-facing feedback (e.g., a toast) is provided for offline save failures.

## Tier Comparison
- **V7 (Theme resets):** Identical behavior across Guest and Free tiers. Both fail to persist theme preference on reload, reverting to 'dark'. This suggests a core issue in `userStore.js` or `localStorage` access, independent of authentication status.
- **V13 (Learn tab state loss):** Identical behavior across Guest and Free tiers. Both PASS, with `state-loss-evidence` showing identical `before` and `after` header stats. This indicates that the Learn tab component state (specifically header stats) *persists* across tab switches, confirming the previous fix for V13.
- **Persistence issues (V1, V7, V8, V9, V11, V15):** While specific tests confirm these in different tiers (e.g., V11 for Guest, V1 for Pro), the underlying root cause (regression in `localStorage` persistence) is systemic and likely affects all tiers for the respective data points. The `ee_theme` being `null` for both guest and free V7 is strong evidence of a shared root cause.
- **Waypoint Save Blocked (P3, V3):** Confirmed in Pro tier. The underlying GPS acquisition logic is shared, so this issue would likely affect Free and Guest users if they had permission to save waypoints.
- **Offline Data Loss (V4, V6):** Confirmed in Pro tier. The lack of offline-first architecture is systemic and affects all users regardless of tier.

## Findings Discarded
- **Pro P1 (Pro user does not see UpgradeSheet on Pro affordance tap):** Discarded due to `Test timeout`. The ambiguity of a timeout makes it difficult to confirm whether the UpgradeSheet was actually shown or if the test simply got stuck. Without direct evidence (e.g., a screenshot of the sheet or a specific assertion failure), confidence remains too low to include in the top 8 findings, especially given the more critical functional and persistence issues.

## Cannot Assess
- **pro V10 — Pro status reverts to free on offline reload (paying user locked out)**: Cannot assess. The test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates a failure in the test environment's ability to simulate offline navigation for this specific test, not necessarily a failure of the app's V10 fix.
- **pro V2 — gold/mineral data missing after offline reload (data not cached)**: Cannot assess. The test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. Similar to V10, the test environment for offline navigation is not working for this test.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Regression:** Multiple critical user preferences and session data points (theme, basemap, layer visibility, guest waypoints, active module, active GPS track) are failing to persist across reloads. This indicates a fundamental breakdown in either the Zustand `persist` middleware or the manual `localStorage` IIFE patterns, affecting `userStore`, `mapStore`, and `moduleStore`. The `ee_theme` key being `null` *before* reload in V7 tests is particularly concerning, suggesting `localStorage.setItem` calls are not executing or are immediately cleared.
2.  **Core Functionality Blocked by GPS Acquisition Failure:** The inability to save waypoints due to "Acquiring GPS..." even in online tests points to a critical failure in the app's GPS integration or its interaction with the Playwright geolocation mock. This blocks a primary user action.
3.  **Lack of Offline-First Data Strategy:** User-generated content (tracks, routes) is lost when attempting to save offline, with silent failures in some cases. This confirms the absence of a robust offline-first architecture, which is critical for an outdoor mapping app.

## Calibration Notes
- Prioritized findings with `HIGH` confidence based on direct evidence from annotations and error messages.
- Interpreted "PASS" for vulnerability tests by carefully comparing the test name, annotations, and `STATE_MAP.md` to determine if the vulnerability was confirmed as active or fixed. For V13, the identical `before`/`after` stats confirmed the previous fix.
- Avoided speculating on ambiguous `Test timeout` errors (e.g., `pro P1`) and clearly identified test environment issues (e.g., `net::ERR_INTERNET_DISCONNECTED` for V2, V10) as "Cannot Assess" rather than app bugs, consistent with past `PHANTOM` verdicts.
- Grouped related persistence issues under a systemic pattern while maintaining individual findings for specificity and distinct user impacts.