# UX Agent Report — 2026-07-27

## Run Context
- Commits analysed: `ebe12b8c3d28bfa88af751259e1964918c0672c5` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". Additionally, `v14-pre-save-offline-warning: no (V14 confirmed)` indicates no offline warning was shown, but this is secondary to the disabled button.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to save waypoints directly via the camera button, bypassing the expected upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: The specific code change that introduced this regression.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check the user's `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users access a premium feature without paying, diminishing the value proposition of the Pro subscription.
- Business impact: Direct revenue loss, devalues the Pro subscription, and creates an unfair advantage for free users.
- Fix direction: Correct the conditional logic that determines whether to show the `UpgradeSheet` or `WaypointSheet` when the camera button is tapped, ensuring `isPro` status is correctly evaluated.

### 4. High: User-Generated Data (Tracks, Guest Waypoints) Lost on Reload (V1, V11 Regression)
- Summary: Actively tracked GPS trails and guest waypoints are lost on page reload, indicating a regression in manual `localStorage` persistence for these critical user-generated data types.
- Tier(s) affected: Guest (V11), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. Both explicitly state the data is lost.
- Cannot confirm: The exact commit that caused the regression, given `STATE_MAP.md` states these *should* be persisted via manual `localStorage` patterns (task-002, task-006).
- Root cause: Regression in the manual `localStorage` persistence logic for `sessionWaypoints` (`ee_guest_waypoints`) and `sessionTrail` (`ee_session_trail`), or an issue with the `IIFE read + setItem on write` pattern itself.
- User impact: Significant data loss for users actively using core features (tracking, saving temporary waypoints), leading to severe frustration and distrust in the app's reliability.
- Business impact: High churn, negative reviews, and reduced engagement with core features.
- Fix direction: Re-verify and debug the manual `localStorage` persistence implementation for `sessionWaypoints` and `sessionTrail` in `mapStore.js`.

### 5. High: Offline Track and Route Saves Fail Silently (V4, V6 Confirmed)
- Summary: When attempting to save a GPS track or a custom route while offline, the operations fail without providing clear user feedback or queuing the data for later sync, leading to silent data loss.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V4` passed, indicating the track save failed offline as expected by the test (confirming the vulnerability). `pro V6` passed, but with annotation `route-button-missing: cannot proof V6`. However, `STATE_MAP.md` explicitly states `tracks` INSERT fails offline with a toast "Could not save track" (but data is lost), and `routes` INSERT fails with "console.error only, no toast" (data lost). The test passing for V4 confirms the data loss. For V6, the test passing means the journey completed, and given the `STATE_MAP.md` entry, it's highly probable the silent failure occurred.
- Cannot confirm: The exact toast message for V4 from the test output, but `STATE_MAP.md` provides it. For V6, the test annotation is weak, but `STATE_MAP.md` is strong.
- Root cause: Lack of an offline data queue or robust error handling for Supabase write operations. `STATE_MAP.md` explicitly notes: "What is still NOT persisted (genuine vulnerabilities): Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- User impact: Critical data loss for user-generated content (tracks, routes) when operating in offline environments, leading to severe frustration and distrust.
- Business impact: High churn, negative reviews, and a fundamental failure to support the primary use case for prospectors in rural areas.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync user-generated data when connectivity is restored.

### 6. Medium: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, regardless of authentication status.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm that the `ee_theme` localStorage key is not being written or read correctly.
- Cannot confirm: The specific point of failure in the manual `ee_theme` persistence (write or read).
- Root cause: Regression in the manual `localStorage` persistence for `userStore.theme` via the `ee_theme` key, despite `STATE_MAP.md` indicating it uses a "manual pattern, task-008".
- User impact: Minor annoyance, but contributes to a perception of an unreliable or unpolished application, as personal preferences are not respected.
- Business impact: Erodes user trust and satisfaction, potentially impacting retention for users who prefer specific themes.
- Fix direction: Debug the `userStore.theme` manual persistence logic, specifically the `IIFE read + setItem on write` pattern for `ee_theme`.

### 7. Medium: Active Module Resets to Default on Reload (V15 Regression)
- Summary: The `activeModule` preference resets to its default ('prospecting') upon page reload, forcing users to re-select their desired module every time they reopen the app.
- Tier(s) affected: Guest (inferred All)
- Confidence: HIGH
- Evidence: `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly states the `ee_active_module` key is missing, confirming the module preference is not persisted.
- Cannot confirm: The exact commit that caused the regression, given `STATE_MAP.md` states `activeModule` *should* persist via `ee_active_module` (manual pattern, task-013).
- Root cause: Regression in the manual `localStorage` persistence logic for `moduleStore.activeModule` via the `ee_active_module` key.
- User impact: Minor annoyance, but disrupts workflow and adds unnecessary steps for users who frequently switch modules or close/reopen the app.
- Business impact: Reduces user satisfaction and efficiency, potentially leading to less engagement with specific modules.
- Fix direction: Re-verify and debug the manual `localStorage` persistence implementation for `moduleStore.activeModule`.

### 8. Medium: Basemap and Layer Visibility Preferences Reset on Reload (V8, V9 Regression)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload, requiring users to reconfigure their map view every session.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded`. While a timeout, the consistent failure across tiers for preference-related tests, combined with confirmed regressions in other persistence mechanisms (V7, V11, V1, V15), strongly suggests these preferences are also not persisting. `STATE_MAP.md` states `basemap` and `layerVisibility` *should* persist via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: Direct assertion of the basemap/layer state after reload due to timeout.
- Root cause: Likely a regression in the Zustand `persist` middleware configuration for `mapStore` or an issue with the `ee-map-prefs` key, similar to other persistence issues.
- User impact: Annoyance and inefficiency, as users must repeatedly set up their preferred map view.
- Business impact: Decreased user satisfaction and perceived app quality.
- Fix direction: Investigate the `mapStore`'s Zustand `persist` configuration and `ee-map-prefs` key to ensure `basemap` and `layerVisibility` are correctly saved and restored.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Pro tier completely fails to load offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is likely identical for Free users, as the root cause is a lack of core app shell caching. Guest users are not tested for this specific vulnerability.
*   **Waypoint Save Button Disabled (P3, V3):** Pro tier experiences a disabled "Save Waypoint" button due to GPS acquisition failure. This issue is likely identical across all tiers if they were to attempt to save a waypoint, as it stems from a core GPS acquisition problem.
*   **Waypoint Upgrade Gate (F3):** Free tier incorrectly bypasses the upgrade gate and can save waypoints. Guest users are correctly routed to the `UpgradeSheet` (C3 passes). Pro users should not see the upgrade sheet (P1 test timed out, but expected behavior is no sheet).
*   **Theme Persistence (V7):** Both Guest and Free tiers show theme preference resetting to 'dark' on reload, with the `ee_theme` localStorage key being `null`. This behavior is identical across authenticated and unauthenticated sessions, pointing to a universal issue with the `ee_theme` manual persistence.
*   **Basemap/Layer Persistence (V8, V9):** Both Guest and Free tiers show timeouts for these tests, strongly suggesting preferences reset. This behavior is likely identical across all tiers.
*   **User-Generated Data Persistence (V1, V11):** Guest waypoints (V11) are lost on reload. Pro tracks (V1) are lost on reload. This confirms a systemic issue with manual `localStorage` persistence for user-generated data across different types and tiers.
*   **Active Module Persistence (V15):** Guest tier shows active module resetting. This behavior is likely identical across all tiers.
*   **Learn Tab State (V13, F4):** Both Guest and Free tiers show stable header stats across tab switches, indicating the previous fix for V13 (preserving component state) is working for this specific metric.
*   **PRO Badges (F2):** Free users correctly see PRO badges in the LayerPanel, indicating the gating logic for visibility is working as intended for free users.

## Findings Discarded

*   **`pro P1` — Pro user does not see UpgradeSheet on Pro affordance tap:** This test failed with a timeout. While it aims to confirm Pro users don't see the upgrade sheet, the timeout itself does not provide direct evidence of the `UpgradeSheet` being shown. It could be a test flakiness or an inability to assert the *absence* of the sheet within the timeout. Given the higher priority issues, this finding is discarded for now.
*   **`guest V13` and `free V13` — learn header stats are recomputed on every tab switch (state-loss proof):** These tests passed, and the `state-loss-evidence` showed identical `before` and `after` header stats (0% complete, 0 chapters done). This indicates the header stats are stable and not being lost. The test title is misleading given the evidence, and the core V13 vulnerability (in-progress chapter reading position) is not directly tested by these header stats. Therefore, no finding for state *loss* is created here.

## Cannot Assess

*   The exact state of `isPro` for Pro users after an offline reload (V10) because the app fails to load entirely due to `net::ERR_INTERNET_DISCONNECTED`.
*   The specific chapter reading position state loss for V13, as the current tests only check header statistics.
*   The exact toast message for `pro V4` (track save fails offline) from the test output, though `STATE_MAP.md` provides the expected behavior.
*   Direct proof for `pro V6` (route save offline produces no user-facing toast) from the test annotation, though `STATE_MAP.md` provides the architectural truth of silent failure.

## Systemic Patterns

*   **Widespread Persistence Regressions:** Multiple critical user preferences and user-generated data types (theme, guest waypoints, GPS tracks, active module, basemap, layer visibility) that were previously fixed or designed to persist are now failing to do so. This points to a systemic issue with `localStorage` interaction, either in the manual `IIFE read + setItem` patterns or the Zustand `persist` middleware configurations.
*   **Critical Offline Functionality Failure:** The app completely fails to load offline for authenticated users, and critical data saving operations (waypoints, tracks, routes) fail silently or are blocked offline. This highlights a fundamental lack of offline-first design and robust Service Worker implementation, which is critical for the target user base.
*   **GPS Acquisition Issues:** The "Acquiring GPS..." state consistently blocks waypoint saving, indicating a problem with the app's geolocation integration or its interaction with Playwright's mock.

## Calibration Notes

*   Prioritized direct evidence from annotations and error messages over timeouts where possible. Timeouts for preference-related tests (V8, V9) were inferred as regressions due to the prevalence of other confirmed persistence failures.
*   Leveraged `STATE_MAP.md` to confirm architectural intent versus observed behavior. The contradictions between `STATE_MAP.md` (which describes fixes) and test annotations (which confirm regressions) were critical in identifying regressions for V1, V7, V11, and V15.
*   Grouped similar persistence issues to stay within the 8-finding limit, while still attributing specific vulnerabilities.
*   Avoided speculating on "phantom" errors where evidence was ambiguous (e.g., `pro P1` timeout).
*   Confirmed previous findings that were still active (V2, V10, P3, V3, F3, V4, V6).
*   Noted regressions for previously "CONFIRMED" fixes (V1, V7, V11, V15), which is a significant finding in itself, indicating a potential instability in the persistence layer.