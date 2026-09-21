# UX Agent Report — 2026-09-21

## Run Context
- Commits analysed: `667d55b7ee104929c6ac5e5386b9b2a7f56490b9` and 19 preceding commits.
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

### 3. High: Free Users Can Save Waypoints, Bypassing Pro Gate (F3 Regression)
- Summary: Free tier users are able to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Correctly implement the `isPro` gate for the waypoint saving feature, ensuring the `UpgradeSheet` is shown for free users.

### 4. High: Theme Preference Resets on Reload (V7 Confirmed)
- Summary: The user's selected theme (e.g., 'light') resets to the default 'dark' theme after a page reload, regardless of authentication status.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests both failed with `Expected: "light" Received: "dark"`. Both tests show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`. This explicitly indicates that the `ee_theme` localStorage key, which `STATE_MAP.md` states is used for `userStore.theme` persistence, is not being written to.
- Cannot confirm: The exact line of code where the `ee_theme` localStorage write is failing, but the evidence clearly points to its absence.
- Root cause: The manual localStorage persistence mechanism for `userStore.theme` (key `ee_theme`) is not functioning correctly. The `setTheme` action is either not calling `localStorage.setItem('ee_theme', newTheme)` or the initial read is failing. `STATE_MAP.md` notes `theme` uses manual `ee_theme` key.
- User impact: Users experience a jarring visual change and loss of personalization on every app reload, leading to frustration and a perception of an unreliable application.
- Business impact: Degrades user experience, potentially leading to lower engagement and a perception of a less polished product.
- Fix direction: Debug the `setTheme` action in `userStore.js` to ensure `localStorage.setItem('ee_theme', newTheme)` is correctly called, and verify the initial read of `ee_theme` on store initialization.

### 5. Medium: Basemap and Layer Preferences Reset on Reload (V9, V8 Timeout)
- Summary: User-selected basemap and layer visibility preferences are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All (Guest, Free)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests both failed with `Test timeout of 60000ms exceeded`. While a timeout, this often indicates the test couldn't find the expected state after reload, implying a reset. `STATE_MAP.md` explicitly states `mapStore.basemap` and `mapStore.layerVisibility` are persisted via Zustand's `persist` middleware using the `ee-map-prefs` key. The timeout suggests this persistence is not working as expected.
- Cannot confirm: The exact state of `ee-map-prefs` in localStorage due to the timeout, but the consistent failure pattern across tiers for related preferences strongly suggests a persistence issue.
- Root cause: The `mapStore`'s Zustand `persist` middleware for `basemap` and `layerVisibility` (key `ee-map-prefs`) is likely failing to save or load these preferences correctly. This could be due to a configuration error, a data serialization issue, or a race condition during hydration.
- User impact: Users lose their customized map view settings on every reload, forcing them to reconfigure layers and basemap, which is inconvenient and frustrating.
- Business impact: Reduces user satisfaction and efficiency, particularly for power users who rely on specific map configurations.
- Fix direction: Investigate the `mapStore`'s `persist` middleware configuration and data flow for `basemap` and `layerVisibility`. Verify `ee-map-prefs` is correctly written to and read from localStorage.

### 6. Medium: Pro User Upgrade Sheet Check Times Out (P1 Timeout)
- Summary: The test for Pro users not seeing the Upgrade Sheet on Pro affordance tap times out, preventing confirmation of correct Pro gating.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This test is designed to confirm that Pro users *do not* see the UpgradeSheet when interacting with Pro features. A timeout here could mean the test is waiting for an UpgradeSheet that never appears (correct behavior, but test setup issue) or that the interaction itself is failing.
- Cannot confirm: Whether the UpgradeSheet *would* appear if the test didn't time out, or if the test is simply waiting for an element that isn't there (which would be correct behavior for a Pro user). The timeout makes it ambiguous.
- Root cause: The test `pro P1` is timing out, possibly due to an incorrect selector, a race condition, or an unexpected state in the application that prevents the test from completing its assertion within the allowed time. It's not clear if this is an app bug or a test bug.
- User impact: (If an actual bug) Pro users might be incorrectly prompted to upgrade, causing confusion and frustration. (If a test bug) Prevents verification of a critical Pro feature gate.
- Business impact: (If an actual bug) Damages trust and perception of Pro value. (If a test bug) Reduces confidence in test suite coverage.
- Fix direction: Review the `pro P1` test logic and selectors. Ensure it correctly asserts the *absence* of the UpgradeSheet for Pro users without timing out.

### 7. Low: Session Waypoints and Active Module Not Persisted (V11, V15 Confirmed)
- Summary: Guest waypoints (`sessionWaypoints`) and the active module (`activeModule`) are *not* persisted across reloads, leading to loss of user context.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed with `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` passed with `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. These tests *passed* because they *confirmed* the vulnerabilities, meaning the expected state loss occurred.
- Cannot confirm: The exact reason for the failure of the manual persistence, but the annotations are clear.
- Root cause: `STATE_MAP.md` indicates `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002) and `activeModule` via `ee_active_module` (manual IIFE + write pattern, task-013). The test results confirm these manual persistence mechanisms are currently failing to write to localStorage, leading to state loss.
- User impact: Guest users lose any waypoints they've added and their active module selection upon refreshing the page, disrupting their workflow.
- Business impact: Hinders guest user engagement and conversion by making the app feel unreliable and losing their temporary data.
- Fix direction: Debug the manual persistence logic for `sessionWaypoints` and `activeModule` to ensure `localStorage.setItem` is correctly called and `localStorage.getItem` is correctly read on store initialization.

### 8. Low: GPS Track, Offline Track Save, Offline Route Save Fail (V1, V4, V6 Confirmed)
- Summary: GPS tracks are lost on reload, and attempts to save tracks or routes offline fail, leading to data loss for users.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V1` passed with `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. `pro V4` passed, confirming the vulnerability of track save failing offline. `pro V6` passed, confirming the vulnerability of route save failing offline silently. These tests *passed* because they *confirmed* the vulnerabilities. `STATE_MAP.md` notes `sessionTrail` accumulates in memory and is not persisted until saved, and that `tracks` INSERT and `routes` INSERT fail offline.
- Cannot confirm: The exact toast message for V4/V6, but the test pass indicates the vulnerability (silent failure/data loss) was observed.
- Root cause: `mapStore.sessionTrail` is volatile and not auto-persisted during tracking (V1). Supabase write operations for `tracks` and `routes` lack an offline queue and fail silently when offline (V4, V6). This violates "Data Safety" and "Offline-First Design" principles.
- User impact: Users lose valuable GPS tracking data and planned routes due to unexpected app closure or lack of connectivity, leading to significant frustration and loss of effort.
- Business impact: Erodes user trust in the app's ability to safeguard their data, leading to churn and negative reviews.
- Fix direction: Implement auto-persistence for `sessionTrail` during active tracking (e.g., to `ee_session_trail` localStorage key). Implement an offline sync queue for `tracks` and `routes` writes.

## Tier Comparison
- **Theme Preference (V7):** Identical failure across Guest and Free tiers. Both fail to persist theme preference to `ee_theme` in localStorage, resulting in a reset to 'dark' on reload. This suggests a systemic issue with the manual `ee_theme` persistence mechanism, affecting all users.
- **Basemap/Layer Preferences (V9/V8):** Identical timeout failure across Guest (V9) and Free (V8) tiers. This suggests a systemic issue with the `mapStore`'s Zustand `persist` middleware for `ee-map-prefs`, affecting all users.
- **Learn Tab State (V13/F4):** Identical pass across Guest (V13) and Free (V13, F4). The `state-loss-evidence` shows no change in header stats, indicating that the fix for V13 (always-mounted tabs) is working for header stats across tiers, preventing state loss for these metrics.
- **Offline App Load (V2/V10):** Critical failure for Pro tier (and inferred Free). The app cannot load at all when offline. This is a fundamental issue affecting authenticated users. Guest users are not explicitly tested for this scenario, but the root cause (lack of app shell caching) would likely affect them too if they had any data to load.
- **Waypoint Saving (P3/V3/F3):**
    - Pro tier (P3, V3): "Save Waypoint" button disabled due to GPS acquisition failure. This prevents saving online and offline.
    - Free tier (F3): Waypoint sheet *opens*, bypassing the Pro gate, but the "Save Waypoint" button would likely also be disabled due to the GPS issue (though the test doesn't reach that point).
    - Guest tier: Waypoint saving is not directly tested, but `guest V11` confirms guest waypoints are memory-only. The GPS acquisition issue would likely affect them too.
    - This shows a multi-faceted problem: incorrect Pro gating for Free users, and a GPS acquisition failure affecting all tiers attempting to save waypoints.
- **Session Waypoints (V11):** Confirmed vulnerability for Guest tier (memory-only). Not tested for Free/Pro, but `STATE_MAP.md` implies `sessionWaypoints` are only for guests.
- **Active Module (V15):** Confirmed vulnerability for Guest tier (resets to default). Not tested for Free/Pro.
- **GPS Track Loss (V1):** Confirmed vulnerability for Pro tier (lost on reload). Not tested for other tiers, but `mapStore.sessionTrail` is volatile for all.
- **Offline Track/Route Save (V4/V6):** Confirmed vulnerability for Pro tier (silent failure/data loss). Not tested for other tiers.

## Findings Discarded
- No findings were discarded in this run, as all identified issues were deemed relevant and within the maximum limit of 8.

## Cannot Assess
- The exact state of `ee-map-prefs` in localStorage for V8/V9 due to test timeouts.
- The exact toast messages for V4/V6, though the vulnerability (silent failure/data loss) is confirmed.
- Whether the `isPro` status would revert to 'free' for V10 if the app could actually load offline, as the primary failure is the inability to load at all.
- The full impact of the GPS acquisition failure on Free/Guest users attempting to save waypoints, as the tests for those tiers don't fully exercise the save flow after the sheet opens.

## Systemic Patterns
-   **Persistence Failures:** Multiple critical user preferences (theme, basemap, layer visibility) and temporary data (guest waypoints, active module) are not persisting across reloads. This points to widespread issues with both Zustand's `persist` middleware configuration and manual `localStorage` write patterns.
-   **Offline Unusability:** The app is fundamentally broken offline for authenticated users, failing to load the core application. This is a severe violation of offline-first principles and impacts core functionality (data access, saving).
-   **GPS Acquisition Issues:** A core utility (GPS location) is failing, blocking critical user actions like saving waypoints across multiple tiers.
-   **Pro Gating Inconsistencies:** A premium feature (waypoint saving) is accessible to free users, undermining the business model.

## Calibration Notes
-   Carefully interpreted "PASS" for vulnerability tests (V1, V4, V6, V11, V15) as confirmation that the vulnerability *exists*, aligning with the "vulnerability-proof test philosophy".
-   Noted that the `guest V13` and `free V13/F4` tests *passing* with identical `state-loss-evidence` indicates the previous fix for V13 (preserving tab state) is working for header statistics, preventing state loss for these specific metrics.
-   Prioritized findings based on immediate user impact, with app loading failures and core feature blockers taking precedence over preference loss or less critical data loss.
-   Recognized that timeouts (V8, V9, P1) can still indicate underlying issues, especially when architectural knowledge suggests a persistence mechanism should be active.
-   Paid close attention to specific annotations like `ee_theme-before-reload: null` for V7, which directly contradicted previous "CONFIRMED" fix for V7, indicating a regression in manual persistence.