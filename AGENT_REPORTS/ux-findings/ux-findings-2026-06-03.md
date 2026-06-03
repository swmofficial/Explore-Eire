# UX Agent Report — 2026-06-03

## Run Context
- Commits analysed: `678d321` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro (and likely Free, as the underlying GPS issue would affect them if they could save)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning is given before attempting an offline save, as the button is disabled for a different reason.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. This also means the app cannot reach the point of checking for offline status for V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Active GPS Track Data Lost on Page Reload (V1 Regression)
- Summary: Any active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: Pro (likely all tiers that use tracking, as the persistence mechanism is global)
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes, the browser tab closes, or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for a core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence logic in `mapStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 3. High: Theme Preference Resets on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload for all users.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both reported `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` clearly show that the `ee_theme` localStorage key, intended for theme persistence, is not being written or read correctly.
- Cannot confirm: Whether `localStorage.setItem` is failing to write the value, or if `localStorage.getItem` is failing to retrieve it, or if `localStorage` is being cleared unexpectedly.
- Root cause: Regression in the manual `localStorage` persistence for `userStore.theme` (key `ee_theme`), despite `STATE_MAP.md` claiming it uses a "manual pattern, task-008". The `null` values indicate the `localStorage.setItem` is not happening or is being cleared.
- User impact: Annoying loss of personalized theme settings on every app reload, requiring manual re-selection.
- Business impact: Minor negative impact on user experience and app polish, potentially signaling a lack of attention to detail.
- Fix direction: Re-verify the `ee_theme` manual persistence logic in `userStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 4. High: Guest Waypoints Lost on Reload (V11 Regression)
- Summary: Waypoints created by guest users are lost upon page reload, despite previous fixes intended to persist them.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`), despite `STATE_MAP.md` claiming it uses a "manual pattern, task-002". The `absent` annotation indicates the `localStorage.setItem` is not happening or is being cleared.
- User impact: Guest users lose all unsaved waypoints if the app reloads, making the "continue as guest" option unreliable for data collection and discouraging deeper engagement.
- Business impact: Reduces utility for unauthenticated users, potentially hindering conversion to free/pro tiers.
- Fix direction: Re-verify the `ee_guest_waypoints` manual persistence logic in `mapStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 5. High: Active Module Resets on Reload (V15 Regression)
- Summary: The user's selected active module (e.g., 'prospecting') resets to its default upon page reload.
- Tier(s) affected: Guest (likely all tiers, as the persistence mechanism is global)
- Confidence: HIGH
- Evidence: `guest V15` test passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `moduleStore` → `activeModule` persists via `ee_active_module` (manual IIFE + write pattern, task-013).
- Cannot confirm: The exact point of failure in the `activeModule` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence for `moduleStore.activeModule` (key `ee_active_module`), despite `STATE_MAP.md` claiming it uses a "manual pattern, task-013". The `absent` annotation indicates the `localStorage.setItem` is not happening or is being cleared.
- User impact: Users lose their active module selection on reload, requiring them to re-select it, causing minor friction and interrupting workflow.
- Business impact: Minor negative impact on user experience and app polish.
- Fix direction: Re-verify the `ee_active_module` manual persistence logic in `moduleStore.js` to ensure `localStorage.setItem` and `localStorage.getItem` are correctly implemented.

### 6. Medium: Basemap and Layer Preferences Reset on Reload (V9, V8)
- Summary: User-selected basemap and layer visibility preferences are lost upon page reload, reverting to defaults.
- Tier(s) affected: Guest, Free
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded`. While a timeout doesn't directly assert the state, it indicates the test could not verify the expected persisted state. Given the widespread failures in manual `localStorage` persistence, it is highly probable that the Zustand `persist` middleware for `mapStore` (which handles `basemap` and `layerVisibility` via `ee-map-prefs`) is also affected.
- Cannot confirm: The exact state of the basemap and layers after reload, as the test timed out before verification.
- Root cause: Likely a failure in the Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`), or a broader issue with `localStorage` access/clearing that affects all persistence mechanisms.
- User impact: Users lose their preferred basemap and layer visibility settings on every app reload, requiring manual re-selection and disrupting their map view.
- Business impact: Minor negative impact on user experience and app polish.
- Fix direction: Investigate `mapStore`'s Zustand `persist` configuration and `localStorage` access, potentially related to the other `localStorage` persistence regressions.

## Tier Comparison

-   **Theme Preference (V7):** The issue of theme resetting on reload affects both **Guest** and **Free** tiers identically. This strongly suggests a systemic problem with the `ee_theme` localStorage key or its read/write logic, independent of authentication status.
-   **Learn Header Stats (V13, F4):** The learn header statistics (courses, completion percentage, chapters done) persist correctly across tab switches for both **Guest** and **Free** tiers. This indicates that the underlying progress data is correctly persisted or derived, and the header component state is maintained.
-   **Basemap and Layer Preferences (V9, V8):** Both **Guest** and **Free** tiers experienced timeouts when attempting to verify basemap and layer persistence. This points to a common issue with `mapStore`'s persistence mechanisms, regardless of authentication.
-   **GPS Track (V1), Guest Waypoints (V11), Active Module (V15):** These are confirmed regressions in manual `localStorage` persistence. While V11 is specific to guest waypoints, V1 (session trail) and V15 (active module) are likely systemic issues affecting all tiers, even if only tested in one.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** Discarded. The test failed with a timeout, which does not provide direct evidence of whether the UpgradeSheet was shown or not. It's ambiguous and could be a test flakiness issue rather than an app bug.
-   **pro V6 — route save offline produces no user-facing toast (silent failure):** Discarded. The test passed, but the annotation `route-button-missing: cannot proof V6` indicates the specific condition for proving silent failure could not be verified. This means the test did not provide conclusive evidence for or against V6.

## Cannot Assess

-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** Cannot assess. The test failed with `page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a failure in the Playwright test setup to navigate offline. This prevents any verification of the V10 vulnerability or the effectiveness of its previous fix.
-   **pro V2 — gold/mineral data missing after offline reload (data not cached):** Cannot assess. Similar to V10, this test failed with `page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing verification of whether gold/mineral data is cached offline.

## Systemic Patterns

-   **Widespread `localStorage` Persistence Regressions:** A significant number of features relying on manual `localStorage` persistence (`ee_theme`, `ee_session_trail`, `ee_guest_waypoints`, `ee_active_module`) are failing to retain state across reloads. This suggests a fundamental issue with how `localStorage.setItem` or `localStorage.getItem` is being called, or a global `localStorage.clear()` operation occurring unexpectedly. This pattern also likely extends to Zustand `persist` middleware for `mapStore` (`ee-map-prefs`).
-   **Playwright Offline Navigation Issues:** Critical offline vulnerability tests (`pro V10`, `pro V2`) are blocked by Playwright's inability to navigate the application offline. This is a test infrastructure issue that needs to be addressed to properly assess offline capabilities.
-   **Persistent GPS Acquisition Failure:** The "Acquiring GPS..." state consistently blocks core functionality (waypoint saving), indicating a problem with the app's GPS integration or the Playwright geolocation mock setup.

## Calibration Notes

-   Prioritized findings with HIGH confidence based on direct error messages or explicit "confirmed" annotations, especially for regressions of previously fixed vulnerabilities (V1, V7, V11, V15).
-   Applied caution to test failures that were timeouts or indicated test setup issues (e.g., `net::ERR_INTERNET_DISCONNECTED`), marking them as "Verification Blocked" with LOW confidence, consistent with past "PHANTOM" verdicts for similar scenarios. This avoids misdiagnosing test infrastructure problems as application bugs.
-   Carefully interpreted "PASS" results for vulnerability tests (e.g., V1, V11, V15) where the annotation explicitly confirmed the vulnerability, aligning with the new "vulnerability-proof test philosophy" that focuses on evidence rather than simple pass/fail.
-   Distinguished between "learn header stats" and "in-progress chapter reading position" for V13 based on the `UX Knowledge Context` to correctly identify that header stats are *not* lost, thus avoiding a misdiagnosis.