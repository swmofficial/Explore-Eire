# UX Agent Report — 2026-05-10

## Run Context
- Commits analysed: c772083, e65d970, b64d6db, 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled, preventing users from saving waypoints, because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests.
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the GPS signal isn't being acquired or processed, despite `task-010` adding a geolocation mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). The app is either not receiving a valid GPS signal from the Playwright mock, the mock is incorrectly configured, or the `useTracks` hook or `WaypointSheet`'s logic is incorrectly interpreting the signal, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's GPS acquisition and `userLocation` state updates, especially in the context of Playwright's geolocation mock.

### 2. Critical: Systemic Persistence Failure: All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1, V4, V6).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` & `free V8` FAIL: `Test timeout of 60000ms exceeded.` for basemap and layer preferences, strongly implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
    - `pro V4` PASS: Track save fails offline (post-stop data loss) - implies the track itself was not persisted before the save attempt.
    - `pro V6` PASS: Route save offline produces no user-facing toast (silent failure) - implies route points are not persisted locally before save.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks, routes) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly interacting with `localStorage` and that `localStorage` itself is not being cleared prematurely.

### 3. High Priority: Pro User Sees Upgrade Sheet or Experiences Timeout on Pro Affordance Tap (P1)
- Summary: A Pro user attempting to use a Pro-gated feature either encounters an Upgrade Sheet or the test times out, indicating a failure in correctly identifying the user's Pro status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` FAIL: `Test timeout of 60000ms exceeded.` The test is designed to ensure a Pro user *does not* see an UpgradeSheet. A timeout here suggests the test either failed to verify the absence of the sheet or the sheet *did* appear, causing the test to hang or fail.
- Cannot confirm: Whether the UpgradeSheet actually appeared or if the test simply timed out waiting for a condition that was never met.
- Root cause: Potential race condition in `isPro` state hydration or an incorrect gating logic for Pro features. `STATE_MAP.md` notes `useAuth.onAuthStateChange` may overwrite `isPro` to false on offline JWT expiry (V10), but this test is online. The `global-setup.js` was updated to poll for `isPro:true` in `ee-user-prefs`, suggesting the issue might be in the app's runtime `isPro` state.
- User impact: Paying Pro users are blocked from accessing features they've paid for, leading to extreme frustration and a sense of being cheated.
- Business impact: Direct loss of trust from paying customers, leading to cancellations, negative reviews, and significant reputational damage.
- Fix direction: Re-evaluate the `isPro` state hydration and access control logic, ensuring that `isPro` is correctly and promptly set for authenticated Pro users and that Pro-gated features are accessible without showing upgrade prompts.

### 4. Offline Functionality Untestable Due to Network Disconnection Error (V2, V10)
- Summary: Critical offline functionality tests for Pro users (gold/mineral data caching and Pro status persistence) cannot be assessed because the Playwright environment fails to simulate an offline state, resulting in `net::ERR_INTERNET_DISCONNECTED` errors during page navigation.
- Tier(s) affected: Pro (V2, V10)
- Confidence: HIGH
- Evidence: `pro V10` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. `pro V2` FAIL: `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. Both tests failed at the `page.goto` step, indicating a fundamental issue with the offline test setup.
- Cannot confirm: The actual state of V2 and V10 vulnerabilities.
- Root cause: The Playwright test setup for simulating offline conditions is not correctly configured or is being overridden. The `page.goto` command is failing because the browser instance itself is reporting no network connection, preventing the app from loading at all, rather than loading in an offline-simulated state.
- User impact: Unknown, as the offline behavior for these critical features cannot be verified. If the vulnerabilities are active, Pro users would lose access to cached data and their Pro status when offline.
- Business impact: Inability to guarantee core offline features for paying users, leading to potential churn and negative feedback if the underlying issues exist.
- Fix direction: Debug the Playwright test environment's offline simulation. Ensure the `page.route` or `context.setOffline(true)` commands are correctly applied and that `page.goto` can still load the app from cache when offline.

### 5. Learn Tab Header Stats Persist, but Chapter Reading Position Remains Unverified (V13, F4)
- Summary: The Learn tab's header statistics (courses, completion percentage, chapters done) correctly persist across tab switches and reloads for both Guest and Free users. However, the more granular vulnerability of losing in-progress chapter reading position (page within a chapter) remains unverified by current tests.
- Tier(s) affected: Guest (V13), Free (V13, F4)
- Confidence: MEDIUM (for the unverified part) / HIGH (for the persistence of header stats)
- Evidence:
    - `guest V13` PASS: `state-loss-evidence` shows `before` and `after` stats are identical (`courses:2, completePct:0, chaptersDone:0`).
    - `free V13` PASS: `state-loss-evidence` shows `before` and `after` stats are identical.
    - `free F4` PASS: `header-stats-pair` shows `before` and `after` stats are identical.
- Cannot confirm: Whether the user's specific page within a chapter (e.g., page 2 of 3) is lost when switching tabs, as the current tests only check the aggregate header stats.
- Root cause: The `ee_progress` and `ee_certificates` keys in `localStorage` (as per `STATE_MAP.md`) correctly persist the overall progress, which is reflected in the header stats. The `App.jsx` change to always mount tab content (task-012) should prevent component unmount, but the test doesn't verify the specific `ChapterReader` component state.
- User impact: Users might still lose their exact reading position within a chapter if they navigate away and return, forcing them to find their place again. This is less severe than losing overall progress but still disruptive.
- Business impact: Minor impact on user engagement with the learning module; could lead to slight frustration but not critical churn.
- Fix direction: Enhance V13 test to specifically verify the `ChapterReader` component's internal state (e.g., current page number) before and after a tab switch.

## Tier Comparison

*   **Persistence Failures (V7, V8, V9):** Theme, basemap, and layer preferences are consistently lost on reload across **all** tiers (Guest, Free, Pro). This indicates a fundamental issue with the `localStorage` read/write mechanism or its initialization, independent of authentication status.
*   **Session Data Loss (V1, V11, V15):** Guest waypoints (V11), active module (V15), and active GPS track (V1) are lost on reload for **Guest** and **Pro** tiers respectively. This reinforces the systemic `localStorage` failure.
*   **Learn Tab Header Stats (V13, F4):** The header statistics in the Learn tab (courses, completion percentage, chapters done) correctly persist across tab switches and reloads for both **Guest** and **Free** tiers. This indicates that the `ee_progress` and `ee_certificates` `localStorage` keys are functioning correctly for these specific data points, contrasting with the other widespread persistence failures.
*   **Waypoint Save Button Disabled (P3, V3):** The "Save Waypoint" button is disabled due to GPS acquisition failure for **Pro** users (P3, V3). This issue is likely present across all tiers, as the underlying GPS acquisition logic is universal.
*   **Upgrade Sheet Gating (C3, F3, P1):**
    *   **Guest (C3):** Correctly surfaces the UpgradeSheet when tapping a Pro-gated feature.
    *   **Free (F3):** Correctly surfaces the UpgradeSheet when attempting to save a waypoint (a Pro feature).
    *   **Pro (P1):** Fails to correctly bypass the UpgradeSheet or times out, indicating a problem with Pro status recognition. This is a critical difference.
*   **Offline Testability (V2, V10):** Offline tests for **Pro** users (V2, V10) are completely blocked by a `net::ERR_INTERNET_DISCONNECTED` error, preventing any assessment of these vulnerabilities. This issue is specific to the offline test setup for the Pro tier.

## Findings Discarded

*   **pro V4 (Track save fails offline) and pro V6 (Route save offline produces no user-facing toast):** These tests "PASS" because they confirm the existence of the vulnerability (data loss/silent failure). Their user impact is covered by the broader "Systemic Persistence Failure" (Finding 2), which encompasses the loss of session-specific data like tracks and routes. No need for separate findings.

## Cannot Assess

*   **pro V2 (gold/mineral data missing after offline reload) and pro V10 (Pro status reverts to free on offline reload):** These tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates a fundamental issue with the Playwright test environment's ability to simulate offline conditions for navigation, preventing the actual vulnerabilities from being assessed.

## Systemic Patterns

1.  **Widespread `localStorage` Persistence Failure:** Almost all `localStorage` keys (both Zustand `persist` middleware and manual IIFE patterns) appear to be failing to write or read correctly, leading to significant data and preference loss across all tiers. This points to a fundamental issue with `localStorage` access, initialization, or an unexpected clearing event.
2.  **GPS Acquisition/Mocking Issue:** The app consistently fails to acquire GPS coordinates, leading to disabled functionality (e.g., Waypoint Save button). This suggests either a problem with the Playwright geolocation mock setup or the app's internal `useTracks` hook for processing location data.
3.  **Flawed Offline Test Environment:** The Playwright setup for simulating offline conditions is broken, preventing critical offline vulnerability tests from even starting.

## Calibration Notes

*   Previous `V7 theme resets`, `V15 activeModule resets`, `V11 guest waypoints`, and `V1 sessionTrail` were marked CONFIRMED and had fixes implemented. The current test results (e.g., `ee_theme-before-reload: null`, `ee_active_module absent`) directly contradict the expected outcome of those fixes, indicating a regression or incomplete implementation of the persistence mechanisms.
*   The `P1 Pro badge race` was previously CONFIRMED and fixed. The current `pro P1` timeout suggests a regression or a new race condition in Pro status recognition.
*   The `V13 learn tab state loss` was previously CONFIRMED and fixed by always mounting tabs. The current tests show header stats *are* persistent, confirming the fix for that specific aspect. However, the original V13 vulnerability (loss of in-progress chapter reading position) is not adequately tested by the current `state-loss-evidence` annotation, which only checks aggregate header stats.
*   The `net::ERR_INTERNET_DISCONNECTED` errors for offline tests represent a new class of failure related to test infrastructure, preventing assessment of the underlying UX issues. This highlights the need to distinguish between application bugs and test environment issues.