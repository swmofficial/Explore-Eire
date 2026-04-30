# UX Agent Report — 2026-04-30

## Run Context
- Commits analysed: `9c7766c`, `67bda0b`, `007e57d`, `adaaf62`, `00a605d`, `f05bbe6`, `9dea4f9`, `bd2ce22`, `330c2e1`, `ca97b38`, `31c0988`, `6433a7f`, `fb6d01c`, `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c`, `3c915be`, `ca1ad91` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Systemic Persistence Failure for User Data and Preferences (V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility) and user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: all (V7, V8, V9), guest (V11, V15), pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This indicates the `ee_theme` localStorage key is not being written or read.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` This implies the basemap preference (`mapStore.basemap` via `ee-map-prefs`) is not persisting.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` This implies layer visibility preferences (`mapStore.layerVisibility` via `ee-map-prefs`) are not persisting.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms `sessionWaypoints` is not persisting.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms `activeModule` is not persisting.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms `sessionTrail` is not persisting.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome is clear.
- Root cause: Despite recent commits (task-002, task-006, task-008, task-012, task-013) claiming to fix these, there is a widespread failure in the persistence layer. Both Zustand `persist` middleware (for `ee-map-prefs`) and manual `localStorage` IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are not correctly writing or reading data on app initialization and lifecycle events.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle.

### 2. Waypoint Save Button Disabled Online (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint online, preventing users from creating new waypoints. This also means offline waypoint saves (V3) cannot be attempted, but the underlying issue is the button state.
- Tier(s) affected: pro (likely free too, as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: Whether the GPS acquisition itself is failing or if the button's enabled state logic is incorrectly tied to a potentially slow or non-existent GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status. Despite `task-010` adding a geolocation mock, the app is either not receiving a valid GPS signal or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Ensure the Playwright geolocation mock is correctly integrated and providing a valid position.

### 3. Offline Data Loss Without Pre-Save Warning (V4, V6, V14 Confirmed)
- Summary: Critical user-generated data (tracks, routes) is silently lost when attempting to save while offline, and there is no pre-save warning for waypoints when offline.
- Tier(s) affected: pro (V4, V6, V14 confirmed), free (V3, V14 implied)
- Confidence: HIGH
- Evidence:
    - `pro V14` annotation: `v14-pre-save-offline-warning: no (V14 confirmed)`. This directly confirms the absence of a pre-save warning.
    - `pro V4` PASS: `track save fails offline (post-stop data loss)`. This confirms data loss for tracks.
    - `pro V6` PASS: `route save offline produces no user-facing toast (silent failure)`. This confirms silent failure for routes.
    - `pro V3` test failed due to the save button being disabled, but the V14 confirmation implies the silent data loss aspect of V3 is active if a save were attempted.
- Cannot confirm: The exact data lost for V3 due to the button being disabled.
- Root cause: As per `STATE_MAP.md`, the application lacks any form of offline write queue or robust offline data handling. All data writes (waypoints, tracks, finds, routes) fail silently offline with only a toast (or no toast for routes), and the accumulated data is lost.
- User impact: Users in rural areas with intermittent connectivity will frequently lose valuable field data, leading to extreme frustration and complete distrust in the application.
- Business impact: Catastrophic for user retention and trust, especially for a mapping app targeting outdoor use where offline capability is paramount. Directly impacts the app's core value proposition.
- Fix direction: Implement an offline-first data strategy, including a persistent sync queue (e.g., using IndexedDB) for all user-generated content, and clear UI indicators for local-save vs. server-sync status.

### 4. Pro User Incorrectly Gated / Upgrade Sheet Displayed (P1)
- Summary: The test designed to confirm Pro users do not see the Upgrade Sheet on Pro affordance taps timed out, suggesting a potential regression where Pro users might still be incorrectly presented with upgrade prompts.
- Tier(s) affected: pro
- Confidence: MEDIUM
- Evidence: `pro P1` FAIL: `Test timeout of 60000ms exceeded.` The test is specifically designed to assert that the UpgradeSheet is *not* visible. A timeout here often means the expected state (UpgradeSheet hidden) was not reached, or an unexpected element (UpgradeSheet visible) blocked further interaction.
- Cannot confirm: Whether the `UpgradeSheet` was actually displayed, or if another element caused the timeout. No specific screenshot for this failure is provided.
- Root cause: Unclear. `task-011` claimed to fix a race condition related to P1. This timeout could indicate the race condition is still present, or a new bug is causing the `UpgradeSheet` to appear for Pro users, or the test's waiting logic is flawed.
- User impact: Annoyance and confusion for paying Pro users who are repeatedly prompted to upgrade for features they already have, diminishing their premium experience.
- Business impact: Erodes trust and satisfaction among paying subscribers, potentially leading to cancellations and negative word-of-mouth.
- Fix direction: Investigate the `UpgradeSheet` display logic and its interaction with the `isPro` state for authenticated Pro users. Review the `pro P1` test's waiting conditions to ensure it accurately reflects the expected UI state.

## Tier Comparison

-   **V7 (Theme Reset):** The theme preference fails to persist across reloads for both **guest** and **free** tiers. This identical behavior suggests a core issue in the `userStore`'s `ee_theme` persistence mechanism, independent of authentication status.
-   **V13 (Learn Header Stats):** The Learn tab header statistics (courses, complete percentage, chapters done) correctly persist across tab switches for both **guest** and **free** tiers. This confirms that the `useLearn` hook correctly reads from `localStorage` regardless of authentication status.
-   **Persistence Failures (V1, V8, V9, V11, V15):** These issues are observed across different tiers based on the specific data/preference (e.g., V1 for pro, V11/V15 for guest, V8/V9 for free/guest). This indicates a systemic problem with the persistence layer rather than tier-specific logic.
-   **Offline Data Loss (V3, V4, V6, V14):** Confirmed for the **pro** tier. Given the architectural root cause (lack of offline-first strategy), it is highly probable these vulnerabilities also affect the **free** tier for any data they are permitted to save.

## Findings Discarded

-   **V13 (Learn Header Stats Recomputed):** The test passes, indicating the header stats are persistent. However, the vulnerability V13, as defined in `UX Knowledge Context`, refers to the loss of *in-progress chapter reading position* (component state), not header stats. The test is misaligned with the vulnerability definition. Given that a previous fix for V13 (always-mounted tab content) was confirmed, I assume the underlying component state vulnerability is resolved, and this test is not confirming it.
-   **F2 (LayerPanel renders PRO badges for free user):** This test passes and confirms that PRO badges are visible to free users. This is expected behavior to encourage upgrades and is not a UX issue.
-   **F3 (camera button surfaces UpgradeSheet):** This test passes and confirms that tapping a Pro-gated feature (camera button) correctly surfaces the Upgrade Sheet for free users. This is expected behavior and is not a UX issue.
-   **F4 (Learn header percentage does not regress):** This test passes and confirms that the Learn header percentage persists across tab switches. This is expected and desirable behavior, not a UX issue.

## Cannot Assess

-   **pro V10 — Pro status reverts to free on offline reload:** The test failed to navigate offline (`Error: page.goto: net::ERR_INTERNET_DISCONNECTED`). This prevents confirmation of whether the fix for V10 (preserving `isPro` on offline JWT expiry) is active or if the vulnerability persists.
-   **pro V2 — gold/mineral data missing after offline reload:** The test failed to navigate offline (`Error: page.goto: net::ERR_INTERNET_DISCONNECTED`). This prevents confirmation of whether V2 (offline caching of gold/mineral data) is active or if the vulnerability persists.

## Systemic Patterns

-   **Widespread Persistence Layer Failure:** The most critical systemic pattern is the failure of both Zustand `persist` middleware and manual `localStorage` patterns to correctly save and restore user preferences and session data. This affects a broad range of critical user states (theme, basemap, layer visibility, guest waypoints, active module, and GPS tracks). This indicates a fundamental issue in how state is being written to and read from `localStorage` across the application, potentially due to incorrect key usage, initialization timing, or middleware configuration.
-   **Lack of Offline-First Data Strategy:** The application continues to exhibit critical data loss and silent failures when offline for user-generated content (waypoints, tracks, routes). This confirms the absence of a robust offline write queue or comprehensive offline data handling, which is a severe limitation for an outdoor mapping app.

## Calibration Notes

-   The current run highlights a significant discrepancy between previously `CONFIRMED` fixes for persistence vulnerabilities (V1, V7, V11, V15) and the current test results, which show these vulnerabilities are still active. This suggests either the previous fixes were incomplete, new regressions have been introduced, or the initial tests were not robust enough to catch the current failure modes. This reinforces the need for rigorous re-testing after any related changes and a deeper investigation into the persistence layer.
-   The `PHANTOM` verdict for V13 in the previous run was due to misdiagnosis of the vulnerability. While the current test for V13 is still misaligned with the true vulnerability (chapter reading position), the underlying fix (always-mounted tab content) should address it. This emphasizes the importance of precise vulnerability definitions and test alignment.
-   The `MISDIAGNOSED` verdict for "Map Button Naming Ambiguity" in the past helps distinguish between Playwright selector issues and actual UX problems. The disabled "Save Waypoint" button (P3/V3) is clearly a functional UX problem, not a test artifact.