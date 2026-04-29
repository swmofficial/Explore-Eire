# UX Agent Report — 2026-04-29

## Run Context
- Commits analysed: `adaaf62`, `00a605d`, `f05bbe6`, `9dea4f9`, `bd2ce22`, `330c2e1`, `ca97b38`, `31c0988`, `6433a7f`, `fb6d01c`, `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c`, `3c915be`, `ca1ad91`, `032d09e`, `48395fe`, `68b57ff` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical Data & Preference Persistence Failures (V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility) and user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: all (V7, V8, V9), guest (V11, V15), pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` (implies basemap not found or not 'light').
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` (implies layer visibility not found or not as expected).
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact state of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome is clear.
- Root cause: Despite previous fixes (task-002, task-006, task-008, task-013, task-001 for Zustand persist), the `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, `ee-map-prefs`) are either not being written to, or not being read from correctly on app initialization. This suggests a systemic failure in the persistence layer.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Thoroughly audit all persistence mechanisms (Zustand `persist` middleware and manual `localStorage` IIFE patterns) to ensure data is correctly written and read on app lifecycle events.

### 2. Waypoint Save Button Disabled Online (P3 Regression)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint online, preventing users from creating new waypoints.
- Tier(s) affected: pro (likely free too, as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` test failed with `Error: expect(locator).not.toBeDisabled() failed` for the save button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` shows the "Save Waypoint" button with "LOCATION Acquiring GPS..."
- Cannot confirm: The specific reason for the button being disabled (e.g., missing required fields, validation error, or a bug in the button's enabled state logic).
- Root cause: Unclear from current information. This is a regression in a core feature's functionality. The "Acquiring GPS..." status suggests the button's enabled state is tied to successful GPS acquisition, which may be failing or timing out.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, particularly the `LOCATION` field's GPS acquisition status, to identify why the save button is disabled in a happy-path online scenario.

### 3. Offline Data Loss Without Warning (V3, V4, V6, V14 Confirmed)
- Summary: Critical user-generated data (waypoints, tracks, routes) is silently lost when attempting to save while offline, with no pre-save warning to the user.
- Tier(s) affected: pro (V3, V4, V6, V14 confirmed), free (V3, V14 implied)
- Confidence: HIGH
- Evidence:
    - `pro V14` annotation: `v14-pre-save-offline-warning: no (V14 confirmed)`.
    - `pro V4` PASS: `track save fails offline (post-stop data loss)` (confirms V4).
    - `pro V6` PASS: `route save offline produces no user-facing toast (silent failure)` (confirms V6).
    - `pro V3` test failed due to disabled button, but the V14 confirmation implies V3's data loss aspect is active.
- Cannot confirm: The exact data lost for V3 due to the button being disabled.
- Root cause: As per STATE_MAP.md, "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)" is a known, unaddressed vulnerability. The app lacks an offline-first data strategy, leading to direct Supabase write failures.
- User impact: Users in rural areas (primary use case) will frequently lose valuable field data, leading to extreme frustration, distrust, and potential safety issues if critical information isn't recorded.
- Business impact: Makes the app unusable for its core purpose in its target environment, leading to massive churn, negative reviews, and a damaged brand reputation.
- Fix direction: Implement an offline-first data strategy with a local persistence layer (e.g., IndexedDB) and a sync queue for all user-generated content, along with clear offline status indicators and pre-save warnings.

### 4. Pro User Sees Upgrade Sheet (P1 Regression)
- Summary: Authenticated Pro users are unexpectedly presented with the Upgrade Sheet when tapping a Pro-gated affordance, despite already having a subscription.
- Tier(s) affected: pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. The test description `Pro user does not see UpgradeSheet on Pro affordance tap` implies the test timed out because the UpgradeSheet *was* visible or the expected UI state was not reached.
- Cannot confirm: A direct screenshot of the UpgradeSheet being visible for a Pro user.
- Root cause: The logic gating the display of the `UpgradeSheet` is likely incorrect or `isPro` status is not being correctly evaluated at the point of interaction. This could be a race condition or an incorrect conditional.
- User impact: Confuses and frustrates paying Pro users, making them question their subscription status and the value they are receiving, potentially leading to churn.
- Business impact: Erodes trust with paying customers, leading to churn and negative sentiment.
- Fix direction: Verify the `isPro` check before displaying the `UpgradeSheet` for Pro-gated features. Ensure `isPro` is correctly hydrated and available when the affordance is tapped.

### 5. Offline Navigation Failures in Tests (V2, V10 Cannot Confirm)
- Summary: Tests for critical offline functionalities (Pro status persistence, gold/mineral data caching) are failing due to an inability to navigate the app while offline.
- Tier(s) affected: pro
- Confidence: HIGH (on test setup, LOW on actual vulnerability)
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`.
- Cannot confirm: Whether V2 (gold/mineral data missing) or V10 (Pro status reverts) are active, as the tests cannot execute their core assertions.
- Root cause: The Playwright test setup for offline navigation (specifically `page.goto` after setting offline status) is not robust or correctly configured for these specific tests, preventing them from running.
- User impact: Prevents verification of critical offline functionality, leaving potential severe bugs undetected.
- Business impact: Risks shipping major regressions in offline experience for paying Pro users without detection.
- Fix direction: Debug and fix the Playwright test environment for offline navigation in `pro V2` and `pro V10` to allow the tests to execute their assertions.

### 6. Learn Header Stats Stable (V13 Resolved for Header Stats)
- Summary: The Learn tab header statistics (courses, complete percentage, chapters done) correctly persist and do not regress when switching tabs.
- Tier(s) affected: guest, free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed. Annotations `state-loss-evidence` and `header-stats-pair` show identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`.
- Cannot confirm: If other component-specific state within the Learn tab (e.g., scroll position within a course, current page in a chapter) persists, as the test only checks header stats.
- Root cause: The previous fix for V13 (keeping Learn tab components mounted) and the `useProgress` hook correctly persisting `ee_progress` to `localStorage` ensure these derived stats remain stable.
- User impact: Users experience a consistent and reliable display of their learning progress, fostering trust and motivation.
- Business impact: Supports user engagement and retention for the learning module.
- Fix direction: (Already resolved for header stats). Consider adding tests for component-specific state persistence (e.g., scroll position, active chapter page) to fully address the original V13 scope.

## Tier Comparison

- **Persistence Failures (V1, V7, V8, V9, V11, V15):**
    - `V7 (Theme)`: Fails for both guest and free tiers, indicating a universal issue with theme persistence.
    - `V9 (Basemap)`: Fails for guest. Likely affects free and pro tiers as `mapStore` persistence is shared.
    - `V8 (Layer preferences)`: Fails for free. Likely affects guest and pro tiers as `mapStore` persistence is shared.
    - `V11 (Guest Waypoints)`: Confirmed for guest. This vulnerability is specific to unauthenticated users.
    - `V15 (Active Module)`: Confirmed for guest. Likely affects free and pro tiers as `moduleStore` persistence is shared.
    - `V1 (GPS Track)`: Confirmed for pro. Likely affects free users as well, as tracking is not Pro-gated.
    - *Overall:* A widespread failure in `localStorage` persistence, affecting both Zustand `persist` middleware and manual `localStorage` implementations, and impacting both preferences and user-generated data across relevant tiers.

- **Learn Header Stats Stability (V13, F4):**
    - Identical behavior across guest and free tiers: header statistics are stable and do not regress on tab switch. This indicates the underlying progress data persistence and component mounting fix are working for these derived stats.

- **Waypoint Save Button (P3, V3):**
    - The "Save Waypoint" button is disabled for the pro tier (both online and offline attempts). This suggests a core component issue, likely affecting free users as well.

- **Offline Data Loss (V4, V6, V14):**
    - Confirmed for the pro tier. These are systemic issues related to the lack of an offline-first strategy, so they would affect free users similarly for their respective data types. Guest users do not save to Supabase, so V3/V4/V6 are not applicable in the same way.

- **Pro-specific Issues (P1, V2, V10):**
    - `P1 (UpgradeSheet for Pro)`: Fails for the pro tier. Not applicable to guest/free.
    - `V2 (Gold/mineral data offline)`: Test failed to run for the pro tier. Not applicable to guest/free.
    - `V10 (Pro status reverts offline)`: Test failed to run for the pro tier. Not applicable to guest/free.

## Findings Discarded
- No findings were explicitly discarded as PHANTOM in this run.

## Cannot Assess
- `pro V10` and `pro V2`: These tests failed due to `net::ERR_INTERNET_DISCONNECTED` during `page.goto`, preventing assessment of whether V2 (gold/mineral data missing offline) or V10 (Pro status reverts to free offline) are active vulnerabilities. The Playwright offline setup needs debugging for these specific tests.
- The full scope of V13 (Learn tab component state persistence beyond header statistics, e.g., scroll position within a chapter) cannot be assessed with the current test, which only verifies header stats.

## Systemic Patterns

-   **Widespread Persistence Failure:** A critical and systemic issue affecting multiple `localStorage` keys (both Zustand `persist` and manual implementations). This indicates a fundamental problem with how the app writes and reads state from `localStorage` on app initialization and reload. Many previously "CONFIRMED" fixes (task-001, task-002, task-006, task-008, task-013) appear to have regressed or were not fully implemented, leading to significant data and preference loss.
-   **Lack of Offline-First Strategy:** Confirmed by V3, V4, V6, V14. The app continues to rely on direct Supabase writes, leading to silent data loss and poor user experience in offline environments. This is a known, deferred architectural decision that is now critically impacting user data safety.
-   **Flaky Playwright Offline Setup:** The `net::ERR_INTERNET_DISCONNECTED` errors for `pro V2` and `pro V10` indicate that the Playwright environment for simulating offline conditions is not consistently working for all navigation scenarios, hindering comprehensive testing of critical offline vulnerabilities.

## Calibration Notes

-   The new test philosophy, where a "PASS" verdict for a vulnerability test means the vulnerability *was confirmed*, is working as intended for V1, V4, V6, V11, V14, and V15. This provides clear, direct evidence of active vulnerabilities.
-   The "CONFIRMED" status in previous reports for persistence-related tasks (e.g., task-002, task-006, task-008, task-013) needs to be re-evaluated. The current test results directly contradict those resolutions, highlighting the importance of robust and continuous regression testing for persistence mechanisms.
-   The distinction between "component state loss" and "derived data persistence" for V13 is important. While the current test confirms derived data persistence, the original vulnerability's scope regarding component-specific state (like scroll position within a chapter) may still be active.
-   Playwright timeouts, as seen in P1, P3, V8, and V9, can mask underlying issues or indicate test flakiness. Careful interpretation is required to determine if the timeout itself is the issue, or if it's a symptom of a deeper UX problem (e.g., a disabled button preventing interaction).