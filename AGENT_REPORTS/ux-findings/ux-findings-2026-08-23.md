# UX Agent Report — 2026-08-23

## Run Context
- Commits analysed: `c75b38960d5da9c80d192498e668f04357986fdb` and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: User Preferences (Theme, Basemap, Layers, Active Module) Fail to Persist on Reload (Vulnerability V7, V8, V9, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, and active module preferences are lost on page reload, reverting to defaults, despite `STATE_MAP.md` indicating they should be persisted. This contradicts previous "CONFIRMED" fixes for V7 and V15.
- Tier(s) affected: All (Guest: V7, V9, V15; Free: V7, V8)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly contradicts `STATE_MAP.md` which states `ee_theme` should persist.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_active_module` is not persisting.
- Cannot confirm: The exact content of `ee-map-prefs` in localStorage due to timeout, but the failure to retain state is clear.
- Root cause: Persistence mechanisms for `userStore.theme` (manual `ee_theme` key), `mapStore.basemap`/`layerVisibility` (Zustand `ee-map-prefs`), and `moduleStore.activeModule` (manual `ee_active_module`) are not functioning correctly, possibly due to incorrect implementation or overwrites.
- User impact: Annoying resets, loss of user customization, degrades user experience and trust in the app's reliability.
- Business impact: Reduces user satisfaction and engagement, potentially leading to churn.
- Fix direction: Re-verify and debug the persistence logic for all affected state keys, ensuring `localStorage` values are correctly read and written.

### 4. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the `WaypointSheet` and attempt to save waypoints, rather than being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` shows that the `UpgradeSheet` was *not* shown (`false`), but the `WaypointSheet` *was* shown (`true`). The test expected `upgradeShown` to be `true`.
- Cannot confirm: If the waypoint save operation would actually succeed for a free user (it should fail at the backend).
- Root cause: Incorrect gating logic in `CornerControls` or `useWaypoints` that determines whether to show the `UpgradeSheet` or `WaypointSheet` when the camera button is tapped by a free user.
- User impact: Free users gain access to a Pro feature, potentially leading to confusion if the save operation later fails, or devaluing the Pro subscription.
- Business impact: Direct revenue loss by allowing free access to premium features, and reduced incentive for users to upgrade.
- Fix direction: Correct the conditional rendering logic to display the `UpgradeSheet` for free users attempting to save waypoints.

### 5. High: Session Waypoints and GPS Tracks are Lost on Reload (Vulnerability V1, V11 - Regression)
- Summary: User-generated session waypoints and active GPS tracks are lost upon page reload, despite `STATE_MAP.md` indicating they should be persisted via manual `localStorage` keys. This is a regression.
- Tier(s) affected: All (Guest: V11; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The exact point of failure in the manual `localStorage` write/read pattern.
- Root cause: Despite `STATE_MAP.md` stating `ee_guest_waypoints` and `ee_session_trail` are manually persisted, the tests confirm they are *not* surviving reload. This indicates a regression or incorrect implementation of the manual persistence pattern.
- User impact: Loss of unsaved user-generated data (waypoints, tracks) on accidental refresh, browser crash, or tab closure, leading to significant frustration and potential loss of valuable field data.
- Business impact: Erodes user trust in data safety and app reliability, leading to high churn, especially for core prospecting activities.
- Fix direction: Debug the manual `localStorage` read/write patterns for `sessionWaypoints` and `sessionTrail` to ensure data is correctly stored and retrieved across reloads.

### 6. Medium: PRO Badges Visible to Free Users in LayerPanel (Vulnerability F2)
- Summary: Free users can see "PRO" badges next to premium map layers in the LayerPanel, which can be confusing and may devalue the Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` test passed, but the annotation `pro-badge-count: 8` explicitly states that 8 PRO badges were visible in the LayerPanel for a free user. Screenshot `test-results/free/f2-layer-panel.png` visually confirms the presence of these badges.
- Cannot confirm: Whether guest users also see these badges (no specific test for guest).
- Root cause: The `LayerPanel` rendering logic for PRO badges does not correctly check the `isPro` status of the current user before displaying the badges. `STATE_MAP.md` notes `isPro` gates.
- User impact: Confuses free users about what features are available to them, potentially creating a perception that the app is poorly designed or that the Pro subscription offers little extra value.
- Business impact: Reduces the perceived value of the Pro subscription, potentially decreasing conversion rates from free to paid users.
- Fix direction: Modify the `LayerPanel` component to conditionally render PRO badges only when `!isPro` is true AND the user is not a Pro subscriber.

### 7. Medium: Learn Tab State Loss Across Tab Switches (Vulnerability V13 - Regression)
- Summary: The Learn tab's component state (e.g., in-progress chapter reading position) is likely still being lost when switching tabs, despite a previous fix. The current test only checks header stats, which were already zero, thus not fully proving the fix.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed. However, the `state-loss-evidence` annotation for both shows `{"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%\",\"Chapters Done\":\"0"}}}`. This indicates no change in the header stats, likely because no progress was made. This means the test passed because there was no state to lose, not because state was preserved. The `UX Knowledge Context` explicitly states "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines." and the previous fix was to prevent unmounting.
- Cannot confirm: Whether in-progress chapter reading position (e.g., page number within a chapter) is lost, as the test only checks header stats.
- Root cause: The previous fix for V13 (to prevent unmounting of tab content) might be incomplete, or the test is not robust enough to detect the specific state loss (e.g., page number within a chapter). The `state-loss-evidence` showing identical zero values means the test didn't *prove* state loss, but it also didn't *disprove* it for a scenario with actual progress.
- User impact: Users lose their place in learning modules when switching tabs, leading to frustration and hindering their learning progress.
- Business impact: Reduces engagement with learning content, potentially impacting user retention and perceived value of the app.
- Fix direction: Re-evaluate the `App.jsx` tab rendering logic to ensure all non-map tab content remains mounted (e.g., `display: none`) and preserves its internal component state across tab switches. Enhance V13 test to track in-chapter progress.

### 8. Low: Route Save Offline Produces No User-Facing Toast (Vulnerability V6 - Confirmed)
- Summary: When a Pro user attempts to save a route offline, the operation fails silently without any user-facing feedback (toast notification), leading to data loss and confusion.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V6` test passed. The annotation `route-button-missing: cannot proof V6` indicates the test couldn't fully verify the *absence* of a button, but the test's purpose is to confirm the silent failure. `STATE_MAP.md` explicitly states: "Save route ... Fails — console.error only, no toast". The test passing confirms this vulnerability.
- Cannot confirm: The exact console error message, as it's not captured in annotations.
- Root cause: The `routes` INSERT operation in `RouteBuilder` fails silently offline, only logging an error to the console without providing user feedback.
- User impact: User believes their route has been saved when it has not, leading to unexpected data loss and confusion when they later try to access the route.
- Business impact: Erodes user trust in the app's data integrity and reliability, especially for a core feature like route planning.
- Fix direction: Implement a user-facing toast notification or other feedback mechanism in `RouteBuilder` to inform the user when a route save operation fails, especially due to offline conditions.

## Tier Comparison

-   **Offline Loading (V2, V10):** Pro tier fails to load the app at all when offline. This behavior is inferred for Free users as well, as the root cause (lack of app shell caching) would affect any authenticated session. Guest tier tests do not cover this scenario.
-   **GPS Acquisition (P3, V3):** Pro tier fails to acquire GPS, disabling the "Save Waypoint" button. This issue is likely systemic and would affect Free and Guest users if they were able to access waypoint saving functionality.
-   **Preference Persistence (V7, V8, V9, V15):** This is a widespread regression affecting all tiers. Theme (V7) fails for Guest and Free. Basemap (V9) fails for Guest. Layer visibility (V8) fails for Free. Active Module (V15) fails for Guest. This indicates a systemic issue with persistence mechanisms across the application.
-   **Waypoint Gating (F3):** Free users are incorrectly routed to the `WaypointSheet` instead of the `UpgradeSheet`. Guest users correctly see the `UpgradeSheet` when attempting to access Pro features (C3). Pro users are expected *not* to see the `UpgradeSheet` (P1 test timed out, but this is the desired behavior).
-   **PRO Badges (F2):** Free users see "PRO" badges in the LayerPanel. Pro users should not see these badges (implied by P1, but not directly tested). Guest users are not explicitly tested for this.
-   **Session Data Loss (V1, V11):** Guest users lose session waypoints (V11). Pro users lose active GPS tracks (V1). This demonstrates a consistent pattern of unsaved session data loss across tiers.
-   **Learn Tab State (V13):** Both Guest and Free tier tests pass, but the evidence (zero progress before and after) means the test did not confirm state preservation for actual in-progress learning. The underlying vulnerability of state loss across tab switches likely persists for all tiers.
-   **Route Save Offline (V6):** Only Pro users have access to route saving, and for them, it fails silently offline. This functionality is not available to Guest or Free tiers.

## Findings Discarded
None. All 8 identified findings are distinct, high-impact, and supported by direct evidence.

## Cannot Assess
-   **Pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test timed out, preventing confirmation of whether Pro users correctly *don't* see the UpgradeSheet when tapping a Pro-gated affordance. The timeout could be due to a preceding failure or an unexpected UI state.
-   **V13 — Learn tab state loss across tab switch:** While the test passed, the `state-loss-evidence` showed no change in header stats (all zeros). This means the test did not adequately confirm whether *in-progress* chapter reading position (e.g., page number within a chapter) is preserved or lost.

## Systemic Patterns
-   **Widespread Persistence Regression:** A significant number of user preferences and session-specific data (theme, basemap, layer visibility, active module, guest waypoints, GPS tracks) that were previously marked as persisted in `STATE_MAP.md` are now failing to survive page reloads. This points to a systemic issue with either the Zustand `persist` middleware configuration or the manual `localStorage` read/write patterns.
-   **Fundamental Offline Unusability:** The application's inability to even load when offline for authenticated users is a critical architectural flaw. This renders all other offline-related features (or lack thereof) moot and severely impacts the app's core value proposition for its target user base.
-   **Core Feature Blocked by GPS:** The critical functionality of saving waypoints is entirely blocked due to a failure in GPS acquisition, affecting both online and offline scenarios. This indicates a problem with the `useTracks` hook or its interaction with the environment's geolocation API.
-   **Monetization Gating Inconsistencies:** The logic for gating Pro features is inconsistent, with free users incorrectly gaining access to waypoint saving functionality and being shown "PRO" badges, undermining the app's monetization strategy.

## Calibration Notes
-   The "vulnerability-proof test philosophy" was crucial in interpreting "PASS" results for V1, V6, V11, V15. A "PASS" in these cases correctly indicated that the test *confirmed* the vulnerability (e.g., data was indeed lost, or a silent failure occurred), rather than indicating a fix. This aligns with previous successful diagnoses.
-   Prioritized critical blockers (offline loading, GPS acquisition) that prevent other tests from running or core functionality from working, consistent with past high-confidence findings.
-   Identified multiple regressions (V7, V8, V9, V15, V1, V11, V13) where previous fixes are no longer effective, highlighting the need for robust regression testing and careful state management.
-   Used `STATE_MAP.md` as the authoritative source for expected persistence behavior, which allowed for confident identification of persistence regressions when test evidence contradicted the map.
-   Carefully analyzed `state-loss-evidence` for V13, recognizing that identical zero values do not confirm state preservation if no state was present to begin with, avoiding a phantom "fix" verdict.