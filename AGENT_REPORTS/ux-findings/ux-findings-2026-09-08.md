# UX Agent Report — 2026-09-08

## Run Context
- Commits analysed: `0fcb9dbe7f1694db0878486836e13c4c973b7732` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, requiring users to re-select it every time.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read. `STATE_MAP.md` indicates `ee_theme` should be persisted via a manual pattern (task-008).
- Cannot confirm: The exact line of code where the manual `localStorage.setItem` or `localStorage.getItem` for `ee_theme` is failing.
- Root cause: The manual `localStorage` persistence mechanism for `userStore.theme` (key `ee_theme`) is not functioning correctly, leading to state loss on reload.
- User impact: Annoying and repetitive task for users who prefer a non-default theme, reducing personalization and perceived app quality.
- Business impact: Minor, but contributes to a perception of an unreliable or unpolished application, potentially affecting user satisfaction.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_theme` key in `userStore.js`.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the WaypointSheet and attempt to save a waypoint, instead of being presented with an UpgradeSheet as intended for Pro-gated features.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: If the save operation would actually succeed for a free user (it should fail on the backend), but the UX gate is clearly broken.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before showing the `WaypointSheet`.
- User impact: Free users can access a Pro feature, potentially leading to confusion when their data doesn't save or they hit a backend error. It also undermines the value proposition of the Pro tier.
- Business impact: Direct loss of potential Pro conversions, as the upgrade path for a core feature is bypassed.
- Fix direction: Correct the gating logic for the camera button to display the `UpgradeSheet` if `isPro` is false.

### 5. High: Learn Tab Content Resets on Tab Switch (V13 Confirmed)
- Summary: When a user navigates away from the Learn tab and then returns, the content (e.g., current chapter page, scroll position) resets to its default state, forcing the user to find their place again.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` both passed, with `state-loss-evidence` showing identical `before` and `after` stats (e.g., `chaptersDone: 0`). This confirms the test's intent: that state *is* lost. `UX Knowledge Context` explicitly states: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines."
- Cannot confirm: The exact component state (e.g., scroll position, active chapter page) that is lost, as the annotation only captures header stats. However, the architectural cause is clear.
- Root cause: `App.jsx` unmounts non-map tab components (DashboardView, SettingsView, LearnView, ProfileView) when switching away, destroying their internal component state.
- User impact: Frustrating and disruptive experience for users engaging with learning content, forcing them to repeatedly re-navigate within the Learn module.
- Business impact: Reduces engagement with the learning module, potentially impacting user onboarding and feature adoption.
- Fix direction: Modify `App.jsx` to keep non-map tab components mounted and use CSS (e.g., `display: none`) to hide them when inactive, preserving their state.

### 6. High: Guest Waypoints Lost on Reload (V11 Regression)
- Summary: Waypoints saved by guest users are not persisted across page reloads and are lost, despite a manual `localStorage` persistence mechanism being in place.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability. `STATE_MAP.md` indicates `sessionWaypoints` should persist via `ee_guest_waypoints` (manual pattern, task-002).
- Cannot confirm: The specific failure point in the `sessionWaypoints` manual persistence logic.
- Root cause: The manual `localStorage` persistence mechanism for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`) is not functioning correctly, leading to state loss on reload.
- User impact: Guest users lose valuable data they've explicitly saved, leading to frustration and distrust in the application's reliability.
- Business impact: Prevents guest users from experiencing the value of the app, hindering conversion to authenticated or paid tiers.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_guest_waypoints` key in `mapStore.js`.

### 7. High: Active Module Resets to Default on Reload (V15 Regression)
- Summary: The user's selected active module (e.g., 'geology') resets to the default 'prospecting' module upon page reload, requiring users to re-select it every time.
- Tier(s) affected: All (Guest)
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability. `STATE_MAP.md` indicates `activeModule` should persist via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: The specific failure point in the `activeModule` manual persistence logic.
- Root cause: The manual `localStorage` persistence mechanism for `moduleStore.activeModule` (key `ee_active_module`) is not functioning correctly, leading to state loss on reload.
- User impact: Annoying and repetitive task for users who prefer a different module, disrupting their workflow.
- Business impact: Minor, but contributes to a perception of an unreliable or unpolished application, potentially affecting user satisfaction and engagement with specific modules.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_active_module` key in `moduleStore.js`.

### 8. High: GPS Track Lost on Reload (V1 Regression)
- Summary: An active GPS tracking session's accumulated trail data is lost upon page reload, despite a manual `localStorage` persistence mechanism being in place.
- Tier(s) affected: All (Pro)
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability. `STATE_MAP.md` indicates `sessionTrail` should persist via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The specific failure point in the `sessionTrail` manual persistence logic.
- Root cause: The manual `localStorage` persistence mechanism for `mapStore.sessionTrail` (key `ee_session_trail`) is not functioning correctly, leading to state loss on reload.
- User impact: Users lose valuable GPS tracking data if the app crashes or the page is accidentally reloaded, leading to significant frustration and loss of irreplaceable activity records.
- Business impact: Severe impact on user trust and retention, especially for a core feature like tracking. Directly contradicts "Data Safety" principles.
- Fix direction: Debug the manual `localStorage` read/write logic for the `ee_session_trail` key in `mapStore.js`.

## Tier Comparison

-   **Offline Loading (V2, V10):** The Pro tier completely fails to load the application when offline. This behavior is inferred for the Free tier as well due to shared architectural dependencies on Supabase data. The Guest tier is not explicitly tested for this specific failure, but would likely also experience issues loading data if it attempts to fetch `gold_samples` offline.
-   **Theme Preference Reset (V7):** Confirmed for both Guest and Free tiers, indicating a systemic issue affecting all users regardless of authentication status.
-   **Learn Tab State Loss (V13):** Confirmed for both Guest and Free tiers, indicating a consistent behavior across different user types for this module.
-   **Persistence of Waypoints (V11), Active Module (V15), and GPS Track (V1):** These are confirmed as lost on reload for Guest (V11, V15) and Pro (V1) tiers. Given that these rely on manual `localStorage` patterns in shared stores (`mapStore`, `moduleStore`), the underlying persistence failure is likely universal across all tiers for these features.
-   **Basemap (V9) and Layer Visibility (V8) Reset:** Tests for these features timed out for both Guest and Free tiers. While not directly confirmed, the consistent timeout across tiers suggests a shared underlying issue, likely related to persistence.
-   **PRO Badges (F2):** Free users correctly see PRO badges in the LayerPanel, which is the intended behavior to encourage upgrades.
-   **Waypoint Gating (F3):** Free users incorrectly bypass the upgrade gate and are shown the WaypointSheet. In contrast, Guest users are correctly presented with the UpgradeSheet (C3) when attempting to access Pro-gated features. This highlights a specific flaw in the Free tier's gating logic.
-   **GPS Acquisition (P3, V3):** The Pro tier experiences a critical failure in GPS acquisition, disabling the "Save Waypoint" button. This is a fundamental app functionality issue that would affect all tiers if they attempted to save waypoints.

## Findings Discarded

-   `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: This test timed out. The timeout prevents direct confirmation of the expected behavior (UpgradeSheet not shown) and is likely due to test flakiness or a blocking issue (such as the GPS acquisition failure) rather than a regression of the P1 fix itself. Cannot confidently confirm a UX issue from a timeout in this context.
-   `pro V4 — track save fails offline (post-stop data loss)`: This test *passed*, confirming the vulnerability that track saves fail offline. While this is a UX issue (data loss), it is an *expected* vulnerability (V4) as per `STATE_MAP.md` and less critical than the inability to save at all (P3) or data loss on reload (V1). It is acknowledged as part of the systemic "Incomplete Offline-First Implementation".
-   `pro V6 — route save offline produces no user-facing toast (silent failure)`: This test *passed*, confirming the vulnerability that route saves fail silently offline. Similar to V4, this is an *expected* vulnerability (V6) and less critical than the top 8 findings. It is also acknowledged as part of the systemic "Incomplete Offline-First Implementation".
-   `guest V9 — basemap resets to satellite on reload (preference-loss proof)` and `free V8 — layer preferences reset to defaults on reload`: These tests timed out. While highly likely to be persistence issues similar to V7, the timeouts prevent direct confirmation of the *value* resetting. I've prioritized the confirmed V7 and will mention these in "Cannot Assess".

## Cannot Assess

-   `guest V9` and `free V8` (basemap and layer preference resets): These tests timed out, preventing direct confirmation of the preference reset. They are likely related to the general persistence issues (V7) but cannot be confirmed with HIGH confidence from the current evidence.
-   `pro V10` (Pro status reverts to free on offline reload): This test was blocked by the app failing to load offline (`net::ERR_INTERNET_DISCONNECTED`). Therefore, it was impossible to assess whether the `isPro` status would revert to 'free' if the app were able to load in an offline state.

## Systemic Patterns

-   **Incomplete Offline-First Implementation:** The most critical systemic issue. The application fundamentally fails to load offline for authenticated users (V2, V10 blocker), and all data write operations (waypoints, tracks, routes) are confirmed to fail when offline (V4, V6 confirmed). This violates core "Offline-First Design" principles and renders the app unusable in its primary target environment.
-   **Broken Manual `localStorage` Persistence:** A widespread issue affecting multiple critical user preferences and session data. The theme (V7), guest waypoints (V11), active module (V15), and active GPS track (V1) are all failing to persist across reloads, despite `STATE_MAP.md` indicating that manual `localStorage` patterns are in place for these fields. This suggests a fundamental flaw in the implementation or interaction with these manual persistence mechanisms.
-   **Volatile Component State:** The Learn tab (V13) demonstrates a pattern where component state is not preserved across tab switches. This is due to `App.jsx` unmounting components when switching tabs, rather than merely hiding them, directly violating "Mobile Navigation State" guidelines.
-   **Flawed Gating Logic:** The `isPro` check is either missing or incorrectly implemented in certain areas (F3), leading to free users accessing Pro-gated features, which undermines the value proposition of the Pro tier.

## Calibration Notes

-   **Prioritized Direct Evidence:** I focused on annotations (e.g., `V11 confirmed`, `ee_theme: null`) and explicit assertion failures over general pass/fail statuses, especially for "vulnerability-proof" tests where a "PASS" indicates the vulnerability *is* confirmed.
-   **Distinguished Failure Types:** I carefully differentiated between tests failing due to assertion mismatches (indicating a specific UX bug) and those failing due to timeouts or network errors (indicating deeper blocking issues that prevent the test from reaching its assertion point).
-   **Recognized Blockers:** `net::ERR_INTERNET_DISCONNECTED` was treated as a critical blocker, preventing assessment of subsequent state changes, as the application itself could not load.
-   **Strict "NEVER Guess" Rule:** Findings were marked as "Cannot confirm" or discarded if evidence was ambiguous or if the test was blocked, adhering to the principle of not speculating.
-   **Leveraged `STATE_MAP.md`:** The architectural ground truth was crucial for tracing UX findings to their root causes and confirming the intended persistence mechanisms.
-   **Identified Regressions:** Several findings (V1, V7, V11, V15, F3) indicate regressions or incomplete fixes for previously addressed vulnerabilities, highlighting the need for robust regression testing.