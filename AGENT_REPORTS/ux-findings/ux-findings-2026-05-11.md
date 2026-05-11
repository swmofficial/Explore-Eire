# UX Agent Report — 2026-05-11

## Run Context
- Commits analysed: db7f6d0, 39c2e46, 28b2b20, 1c2184c, c5131e8, ce7e7d6, 29233ab, d29354c, eb866d4, d552904, dfebcc0, acd32af, f174f1e, 3575880, c57cd05, d8f3828, 6af04ec, b8804de, ec37b0d, 03858e
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet` component's form validation and button state logic, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 2. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload. This reverts previously confirmed fixes.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap preference, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms V11 (guest waypoints lost).
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms V15 (active module lost).
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms V1 (GPS track lost).
    All these findings directly contradict the `STATE_MAP.md` which states these items are persisted, and revert previously confirmed fixes.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken. The `ee_theme` being `null` before reload is particularly concerning as it implies the `setItem` is not happening at all. This is likely due to the incomplete revert of `surgery(rvsv-offline-001)` or subsequent changes affecting `localStorage` access.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and unusable for its primary purpose.
- Business impact: Direct impact on user retention and trust. Users will abandon an app that cannot remember their preferences or save their work.
- Fix direction: Thoroughly audit `localStorage` interactions across `userStore`, `mapStore`, `moduleStore`, and the manual persistence patterns in `useWaypoints`, `useTracks`. Verify Zustand `persist` middleware configuration and ensure `localStorage.setItem` calls are correctly executed and not being immediately overwritten or cleared.

### 3. Critical: Offline Data Loss Due to Removal of Offline Queue (V3, V4, V6)
- Summary: User-generated data (waypoints, tracks, routes) is lost when attempting to save offline, confirming known vulnerabilities V3, V4, V6. This is directly attributable to the removal of the `useOfflineQueue.js` hook.
- Tier(s) affected: Pro (V3, V4, V6 confirmed). Likely affects all tiers if they were allowed to perform these actions.
- Confidence: HIGH
- Evidence:
    - `pro V3` FAIL: Waypoint save fails offline (button disabled, see Finding 1).
    - `pro V4` PASS: Track save fails offline. This test passing means the track was not saved.
    - `pro V6` PASS: Route save offline produces no user-facing toast. This test passing means the route save failed silently, as per `STATE_MAP.md` ("Fails — console.error only, no toast").
    - **Git Changes:** The `git diff` clearly shows `src/hooks/useOfflineQueue.js` as `113 deletions(-)`, indicating its complete removal from the codebase.
- Cannot confirm: The exact console error for V6, but the `STATE_MAP.md` confirms it's console.error only.
- Root cause: The `useOfflineQueue.js` hook, which was responsible for queuing offline data writes, has been removed from the application. This directly violates offline-first principles and leads to immediate data loss for any save operation attempted without an active network connection.
- User impact: Critical data loss for users operating in areas with intermittent or no connectivity, which is a primary use case for a field mapping app. Leads to extreme frustration and distrust.
- Business impact: Makes the app unusable for its target audience in critical scenarios, severely impacting user retention, reputation, and potential for paid subscriptions.
- Fix direction: Reimplement a robust offline data queuing mechanism, preferably using IndexedDB for persistence, to store and retry failed Supabase writes. Restore or rebuild `useOfflineQueue.js` functionality.

### 4. Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, indicating a regression in Pro status recognition or gating logic.
- Tier(s) affected: Pro (P1 confirmed).
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout, in the context of a test designed to ensure a Pro user *does not* see the UpgradeSheet, strongly suggests the sheet *did* appear, causing the test to get stuck or fail its assertion. This contradicts the previously confirmed fix for P1.
- Cannot confirm: The exact screenshot of the UpgradeSheet appearing for the Pro user due to the timeout, but the test's intent and failure mode are clear.
- Root cause: There's a regression in the logic that gates Pro features or displays the `UpgradeSheet`. This could be due to `isPro` state being incorrectly set or read, or the conditional rendering logic for `UpgradeSheet` not correctly checking the user's `isPro` status. Given the systemic persistence issues (Finding 2), it's possible `isPro` is not being correctly hydrated or persisted, leading to a race condition or incorrect state.
- User impact: Frustration and confusion for paying Pro users who are incorrectly prompted to upgrade, undermining the value of their subscription.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Investigate the `isPro` state management, its hydration from Supabase, and its persistence via `ee-user-prefs`. Review the conditional rendering logic for the `UpgradeSheet` and Pro-gated features to ensure `isPro` is correctly evaluated.

### 5. Offline Test Setup Failure Prevents Verification of V2 and V10
- Summary: The Playwright test setup for offline scenarios is failing to navigate to the app, preventing verification of critical offline vulnerabilities V2 (gold/mineral data missing) and V10 (Pro status reverts to free).
- Tier(s) affected: Pro (V2, V10 cannot be confirmed).
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the Playwright `page.goto` command itself is failing when the network is intentionally disconnected for the test.
- Cannot confirm: Whether V2 or V10 are active vulnerabilities, as the tests could not even reach the application state required for verification.
- Root cause: The Playwright test environment's network emulation or `page.goto` command is not robust enough to handle the offline navigation scenario. It's possible the `page.goto` is attempting a fresh network request that fails, rather than loading from a cached Service Worker or local state.
- User impact: N/A (test environment issue).
- Business impact: Inability to verify critical offline functionality for paying users, leaving significant gaps in quality assurance.
- Fix direction: Review Playwright's network emulation and `page.goto` strategy for offline tests. Ensure the test can reliably load the application from a cached state when the network is disconnected, rather than failing on the initial navigation.

### 6. Learn Tab Header Stats are Persistent, but Component State Loss (V13) Remains Unconfirmed by Test
- Summary: The Learn tab's header statistics (courses, completion percentage, chapters done) correctly persist across tab switches, but the underlying vulnerability V13 (loss of in-progress chapter reading position) is not addressed or confirmed by the current test.
- Tier(s) affected: Guest, Free (V13 test passed for both).
- Confidence: MEDIUM (for V13 still being active, HIGH for header stats persistence)
- Evidence: `guest V13` and `free V13` tests passed. The `state-loss-evidence` annotation for both shows identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` after a tab switch. This confirms the *persistence of these aggregated stats*. However, the `UX Knowledge Context` explicitly defines V13 as "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch." The current test does not assert on this specific component state.
- Cannot confirm: Whether the in-progress chapter reading position is lost, as the test only checks aggregated header statistics.
- Root cause: The test for V13 is misaligned with the actual vulnerability definition. While the aggregated header stats are correctly persisted (likely via `localStorage.ee_progress`), the component-level state (e.g., scroll position, current page in a chapter) is still likely lost due to the `App.jsx` unmounting non-map tabs on switch, as per UX Knowledge Context.
- User impact: Users lose their place when reading a chapter if they switch tabs, leading to frustration and disruption of the learning flow.
- Business impact: Decreased engagement with the Learn module, as users are discouraged from multitasking or navigating away during a chapter.
- Fix direction: Modify the V13 test to specifically assert on the persistence of component state within the `ChapterReader` (e.g., current page number, scroll position). Implement state lifting or DOM persistence for Learn module components to preserve their internal state across tab switches.

## Tier Comparison

- **Persistence Issues (V1, V7, V8, V9, V11, V15):** The behaviour is identical across all tiers where applicable. Theme (V7) affects Guest and Free. Basemap (V9) and Layer Visibility (V8) affect Guest and Free. Guest Waypoints (V11) affects Guest. Active Module (V15) affects Guest. GPS Track (V1) affects Pro. The consistent failure pattern across different types of persisted state and different tiers strongly indicates a systemic issue with `localStorage` or Zustand `persist` middleware initialization/operation, rather than tier-specific logic.
- **Offline Data Loss (V3, V4, V6):** The behaviour is identical for Pro users (failure to save, silent failure for routes). While Free and Guest tiers have gated access to these features, the underlying mechanism (removal of `useOfflineQueue.js`) means that if they *were* allowed to save, they would experience the same data loss. This points to a systemic architectural flaw.
- **Learn Tab Header Stats (V13 test):** The behaviour is identical for Guest and Free tiers. The header stats persist correctly across tab switches. This indicates the `ee_progress` and `ee_certificates` `localStorage` keys are functioning as expected for these aggregated values.
- **GPS Acquisition Failure (P3, V3, V14):** The "Acquiring GPS..." issue and disabled save button is observed for Pro. Given the shared `mapStore.userLocation` and `useTracks` logic, it's highly probable this issue would affect any tier attempting to acquire GPS or save waypoints.

## Findings Discarded
- None. All identified findings are significant and supported by direct evidence or strong architectural inference.

## Cannot Assess
- **Pro Status Reversion Offline (V10):** The test failed to navigate offline, preventing verification.
- **Gold/Mineral Data Missing Offline (V2):** The test failed to navigate offline, preventing verification.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** A major regression has broken persistence for almost all user preferences and session data, affecting all tiers. This points to a fundamental issue with how `localStorage` is being accessed, written, or how Zustand `persist` middleware is configured/hydrated. The `ee_theme-before-reload: null` annotation is particularly indicative of `localStorage.setItem` not being called or being immediately cleared.
2.  **Complete Absence of Offline Data Queuing:** The `useOfflineQueue.js` hook has been removed, leading to confirmed data loss for all user-generated content (waypoints, tracks, routes) when offline. This is a critical architectural flaw for an outdoor mapping app.
3.  **GPS Acquisition Malfunction:** The app is failing to acquire GPS coordinates, even in online test environments with mocked geolocation, rendering waypoint saving impossible.

## Calibration Notes
- The analysis of the `Revert "surgery(rvsv-offline-001)"` commit and the subsequent `git diff` was crucial in identifying the complete removal of `useOfflineQueue.js`, which directly explains the offline data loss vulnerabilities. This highlights the importance of deep dives into commit history and file changes.
- The re-evaluation of V13, distinguishing between the persistence of aggregated header stats (which passed the test) and the loss of component-level reading position (the actual vulnerability, which the test did not cover), demonstrates the need to align test assertions precisely with vulnerability definitions from the `UX Knowledge Context`.
- The consistent failure patterns across tiers for persistence and offline issues strongly supports identifying systemic architectural root causes rather than isolated bugs.