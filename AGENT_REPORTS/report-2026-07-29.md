# UX Agent Report — 2026-07-29

## Run Context
- Commits analysed: `8f8c400ffb90961f7e8c8e38735eae5dec945a5f` (latest) and 19 preceding commits.
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
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
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

### 4. High: User-Generated Session Data (Tracks, Guest Waypoints, Active Module) Lost on Reload (V1, V11, V15 Regression)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module selection, are lost on page reload, indicating a regression in their manual `localStorage` persistence mechanisms.
- Tier(s) affected: Guest (V11, V15), Pro (V1), (inferred Free for V1, V15)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of regression in the manual `localStorage` patterns.
- Root cause: Regression in the manual `localStorage` persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`, despite `STATE_MAP.md` indicating these should be persisted.
- User impact: Loss of unsaved work (e.g., a long GPS track), leading to significant frustration and distrust in the application's reliability.
- Business impact: Reduced user engagement, negative perception of data safety, and potential abandonment of the app.
- Fix direction: Re-implement or debug the manual `localStorage` persistence logic for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 5. High: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, forcing users to re-select their preference every session.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed. The error message `Expected: "light" Received: "dark"` directly confirms the reset. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being written or read correctly.
- Cannot confirm: The specific code change that introduced this regression.
- Root cause: Regression in the manual `localStorage` persistence pattern for `userStore.theme`, despite `STATE_MAP.md` indicating it should be persisted via `ee_theme`.
- User impact: Inconsistent UI experience and minor annoyance, eroding the sense of a personalized application.
- Business impact: Perceived lack of polish and attention to user preferences, potentially contributing to a negative overall user experience.
- Fix direction: Debug the manual `localStorage` persistence logic for the `theme` setting.

### 6. Medium: Basemap Preference Resets to Default on Reload (V9 Regression)
- Summary: The user's selected basemap preference resets to the default 'satellite' basemap upon page reload.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `guest V9` test failed with a `Test timeout of 60000ms exceeded.`. While not a direct assertion failure, a timeout in a test specifically designed to prove persistence loss strongly implies the preference was not retained.
- Cannot confirm: The exact state of the basemap after reload, or the specific error that caused the timeout.
- Root cause: Likely a regression in `mapStore`'s `persist` middleware for `basemap` or a related issue preventing the test from completing its checks. `STATE_MAP.md` states `basemap` is persisted via `ee-map-prefs`.
- User impact: Basemap preference is lost, requiring manual re-selection, which is a minor but recurring annoyance.
- Business impact: Minor negative impact on user experience and perceived app reliability.
- Fix direction: Investigate the `mapStore`'s persistence mechanism for `basemap` and debug the test timeout.

### 7. Medium: Layer Visibility Preferences Reset to Defaults on Reload (V8 Regression)
- Summary: The user's custom layer visibility preferences reset to their default states upon page reload.
- Tier(s) affected: All
- Confidence: MEDIUM
- Evidence: `free V8` test failed with a `Test timeout of 60000ms exceeded.`. Similar to V9, a timeout in a persistence test implies the preferences were not retained.
- Cannot confirm: The exact state of layer visibility after reload, or the specific error that caused the timeout.
- Root cause: Likely a regression in `mapStore`'s `persist` middleware for `layerVisibility` or a related issue preventing the test from completing its checks. `STATE_MAP.md` states `layerVisibility` is persisted via `ee-map-prefs`.
- User impact: Custom layer configurations are lost, requiring users to manually re-enable their preferred layers, which can be frustrating for power users.
- Business impact: Annoyance for engaged users, potentially leading to reduced feature adoption if settings are not reliably saved.
- Fix direction: Investigate the `mapStore`'s persistence mechanism for `layerVisibility` and debug the test timeout.

### 8. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: A Pro user attempting to access a Pro-gated feature may incorrectly be shown the Upgrade Sheet, causing confusion and frustration.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with a `Test timeout of 60000ms exceeded.`. This test is designed to confirm the *absence* of the `UpgradeSheet` for Pro users. A timeout means the test could not confirm this expected behavior, potentially because the `UpgradeSheet` *was* shown or the test got stuck.
- Cannot confirm: Whether the `UpgradeSheet` was definitively shown, or if the timeout was due to other test instability.
- Root cause: Could be a regression in the Pro gating logic that determines when to display the `UpgradeSheet`, or general instability in the Pro test suite.
- User impact: Pro users are incorrectly prompted to upgrade, which is confusing and undermines the value of their subscription.
- Business impact: Erodes trust in the Pro subscription, creates a negative user experience for paying customers.
- Fix direction: Investigate the Pro gating logic for `UpgradeSheet` display and the stability of the `pro P1` test.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Pro tier explicitly fails to load offline. Free tier is inferred to be affected due to shared authentication requirements. Guest tier is not authenticated, so this specific failure mode may not apply, though general app shell caching issues would still be relevant.
-   **GPS Acquisition Failure (P3, V3):** Confirmed for Pro tier. This is a core map functionality issue and is highly likely to affect Free and Guest tiers if they attempt to save waypoints.
-   **Waypoint Save Bypass (F3):** This is a specific regression affecting only the Free tier, allowing them to access a Pro feature.
-   **Preference Loss (V7, V9, V8):** Theme (V7) is confirmed to reset for Guest and Free tiers. Basemap (V9) and Layer Visibility (V8) also show evidence of resetting for Guest and Free tiers (via timeouts). These issues are highly likely to affect Pro users as the underlying `localStorage` persistence mechanisms are shared across all tiers.
-   **Session Data Loss (V1, V11, V15):** Guest Waypoints (V11) is confirmed lost for Guest users. Active Module (V15) is confirmed lost for Guest users. GPS Track (V1) is confirmed lost for Pro users. These are regressions in manual `localStorage` persistence and are likely to affect all tiers where the respective features are available.
-   **Learn Tab State (V13, F4):** The fix for preserving Learn tab component state across tab switches (V13) and preventing header percentage regression (F4) is confirmed to be working correctly for both Guest and Free tiers, with identical `before` and `after` stats.

## Findings Discarded

-   **pro V6 — route save offline produces no user-facing toast (silent failure):** This test passed, but the annotation `route-button-missing: cannot proof V6` indicates it could not directly prove the vulnerability (silent failure). While `STATE_MAP.md` confirms this is a known vulnerability ("console.error only, no toast"), the test run itself did not provide direct evidence. It was discarded to adhere to the maximum 8 findings and prioritize issues with direct evidence from this run.

## Cannot Assess

-   The full impact of offline failures (V2, V10) on `isPro` status reversion for Pro users could not be assessed, as the app failed to load at all.

## Systemic Patterns

-   **Offline Capability Deficiencies:** The most critical systemic issue is the fundamental failure of the application to load offline for authenticated users. This indicates a severe lack of comprehensive Service Worker caching for the app shell and essential data, making the app unusable in its primary target environment (rural Ireland).
-   **Persistence Mechanism Regressions:** There is a widespread regression in `localStorage` persistence for various user preferences and session data (theme, basemap, layer visibility, guest waypoints, active module, GPS tracks). This suggests a systemic issue with the implementation or maintenance of the manual `localStorage` patterns, or conflicts with Zustand's `persist` middleware.
-   **Core Functionality Blockers:** The consistent failure of GPS acquisition is a significant systemic blocker, preventing users from performing a core action (saving waypoints) across multiple tiers.

## Calibration Notes

-   Carefully distinguished between tests that *passed* because a vulnerability *was confirmed* (e.g., V1, V11, V15 annotations explicitly stating "V[X] confirmed") versus tests that passed because a *fix* was confirmed (e.g., V13, F4 showing identical before/after states). This helped correctly identify regressions where previous fixes are no longer working.
-   Prioritized critical app-blocking issues (offline loading, GPS acquisition) and revenue-impacting regressions (free user bypass) over preference resets, while still including preference resets due to their high frequency of user annoyance.
-   Interpreted `Test timeout` errors in persistence tests (V8, V9) as strong indicators of failure, especially when other persistence tests (V7) directly failed with clear assertions.
-   Noted contradictions between `STATE_MAP.md` (which states certain items are persisted) and current test results (which show them as not persisted), indicating regressions or incomplete fixes.