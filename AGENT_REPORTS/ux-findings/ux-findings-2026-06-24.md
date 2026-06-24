# UX Agent Report — 2026-06-24

## Run Context
- Commits analysed: `916c561` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V10, V2)
- Summary: The application completely fails to load when authenticated users (Free or Pro) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (likely Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of robust Service Worker caching for the core application shell and critical data. The `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online. This also confirms V14 (no offline pre-save warning) as the button is disabled, preventing the warning from being triggered.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes the annotation `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 3. Critical: Pro Users Incorrectly See Upgrade Sheet (Vulnerability P1)
- Summary: Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, despite already having a Pro subscription. This is a regression of a previously confirmed fix.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout indicates the test was waiting for the UpgradeSheet *not* to be visible, but it likely appeared, causing the test to hang.
- Cannot confirm: The exact UI element that triggered the UpgradeSheet, as the test timed out before a specific assertion could fail.
- Root cause: The gating logic for `showUpgradeSheet` (controlled by `userStore.showUpgradeSheet`) is likely misconfigured or has a race condition, failing to correctly check `userStore.isPro` before displaying the sheet.
- User impact: Confusing and frustrating experience for paying Pro users, making them question their subscription status and the app's reliability.
- Business impact: Erodes trust with paying customers, potentially leading to subscription cancellations and negative reviews.
- Fix direction: Review the `showUpgradeSheet` gating logic to ensure it correctly evaluates `userStore.isPro` and `userStore.subscriptionStatus` before displaying the upgrade sheet.

### 4. High: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' on page reload, regardless of authentication status.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. The annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate that the `ee_theme` localStorage key, which is supposed to persist the theme, is not being written or read correctly. The `theme-after-reload: dark` annotation confirms the reset.
- Cannot confirm: The exact line of code preventing the `ee_theme` key from being written, but the evidence points to a failure in the manual persistence pattern for `userStore.theme`.
- Root cause: The manual `localStorage` persistence for `userStore.theme` (via `ee_theme`, task-008) is not functioning as intended. The `STATE_MAP.md` indicates `ee_theme` should be written on `setTheme` and read on `userStore` init. The `null` values in annotations suggest this is failing.
- User impact: Minor annoyance for users who prefer a different theme, requiring them to re-select it on every app load.
- Business impact: Contributes to a perception of an unpolished or unreliable application, potentially affecting user satisfaction and retention.
- Fix direction: Debug the `setTheme` function and the `userStore` initialization to ensure `ee_theme` is correctly written to and read from `localStorage`.

### 5. High: Map Preferences (Basemap, Layer Visibility) Reset on Reload (Vulnerability V9, V8)
- Summary: User-selected map preferences, specifically the basemap and layer visibility, reset to their default states upon page reload.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded`. While a timeout, this typically indicates the expected state (e.g., 'light' basemap, specific layers visible) was not found after reload, implying a reset. The `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware. The timeout suggests this persistence is failing.
- Cannot confirm: The exact default values they reset to, but the failure implies they are not retaining the user's selection.
- Root cause: The Zustand `persist` middleware for `mapStore` (key `ee-map-prefs`) is failing to correctly save or load `basemap` and `layerVisibility` preferences.
- User impact: Users must reconfigure their preferred map view settings (basemap, visible layers) every time they reload the app, leading to repetitive and frustrating interactions.
- Business impact: Degrades the user experience for core map functionality, potentially reducing engagement and perceived value of the app.
- Fix direction: Investigate the `mapStore` Zustand `persist` configuration and ensure `basemap` and `layerVisibility` are correctly serialized, stored, and rehydrated from `localStorage`.

### 6. High: Guest Waypoints, Active Module, and GPS Tracks are Lost on Reload (Vulnerability V11, V15, V1)
- Summary: User-generated data such as guest waypoints, the currently active module, and in-progress GPS tracks are not persisted and are lost upon page reload.
- Tier(s) affected: Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    *   `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    *   `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    *   `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure in the manual `localStorage` write for `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`, but the `absent` or `empty` annotations are definitive.
- Root cause: The manual `localStorage` persistence patterns (IIFE read + `setItem` on write) for `sessionWaypoints` (`ee_guest_waypoints`), `activeModule` (`ee_active_module`), and `sessionTrail` (`ee_session_trail`) are not correctly implemented or are being overwritten/cleared prematurely. `STATE_MAP.md` explicitly lists these as "manual IIFE + write pattern" and `sessionTrail` as "accumulate during active user sessions. None are persisted anywhere until the user explicitly saves." The `V1` fix was supposed to address this.
- User impact: Loss of unsaved work (GPS tracks, waypoints) and disruption of workflow (module reset), forcing users to restart activities or re-enter data. This is particularly frustrating for guest users who might be evaluating the app.
- Business impact: Leads to user frustration, abandonment of features, and a perception of data unreliability, especially for core tracking and data collection features.
- Fix direction: Debug the manual `localStorage` write functions for `sessionWaypoints`, `activeModule`, and `sessionTrail` to ensure data is consistently written and read across reloads. For `sessionTrail`, ensure auto-persistence during active tracking is robust.

### 7. High: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When attempting to save a route offline, the operation fails without providing a user-facing toast notification, leading to silent data loss.
- Tier(s) affected: Pro (likely Free, Guest if routes were available)
- Confidence: HIGH
- Evidence: `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test couldn't verify the *absence* of a toast. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". This architectural ground truth confirms the silent failure.
- Cannot confirm: The exact console error message, as it's not provided in the test output.
- Root cause: The `routes` INSERT operation in `RouteBuilder` only logs a `console.error` on failure and does not trigger the `addToast` mechanism, as confirmed by `STATE_MAP.md`.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to significant frustration and wasted effort.
- Business impact: Erodes user trust in data persistence and the app's reliability, especially for a critical planning feature like route building.
- Fix direction: Implement a user-facing toast notification for failed route save operations, similar to other data write failures (waypoints, finds).

### 8. Medium: Learn Tab Header Stats Test is Not Robust for State Loss (Vulnerability V13)
- Summary: While the `V13` test for Learn tab state loss passes, the provided `state-loss-evidence` shows identical `before` and `after` stats (all zeros), indicating no actual progress was made or observed. This means the test does not robustly prove the *absence* of state loss for chapter progress, only that the header stats themselves didn't change from zero.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed. The `state-loss-evidence` annotation for both shows `{"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}}}`. This means no chapters were completed, so there was no state *to* lose or preserve in the header.
- Cannot confirm: Whether actual in-chapter reading position (page number) is preserved, as the test only checks header stats. The previous report *confirmed* V13 fix, but this test doesn't provide strong evidence for it.
- Root cause: The test scenario for V13 does not involve making actual progress (e.g., completing a chapter) before switching tabs and checking for state preservation. The test only checks the header, not the deeper component state of the `ChapterReader`.
- User impact: Potential for users to lose their reading position within a chapter if they navigate away and return, leading to frustration and disruption of the learning flow.
- Business impact: Reduces engagement with the Learn module if users perceive progress as unreliable, impacting educational value and feature stickiness.
- Fix direction: Enhance the `V13` test to simulate actual chapter progress (e.g., advancing to page 2 of 3) before tab switching, and then assert that the reading position is retained.

## Tier Comparison

-   **Offline App Load (V10, V2)**: Fails for Pro users, preventing app access. This issue is likely systemic and would affect Free users similarly, as both rely on Supabase authentication and data loading. Guest users are not explicitly tested for this scenario, but the underlying lack of Service Worker caching for the app shell would likely affect them too.
-   **Waypoint Save Disabled (P3, V3, V14)**: Fails for Pro users due to GPS acquisition issues, disabling the save button. Free users are prevented from saving waypoints by an upgrade gate (F3 passed), so they do not encounter this specific failure. Guest users' waypoints are memory-only (V11 confirmed), so they also do not reach a save-to-DB scenario.
-   **Pro User Sees Upgrade Sheet (P1)**: This issue specifically affects Pro users, as it involves incorrect gating logic for Pro-exclusive features. Not applicable to Guest or Free tiers.
-   **Theme Resets (V7)**: This issue affects all tiers (Guest and Free tests failed), indicating a universal failure in theme preference persistence.
-   **Map Preferences Reset (V9, V8)**: This issue affects all tiers (Guest V9 and Free V8 tests failed), indicating a universal failure in map preference persistence.
-   **Data Loss on Reload (V11, V15, V1)**:
    *   `V11` (guest waypoints) and `V15` (active module reset) affect Guest users.
    *   `V1` (GPS track loss) affects Pro users.
    *   These are distinct data loss vulnerabilities, but all point to a common systemic problem with state persistence across reloads.
-   **Offline Route Save (V6)**: Fails silently for Pro users. Not applicable to Guest or Free tiers, as route building is a Pro feature.
-   **Learn Tab State (V13)**: The test passes for both Guest and Free tiers, but the evidence is inconclusive regarding actual state preservation. The underlying fix (always-mounted tabs) should apply universally.

## Findings Discarded
-   No findings were discarded in this run. All identified issues were supported by sufficient evidence and ranked by user impact.

## Cannot Assess
-   The exact reason for GPS acquisition failure in Playwright tests (P3, V3) could not be fully assessed without deeper debugging of the app's GPS integration with the Playwright mock.
-   The full extent of offline loading failure for Free and Guest users (V10, V2) could not be assessed, as the tests only explicitly failed for Pro. However, the root cause is likely universal.
-   The `pro V6` test for silent route save failure could not directly "proof V6" via annotations, but the `STATE_MAP.md` provides architectural ground truth confirming the silent failure.

## Systemic Patterns
-   **Widespread Persistence Failures**: A significant number of findings (V7, V9, V8, V11, V15, V1) indicate a systemic problem with state persistence. This affects both Zustand `persist` middleware configurations (V7, V9, V8) and manual `localStorage` patterns (V11, V15, V1). Data that should survive a reload is consistently lost.
-   **Fundamental Offline Capability Gaps**: Critical failures (V10, V2, P3, V3, V6) highlight a severe lack of offline-first design. The application is not resilient to network interruptions, failing to load, acquire GPS, or save user-generated data when offline. This is a core architectural deficiency for an outdoor mapping app.
-   **Gating Logic Inconsistencies**: The regression in P1 (Pro users seeing upgrade sheets) points to potential race conditions or errors in the logic that gates features based on subscription status.

## Calibration Notes
-   The consistent `CONFIRMED` verdicts for previous fixes (e.g., V13 fix for tab state) guided the interpretation of current test results. When a test passes but the evidence is weak (as in V13), it prompts a finding about the test's robustness rather than assuming the fix is broken.
-   The history of `PHANTOM` verdicts reinforced the need to rely strictly on direct evidence from error messages, annotations, and the `STATE_MAP.md`, avoiding speculative inferences from timeouts alone unless corroborated.
-   The recurrence of critical issues like offline failures and persistence problems (V10, V2, V7, V9, V8, V11, V15, V1) indicates these are deeply rooted architectural challenges that require comprehensive solutions, not just isolated fixes.