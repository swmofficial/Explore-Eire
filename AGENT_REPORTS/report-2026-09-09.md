# UX Agent Report — 2026-09-09

## Run Context
- Commits analysed: `55707d9cc5ca5d38dc9b52599f76ce71cebfea22` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This is a regression of a previously identified critical issue.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This issue affects both online and offline waypoint saving attempts.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no offline warning is shown before this disabled state.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Widespread Persistence Failures for User Preferences and Data (V1, V7, V11, V15 Regression)
- Summary: Multiple user preferences (theme, active module) and user-generated session data (guest waypoints, session trail) are not persisting across page reloads, despite previous fixes and `STATE_MAP.md` indicating they should be persisted. This represents a significant regression in core state management.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read. `STATE_MAP.md` indicates `ee_theme` should persist via a manual pattern (task-008).
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is active. `STATE_MAP.md` indicates `sessionWaypoints` should persist via `ee_guest_waypoints` (task-002).
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is active. `STATE_MAP.md` indicates `activeModule` should persist via `ee_active_module` (task-013).
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is active. `STATE_MAP.md` indicates `sessionTrail` should persist via `ee_session_trail` (task-006).
- Cannot confirm: The exact commit or change that caused these widespread regressions in persistence mechanisms.
- Root cause: A systemic failure in the application's persistence layer. This affects both Zustand `persist` middleware (for `userStore.theme` if it was still using it, or if the manual pattern is broken) and the manual `localStorage` patterns used for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`. The `null` values for `ee_theme` are particularly concerning.
- User impact: Users lose their personalized settings and unsaved session data (waypoints, tracks) on every reload, leading to severe frustration and distrust in the application's reliability.
- Business impact: High churn due to a frustrating user experience, negative reviews, and reduced engagement with core features.
- Fix direction: Thoroughly audit and debug all persistence mechanisms (Zustand `persist` and manual `localStorage` patterns) across `userStore`, `mapStore`, and `moduleStore`. Verify that `localStorage.setItem` and `localStorage.getItem` are correctly implemented and called.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the WaypointSheet and attempt to save a waypoint, instead of being presented with an UpgradeSheet as intended for Pro-gated features. This is a regression of a critical business logic gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failed, `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms that the `UpgradeSheet` was *not* shown, and the `WaypointSheet` *was* shown.
- Cannot confirm: The specific code change that caused this regression in the upgrade gate logic.
- Root cause: The conditional rendering or routing logic that gates Pro features (like saving waypoints) for Free users is flawed, allowing access to the `WaypointSheet` instead of triggering the `UpgradeSheet`.
- User impact: Free users can access a Pro feature, potentially leading to confusion when their saved waypoints are not truly persisted or when they encounter other Pro-only limitations.
- Business impact: Direct loss of potential Pro conversions, as the value proposition of the Pro tier is undermined. This impacts revenue and the integrity of the subscription model.
- Fix direction: Review the `useSubscription` hook and the logic that determines whether to show the `UpgradeSheet` or the `WaypointSheet` when a Pro-gated action is attempted by a Free user.

### 5. Medium: Offline Data Loss for Tracks and Routes (V4, V6 Confirmed)
- Summary: User-generated tracks and routes are lost if the user attempts to save them while offline. Track saving fails with a toast, but route saving fails silently with no user feedback.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks/routes)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming `track save fails offline (post-stop data loss)`. `STATE_MAP.md` confirms `tracks` INSERT fails offline with a toast.
    - `pro V6` passed, confirming `route save offline produces no user-facing toast (silent failure)`. `STATE_MAP.md` confirms `routes` INSERT fails offline with "console.error only, no toast".
- Cannot confirm: The exact content of the toast for V4, or the console error for V6, but the behaviour is confirmed as per `STATE_MAP.md`.
- Root cause: The application lacks an offline data synchronization queue. All Supabase write operations (for tracks and routes) fail immediately if there is no network connection, leading to data loss.
- User impact: Users lose valuable recorded data (hike tracks, planned routes) if they are in an area without connectivity, leading to frustration and loss of trust. Silent failures are particularly problematic as the user is unaware of the data loss.
- Business impact: Reduces the reliability of core data collection features, potentially leading to user churn, especially for professional users who rely on data integrity.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store unsynced operations and retry them when connectivity is restored. Provide clear UI feedback for both local saving and server synchronization status.

## Tier Comparison

-   **Persistence Issues (V1, V7, V11, V15):**
    -   `V7 (theme reset)`: Confirmed for **Guest** and **Free**. The `ee_theme` localStorage key is `null` before and after reload for both, indicating a systemic failure in theme persistence across all tiers.
    -   `V11 (guest waypoints)`: Confirmed for **Guest**. Waypoints vanish on reload.
    -   `V15 (active module)`: Confirmed for **Guest**. Active module resets to default on reload.
    -   `V1 (session trail)`: Confirmed for **Pro**. Session trail is lost on reload.
    -   This pattern suggests a widespread regression in the core persistence mechanisms affecting multiple stores and data types across all tiers.
-   **Offline Loading (V2, V10):**
    -   `pro V2` and `pro V10` both failed with `net::ERR_INTERNET_DISCONNECTED`, indicating the app cannot load offline for **Pro** users. This behavior is highly likely to be identical for **Free** users, as the core app shell and initial data loading are not tier-specific.
-   **GPS Acquisition / Waypoint Saving (P3, V3):**
    -   `P3` and `V3` failures (disabled save button due to "Acquiring GPS...") are confirmed for **Pro** users. This issue would likely affect **Free** and **Guest** users if they were able to access the WaypointSheet and attempt to save.
-   **Upgrade Gate Bypass (F3):**
    -   `F3` is specific to the **Free** tier, where the upgrade gate is bypassed, allowing access to the WaypointSheet.
-   **Offline Data Loss (V4, V6, V14):**
    -   `V4`, `V6`, and `V14` are confirmed for **Pro** users. The underlying Supabase write failures and lack of offline queue would be identical for **Free** users attempting to save tracks or routes.
-   **Learn Tab State (V13, F4):**
    -   `guest V13`, `free V13`, and `free F4` all passed, showing identical `before` and `after` header stats (0% complete). This indicates that the fix for V13 (preserving component state across tab switches) is working correctly across tiers, and the "state-loss proof" annotation is misleading in this context. The 0% completion is due to no progress being made in the test, not state loss.

## Findings Discarded

-   **`pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap` (Timeout):** This finding was discarded. While a timeout is suspicious, the `free F3` finding already confirms a critical regression in the upgrade gate logic (Free users *can* save waypoints). The `pro P1` timeout is likely a symptom of broader issues with the upgrade gate or test navigation, rather than a distinct, high-impact UX problem for Pro users (who *shouldn't* see the UpgradeSheet anyway). Prioritizing the direct evidence from `F3` is more impactful.
-   **`guest V9 — basemap resets to satellite on reload` (Timeout):** This finding was discarded. While it points to a potential persistence issue for basemap, the evidence is a timeout, not a direct assertion failure. Given the confirmed widespread persistence regressions (V1, V7, V11, V15) with direct evidence, this timeout is less certain and likely falls under the broader persistence problem.
-   **`free V8 — layer preferences reset to defaults on reload` (Timeout):** Similar to `guest V9`, this was discarded due to being a timeout. `STATE_MAP.md` indicates `layerVisibility` is persisted. This timeout likely points to another instance of the general persistence regression, but without direct assertion failure, it's less confident than the other confirmed persistence issues.

## Cannot Assess

-   No specific tests were skipped or blocked from running, so all intended assessments were attempted.

## Systemic Patterns

-   **Widespread Persistence Regression:** The most critical systemic pattern is the failure of multiple persistence mechanisms. Previously "CONFIRMED" and "FIXED" vulnerabilities (V1, V7, V11, V15) are now re-confirmed as active. This affects both Zustand's `persist` middleware (if still in use for `theme`) and the manual `localStorage` patterns. The `ee_theme` key being `null` before and after reload for V7 is strong evidence that the manual `localStorage.setItem` is not being called or is being overwritten. This indicates a fundamental breakdown in how the application saves and restores user state and data.
-   **Fundamental Offline Functionality Breakdown:** The application completely fails to load for authenticated users when offline (V2, V10), making it unusable in its target environment. This, combined with the GPS acquisition failure (P3, V3) and confirmed offline data loss for tracks and routes (V4, V6, V14), highlights a severe lack of offline-first design and robustness. The app is not designed to function reliably without a constant network connection.

## Calibration Notes

-   The current test suite design, where "PASS" can mean a vulnerability is "confirmed" (e.g., `guest V11`, `guest V15`, `pro V1`), requires careful interpretation of annotations. I prioritized explicit "confirmed" annotations over the test's pass/fail status when assessing vulnerability presence. This helped identify regressions in previously "fixed" issues.
-   I continued to prioritize direct assertion failures and explicit "confirmed" annotations over timeouts, which can have multiple underlying causes and are less definitive as evidence of a specific UX issue.
-   The recurrence of previously "CONFIRMED" and "FIXED" issues (V1, V7, V10, V11, V15) indicates a need for more robust regression testing and potentially a review of the deployment process to ensure fixes are not inadvertently reverted or broken by subsequent changes.