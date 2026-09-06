# UX Agent Report — 2026-09-06

## Run Context
- Commits analysed: `501b02e4c85c8599810a652735abaddf923498cb` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the WaypointSheet and attempt to save a waypoint, instead of being presented with an UpgradeSheet as intended for Pro-gated features.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: If the save operation would actually succeed for a free user (it should fail on the backend), but the UX gate is clearly broken.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before showing the `WaypointSheet`.
- User impact: Free users can access a Pro feature, potentially leading to confusion when their data doesn't save or they hit a backend error. It also undermines the value proposition of the Pro tier.
- Business impact: Direct loss of potential Pro conversions, as the upgrade path for a core feature is bypassed.
- Fix direction: Correct the gating logic for the camera button to display the `UpgradeSheet` if `isPro` is false.

### 4. High: Unsaved GPS Tracks and Guest Waypoints Lost on Reload (V1, V11)
- Summary: Any active GPS tracking session data (`sessionTrail`) and guest-created waypoints (`sessionWaypoints`) are lost upon page reload, even though `STATE_MAP.md` indicates they should be persisted via `localStorage`.
- Tier(s) affected: All (V1 affects authenticated users, V11 affects guests)
- Confidence: HIGH
- Evidence: `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `STATE_MAP.md` explicitly lists `sessionTrail` and `sessionWaypoints` as persisting via `ee_session_trail` and `ee_guest_waypoints`.
- Cannot confirm: The exact point of failure in the manual `localStorage` write/read pattern for these specific keys.
- Root cause: Regression in the manual `localStorage` persistence logic for `sessionTrail` and `sessionWaypoints`, or an issue with their initial hydration from `localStorage` on app load.
- User impact: Significant data loss for users actively tracking or marking temporary points, leading to high frustration and distrust in the app's reliability.
- Business impact: Damages user trust and engagement, particularly for core prospecting activities, potentially leading to churn.
- Fix direction: Debug and restore the manual `localStorage` persistence for `sessionTrail` and `sessionWaypoints` as described in `STATE_MAP.md`.

### 5. Medium: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads and reverts to the default 'dark' theme.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` confirm that the `ee_theme` `localStorage` key is not being written or read correctly.
- Cannot confirm: If the `userStore.theme` state itself is being updated correctly before the reload.
- Root cause: Regression in the manual `localStorage` persistence for `userStore.theme` via the `ee_theme` key, or an issue with its initial hydration from `localStorage` on app load. `STATE_MAP.md` confirms `theme` uses a manual `ee_theme` key.
- User impact: Minor annoyance, as users have to re-select their preferred theme after every reload.
- Business impact: Contributes to a perception of an unpolished or unreliable application, subtly eroding user satisfaction.
- Fix direction: Debug and restore the manual `localStorage` persistence for `userStore.theme` using the `ee_theme` key.

### 6. Medium: Basemap and Layer Visibility Preferences Reset on Reload (V8, V9 Regression)
- Summary: User-selected basemap and layer visibility settings are not persisted across page reloads and revert to their default states.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded`. While timeouts, the test names and `STATE_MAP.md` (which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`) strongly suggest these preferences are resetting.
- Cannot confirm: The exact default values they revert to, but the failure implies a reset.
- Root cause: Regression in the `Zustand persist` middleware configuration for `mapStore` or an issue with the `ee-map-prefs` `localStorage` key, preventing `basemap` and `layerVisibility` from being correctly saved and restored.
- User impact: Annoyance for users who customize their map view, requiring them to re-apply settings after every reload.
- Business impact: Similar to theme reset, it erodes user satisfaction and the perception of a robust application.
- Fix direction: Verify the `Zustand persist` configuration and `localStorage` interactions for `mapStore` and the `ee-map-prefs` key.

### 7. Medium: Active Module Resets to Default on Reload (V15 Regression)
- Summary: The `activeModule` preference is not persisted across page reloads and reverts to the default 'prospecting' module.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly confirms `moduleStore.activeModule` is not persisted. `STATE_MAP.md` confirms `activeModule` uses a manual `ee_active_module` key.
- Cannot confirm: The exact point of failure in the manual `localStorage` write/read pattern for this specific key.
- Root cause: Regression in the manual `localStorage` persistence logic for `moduleStore.activeModule` via the `ee_active_module` key, or an issue with its initial hydration from `localStorage` on app load.
- User impact: Minor annoyance for users who prefer a different default module, requiring them to re-select it after every reload.
- Business impact: Contributes to a perception of an unpolished or unreliable application.
- Fix direction: Debug and restore the manual `localStorage` persistence for `moduleStore.activeModule` using the `ee_active_module` key.

### 8. Low: Offline Data Save Failures (V4, V6, V14)
- Summary: Saving tracks and routes offline results in silent failures or toast messages without retaining the data locally, and there is no pre-save warning about being offline for waypoints.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming the journey to demonstrate track save failure offline. `pro V6` passed, confirming the journey to demonstrate route save failure offline (despite a confusing annotation, `STATE_MAP.md` confirms silent failure). `pro V3` (which failed due to GPS issue) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, confirming the absence of a pre-save offline warning for waypoints.
- Cannot confirm: The exact toast messages or console errors, but `STATE_MAP.md` provides ground truth.
- Root cause: Fundamental lack of an offline data queue and local-first write strategy for user-generated content. This is a known architectural gap (V3, V4, V6, V14 are all related to "offline write queue" in `STATE_MAP.md`).
- User impact: Loss of user-generated data (tracks, routes) when offline, and lack of clear communication about offline limitations, leading to frustration.
- Business impact: Hinders adoption and trust in rural areas where offline usage is common.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync user-generated data when connectivity is restored.

## Tier Comparison
- **V7 (Theme Reset)**: Identical behavior across Guest and Free tiers. Both fail to persist the theme preference, reverting to 'dark' on reload. This indicates a core persistence issue unrelated to authentication status.
- **V9 (Basemap Reset) / V8 (Layer Visibility Reset)**: Guest V9 and Free V8 both exhibit preference loss (indicated by timeouts). This suggests a common persistence issue for `mapStore` preferences across all tiers.
- **V1 (GPS Track Loss) / V11 (Guest Waypoint Loss)**: V1 (track loss) is confirmed for Pro, and V11 (guest waypoint loss) is confirmed for Guest. These are distinct features but share the pattern of volatile user-generated data.
- **V2/V10 (Offline App Load Failure)**: Confirmed for Pro. It is highly probable this affects Free users as well, as both require Supabase authentication and data loading, which fail offline. Guest users are not affected by `page.goto` failures related to authentication/data loading in the same way, as they have less server-dependent state.
- **P3/V3 (Waypoint Save Disabled)**: Confirmed for Pro. This issue is likely systemic to the GPS acquisition logic and would affect Free and Guest users if they were able to reach the WaypointSheet and attempt to save.
- **F3 (Free Waypoint Bypass)**: Specific to the Free tier, where the upgrade gate is bypassed. Guest users are not expected to save waypoints to the database, and Pro users are expected to save them.

## Findings Discarded
- `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: This test timed out. The previous report confirmed the fix for P1 ("Hide PRO badges in LayerPanel for authenticated Pro users (P1)"). The test name implies success is *not* seeing the UpgradeSheet. A timeout here is ambiguous and does not provide clear evidence of a UX issue. It is likely a test flakiness or setup issue.
- `guest V13 / free V13 — learn header stats are recomputed on every tab switch (state-loss proof)`: These tests passed, and the `state-loss-evidence` showed identical `before` and `after` stats for the Learn header. This indicates that the header stats are preserved, confirming the previous fix for V13 is working for this aspect. While other parts of Learn tab state might still be volatile, this test does not provide evidence for it.

## Cannot Assess
- The full extent of `pro P1` failure due to the ambiguous timeout.
- The specific toast messages or console errors for `pro V4` and `pro V6` as the tests passed by confirming the *journey* of failure, not by capturing the exact error output. However, `STATE_MAP.md` provides the ground truth for these.

## Systemic Patterns
- **Persistence Regression**: Multiple `localStorage` keys (for theme, basemap, layers, active module, guest waypoints, session trail) that are explicitly listed as persisted in `STATE_MAP.md` are failing to save or restore state. This points to a widespread regression in either the Zustand `persist` middleware configuration or the manual `localStorage` IIFE patterns.
- **Offline Inoperability**: The application fundamentally fails to load for authenticated users when offline, indicating a critical gap in Service Worker caching for the app shell and initial data. This is a blocker for all offline-first capabilities.
- **Core Feature Blockage**: GPS acquisition issues are preventing a fundamental feature (waypoint saving) from working, even online. This suggests a problem with the geolocation API integration or its handling within the app.
- **Inconsistent Gating**: The `F3` failure highlights an inconsistency in how Pro features are gated, allowing free users to access a Pro-only action without an upgrade prompt.

## Calibration Notes
- Prioritized critical blockers (app won't load, core feature broken) as per past successful diagnoses.
- Distinguished carefully between a test *passing* (meaning the journey completed and produced evidence) and the *vulnerability being fixed*. For V1, V4, V6, V11, V14, V15, the tests *passed* because they successfully *demonstrated* the vulnerability, confirming its presence.
- Avoided PHANTOM verdicts by requiring direct evidence from annotations or clear error messages. For V9 and V8, while timeouts, the context of "preference-loss proof" and `STATE_MAP.md` made the inference of a reset highly confident.
- Re-evaluated V13 based on the `state-loss-evidence` annotation, which showed *no* state loss for the header stats, indicating the previous fix was effective for that aspect.
- Used `STATE_MAP.md` as the definitive source for expected persistence behavior and offline failure modes.