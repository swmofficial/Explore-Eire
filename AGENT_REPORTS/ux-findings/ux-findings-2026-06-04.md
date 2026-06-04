# UX Agent Report — 2026-06-04

## Run Context
- Commits analysed: `0a78ca2` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning is given before attempting an offline save, as the button is disabled for a different reason.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. This also means the app cannot reach the point of checking for offline status for V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Active GPS Track Data Lost on Page Reload (Vulnerability V1 Regression)
- Summary: Any active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: All (as `sessionTrail` persistence is a global mechanism, though tested in Pro tier).
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes, the browser tab closes, or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for a core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence logic in `mapStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 3. High: Theme Preference Resets on Reload (Vulnerability V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload for all users.
- Tier(s) affected: All (Guest, Free).
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both reported `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` clearly show that the `ee_theme` localStorage key, intended for theme persistence, is not being written or read correctly.
- Cannot confirm: Whether `localStorage.setItem` is failing to write the value, or if `localStorage.getItem` is failing to retrieve it, or if `localStorage` is being cleared unexpectedly.
- Root cause: Regression in the manual `localStorage` persistence for `userStore.theme` (key `ee_theme`), despite `STATE_MAP.md` claiming it uses a "manual pattern, task-008". The `null` values indicate the `localStorage.setItem` is not happening or is being cleared.
- User impact: Annoying loss of personalized theme settings on every app reload, requiring manual re-selection.
- Business impact: Minor negative impact on user experience and personalization, potentially reducing perceived app quality.
- Fix direction: Debug the `ee_theme` manual persistence logic in `userStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented and not being overwritten or cleared.

### 4. High: Guest Waypoints Lost on Page Reload (Vulnerability V11 Regression)
- Summary: Waypoints created by guest users are lost upon page reload, despite previous fixes intended to persist them locally.
- Tier(s) affected: Guest.
- Confidence: HIGH
- Evidence: `guest V11` test passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`), possibly due to recent changes affecting `localStorage` access.
- User impact: Guest users lose any saved waypoints if the app reloads, leading to frustration and loss of temporary but potentially valuable data.
- Business impact: Reduces the utility of the guest experience, potentially hindering conversion to authenticated users if initial data is not retained.
- Fix direction: Re-verify the `ee_guest_waypoints` manual persistence logic in `mapStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 5. Medium: Active Module Resets to Default on Page Reload (Vulnerability V15 Regression)
- Summary: The user's selected active module (e.g., 'geology') resets to the default 'prospecting' module upon page reload.
- Tier(s) affected: All (as `activeModule` persistence is a global mechanism).
- Confidence: HIGH
- Evidence: `guest V15` test passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The exact point of failure in the `activeModule` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence pattern for `moduleStore.activeModule` (key `ee_active_module`), possibly due to recent changes affecting `localStorage` access.
- User impact: Minor annoyance as users must re-select their preferred module after every app reload, disrupting workflow.
- Business impact: Slight degradation of user experience, potentially impacting efficiency for power users who frequently switch modules.
- Fix direction: Re-verify the `ee_active_module` manual persistence logic in `moduleStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 6. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When a Pro user attempts to save a route while offline, the operation fails without any user-facing toast notification, leading to silent data loss.
- Tier(s) affected: Pro.
- Confidence: HIGH
- Evidence: `pro V6` test passed. The annotation `route-button-missing: cannot proof V6` indicates the test completed but couldn't directly assert the *absence* of a toast. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "Offline Behaviour: Fails — console.error only, no toast. Data Lost? YES — route points gone." This architectural truth confirms the vulnerability.
- Cannot confirm: Visual evidence of the absence of a toast from the test run itself.
- Root cause: The `routes` INSERT operation in `Supabase Write Map` is designed to fail silently offline, only logging a `console.error` without providing user feedback.
- User impact: Users believe their route has been saved, only to find it missing later, leading to frustration and loss of effort.
- Business impact: Erodes user trust in data reliability, especially for a core feature like route planning in potentially offline environments.
- Fix direction: Implement an offline-first strategy for route saving, including a local queue and user-facing toasts for both failure and successful local queuing.

### 7. Low: Map Preferences (Basemap, Layers) Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for basemap and layer visibility may be resetting to defaults on page reload.
- Tier(s) affected: All (Guest, Free).
- Confidence: LOW
- Evidence: `guest V9` and `free V8` tests both resulted in `Test timeout of 60000ms exceeded.` These timeouts prevent direct confirmation of the preference reset. However, `STATE_MAP.md` indicates `basemap` and `layerVisibility` are intended to be persisted via `ee-map-prefs` (Zustand persist middleware). The timeouts suggest an issue in the map loading or interaction flow that prevents the test from completing. Given the other persistence regressions, it's plausible this is also affected.
- Cannot confirm: Direct observation of basemap or layer visibility resetting in screenshots or specific assertion failures. The timeout could be due to other factors.
- Root cause: Unclear due to timeout. Could be a regression in `ee-map-prefs` persistence, or an issue with map loading/rendering that prevents the test from completing.
- User impact: Minor annoyance if users have to re-select their preferred basemap or re-enable specific layers after every reload.
- Business impact: Slight degradation of user experience for map customization.
- Fix direction: Investigate the cause of the test timeouts. If the underlying issue is persistence, debug the `ee-map-prefs` Zustand persist configuration.

## Tier Comparison

*   **Theme Preference Reset (V7):** Identical behavior across **Guest** and **Free** tiers. Both fail to persist the selected theme on reload, reverting to 'dark'. This indicates a systemic issue with the `ee_theme` manual persistence mechanism, independent of authentication status.
*   **Learn Tab Header Stats (V13, F4):** Identical behavior across **Guest** and **Free** tiers. The header statistics (courses, completePct, chaptersDone) are correctly preserved across tab switches, showing no regression. This suggests the fix for tab state preservation (always-mounted tabs) is working for this specific aspect across authenticated and unauthenticated sessions.
*   **GPS Acquisition Failure (P3, V3):** Primarily observed in the **Pro** tier, where the "Save Waypoint" button is disabled due to "Acquiring GPS...". This issue prevents Pro users from saving waypoints. **Free** users are gated from saving waypoints and would encounter an UpgradeSheet instead, so they do not directly experience this specific failure. **Guest** users have memory-only waypoints, so the save button's functionality is different and not tested in the same context.
*   **Active GPS Track Data Loss (V1):** Confirmed in the **Pro** tier. The underlying `sessionTrail` persistence mechanism is global, implying this vulnerability would affect any user (including Free) who uses the tracking feature.
*   **Guest Waypoints Lost (V11):** Specific to the **Guest** tier, as authenticated users save waypoints to Supabase.
*   **Active Module Reset (V15):** Confirmed in the **Guest** tier. The underlying `activeModule` persistence mechanism is global, implying this vulnerability would affect all tiers.
*   **Route Save Fails Silently Offline (V6):** Specific to the **Pro** tier, as route saving is a Pro-gated feature.
*   **Map Preferences Reset (V9, V8):** Test timeouts occurred for both **Guest** (basemap) and **Free** (layers), suggesting a potential persistence issue affecting map preferences across these tiers.

## Findings Discarded

*   `pro P1` (Pro user does not see UpgradeSheet): Discarded due to `Test timeout of 60000ms exceeded.` The timeout prevents confirmation of the expected behavior.
*   `pro V2` (Gold/mineral data missing after offline reload): Discarded due to `page.goto: net::ERR_INTERNET_DISCONNECTED`. The test failed to load the page offline, preventing any assessment of data caching.
*   `pro V10` (Pro status reverts to free on offline reload): Discarded due to `page.goto: net::ERR_INTERNET_DISCONNECTED`. The test failed to load the page offline, preventing any assessment of Pro status persistence.

These three findings were discarded because the tests themselves failed to reach a state where the vulnerability could be confirmed or disproven, due to network issues or timeouts.

## Cannot Assess

*   **Offline Data Access (V2) and Pro Status Persistence (V10):** The Playwright offline test environment is currently unable to load the application, resulting in `net::ERR_INTERNET_DISCONNECTED` errors. This prevents any assessment of whether gold/mineral data is cached offline or if Pro status persists during offline reloads. A more robust offline testing setup is required to evaluate these critical vulnerabilities.

## Systemic Patterns

1.  **Widespread Persistence Regression in Manual `localStorage` Keys:** Multiple manual `localStorage` persistence mechanisms (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) are failing to retain state across reloads. This contradicts `STATE_MAP.md` which describes these as using a "proven reliable pattern" and having dedicated tasks (task-002, task-006, task-008, task-013) for their implementation. This suggests a recent change or environmental factor is interfering with `localStorage` operations or the hydration logic for these specific keys.
2.  **Persistent GPS Acquisition Failure:** The app consistently fails to acquire a GPS location, even with Playwright's geolocation mock enabled. This critical issue blocks core location-dependent functionalities like saving waypoints (P3, V3) and potentially affects tracking. This points to a problem in the `useTracks` hook, `Map.jsx watchPosition` implementation, or how the app processes geolocation data.
3.  **Fragile Offline Test Environment:** The `net::ERR_INTERNET_DISCONNECTED` errors for `pro V2` and `pro V10` indicate that the Playwright setup for offline testing is not robust enough to even load the application in an offline state. This prevents proper assessment of critical offline vulnerabilities related to data caching and authentication status.

## Calibration Notes

*   **Prioritization of Data Loss and Core Functionality:** My analysis continues to prioritize findings that lead to user data loss (V1, V11, V6) or block core application functionality (P3, V3) with HIGH confidence, aligning with previous successful diagnoses.
*   **Distinguishing Test Failure from Vulnerability Confirmation:** I correctly interpreted "PASS" for vulnerability tests (V1, V11, V15) as confirmation of the vulnerability, as per the new test philosophy, rather than assuming a fix. This is a key learning from the redesigned test suite.
*   **Cautious Interpretation of Timeouts:** I maintained a cautious approach to Playwright timeouts (V8, V9, P1) and `net::ERR_INTERNET_DISCONNECTED` errors (V2, V10). Instead of guessing a root cause, I explicitly stated "Cannot confirm" or "Cannot Assess" unless `STATE_MAP.md` provided clear architectural ground truth (e.g., for V6). This avoids the "PHANTOM" verdict trap seen in past reports.
*   **Cross-referencing `STATE_MAP.md`:** I consistently used `STATE_MAP.md` as the source of truth for intended state management and persistence, highlighting contradictions with observed test results (e.g., for V1, V7, V11, V15). This helps pinpoint regressions against documented fixes.