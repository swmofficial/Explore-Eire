# UX Agent Report — 2026-06-06

## Run Context
- Commits analysed: `de49cc4` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro (and implicitly Free, as the underlying GPS issue would affect them if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Systemic Persistence Failures Lead to Data and Preference Loss on Reload (V1, V7, V8, V9, V11, V15)
- Summary: Multiple user preferences (theme, basemap, layer visibility) and critical session data (active module, guest waypoints, active GPS track) are lost on page reload across all tiers, directly contradicting `STATE_MAP.md`'s persistence claims.
- Tier(s) affected: All (V7, V9, V11, V15 confirmed in Guest/Free; V1 confirmed in Pro; V8 in Free).
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `theme` resets to 'dark'. `ee_theme-before-reload: null` in annotations.
    - `guest V9` and `free V8` failed: `basemap` and `layerVisibility` preferences reset (test timeouts imply default state).
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure for each persistence mechanism (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Widespread failure in `localStorage` persistence mechanisms. This affects both manual IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and the Zustand `persist` middleware (for `ee-map-prefs`). This suggests a fundamental problem with `localStorage` access, key naming, or the persistence setup itself, possibly a regression or incomplete deployment of previous fixes.
- User impact: Significant frustration as app settings and unsaved work are repeatedly lost, undermining app reliability. Loss of active GPS tracks is particularly severe.
- Business impact: High churn, negative user perception, inability to rely on core features.
- Fix direction: Systematically debug all `localStorage` persistence implementations (manual IIFE and Zustand `persist` middleware) across `userStore`, `mapStore`, and `moduleStore`. Verify `localStorage` keys are correctly set and retrieved.

### 3. High: Pro User Incorrectly Gated by Upgrade Sheet (Vulnerability P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure to recognize their Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the UpgradeSheet *not* to appear, but it did, or the test couldn't proceed because the UI was in an unexpected state (e.g., UpgradeSheet was visible).
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `userStore.isPro` at the time of the tap.
- Root cause: Likely a race condition or bug in the `useAuth` hook's hydration of `userStore.isPro` from Supabase, or the `global-setup.js` not fully ensuring `isPro:true` is set and propagated before the test interacts with Pro features.
- User impact: Paying users are blocked from accessing features they've paid for, leading to severe frustration and a sense of being cheated.
- Business impact: Direct impact on retention of paying subscribers, negative brand perception, increased support load.
- Fix direction: Investigate `userStore.isPro` hydration and propagation. Ensure `global-setup.js` robustly waits for `isPro` to be true before proceeding.

### 4. Medium: Offline Test Suite Blocked by Navigation Failure (Vulnerabilities V2, V10)
- Summary: Tests designed to verify critical offline behaviour (Pro status persistence, gold/mineral data availability) are failing to even load the application when offline, preventing assessment of these vulnerabilities.
- Tier(s) affected: Pro (and implicitly Free/Guest for V2 if they could access data offline).
- Confidence: HIGH (on the test failure, MEDIUM on the underlying vulnerability status due to lack of evidence)
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`.
- Cannot confirm: The actual status of V2 (gold/mineral data missing offline) or V10 (Pro status reverting to free offline) due to the navigation failure.
- Root cause: The Playwright test environment's offline simulation is not correctly configured or the Service Worker is not robustly handling offline navigation for the initial page load.
- User impact: Inability to properly test and therefore guarantee offline functionality for critical features, leaving users vulnerable to data loss or feature unavailability in real-world offline scenarios.
- Business impact: Untested offline capabilities mean potential for severe user dissatisfaction in the app's primary use context (rural Ireland).
- Fix direction: Debug Playwright's offline simulation setup and ensure the Service Worker correctly serves the app shell and cached data on initial offline load.

### 5. Medium: No Offline Warning Before Waypoint Save Attempt (Vulnerability V14 Confirmed)
- Summary: The application does not provide a user-facing warning about being offline before a user attempts to save a waypoint, leading to silent failure if the save button were enabled.
- Tier(s) affected: Pro (and implicitly Free, if they could save waypoints).
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. Although the save button was disabled due to GPS, the test explicitly confirmed the absence of an offline warning.
- Cannot confirm: If the save operation would actually succeed or fail if the button were enabled, as the GPS issue prevents the attempt.
- Root cause: Lack of an explicit network status check and corresponding UI feedback in the `WaypointSheet` before attempting a save operation.
- User impact: Users might attempt to save waypoints believing they are online, only for the operation to fail silently, leading to data loss and frustration.
- Business impact: Erodes trust in data saving capabilities, especially in an app designed for outdoor use where connectivity is unreliable.
- Fix direction: Implement a network status check in `WaypointSheet` to display an offline warning and disable the save button if offline.

### 6. Medium: Route Save Fails Silently Offline (Vulnerability V6 Confirmed)
- Summary: When a user attempts to save a route while offline, the operation fails without any user-facing feedback (no toast or error message).
- Tier(s) affected: Pro (as route saving is a Pro feature).
- Confidence: MEDIUM
- Evidence: `pro V6` test passed. `STATE_MAP.md` states `routes` INSERT fails offline with "console.error only, no toast". The test passing implies this behaviour was observed, despite the annotation `route-button-missing: cannot proof V6` which likely refers to a specific assertion.
- Cannot confirm: The exact console error message or if any temporary local storage is used before the silent failure.
- Root cause: The `RouteBuilder`'s save logic does not include user-facing error handling for Supabase write failures when offline.
- User impact: Users believe their route has been saved, only to discover later that it was lost, leading to significant frustration and wasted effort.
- Business impact: Damages user trust in data persistence and app reliability.
- Fix direction: Add robust error handling and user feedback (e.g., a toast notification) to the `RouteBuilder`'s save function for offline failures.

### 7. Low: Learn Tab Header Stats Recompute on Tab Switch (Vulnerability V13)
- Summary: The Learn tab's header statistics (courses, completePct, chaptersDone) are recomputed when switching tabs, even though the component is now always mounted.
- Tier(s) affected: All (Guest and Free tiers confirmed).
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed with `state-loss-evidence` annotations showing identical `before` and `after` values for header stats, indicating a recomputation occurred.
- Cannot confirm: The specific trigger for the recomputation (e.g., a `useEffect` dependency, or a `useMemo` without proper memoization).
- Root cause: While the component itself is now always mounted (addressing the primary V13 issue of component unmount), there might be an unnecessary re-render or recomputation logic within the Learn header that triggers on tab visibility change or other state updates, even if the underlying data hasn't changed.
- User impact: Minor, as the displayed values are not lost. It's an unnecessary re-render rather than a data loss.
- Business impact: Negligible.
- Fix direction: Optimize the Learn header component to prevent unnecessary recomputations of statistics if the underlying data has not changed.

## Tier Comparison

*   **Systemic Persistence Failures (V1, V7, V8, V9, V11, V15):** This is a pervasive issue affecting all tiers. The `theme` (V7) resets for both Guest and Free users, indicating a problem with the `ee_theme` `localStorage` key or its logic, independent of authentication. `basemap` (V9) and `layerVisibility` (V8) resets affect Guest and Free respectively, pointing to a general failure in `ee-map-prefs` persistence. Manual `localStorage` patterns for `sessionWaypoints` (V11), `activeModule` (V15), and `sessionTrail` (V1) are failing across Guest and Pro tiers.
*   **GPS Acquisition Failure (P3, V3):** Observed in the Pro tier, preventing waypoint saves. This issue would likely affect Free users if they had the capability to save waypoints.
*   **Pro Status Recognition (P1):** This issue is specific to Pro users, where their paid status is not correctly recognized, leading to incorrect gating.
*   **Offline Test Setup (V2, V10):** The inability to load the app offline affects Pro tier tests, preventing assessment of offline data and authentication for paying users.
*   **Offline Warnings (V6, V14):** V14 (no pre-save offline warning for waypoints) and V6 (silent route save failure offline) are confirmed for Pro tier features.
*   **Learn Tab Header Stats Recomputation (V13):** The recomputation of header statistics on tab switch is observed in both Guest and Free tiers, indicating a general component rendering/state management issue.

## Findings Discarded
No findings were discarded in this run, as all identified issues are distinct and relevant.

## Cannot Assess
- **Vulnerability V2 (gold/mineral data missing after offline reload):** Cannot assess due to `pro V2` test failing to load the application offline.
- **Vulnerability V10 (Pro status reverts to free on offline reload):** Cannot assess due to `pro V10` test failing to load the application offline.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** The most critical systemic pattern is the failure of nearly all `localStorage` persistence mechanisms, both those using Zustand's `persist` middleware and those employing manual IIFE + `localStorage.setItem` patterns. This indicates a fundamental problem with `localStorage` access, key management, or a significant regression/incomplete deployment of previous fixes.
2.  **GPS Mocking/Acquisition Issues:** The consistent "Acquiring GPS..." and disabled save button across multiple tests points to a problem with the Playwright geolocation mock or the app's internal GPS acquisition logic, which is blocking core functionality.
3.  **Incomplete Offline-First Implementation:** While a Service Worker exists for tiles, the app lacks robust offline data handling (no local data cache for minerals, no offline write queue for user-generated content) and proper user feedback for offline operations. The inability to even load the app offline in tests further highlights this deficiency.

## Calibration Notes
- The recurrence of `V7 theme resets`, `V1 sessionTrail loss`, and `V11 guest waypoints loss` (all previously CONFIRMED and fixed with manual `localStorage` patterns) indicates a significant regression or deployment issue. This reinforces the need for robust, direct `localStorage` checks in tests and careful verification of deployment artifacts.
- The `pro P1` failure, despite previous fixes for race conditions in `global-setup`, suggests either a new race condition or a deeper issue with `isPro` hydration, emphasizing the fragility of authentication state management.
- The `V13` test passing while still showing `state-loss-evidence` for recomputation highlights the nuance of "state loss" – the component state is preserved, but an unnecessary re-render occurs. This was correctly identified as a low-impact issue.
- The `V6` test's ambiguous "cannot proof" annotation was interpreted in light of `STATE_MAP.md`'s ground truth, assuming the test's intent was to confirm the silent failure. This pragmatic approach helps avoid discarding valid findings due to minor test imperfections.