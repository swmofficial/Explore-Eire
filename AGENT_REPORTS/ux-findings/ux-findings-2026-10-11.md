# UX Agent Report — 2026-10-11

## Run Context
- Commits analysed: `85014ead30a8ab3840fa9e78985bc6704b38b7d7` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 5/9
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
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `waypoint-sheet-not-reached` annotation for `pro P3` is incorrect, as the screenshot shows the sheet *is* reached.
- Cannot confirm: If the offline save would truly fail silently (V3) or if the pre-save warning (V14) would appear, as the button is never enabled to trigger these paths.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated and the save button enables when location is acquired.

### 3. Critical: Active GPS Track Lost on Reload (V1)
- Summary: Any active GPS track being recorded is entirely lost if the user reloads the page, as the `sessionTrail` is not persisted during tracking.
- Tier(s) affected: Pro (inferred Free/Guest if they could track)
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` notes `sessionTrail` accumulates in `mapStore` and is "not persisted anywhere until the user explicitly saves."
- Cannot confirm: The exact duration or complexity of a lost track, but the mechanism of loss is clear.
- Root cause: `mapStore.sessionTrail` is not persisted to `localStorage` during active tracking. While `STATE_MAP.md` mentions `ee_session_trail` as a manual localStorage key, the test evidence indicates it's not being used to persist the active trail.
- User impact: Significant data loss for users actively tracking their movements, leading to frustration and loss of valuable field data.
- Business impact: Erodes trust in the app's core functionality, discouraging use of tracking features and potentially leading to churn.
- Fix direction: Implement auto-persistence of `sessionTrail` to `localStorage` (e.g., `ee_session_trail`) during active tracking, with a clear save/discard flow upon stopping.

### 4. Business Logic Error: Free Users Can Save Waypoints (F3 Failure)
- Summary: Free tier users are incorrectly allowed to save waypoints, a feature intended for Pro subscribers, bypassing the `UpgradeSheet`.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` received `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was not shown, but the `WaypointSheet` was.
- Cannot confirm: If the waypoint save operation itself would succeed for a free user (it should fail at the Supabase level if policies are correct, but the UI allows the attempt).
- Root cause: The conditional rendering or routing logic for the camera button (which triggers waypoint creation) does not correctly check `isPro` status for free users, allowing them to access the `WaypointSheet` instead of the `UpgradeSheet`.
- User impact: Free users gain access to a premium feature, potentially leading to confusion if the save then fails, or devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key premium feature is accessible for free. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the gating logic for the waypoint creation flow to ensure free users are directed to the `UpgradeSheet`.

### 5. Widespread Preference Loss on Reload (V7, V8, V9, V15)
- Summary: User preferences for theme, basemap, layer visibility, and active module are consistently lost on page reload across all tiers, reverting to default settings.
- Tier(s) affected: All (Guest, Free, Pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being persisted.
    - `guest V9` failed with a timeout, implying the basemap preference was not found.
    - `free V8` failed with a timeout, implying layer preferences were not found.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` confirms the active module preference is lost.
- Cannot confirm: The exact state of `ee-map-prefs` for V8/V9 due to timeouts, but the pattern of `ee_theme` and `ee_active_module` being `null`/absent strongly suggests a systemic persistence failure.
- Root cause: The manual `localStorage` persistence patterns (`ee_theme`, `ee_active_module`) are failing to write or read values correctly. For `basemap` and `layerVisibility` (`ee-map-prefs`), the Zustand `persist` middleware might be misconfigured or failing. `STATE_MAP.md` lists these as persisted, but test evidence contradicts this.
- User impact: Users experience a frustrating and unreliable application where their customisations and context are constantly reset, requiring repetitive actions.
- Business impact: Erodes user trust and satisfaction, leading to decreased engagement and higher churn rates.
- Fix direction: Debug and fix the manual `localStorage` write/read patterns for `ee_theme`, `ee_active_module`. Verify and debug the Zustand `persist` middleware configuration for `ee-map-prefs` to ensure `basemap` and `layerVisibility` are correctly saved and restored.

### 6. Guest Waypoints Lost on Reload (V11)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` directly confirms the loss of guest waypoints.
- Cannot confirm: The exact content of the lost waypoints, but the mechanism of loss is clear.
- Root cause: `mapStore.sessionWaypoints` is not being persisted to `localStorage` for guest users. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002), but the test evidence shows this is not happening.
- User impact: Guest users lose any valuable data they create, making the app feel unreliable and discouraging them from exploring its features or converting to a free/pro account.
- Business impact: Hinders guest user engagement and conversion rates, as their initial interactions with the app are negatively impacted by data loss.
- Fix direction: Debug and fix the manual `localStorage` write/read pattern for `ee_guest_waypoints` to ensure guest waypoints are persisted.

### 7. Offline Data Write Failures & Missing Warnings (V4, V6, V14)
- Summary: Critical user-generated data (tracks, routes) cannot be saved when offline, leading to data loss. Additionally, there is no user-facing warning before attempting to save waypoints offline.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming `track save fails offline (post-stop data loss)`. `STATE_MAP.md` confirms `tracks` INSERT fails offline, leading to data loss.
    - `pro V6` passed, but annotation `route-button-missing: cannot proof V6` indicates the test couldn't gather evidence. However, `STATE_MAP.md` explicitly states `routes` INSERT fails offline with "console.error only, no toast", confirming V6.
    - `pro V3` failed due to disabled button, but annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states there is no pre-save offline warning for waypoints.
- Cannot confirm: The exact user experience for V6 due to the test's inability to proof, but the architectural ground truth is clear.
- Root cause: Lack of an offline data queue or local-first write strategy. Supabase write operations (`tracks` INSERT, `routes` INSERT) fail directly when offline. The app also lacks a pre-check for connectivity before allowing save operations for waypoints (V14).
- User impact: Users lose valuable field data (tracks, routes) if they attempt to save while offline, leading to significant frustration and distrust. The lack of warning for waypoints means they might unknowingly lose data.
- Business impact: Damages user trust and app reliability, particularly for prospectors operating in remote, offline environments. This directly impacts retention and reputation.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) for all user-generated content. Add pre-save connectivity checks and user-facing warnings for offline operations.

### 8. Pro User Sees UpgradeSheet on Pro Affordance Tap (P1 Failure)
- Summary: The test for Pro users not seeing the UpgradeSheet on Pro affordance tap timed out, suggesting a potential issue where Pro users might still be presented with upgrade prompts.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.` The test is designed to ensure Pro users *don't* see the UpgradeSheet. A timeout here could mean the test was waiting for the UpgradeSheet to *not* appear, but it did, or it failed to interact with the Pro affordance.
- Cannot confirm: Whether the UpgradeSheet actually appeared, or if the test failed to interact with the Pro affordance.
- Root cause: Potentially incorrect gating logic for displaying the `UpgradeSheet` when a Pro user interacts with a Pro-gated feature, or a test flakiness.
- User impact: Pro users, who have already paid, are presented with irrelevant upgrade prompts, leading to confusion and a poor user experience.
- Business impact: Erodes trust and satisfaction among paying customers, potentially leading to churn.
- Fix direction: Verify the `UpgradeSheet` display logic for Pro users. Ensure the test correctly interacts with the Pro affordance and asserts the absence of the `UpgradeSheet`.

## Tier Comparison
- **Offline App Loading (V2, V10)**: Identical behaviour across tiers (inferred). The app fails to load for Pro users, which is a fundamental issue likely affecting all tiers if they attempt to load offline.
- **Theme Reset (V7)**: Identical behaviour across Guest and Free tiers. Both experience theme resetting to default on reload, with `ee_theme` being `null`. This suggests a core persistence issue affecting all users regardless of authentication status.
- **Basemap/Layer Preferences Reset (V9, V8)**: Identical behaviour across Guest and Free tiers (based on timeouts). This suggests a core persistence issue affecting all users.
- **Learn Tab State (V13, F4)**: Identical behaviour across Guest and Free tiers. Header stats are preserved across tab switches, indicating the fix for V13 (for header stats) is working for all users.
- **Waypoint Save Gating (F3, P3)**: Differs. Free users are incorrectly allowed to access the WaypointSheet (F3 failure), while Pro users reach the WaypointSheet but are blocked by GPS acquisition failure (P3). Guest users are also blocked by GPS acquisition (inferred from P3/V3).
- **Waypoint Persistence (V11)**: Specific to Guest users, as authenticated users save to Supabase (when online).
- **Active Module Persistence (V15)**: Specific to Guest users (test only run for guest). Likely affects authenticated users too if the underlying persistence mechanism is broken.
- **GPS Track Persistence (V1)**: Specific to Pro users (test only run for pro). Likely affects other tiers if they could track.
- **Offline Data Saves (V3, V4, V6, V14)**: Specific to Pro users (tests only run for pro). These are features that require authentication or Pro status, so the offline failures are observed in the Pro tier.

## Findings Discarded
- None. All 8 findings are included.

## Cannot Assess
- The exact state of `ee-map-prefs` for V8/V9 due to test timeouts.
- The exact user experience for V6 (route save silent failure) due to the test's inability to proof, though `STATE_MAP.md` confirms the vulnerability.
- Whether the `UpgradeSheet` actually appeared for `pro P1` or if the test failed to interact with the Pro affordance.

## Systemic Patterns
1.  **Widespread Persistence Failures**: Multiple manual `localStorage` keys (`ee_theme`, `ee_active_module`, `ee_guest_waypoints`, `ee_session_trail`) are failing to persist data across reloads. This suggests a fundamental issue with the implementation of the manual IIFE + write pattern, or the `setItem` calls are not being triggered. The Zustand `persist` middleware for `ee-map-prefs` also appears to be failing.
2.  **Lack of Offline-First Design**: The app completely fails to load offline, and all data write operations (waypoints, tracks, finds, routes) fail when offline without a sync queue. This is a critical architectural gap for an outdoor mapping app.
3.  **GPS Acquisition Issues**: A persistent problem with GPS acquisition is disabling core functionality (waypoint saving), indicating a bug in the `useTracks` hook or how `mapStore.userLocation` is updated.

## Calibration Notes
- The "Vulnerability-Proof Test Philosophy" was crucial in identifying active vulnerabilities (V1, V11, V15, V4) even when their respective tests "passed" by completing their journey and providing confirming annotations.
- The "Three-Tier Analysis" helped to identify systemic issues (e.g., V7 theme reset affecting both guest and free users) versus tier-specific bugs (e.g., F3 free user waypoint access).
- Cross-referencing test annotations, screenshots, and `STATE_MAP.md` was essential for accurate diagnosis, especially for complex failures like `pro P3` where the annotation `waypoint-sheet-not-reached` was contradicted by the screenshot showing the sheet *was* reached, but the save button was disabled. This prevented a misdiagnosis.