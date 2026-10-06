# UX Agent Report — 2026-10-06

## Run Context
- Commits analysed: `dacd719d00ccd7aee8da0155e8564048a187acce` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free/Guest, as it's an app-level loading issue)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' (V10) or if gold/mineral data would be missing (V2) *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by Persistent GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also masks offline save failures.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` confirms the lack of an offline warning, but the primary issue is the disabled button.
- Cannot confirm: If the offline save would truly fail silently (V3) or if the pre-save warning (V14) would appear, as the button is never enabled to trigger these paths.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated and the save button enables when location is acquired.

### 3. Critical: Free Users Can Create Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to create waypoints, bypassing the intended upgrade gate for a Pro feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was `false` and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet is visible.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the gate.
- Root cause: The logic gating waypoint creation for free users is flawed. Instead of showing the `UpgradeSheet`, the app proceeds to show the `WaypointSheet`. This is a business logic error in the `useWaypoints` hook or the `CornerControls` component.
- User impact: Free users can attempt to use a premium feature, only to potentially hit a failure later, leading to frustration and a poor user experience.
- Business impact: Direct loss of potential conversions from free to Pro users, as the primary upgrade incentive (saving waypoints) is bypassed.
- Fix direction: Correct the conditional rendering logic for the waypoint creation flow to ensure `UpgradeSheet` is shown for free users when attempting to save a waypoint.

### 4. High: Systemic Regression in Manual LocalStorage Persistence (V1, V7, V11, V15)
- Summary: Multiple critical user preferences and session data, intended to be persisted via manual localStorage patterns, are consistently lost on page reload across all tiers, indicating a systemic regression in the persistence mechanism.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, `theme-after-reload: dark` (expected `light`). This confirms `userStore.theme` is not persisted via `ee_theme`.
    - `guest V11` passed (but confirms vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms `mapStore.sessionWaypoints` is not persisted via `ee_guest_waypoints`.
    - `guest V15` passed (but confirms vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms `moduleStore.activeModule` is not persisted via `ee_active_module`.
    - `pro V1` passed (but confirms vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms `mapStore.sessionTrail` is not persisted via `ee_session_trail`.
- Cannot confirm: The exact line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing, but the evidence points to the keys being absent or null.
- Root cause: The "manual IIFE + write pattern" for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` (as described in `STATE_MAP.md` for tasks 002, 006, 008, 013) is either incorrectly implemented, has regressed, or is being overwritten. This contradicts previous "CONFIRMED" fixes for V1, V7, V11, V15.
- User impact: Significant frustration as user interface preferences (theme, active module) and critical user-generated data (guest waypoints, active GPS tracks) are lost on every page reload, leading to a perception of an unreliable and broken application.
- Business impact: High churn due to data loss, negative user reviews, and reduced engagement with core features like tracking and waypoint logging.
- Fix direction: Re-verify the implementation of the manual localStorage persistence patterns for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` to ensure data is correctly written and read across reloads.

### 5. Medium: Basemap and Layer Visibility Preferences Reset on Reload (V8, V9)
- Summary: User preferences for basemap selection and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: MEDIUM (due to timeouts, but strong inference)
- Evidence:
    - `guest V9` failed with `Test timeout of 60000ms exceeded.`. This implies the basemap was not in the expected 'light' state after reload.
    - `free V8` failed with `Test timeout of 60000ms exceeded.`. This implies layer visibility was not in the expected state after reload.
- Cannot confirm: The exact final state of the basemap and layer visibility due to the timeouts. However, timeouts in these specific tests strongly suggest the expected persisted state was not found.
- Root cause: `STATE_MAP.md` lists `mapStore.basemap` and `mapStore.layerVisibility` as "Persisted fields" via `ee-map-prefs` using Zustand `persist` middleware. The timeouts suggest that either the `ee-map-prefs` key is not being correctly written/read, or the Zustand `persist` middleware itself is failing for these specific fields.
- User impact: Users must re-select their preferred basemap and re-enable desired layers after every page reload, leading to minor but repetitive frustration.
- Business impact: Degrades user experience, potentially leading to reduced usage of map customization features.
- Fix direction: Investigate the Zustand `persist` middleware configuration for `mapStore` and the `ee-map-prefs` key to ensure `basemap` and `layerVisibility` are correctly persisted and rehydrated.

### 6. Low: Pro User Upgrade Sheet Check Timeout (P1)
- Summary: The test for ensuring Pro users do not see the Upgrade Sheet timed out, making it unclear if the intended behavior is met or if there's a test flakiness.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. No specific error about the UpgradeSheet being visible or not.
- Cannot confirm: Whether the UpgradeSheet was actually shown, or if the test simply failed to find a subsequent element after successfully *not* showing the sheet.
- Root cause: Unclear. Could be a test flakiness, an issue with the Pro user state setup, or a subtle bug where the UpgradeSheet *does* appear but the test doesn't catch it directly. Given the `free F3` finding (where the UpgradeSheet *should* have appeared but didn't), it's possible the logic for showing/hiding the UpgradeSheet is generally problematic.
- User impact: If the UpgradeSheet *is* shown to Pro users, it's confusing and annoying. If it's not, then the test is just flaky.
- Business impact: If Pro users are prompted to upgrade, it erodes trust and could lead to cancellations.
- Fix direction: Review the `pro P1` test logic for robustness and add more specific assertions or waits to determine the exact state of the UpgradeSheet.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Identical behavior across tiers (inferred). The app fails to load entirely for Pro users when offline, preventing any functionality. This is an app-level issue that would affect all users if they were authenticated and offline.
*   **Waypoint Save Button Disabled (P3, V3):** Identical behavior across tiers (inferred). The "Save Waypoint" button is disabled due to GPS acquisition failure for Pro users. This is a core map/GPS functionality issue that would affect any user attempting to save a waypoint, regardless of tier.
*   **Theme Persistence (V7):** Identical failure across Guest and Free tiers. The theme preference resets to default ('dark') on reload, and the `ee_theme` localStorage key is `null` before and after reload. This indicates a universal failure in the manual persistence mechanism for this preference.
*   **Basemap and Layer Visibility Persistence (V8, V9):** Identical failure (timeouts) across Guest and Free tiers. This suggests a universal failure in the Zustand `persist` middleware for `mapStore` preferences.
*   **Learn Tab State Loss (V13, F4):** Identical *successful* behavior across Guest and Free tiers. The `state-loss-evidence` and `header-stats-pair` annotations show no change in stats after tab switches, indicating the fix for V13 (preserving tab state) is working as intended for both unauthenticated and authenticated free users.
*   **Waypoint Creation Gate (F3):** This is a tier-specific difference. Free users are incorrectly routed to the `WaypointSheet` instead of the `UpgradeSheet`, bypassing the intended Pro gate. Guest users are correctly routed to the `UpgradeSheet` (guest C3 passed). Pro users should not see the `UpgradeSheet` at all (P1 is ambiguous).
*   **Guest Waypoint Persistence (V11):** Specific to Guest tier. Guest waypoints are confirmed to be memory-only and vanish on reload, despite a previous fix.
*   **Active Module Persistence (V15):** Specific to Guest tier (tested here). Active module resets to default on reload, despite a previous fix.
*   **GPS Track Persistence (V1):** Specific to Pro tier (tested here). GPS track is lost on reload, despite a previous fix.

## Findings Discarded
- None. All identified issues have sufficient evidence and user impact to be included.

## Cannot Assess
- The full behavior of `pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) could not be assessed directly due to the application failing to load entirely when offline. The `net::ERR_INTERNET_DISCONNECTED` error prevents the tests from reaching the state where these specific vulnerabilities would manifest.

## Systemic Patterns
1.  **Offline Functionality Failure:** The most critical systemic issue is the complete failure of the application to load or function when offline, affecting all tiers. This indicates a fundamental lack of offline-first design principles, particularly in Service Worker caching for the app shell and initial data.
2.  **GPS Acquisition Instability:** A persistent issue with GPS acquisition prevents core features like waypoint saving from functioning, regardless of online status. This points to a problem in the `useTracks` hook or `mapStore`'s handling of `userLocation`.
3.  **Regression in Manual LocalStorage Persistence:** There is a widespread regression or ineffective implementation of the "manual IIFE + write pattern" for localStorage keys (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This affects multiple user preferences and critical session data, leading to significant data loss and user frustration. This contradicts several previously "CONFIRMED" fixes.
4.  **Zustand Persist Middleware Issues:** Basemap and layer visibility preferences, which are managed by Zustand's `persist` middleware, also appear to be failing to persist. This suggests either a configuration issue with the middleware or a broader problem with localStorage access for Zustand-persisted stores.

## Calibration Notes
- **Trusting Annotations:** The new test design with detailed annotations (e.g., `ee_theme-before-reload: null`, `V11 confirmed`) is highly effective. Direct evidence from Playwright about localStorage keys being `null` or `absent` provides irrefutable proof for persistence failures, allowing HIGH confidence even when previous fixes were "CONFIRMED". This approach successfully avoids PHANTOM verdicts based on speculation.
- **Distinguishing Blocker from Target Vulnerability:** For `pro V3` (waypoint save fails offline silently), the GPS acquisition issue acts as a *blocker* preventing the test from reaching the *target vulnerability*. The annotation `v14-pre-save-offline-warning: no (V14 confirmed)` was crucial in confirming *part* of the vulnerability (lack of pre-check) despite the primary blocker.
- **Re-evaluating "Passed" Tests:** The understanding that a test "passing" can mean it successfully *confirmed* a vulnerability (e.g., `V1 confirmed`) is critical. This aligns with the "Vulnerability-Proof Test Philosophy" and requires careful reading of the test annotations to interpret results correctly.
- **Timeout Ambiguity:** Timeouts (e.g., `guest V9`, `free V8`, `pro P1`) continue to present challenges. While they often *imply* a failure to reach an expected state, they do not provide direct evidence of the *final* state. This correctly leads to MEDIUM or LOW confidence scores for these specific findings.
- **Previous Fix Regressions:** The repeated confirmation of V1, V7, V11, V15 despite previous "CONFIRMED" fixes highlights the importance of continuous regression testing and the potential for fixes to be incomplete, reverted, or broken by subsequent changes. The detailed annotations are key to identifying these regressions.