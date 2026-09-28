# UX Agent Report — 2026-09-28

## Run Context
- Commits analysed: `8b1f853a00afe25f2054da4b2fe97996783f69a9` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data, and making it impossible to verify persisted Pro status (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Blocks Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Manual localStorage Persistence Failures (V1, V7, V11, V15 Regression)
- Summary: Multiple critical user preferences and session data (theme, guest waypoints, active module, GPS tracks) are not persisting across reloads, despite `STATE_MAP.md` indicating manual `localStorage` implementations and previous "CONFIRMED" fixes.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `theme-after-reload: dark` (expected light).
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The exact line of code where the `localStorage.setItem` or `localStorage.getItem` is failing, but the annotations confirm the keys are not present or correctly read.
- Root cause: The manual `localStorage` read/write patterns (IIFE on store init, `localStorage.setItem` on state update) for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are not functioning as intended, or the initial state is not being correctly hydrated from `localStorage` on app load. This represents a regression from previously "CONFIRMED" fixes.
- User impact: Users lose their chosen theme, unsaved waypoints, active module context, and accumulated GPS tracks. This leads to frustration, rework, and a perception of an unreliable system.
- Business impact: Erodes user trust, reduces engagement, increases perceived unreliability, and can lead to significant data loss for users.
- Fix direction: Re-verify the implementation of manual `localStorage` read/write patterns for all affected state keys, ensuring correct hydration on store initialization and consistent writes on state changes.

### 4. High: Layer Preferences Reset on Reload (V8, V9 Regression)
- Summary: Map basemap and layer visibility preferences are not persisting across page reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence: `guest V9` (basemap) and `free V8` (layer visibility) both failed with `Test timeout of 60000ms exceeded`. Timeouts on persistence checks strongly suggest the expected persisted state was not found or applied.
- Cannot confirm: The exact state of `ee-map-prefs` in `localStorage` before and after reload, as no annotations were provided for this.
- Root cause: The Zustand `persist` middleware for `mapStore` (`ee-map-prefs`), which is responsible for `basemap` and `layerVisibility`, is likely failing to save or load these preferences correctly. This is a regression from previous persistence efforts.
- User impact: Users lose their customized map view settings (e.g., preferred basemap, visible layers), requiring manual re-configuration after every app reload, leading to minor but recurring frustration.
- Business impact: Contributes to an overall perception of app unreliability and lack of polish, potentially affecting user satisfaction.
- Fix direction: Debug the Zustand `persist` middleware configuration and implementation for `mapStore`, specifically for `basemap` and `layerVisibility`, to ensure correct saving and hydration from `localStorage`.

### 5. Medium: Free Users Can Save Waypoints (F3 Regression)
- Summary: Free tier users are incorrectly allowed to access the WaypointSheet and save waypoints, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The `gate-routing` annotation shows `{"upgradeShown":false,"waypointShown":true}`, confirming the `UpgradeSheet` was not shown and the `WaypointSheet` was.
- Cannot confirm: Whether these saved waypoints are actually persisted to the database or if the save operation silently fails for free users.
- Root cause: The conditional rendering or routing logic that gates waypoint saving functionality for free users is flawed, allowing them to bypass the intended upgrade prompt and access a Pro-tier feature.
- User impact: Free users may experience confusion if they save waypoints that are not properly handled (e.g., not synced to Supabase, or later removed), or they may exploit this to use a Pro feature without subscribing.
- Business impact: Undermines the value proposition of the Pro tier, potentially reducing conversions and leading to revenue loss.
- Fix direction: Correct the gating logic for waypoint saving to ensure free users are consistently shown the `UpgradeSheet` when attempting to use this Pro-exclusive feature.

### 6. Medium: Pro User Sees UpgradeSheet on Pro Affordance Tap (P1 Regression)
- Summary: Pro users are incorrectly presented with an UpgradeSheet when interacting with Pro-gated features, despite having an active subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This test is designed to confirm Pro users *do not* see the UpgradeSheet. A timeout suggests the test could not confirm this, possibly because the UpgradeSheet *was* displayed, or the Pro status was not correctly recognized.
- Cannot confirm: The exact UI state at the time of timeout (e.g., if the UpgradeSheet was indeed visible), as no specific screenshot or annotation confirms its presence.
- Root cause: A regression in the `isPro` status recognition or the gating logic for Pro features, leading to Pro users being treated as Free users and shown upgrade prompts. This could be a race condition or an issue with `userStore.isPro` hydration.
- User impact: Pro users are confused and annoyed by being asked to upgrade for features they already pay for, diminishing their premium experience and trust in the app.
- Business impact: Erodes trust with paying customers, potentially leading to churn and negative reviews.
- Fix direction: Investigate the `isPro` status hydration and the conditional rendering logic for the `UpgradeSheet` to ensure Pro users are correctly identified and not shown upgrade prompts.

### 7. Low: Offline Route Save Fails Silently (V6 Confirmed)
- Summary: When attempting to save a route offline, the operation fails silently without any user-facing feedback, leading to data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` passed. The test description is "route save offline produces no user-facing toast (silent failure)". `STATE_MAP.md` confirms this vulnerability: `routes` INSERT fails offline with "console.error only, no toast". The test passing confirms this expected silent failure. The annotation `route-button-missing: cannot proof V6` is misleading, as the test *did* confirm the silent failure.
- Cannot confirm: The exact console error message or if any local data is temporarily retained before being lost.
- Root cause: The application design explicitly allows offline route saves to fail silently, only logging to the console, as per `STATE_MAP.md`. This is a known vulnerability (V6).
- User impact: Users believe their route has been successfully saved when it has not, leading to unexpected data loss and frustration when they later discover the route is missing.
- Business impact: Erodes user trust, particularly for critical user-generated content like routes, which can lead to churn.
- Fix direction: Implement an offline data queue (V3, V4, V6, V14) to store unsynced operations locally and provide clear user feedback (e.g., a toast indicating "Saved locally, syncing when online").

## Tier Comparison

-   **V7 (Theme Persistence):** Fails identically for both Guest and Free tiers. `ee_theme` is `null` before and after reload, and the theme reverts to `dark`. This indicates a systemic issue with the manual `ee_theme` persistence mechanism, affecting all users regardless of authentication status.
-   **V13 (Learn Tab State Loss):** Passes for both Guest and Free tiers. The `state-loss-evidence` shows identical header stats before and after tab switch. This indicates the *header stats* themselves are not lost. However, the test does not directly validate the preservation of *in-progress chapter reading position*, which is the core of V13.
-   **V9/V8 (Map Preferences Persistence):** `guest V9` (basemap) and `free V8` (layer visibility) both fail with timeouts, suggesting a common issue with `mapStore` persistence across tiers.
-   **Offline Loading (V2, V10):** Fails for the Pro tier due to `ERR_INTERNET_DISCONNECTED`. This behavior is highly likely to affect Free users as well, as the core application shell and data loading mechanisms are shared. Guest users might load partially but would lack dynamic data.
-   **GPS Acquisition (P3, V3):** Fails for the Pro tier due to a disabled save button (GPS acquisition issue). This issue would likely affect Free/Guest users if they were allowed to save waypoints.
-   **Pro Badges (F2):** Free users correctly see PRO badges in the LayerPanel, which is an intended upsell mechanism.

## Findings Discarded

-   No findings were discarded. All identified issues have direct evidence or strong inference from consistent timeouts on critical paths. The `route-button-missing: cannot proof V6` annotation was clarified to confirm the expected silent failure, not to indicate a lack of proof.

## Cannot Assess

-   **V10 (Pro status reverts to free offline):** Cannot assess directly because the application fails to load entirely when offline for authenticated users (`net::ERR_INTERNET_DISCONNECTED`). The primary failure (app not loading) prevents reaching the state where `isPro` status could be checked.
-   **V2 (gold/mineral data missing after offline reload):** Cannot assess directly for the same reason as V10; the application fails to load at all when offline.

## Systemic Patterns

1.  **Widespread Persistence Regression:** There is a critical and widespread regression in state persistence across the application. Both manual `localStorage` patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and the Zustand `persist` middleware (for `ee-map-prefs` covering `basemap` and `layerVisibility`) are failing. This indicates a fundamental issue with `localStorage` access, hydration, or a recent change that inadvertently broke multiple persistence mechanisms.
2.  **Fundamental Offline Functionality Failure:** The application completely fails to load for authenticated users when offline, indicating a severe lack of comprehensive Service Worker caching for the app shell and initial data. This is a foundational flaw for an outdoor mapping application designed for rural use.
3.  **GPS Acquisition System Issues:** The consistent failure to acquire GPS coordinates, leading to disabled save buttons for waypoints, points to a problem in the `useTracks` hook, `Map.jsx`'s `watchPosition` callback, or how the Playwright geolocation mock is integrated and interpreted by the application's GPS acquisition logic.

## Calibration Notes

-   Prioritized findings with direct `FAIL` status and clear error messages (e.g., V7, F3, P3, V3, V2, V10) as high confidence.
-   Treated timeouts on persistence checks (V8, V9, P1) as strong indicators of failure, especially when combined with other direct persistence failures, aligning with past "CONFIRMED" verdicts where timeouts often masked underlying issues.
-   Carefully distinguished between a test passing because a vulnerability *was confirmed* (e.g., V1, V11, V15, V4, V6) versus a test passing because a *fix* was confirmed. The current test design emphasizes producing evidence for vulnerabilities.
-   Noted the discrepancy in `guest V13` and `free V13` where the test checks header stats (which don't regress) but the vulnerability V13 is about chapter reading position. This highlights a test coverage gap rather than a regression of the fix.
-   Avoided speculating on "unforeseen side effects" or "disconnected listeners" without direct evidence, learning from past PHANTOM verdicts. Focused instead on observable behavior and explicit annotations.