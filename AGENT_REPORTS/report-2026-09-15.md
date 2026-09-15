# UX Agent Report — 2026-09-15

## Run Context
- Commits analysed: `36c5fa104f60ef6d297515245fc2161516b1a908` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Manual Persistence for Key State (V1, V7, V11, V15 Regressions)
- Summary: User preferences (theme, active module) and critical session data (guest waypoints, GPS tracks) are not being persisted to `localStorage` and are lost on page reload, despite previous fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. Expected "light", received "dark".
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific code changes that caused these regressions in the manual `localStorage` patterns.
- Root cause: The manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` are no longer functioning, or have been inadvertently removed/broken, directly contradicting previous CONFIRMED fixes (V1, V7, V11, V15).
- User impact: Users experience constant loss of preferences and unsaved session data, leading to significant frustration and a perception of an unreliable application.
- Business impact: Erodes user trust, increases friction, reduces engagement, and makes the app feel unreliable, impacting retention.
- Fix direction: Re-implement and thoroughly test the manual `localStorage` persistence patterns for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail`.

### 4. High: Free Users Can Open Waypoint Sheet (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` when tapping the camera button, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` failed, `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown.
- Cannot confirm: The exact code path that allows the `WaypointSheet` to open for free users without triggering the `UpgradeSheet`.
- Root cause: Flawed gating logic for the "Save Waypoint" action, likely in `CornerControls` or `Map.jsx` where the camera button is handled. It should check `isPro` and show `UpgradeSheet` if `false`.
- User impact: Free users can attempt to save waypoints, only to find their efforts wasted (especially combined with V11 where guest waypoints are lost on reload), leading to frustration and distrust.
- Business impact: Undermines the value proposition of the Pro tier, potentially reducing conversions if users can access Pro features without paying.
- Fix direction: Correct the conditional rendering/routing logic for the waypoint camera button to ensure `UpgradeSheet` is shown for free users.

### 5. Medium: Basemap and Layer Preferences Reset on Reload (V8, V9 Regression)
- Summary: User preferences for the basemap and layer visibility are lost on page reload, reverting to default settings.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests timed out. This strongly suggests the expected state (e.g., a flipped basemap or layer visibility) was not present after reload, causing the test to wait indefinitely. `STATE_MAP.md` lists `basemap` and `layerVisibility` as persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact reason for the timeouts, but the context strongly implies state loss.
- Root cause: The `ee-map-prefs` Zustand persist middleware for `mapStore` is either failing to save/load `basemap` and `layerVisibility` correctly, or there's a race condition preventing the UI from reflecting the loaded state before the test checks.
- User impact: Users' preferred map settings (basemap, visible layers) are lost on every reload, requiring manual re-configuration and causing minor friction.
- Business impact: Contributes to a perception of an unreliable app, potentially reducing user satisfaction and engagement.
- Fix direction: Investigate `ee-map-prefs` persistence for `mapStore` and ensure `basemap` and `layerVisibility` are correctly saved and rehydrated.

### 6. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: Pro users are incorrectly presented with the `UpgradeSheet` when interacting with Pro-gated features.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test timed out. The test description "Pro user does not see UpgradeSheet on Pro affordance tap" is the *desired* behavior. A timeout suggests this desired behavior was *not* met, implying the `UpgradeSheet` *was* shown. This contradicts the previous fix "Hide PRO badges in LayerPanel for authenticated Pro users (P1)" which was CONFIRMED.
- Cannot confirm: The exact reason for the timeout, but the test's intent and previous findings point to the `UpgradeSheet` being shown.
- Root cause: The gating logic for Pro features is still incorrectly showing the `UpgradeSheet` to `isPro: true` users, or there's a race condition in the UI that causes the sheet to appear momentarily.
- User impact: Paying users are prompted to upgrade, creating confusion, frustration, and a sense of being undervalued.
- Business impact: Erodes trust with paying customers, potentially leading to cancellations and negative reviews.
- Fix direction: Re-verify the gating logic for Pro features to ensure `UpgradeSheet` is never shown to `isPro: true` users.

### 7. Low: Offline Route Save Fails Silently (V6 Confirmed)
- Summary: When a user attempts to save a route offline, the operation fails without any user-facing notification, leading to silent data loss.
- Tier(s) affected: Pro (inferred all)
- Confidence: HIGH
- Evidence: `pro V6` test passed, confirming the silent failure. `STATE_MAP.md` explicitly states that `routes` INSERT "Fails — console.error only, no toast" on offline.
- Cannot confirm: The exact content of the `console.error` message.
- Root cause: The `routes` INSERT operation to Supabase lacks a user-facing error notification mechanism on failure, only logging to the console.
- User impact: Users believe their route is saved when it is not, leading to unexpected data loss and frustration when they later try to access it.
- Business impact: Data loss leads to user distrust and reduced engagement with route planning features.
- Fix direction: Implement a user-facing toast notification for failed route save operations.

### 8. Low: Offline Waypoint Save Lacks Pre-Check Warning (V14 Confirmed)
- Summary: The application does not warn users about a lack of network connectivity before they attempt to save a waypoint, leading to a failed save without prior notice.
- Tier(s) affected: Pro (inferred all)
- Confidence: HIGH
- Evidence: `pro V3` test failed due to the GPS issue, but its annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states that no pre-save offline warning was shown.
- Cannot confirm: The exact UI flow if the GPS issue were resolved and an offline save was attempted.
- Root cause: The waypoint save flow does not include a pre-check for network connectivity to warn the user before attempting an offline save, as per `STATE_MAP.md` (V14 is a known vulnerability).
- User impact: Users attempt to save waypoints offline without knowing it will fail, leading to wasted effort and frustration.
- Business impact: Contributes to a perception of an unreliable app, especially in offline scenarios, potentially impacting user satisfaction.
- Fix direction: Implement a network connectivity check before allowing waypoint save, displaying a clear warning if the user is offline.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Pro tier explicitly fails to load offline with a `net::ERR_INTERNET_DISCONNECTED` error. This behavior is highly likely to be identical for the Free tier, as both rely on Supabase for initial authentication and data. The Guest tier might load partially but would lack any authenticated features.
*   **GPS Acquisition Failure (P3, V3):** The "Acquiring GPS..." issue affects the Pro tier, preventing waypoint saving. This is a core functionality issue and would affect Free and Guest tiers if they were able to initiate waypoint saving.
*   **Manual Persistence Regressions (V1, V7, V11, V15):** The failure of manual `localStorage` persistence for `theme`, `sessionWaypoints`, `activeModule`, and `sessionTrail` is observed across all relevant tiers (Guest, Free, Pro). This indicates a systemic failure in the manual persistence pattern, affecting all users.
*   **Learn Tab State Preservation (V13, F4):** Both Guest and Free tiers show identical `state-loss-evidence` and `header-stats-pair` annotations, indicating that the Learn tab state is *preserved* across tab switches for both. This confirms the previous fix for V13 is working across tiers.
*   **Pro Badges (F2):** The Free tier correctly renders PRO badges in the LayerPanel, indicating proper differentiation between free and pro features.
*   **Waypoint Gating (F3, P1):** The Free tier incorrectly allows opening the `WaypointSheet` (F3 failure), while the Pro tier's `P1` timeout suggests they are still incorrectly shown the `UpgradeSheet`. This indicates distinct but related issues with the upgrade gating logic across both Free and Pro tiers.
*   **Offline Save Failures (V4, V6):** The Pro tier confirms V4 (track save fails offline) and V6 (route save fails silently offline). These behaviors are expected for the current architecture (no offline data queue) and would be identical across all tiers if they could initiate these saves.
*   **Offline Pre-check (V14):** The Pro tier confirms V14 (no pre-save offline warning for waypoints). This behavior is expected and would be identical across all tiers.

## Findings Discarded
- No findings were discarded, as all 8 identified issues are significant and supported by evidence.

## Cannot Assess
- The exact reason for the `pro P1` timeout. While it strongly suggests the `UpgradeSheet` was shown, a direct assertion failure would be more conclusive.
- The exact reason for `guest V9` and `free V8` timeouts. While they strongly imply preference loss, direct assertions on the `basemap` and `layerVisibility` values after reload would be more conclusive.

## Systemic Patterns
-   **Regression in Manual `localStorage` Persistence:** Multiple critical features (theme, guest waypoints, active module, session trail) that were previously "CONFIRMED" fixed via manual `localStorage` patterns are now failing, indicating a widespread regression in how these manual persistence mechanisms are implemented or integrated. This is a major architectural vulnerability.
-   **Incomplete Offline-First Implementation:** The app still fundamentally fails offline for authenticated users (V2, V10), and lacks basic offline data queuing or user warnings for offline save failures (V3, V4, V6, V14). This is a core architectural gap for an outdoor mapping app.
-   **Gating Logic Flaws:** Issues with showing/hiding the `UpgradeSheet` and `WaypointSheet` for Free and Pro users (F3, P1) indicate inconsistencies in the authentication and subscription gating logic.
-   **GPS Acquisition Issues:** A persistent problem with GPS acquisition (P3, V3) is blocking core functionality and testing of offline features.

## Calibration Notes
-   Prioritized findings with direct `Error:` messages and explicit `(V# confirmed)` annotations as HIGH confidence, aligning with past successful diagnoses.
-   Treated timeouts as MEDIUM confidence when they strongly imply a failure based on the test's intent and `STATE_MAP.md`, acknowledging the lack of direct assertion.
-   Carefully re-evaluated "PASS" results for vulnerability tests (V1, V11, V15) where the annotation explicitly stated "(V# confirmed)" or "absent/empty", indicating that the *vulnerability itself was confirmed* despite the test technically "passing" (meaning the test *assertion* for the vulnerability passed). This aligns with the "Vulnerability-Proof Test Philosophy" where a pass means "produced evidence".
-   The previous report's critical findings (V2, V10, P3, V3, F3, P1) remain active, indicating no resolution for these fundamental issues.
-   A significant new observation is the widespread regression in previously "CONFIRMED" manual `localStorage` persistence fixes (V1, V7, V11, V15), which points to a systemic issue in how these solutions are maintained or integrated.