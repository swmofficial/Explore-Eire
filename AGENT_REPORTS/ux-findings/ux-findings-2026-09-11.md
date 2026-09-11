# UX Agent Report — 2026-09-11

## Run Context
- Commits analysed: `3bd9c888e84ed0e549e20efd92aae63638939dc2` and 19 preceding commits.
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

### 3. High: Widespread Persistence Failures for User Preferences and Session Data (V1, V7, V9, V11, V15 Regression)
- Summary: Multiple user preferences (theme, basemap, layer visibility, active module) and user-generated session data (guest waypoints, session trail) are not persisting across page reloads, despite `STATE_MAP.md` indicating they should be. This represents a significant regression in core state management.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm the `ee_theme` localStorage key is not being written or read.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`, indicating a failure to assert persistence of basemap and layer visibility, respectively.
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact point of failure (read, write, or key management) for each persistence mechanism without deeper code inspection.
- Root cause: The manual localStorage persistence patterns for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` (tasks 008, 002, 006, 013 respectively) are not functioning. The Zustand `persist` middleware for `ee-map-prefs` (basemap, layerVisibility) is also failing. This indicates a systemic issue with localStorage read/write operations or key management.
- User impact: Users lose their customisation, active work, and previously saved temporary data on every reload, leading to frustration and a perception of an unreliable app.
- Business impact: Reduced user satisfaction, lower engagement, and potential data loss for users.
- Fix direction: Thoroughly review and debug all localStorage persistence mechanisms (manual IIFE patterns and Zustand `persist` middleware configurations) across `userStore`, `mapStore`, and `moduleStore`.

### 4. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (F3 Regression)
- Summary: Free tier users are incorrectly allowed to save waypoints directly, bypassing the intended upgrade prompt.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms the WaypointSheet was shown instead of the UpgradeSheet.
- Cannot confirm: If this bypass extends to other Pro-gated features beyond waypoint saving.
- Root cause: The gating logic for the camera button (waypoint creation) is flawed for free users, allowing direct access to `WaypointSheet` instead of triggering `showUpgradeSheet`.
- User impact: Free users can access a premium feature without paying, potentially leading to confusion if they later hit other Pro-gated features.
- Business impact: Direct loss of potential conversions from free to Pro users, undermining the freemium model.
- Fix direction: Correct the conditional rendering or routing logic for the camera button to ensure free users are directed to the `UpgradeSheet`.

### 5. Medium: Pro Users May See UpgradeSheet on Pro Affordance Tap (P1 Regression)
- Summary: Pro users are incorrectly shown the UpgradeSheet when interacting with a Pro-gated feature, despite already having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This test is designed to confirm Pro users *do not* see the UpgradeSheet. A timeout suggests the test couldn't proceed as expected, possibly because the UpgradeSheet *did* appear, blocking further interaction, or the expected Pro action didn't occur.
- Cannot confirm: Whether the UpgradeSheet explicitly appeared or if another issue caused the timeout. Screenshots are not provided for this specific failure.
- Root cause: Potential flaw in the `isPro` check or the gating logic for Pro features, leading to an incorrect display of the `UpgradeSheet` for paying users.
- User impact: Frustration and confusion for paying Pro users who are incorrectly prompted to upgrade.
- Business impact: Erodes trust in the subscription model and app functionality, potentially leading to cancellations.
- Fix direction: Review the `isPro` check and conditional rendering logic for Pro-gated features to ensure `UpgradeSheet` is only shown to non-Pro users.

### 6. Medium: Offline Data Writes Fail Silently or With Generic Toasts (V3, V4, V6, V14 Confirmed)
- Summary: User-generated data (tracks, routes, waypoints) fails to save when offline, with either no user feedback (routes) or generic toasts (waypoints, tracks) and no retry mechanism or local queue.
- Tier(s) affected: Pro (inferred All for data writes)
- Confidence: HIGH
- Evidence:
    - `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` (no pre-save warning).
    - `pro V4` passed (track save fails offline, confirming the vulnerability).
    - `pro V6` passed (route save offline produces no user-facing toast, confirming the vulnerability).
    - `STATE_MAP.md` confirms: "Save waypoint" fails with toast "Could not save waypoint", "Save track" fails with toast "Could not save track", "Save route" fails with "console.error only, no toast". All result in data loss.
- Cannot confirm: The exact content of the toasts for V3/V4 without screenshots or specific annotations.
- Root cause: Complete lack of offline data persistence and sync queue mechanisms. All data writes are directly to Supabase, failing on network absence. This violates "Offline-First Design" principles (local-first writes, sync queue).
- User impact: Users lose valuable field data collected offline, leading to significant frustration and loss of trust.
- Business impact: Critical for a field-based app; directly impacts data integrity, user retention, and the app's core value proposition.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store and retry failed writes when connectivity is restored. Provide clear UI feedback on sync status.

## Tier Comparison

*   **Offline App Loading (V2, V10):** The Pro tier completely fails to load the app shell when offline (`net::ERR_INTERNET_DISCONNECTED`). This behaviour is likely identical for Free users as it's a core app loading issue, but cannot be confirmed without specific Free tier offline tests. Guest users are not authenticated, so V10 (Pro status reversion) is not applicable, and V2 (gold/mineral data) might manifest differently or be less critical for them if they don't rely on authenticated data.
*   **GPS Acquisition Failure (P3, V3):** The "Acquiring GPS..." issue preventing waypoint saves is observed in the Pro tier. This is likely a universal bug affecting all tiers attempting to use location services for waypoint creation.
*   **Persistence Failures (V1, V7, V8, V9, V11, V15):** Persistence issues are widespread and affect all tiers for different types of data/preferences (theme, basemap, layer visibility, active module, session waypoints, session trail), pointing to a systemic problem with localStorage read/write operations or Zustand persist configuration.
*   **Learn Tab State (V13, F4):** The Learn tab state (header stats) *does not* regress across tab switches for both Guest and Free tiers. This confirms the fix for V13 is working correctly across these tiers.
*   **Pro Badges (F2):** Free users correctly see PRO badges in the LayerPanel, as expected.
*   **Upgrade Gating (F3, C3, P1):** Guest users correctly see the UpgradeSheet (C3). Free users *incorrectly* bypass the UpgradeSheet and can save waypoints (F3). Pro users *incorrectly* might see the UpgradeSheet (P1 timeout suggests this). This indicates inconsistent and flawed gating logic across tiers.
*   **Offline Data Writes (V3, V4, V6, V14):** All confirmed vulnerabilities (no pre-save warning, track save fails, route save silent failure) are observed in the Pro tier. These behaviours are expected to be identical across all tiers as they stem from a fundamental lack of offline data capabilities.

## Findings Discarded
- No findings were discarded in this run, as all identified issues met the confidence and impact criteria and were within the maximum limit of 8 findings.

## Cannot Assess
- The exact reason for the `pro P1` timeout (whether the `UpgradeSheet` explicitly appeared or if another issue caused the timeout).
- The behaviour of Free users when the app fails to load offline (V2, V10), as specific tests for this were not run for the Free tier.
- The specific content of toasts for offline data write failures (V3, V4, V6) without more detailed annotations or screenshots.

## Systemic Patterns
1.  **Critical Offline Functionality Gap:** The app fundamentally fails to load or save data offline, making it unusable in its primary target environment. This is a recurring and critical issue (V2, V10, V3, V4, V6, V14).
2.  **Widespread Persistence Regression:** Multiple localStorage persistence mechanisms (both manual and Zustand `persist`) are failing across various user preferences and session data (V1, V7, V8, V9, V11, V15). This suggests a core issue with how state is being saved and restored.
3.  **Flawed Gating Logic:** The logic for determining user tier and routing to upgrade prompts versus feature access is inconsistent and incorrect across different tiers (F3, P1).
4.  **GPS Acquisition Instability:** The GPS acquisition process appears unreliable, blocking core functionality like waypoint saving (P3, V3).

## Calibration Notes
- The "Vulnerability-Proof Test Philosophy" is proving effective. Tests passing for V1, V11, V15, V3, V4, V6, V14 directly confirm the vulnerabilities, as intended by the test design. This allows for high-confidence findings even on "passed" tests.
- The `state-loss-evidence` annotation for V13 and F4, showing identical `before` and `after` stats, clearly indicates that the previous fix for V13 (preserving Learn tab state) is working correctly. This reinforces the importance of detailed annotations for nuanced test outcomes.
- The recurrence of "Critical: App Fails to Load Offline" (V2, V10) and "Critical: GPS Acquisition Failure" (P3, V3) highlights persistent, high-impact issues that require immediate attention.
- The "Widespread Persistence Failures" finding is a new, broad category encompassing several previously "CONFIRMED" fixes (V1, V7, V11, V15) that now appear to be regressed or never fully implemented correctly. This suggests a need for a more holistic review of persistence mechanisms rather than isolated fixes.