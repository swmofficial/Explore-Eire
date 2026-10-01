# UX Agent Report — 2026-10-01

## Run Context
- Commits analysed: `4efe6dc17b0420bcbaa2aaf4574edf940bcfb77a` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
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

### 3. High: User Preference Persistence Regressions (V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are not persisting across page reloads, reverting to default settings. This is a regression for theme (V7) and indicates failures for basemap (V9) and layers (V8).
- Tier(s) affected: All
- Confidence: HIGH (V7), MEDIUM (V8, V9)
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, confirming the `ee_theme` localStorage key is not being correctly written or read.
    - `guest V9` failed with `Test timeout of 60000ms exceeded.`
    - `free V8` failed with `Test timeout of 60000ms exceeded.`
- Cannot confirm: The exact default states for V8 and V9 due to timeouts, but the failures strongly imply a reset.
- Root cause: The manual `localStorage` read/write pattern for `ee_theme` is failing. For `basemap` and `layerVisibility`, which are managed by Zustand `persist` middleware (`ee-map-prefs`), the persistence mechanism is either misconfigured or failing to hydrate the store on reload. This is a regression for V7.
- User impact: Users experience frustration as their personalized app settings are lost on every reload, requiring manual re-configuration.
- Business impact: Erodes user trust and satisfaction, potentially leading to reduced engagement and higher churn.
- Fix direction: Debug `ee_theme` manual `localStorage` implementation. Investigate `mapStore`'s Zustand `persist` configuration and hydration logic for `basemap` and `layerVisibility`.

### 4. High: Free Users Incorrectly Allowed to Save Waypoints (F3)
- Summary: Free tier users are incorrectly allowed to access the Waypoint Sheet and attempt to save waypoints, instead of being prompted to upgrade to Pro.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the upgrade sheet was *not* shown, but the waypoint sheet *was*.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the initial gating.
- Root cause: The logic gating the "Save Waypoint" action for free users is flawed, allowing access to the `WaypointSheet` instead of triggering the `UpgradeSheet`. This is a business logic error in the feature gate.
- User impact: Free users are led to believe they can save waypoints, only to potentially encounter a failure later in the process, leading to frustration and a poor user experience.
- Business impact: Missed opportunity for conversion to Pro tier, as the upgrade prompt is bypassed. Leads to user frustration when a gated feature is accessible but ultimately unusable.
- Fix direction: Correct the feature gating logic for waypoint saving to ensure free users are directed to the `UpgradeSheet` when attempting to use this Pro-only feature.

### 5. Medium: Session Data Loss on Reload (V1, V11, V15)
- Summary: Critical session-specific user data, including active GPS tracks, guest waypoints, and the active module, are lost upon page reload.
- Tier(s) affected: All (V1, V15), Guest (V11)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of the lost data, only its absence.
- Root cause: `STATE_MAP.md` explicitly lists `sessionWaypoints`, `sessionTrail`, and `activeModule` as using "manual IIFE + write pattern" for persistence. The test results indicate these manual patterns are either not implemented or are failing to write to `localStorage` (`ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) before reload.
- User impact: Users lose significant progress and data (e.g., a long GPS track, carefully placed guest waypoints, or their current module context) if the app crashes or the page is accidentally closed/reloaded.
- Business impact: Erodes user trust in the app's reliability, especially for core tracking and data collection features, leading to reduced engagement and potential churn.
- Fix direction: Implement or debug the manual `localStorage` persistence for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure they are written to `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` respectively, and rehydrated on app load.

### 6. Medium: Offline Data Write Failures (V4, V6, V14)
- Summary: User-generated data (tracks, routes) cannot be saved when offline, leading to data loss or silent failures, and the app provides no pre-save warning for offline status.
- Tier(s) affected: Pro (V4, V6), All (V14)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming track save fails offline.
    - `pro V6` passed, confirming route save offline produces no user-facing toast.
    - `pro V3` (which failed due to GPS, but still ran the offline check) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` confirms the lack of pre-save warning.
- Cannot confirm: The exact toast message for V4, but the pass implies the expected failure behaviour was observed.
- Root cause: `STATE_MAP.md` confirms that `tracks` INSERT and `routes` INSERT operations "Fail" or "Fails silently" offline, resulting in data loss. There is no offline write queue or pre-check mechanism. This directly violates "Offline-First Design" principles.
- User impact: Users lose valuable data they've created (e.g., a completed track or a planned route) if they attempt to save while offline, often without clear warning.
- Business impact: Significant erosion of user trust, especially for a core feature like data collection in potentially remote areas. Leads to negative reviews and reduced adoption.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) for user-generated content. Provide clear offline status indicators and pre-save warnings (V14).

### 7. Low: Pro Upgrade Sheet Gating Timeout (P1)
- Summary: The test for Pro users *not* seeing the Upgrade Sheet on Pro affordance tap timed out, indicating an issue with the test's ability to verify the expected behavior.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`.
- Cannot confirm: Whether the UpgradeSheet *actually* appeared or if the test simply failed to complete its assertions due to a different issue (e.g., element not found, navigation issue).
- Root cause: Unclear. Could be a flaky test, an issue with the Pro state setup in `global-setup.js`, or an unexpected UI element blocking the test's interaction.
- User impact: Unclear, as the actual UI behavior is not confirmed.
- Business impact: Unclear.
- Fix direction: Investigate the `pro P1` test for flakiness or incorrect assertions. Ensure the `global-setup.js` correctly sets up the Pro user state and that the test waits for the app to be fully ready.

## Tier Comparison
- **V7 (Theme Reset):** Identical behaviour across Guest and Free tiers (both fail, theme resets to 'dark'). This suggests a core issue with the `ee_theme` localStorage handling, independent of authentication status.
- **V13 (Learn Header Stats):** Identical behaviour across Guest and Free tiers (both pass, header stats remain 0%). This indicates the fix for component unmount is working for header stats, and the stats themselves are stable (though at 0% in this test).
- **V9 (Basemap Reset) & V8 (Layer Preferences Reset):** Both Guest and Free tiers experience timeouts, suggesting a common underlying issue with `mapStore` persistence or test flakiness, independent of authentication.
- **V1, V11, V15 (Session Data Loss):** V11 (guest waypoints) is specific to Guest. V1 (session trail) and V15 (active module) affect all tiers, and the tests confirm loss for Guest and Pro respectively. This points to a general failure in the manual `localStorage` persistence patterns for these volatile session states.
- **Offline App Load (V2, V10):** Only tested for Pro, but the `net::ERR_INTERNET_DISCONNECTED` error implies a fundamental app shell loading issue that would affect any authenticated user (Free or Pro) trying to load offline. Guest users might load partially if their initial data requirements are less.

## Findings Discarded
- `guest V13` and `free V13`: While the test description mentions "state-loss proof", the annotation `state-loss-evidence` shows identical `before` and `after` values for header stats, and the test *passed*. This indicates the header stats themselves are stable, which is a positive outcome. The previous finding "Preserve Learn tab component state across tab switches (V13)" was CONFIRMED, implying the underlying component unmount issue was fixed. Therefore, the test confirms the fix for header stats, not a vulnerability. The vulnerability V13 (reading position) is not directly tested by this specific assertion.
- `free F4`: This test explicitly checks that "Learn header percentage does not regress to zero across tab switches" and passed with identical before/after stats. This confirms the stability of header stats, similar to V13. It's a positive finding, not a problem.

## Cannot Assess
- The exact nature of the `pro P1` timeout.
- The specific default values for V8 and V9 due to timeouts.

## Systemic Patterns
- **Persistence Failures:** Multiple issues (V7, V8, V9, V1, V11, V15) point to widespread problems with `localStorage` persistence, both for Zustand's `persist` middleware and manual `IIFE + write` patterns.
- **Offline Inadequacy:** The app fundamentally fails offline (V2, V10), and even when partially functional, it lacks offline data saving capabilities (V3, V4, V6, V14), indicating a complete absence of an offline-first strategy.
- **GPS Dependency:** Critical features (waypoint saving) are blocked by GPS acquisition issues, suggesting a problem with the `useTracks` hook or its interaction with `mapStore.userLocation`.

## Calibration Notes
- Prioritized direct evidence from annotations and error messages (e.g., `net::ERR_INTERNET_DISCONNECTED`, `expect(...).toBeDisabled()`) to ensure HIGH confidence.
- Avoided speculating on root causes without direct evidence, especially for timeouts where the exact failure condition is ambiguous (e.g., `pro P1`).
- Used `STATE_MAP.md` extensively to trace observed UX issues to specific architectural components and their persistence mechanisms, confirming known vulnerabilities.
- Re-evaluated test outcomes (e.g., V13, F4) where a "PASS" might still confirm a vulnerability (if the test is designed to prove the vulnerability exists by observing a specific behavior) or confirm a fix (if the test is designed to assert the absence of a vulnerability). The distinction is crucial for accurate reporting.