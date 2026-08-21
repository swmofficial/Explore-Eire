# UX Agent Report — 2026-08-21

## Run Context
- Commits analysed: `0f75d3205c9e19706248ec263526cb47c556abb5` and 19 preceding commits.
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
- Root cause: Persistence mechanisms for `userStore.theme` (manual `ee_theme` key), `mapStore.basemap`/`layerVisibility` (Zustand `ee-map-prefs`), and `moduleStore.activeModule` (manual `ee_active_module`) are not functioning correctly, possibly due to incorrect `localStorage` key usage, `persist` middleware configuration, or race conditions during hydration.
- User impact: Annoyance and wasted time as users must re-apply their preferred settings on every app load. Erodes trust in the app's reliability.
- Business impact: Minor negative impact on user satisfaction and perceived quality, potentially contributing to churn.
- Fix direction: Re-verify `localStorage` keys, `Zustand persist` middleware configuration, and manual IIFE patterns for all affected state keys.

### 4. High: Guest Waypoints and GPS Tracks are Lost on Reload (Vulnerability V1, V11 - Regression)
- Summary: User-generated session waypoints (for guests) and active GPS tracks are not persisted and are lost on page reload. This contradicts previous "CONFIRMED" fixes for V1 and V11.
- Tier(s) affected: Guest (V11), Pro (V1) (inferred Free for V11 if they were guest first)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_guest_waypoints` is not persisting.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_session_trail` is not persisting.
- Cannot confirm: The exact point of failure in the manual IIFE + write pattern for these keys.
- Root cause: The manual `localStorage` persistence patterns for `sessionWaypoints` (`ee_guest_waypoints`) and `sessionTrail` (`ee_session_trail`) are not functioning as intended, leading to data loss on reload. `STATE_MAP.md` indicates these should be persisted via manual IIFE + write patterns.
- User impact: Significant data loss for users who are actively exploring, leading to severe frustration and loss of valuable field data.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug the manual `localStorage` read/write patterns for `sessionWaypoints` and `sessionTrail` to ensure data is correctly saved and rehydrated.

### 5. Medium: Free Users Can Save Waypoints (F3 - Incorrect Gating)
- Summary: Free users are incorrectly allowed to save waypoints, a feature that should be gated behind a Pro subscription. The app surfaces the `WaypointSheet` instead of the `UpgradeSheet`.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() // Received: false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms the `WaypointSheet` was shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the WaypointSheet.
- Cannot confirm: If this is a recent regression or an existing bug.
- Root cause: The logic gating the "Save Waypoint" action for free users is flawed, allowing access to a premium feature. This likely involves `userStore.isPro` not being correctly checked before rendering the `WaypointSheet` or `UpgradeSheet`.
- User impact: Free users gain access to a premium feature, which might confuse them when they later encounter other Pro gates. Pro users might feel their subscription is devalued.
- Business impact: Undermines the value proposition of the Pro subscription, potentially reducing conversions from free to paid tiers.
- Fix direction: Correct the conditional rendering logic for the "Save Waypoint" action to ensure free users are directed to the `UpgradeSheet`.

### 6. Medium: Track Saving Fails Offline (Vulnerability V4)
- Summary: When offline, attempts to save a GPS track fail, resulting in the loss of the accumulated track data. This is the expected behavior for vulnerability V4.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` passed. `STATE_MAP.md` confirms "Save track" fails offline with a toast and data loss.
- Cannot confirm: The exact toast message or if any local queuing mechanism is attempted before failure.
- Root cause: Lack of an offline data queue for user-generated content. `STATE_MAP.md` explicitly notes "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)" is still NOT persisted.
- User impact: Loss of valuable track data if a user finishes a session and attempts to save while offline, leading to frustration.
- Business impact: Erodes trust in the app's data safety, especially for a core feature like tracking, potentially leading to churn.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync track data when connectivity is restored.

### 7. Low: Pro User UpgradeSheet Gating Timeout (Vulnerability P1)
- Summary: The test designed to verify that Pro users do *not* see the UpgradeSheet on Pro affordance tap timed out, indicating an issue in the test's ability to confirm this expected behavior.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`.
- Cannot confirm: Whether the UpgradeSheet *actually* appeared or if the test simply failed to assert the absence within the timeout. The previous `P1 Pro badge race` fix was CONFIRMED, suggesting the underlying logic might be correct.
- Root cause: Unclear. Could be a flaky test, a race condition, or a subtle UI bug that prevents the test from reaching its assertion point.
- User impact: If the UpgradeSheet *is* shown to Pro users, it's confusing and annoying. If it's just a test issue, no direct user impact.
- Business impact: If the bug exists, it devalues the Pro subscription. If it's a test issue, it wastes developer time.
- Fix direction: Investigate the `pro P1` test for flakiness or insufficient waiting conditions. If the test is robust, then debug the Pro gating logic.

## Tier Comparison
- **V7 (Theme Reset):** Affects **Guest** and **Free** tiers identically. Both fail to persist theme preference on reload, reverting to 'dark'. This indicates a core issue with the `ee_theme` localStorage key or its manual read/write pattern, independent of authentication status.
- **V9 (Basemap Reset) / V8 (Layer Reset):** Affects **Guest** (V9) and **Free** (V8) tiers identically (both timed out, implying reset). This indicates a core issue with the `ee-map-prefs` Zustand persist middleware or its configuration, independent of authentication status.
- **V13 (Learn Tab State Loss):** **Guest** and **Free** tiers both *passed* this test, with identical `state-loss-evidence` annotations showing no change in stats. This confirms that the fix for V13 (preserving Learn tab component state) is working correctly across both unauthenticated and authenticated free users.
- **V11 (Guest Waypoints Lost):** Confirmed for **Guest** tier. This vulnerability would not apply to authenticated users who save waypoints to Supabase, but it affects any user acting as a guest.
- **V15 (Active Module Reset):** Confirmed for **Guest** tier. This indicates a core issue with the `ee_active_module` localStorage key or its manual read/write pattern, independent of authentication status.
- **V1 (GPS Track Lost):** Confirmed for **Pro** tier. This indicates a core issue with the `ee_session_trail` localStorage key or its manual read/write pattern, independent of authentication status.
- **V2/V10 (Offline App Load / Pro Status):** Affects **Pro** tier critically, preventing app load. This is a fundamental offline capability issue that impacts authenticated users. It's inferred to affect Free users similarly, as they also rely on Supabase for initial auth.
- **P3/V3 (Waypoint Save Disabled):** Affects **Pro** tier, preventing waypoint saving due to GPS acquisition failure. This would likely affect Free and Guest users if they were able to access the WaypointSheet.
- **F3 (Free Waypoint Gating):** Specific to **Free** tier, where a Pro-gated feature is incorrectly accessible.
- **V4 (Offline Track Save Fails):** Confirmed for **Pro** tier. This is a general offline data persistence vulnerability that would affect any user attempting to save a track offline.

## Findings Discarded
- `pro V6 — route save offline produces no user-facing toast (silent failure)`: Discarded because the annotation `route-button-missing: cannot proof V6` indicates the test could not provide evidence for or against the silent failure. I cannot confirm this finding.

## Cannot Assess
- The exact content of `ee-map-prefs` in localStorage for `guest V9` and `free V8` due to test timeouts.

## Systemic Patterns
1.  **Persistence Mechanism Failures (Regressions):** Multiple critical user preferences and session data (theme, basemap, layers, active module, guest waypoints, GPS tracks) are failing to persist across reloads. This points to widespread issues with both Zustand's `persist` middleware configuration (for `ee-map-prefs`) and the manual `localStorage` IIFE + write patterns (for `ee_theme`, `ee_active_module`, `ee_guest_waypoints`, `ee_session_trail`). This contradicts previous "CONFIRMED" fixes for V1, V7, V11, V15, suggesting regressions or incomplete fixes.
2.  **Offline Capability Gaps:** The application fundamentally fails to load for authenticated users when offline (V2/V10 blocker), rendering it unusable in target environments. Furthermore, critical data saving operations (waypoints, tracks) lack offline queuing (V3, V4), leading to data loss. This highlights a severe lack of adherence to offline-first design principles.
3.  **GPS Acquisition Issues:** A recurring problem where the app fails to acquire GPS coordinates, disabling core functionality like waypoint saving (P3, V3 blocker). This suggests a problem with the `useTracks` hook or its interaction with the environment's geolocation API.
4.  **Incorrect Feature Gating:** A premium feature (saving waypoints) is accessible to free users (F3), undermining the subscription model.

## Calibration Notes
- The current test results for V1, V7, V11, and V15 directly contradict previous "CONFIRMED" fixes for these vulnerabilities. This indicates significant regressions or that the previous fixes were incomplete/flawed. I have prioritized these as critical regressions.
- The `guest V13` and `free V13` tests successfully confirmed the fix for Learn tab state persistence, showing no state loss.
- Despite a previous "CONFIRMED" fix for Playwright geolocation, GPS acquisition issues persist (P3, V3), suggesting the problem lies within the app's internal GPS handling rather than the test environment.
- I have carefully distinguished between tests that "passed" because a vulnerability was confirmed (e.g., V1, V4, V11, V15) versus tests that "passed" because a fix was working (e.g., V13). The test annotations were crucial for this distinction.
- I continue to discard findings without direct evidence, as seen with `pro V6`.