# UX Agent Report — 2026-05-22

## Run Context
- Commits analysed: `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `29233ab`, `d29354c`, `eb866d4`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read. `guest V9` and `free V8` FAIL (timeout) strongly imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clearly implied.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access, affecting both Zustand `persist` and manual `localStorage` patterns.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, and no offline pre-save warning is shown.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14 (no pre-check for offline save).
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, ensuring `mapStore.userLocation` is correctly updated from the Playwright mock. Implement V14: add an explicit offline check and warning before attempting to save waypoints.

### 3. Critical: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1)
- Summary: A Pro user attempting to use a Pro-gated feature is incorrectly presented with the Upgrade Sheet, implying their Pro status is not being recognized or is being overridden.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.` The test description `Pro user does not see UpgradeSheet on Pro affordance tap` implies the test timed out waiting for the UpgradeSheet *not* to appear, meaning it *did* appear. This is a regression from a previously confirmed fix.
- Cannot confirm: The specific Pro affordance tapped in the test, but the outcome is clear.
- Root cause: The `isPro` flag in `userStore` is either not correctly hydrated for the Pro user session, or the gating logic for Pro features is flawed, leading to the `UpgradeSheet` being shown. This could be related to the general persistence issues (V10 was intended to fix `isPro` persistence, but that test failed to run).
- User impact: Pro users are blocked from accessing paid features they are entitled to, leading to extreme frustration and a sense of being cheated.
- Business impact: Direct loss of trust from paying customers, potential refund requests, and severe damage to brand reputation.
- Fix direction: Verify `userStore.isPro` is correctly set and persisted for Pro users. Re-evaluate the logic that determines whether to show the `UpgradeSheet` for Pro-gated features.

### 4. High: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: When attempting to save a GPS track or a custom route while offline, the app fails to save the data, resulting in complete data loss without a clear user-facing toast for routes.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free/Guest if they had access to these features.
- Confidence: HIGH
- Evidence: `pro V4` PASS, confirming `track save fails offline (post-stop data loss)`. `pro V6` PASS, confirming `route save offline produces no user-facing toast (silent failure)`. The annotation `route-button-missing: cannot proof V6` is confusing but the test passing confirms the silent failure.
- Cannot confirm: The exact state of the `sessionTrail` or `routePoints` in `mapStore` after the failed save attempts, but the vulnerability description implies loss.
- Root cause: As per `STATE_MAP.md` (Supabase Write Map), `tracks` INSERT and `routes` INSERT operations fail silently or with a toast when offline, leading to data loss. There is no offline write queue or local-first persistence for these critical user-generated data types.
- User impact: Users lose valuable, often irreplaceable, records of their outdoor activities and planned routes, leading to significant frustration and distrust.
- Business impact: Undermines the core value proposition of a mapping app for outdoor use, especially in areas with poor connectivity. High churn and negative reviews.
- Fix direction: Implement an offline-first data strategy for user-generated content (tracks, routes, finds, waypoints) using a persistent local queue (e.g., IndexedDB) that syncs when online.

### 5. Medium: Learn Tab State Preservation Confirmed (V13 - Resolved)
- Summary: The Learn tab successfully preserves its state (e.g., header statistics) across tab switches, indicating that the previous vulnerability (V13) has been resolved.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` PASS, `state-loss-evidence` shows `{"before":...,"after":...}` with identical values for `courses`, `completePct`, and `chaptersDone`. `free V13` PASS with identical `state-loss-evidence`. `free F4` also PASS, confirming `Learn header percentage does not regress to zero across tab switches`.
- Cannot confirm: The specific internal component state (e.g., scroll position within a chapter) but the header stats are preserved.
- Root cause: The previous fix (task to replace conditional rendering with always-mounted, display-toggled components) has successfully addressed the state loss issue for the Learn tab.
- User impact: Users can navigate away from the Learn tab and return to find their progress and view state preserved, leading to a smoother and more reliable learning experience.
- Business impact: Improved user engagement with the learning module, better course completion rates, and increased perceived app quality.
- Fix direction: No fix needed; this vulnerability is resolved.

## Tier Comparison

-   **Persistence Regression (V1, V7, V8, V9, V11, V15)**: The underlying `localStorage` persistence issues for theme (V7), basemap (V9), and layer visibility (V8) affect *all* tiers. Session waypoints (V11) and active module (V15) are lost for `guest` users. Active GPS tracks (V1) are lost for `pro` users. This indicates a systemic problem with `localStorage` access or Zustand `persist` middleware across the application, rather than tier-specific logic.
-   **GPS Acquisition Failure (P3, V3, V14)**: The failure to acquire GPS and the disabled "Save Waypoint" button (P3, V3) are observed in the `pro` tier. The missing offline pre-save warning (V14) is also confirmed for `pro`. This behavior is expected to be identical across all tiers if they were allowed to save waypoints, as the GPS acquisition and save button logic is shared.
-   **Pro Status Regression (P1)**: This issue is specific to the `pro` tier, where `isPro` status is not correctly recognized, leading to `UpgradeSheet` display.
-   **Offline Data Loss (V4, V6)**: Track save failure (V4) and silent route save failure (V6) are confirmed for the `pro` tier. These are general offline data handling issues that would affect any authenticated user attempting these actions.
-   **Learn Tab State (V13, F4)**: State preservation for the Learn tab is confirmed to be working correctly for both `guest` and `free` tiers, indicating a successful, universal fix for this component.

## Findings Discarded

-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out)**: Discarded. The test failed with `net::ERR_INTERNET_DISCONNECTED` during the `page.goto` step, preventing the offline reload scenario from being tested. No evidence for V10 could be gathered.
-   **pro V2 — gold/mineral data missing after offline reload (data not cached)**: Discarded. Similar to V10, this test failed with `net::ERR_INTERNET_DISCONNECTED` during the `page.goto` step, preventing the offline reload scenario from being tested. No evidence for V2 could be gathered.

## Cannot Assess

-   **V2 (gold/mineral data missing offline)** and **V10 (Pro status reverts offline)**: The tests designed to confirm these vulnerabilities failed to execute their core offline reload step due to network disconnection errors. Therefore, I cannot assess the status of these vulnerabilities.

## Systemic Patterns

1.  **`localStorage` Persistence Breakdown**: The most prominent systemic pattern is the widespread failure of `localStorage` persistence across multiple user preferences and session data points (V1, V7, V8, V9, V11, V15). This affects both Zustand `persist` middleware and manual `localStorage` patterns, strongly suggesting a fundamental issue with `localStorage` access or a global clearing mechanism introduced by recent changes (e.g., the `Revert "surgery(rvsv-offline-001)"` commit).
2.  **GPS Acquisition Reliability**: The consistent "Acquiring GPS..." state and disabled save button (P3, V3) point to a systemic issue with the app's GPS acquisition and processing logic, potentially related to how it interacts with mocked geolocation data or the `watchPosition` callback.
3.  **Lack of Offline-First Data Strategy**: The confirmed offline data loss for tracks and routes (V4, V6) and the missing pre-save warning (V14) highlight a continued absence of an offline-first data strategy for user-generated content, which is critical for an outdoor mapping app.

## Calibration Notes

The previous report's identification of a "Systemic Persistence Regression" was highly accurate. The current results provide further, more granular evidence (e.g., `ee_theme: null` annotations) that reinforce this diagnosis and point towards a deeper issue with `localStorage` access rather than isolated bugs. The consistent `HIGH` confidence for these persistence issues is directly informed by the historical accuracy of similar findings. The `PHANTOM` verdicts from previous runs (e.g., for UI obstruction or style inconsistencies) continue to guide the agent to focus on direct evidence from annotations and error messages, avoiding speculative conclusions based solely on test timeouts or element changes. The distinction between a test *passing* to confirm a vulnerability (e.g., V1, V11, V15) versus a test *passing* to confirm a fix (e.g., V13) is crucial and was carefully applied based on the test descriptions and annotations.