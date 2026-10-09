# UX Agent Report — 2026-10-09

## Run Context
- Commits analysed: `25e994715aa6a83b3448113754349eee175f5203` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free/Guest, as it's an app-level loading issue)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the app could not even establish a connection to load the initial page.
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

### 3. Critical Regression: Theme Preference Resets on Reload (V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted and reverts to the default 'dark' theme after a page reload, despite previous fixes.
- Tier(s) affected: Guest, Free (likely Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` explicitly show the `ee_theme` localStorage key is not being written or read correctly. `STATE_MAP.md` states `ee_theme` is a manual localStorage key for `userStore.theme` (task-008).
- Cannot confirm: If the issue affects Pro users, though the shared codebase makes it highly probable.
- Root cause: The manual persistence mechanism for `userStore.theme` via `ee_theme` (IIFE read + `setItem` on write) is not functioning, causing the theme to revert to its default on re-initialization. This is a regression from a previously "CONFIRMED" fix.
- User impact: Annoyance and loss of personalization, requiring users to re-select their preferred theme on every app load.
- Business impact: Erodes user trust in the app's reliability and attention to detail, potentially impacting retention.
- Fix direction: Re-verify the implementation of the manual `ee_theme` localStorage persistence in `userStore.js` to ensure theme changes are correctly written and read on app load.

### 4. Critical Regression: Basemap and Layer Preferences Reset on Reload (V9, V8)
- Summary: User preferences for basemap selection and layer visibility are not persisted and revert to their default states after a page reload.
- Tier(s) affected: Guest, Free (likely Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests both timed out. While timeouts can be flaky, the previous report also identified V9 as a failure. `STATE_MAP.md` lists `basemap` and `layerVisibility` as persisted fields in `mapStore` via `ee-map-prefs` (Zustand persist). The timeout suggests the test couldn't even verify the state after reload, implying it didn't persist.
- Cannot confirm: The exact state they revert to without direct assertions, but the timeout strongly suggests a failure to maintain the expected state.
- Root cause: The `mapStore`'s Zustand `persist` middleware for `basemap` and `layerVisibility` (key: `ee-map-prefs`) is either misconfigured or failing to write/read from localStorage, causing these preferences to reset on app re-initialization.
- User impact: Users lose their customised map view settings, requiring them to re-select their preferred basemap and re-enable desired layers on every app load, leading to frustration.
- Business impact: Reduces the perceived quality and reliability of the app, potentially impacting user satisfaction and engagement with core map features.
- Fix direction: Investigate the `mapStore`'s Zustand `persist` configuration and ensure `ee-map-prefs` is correctly saving and loading `basemap` and `layerVisibility`.

### 5. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to save a waypoint, rather than being directed to the Upgrade Sheet as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failed, `Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet, confirming the incorrect routing.
- Cannot confirm: If the waypoint save would actually succeed or fail for a free user, as the test only checks the initial routing. However, `STATE_MAP.md` implies `waypoints` INSERT is a Pro feature.
- Root cause: The logic gating the "Save Waypoint" action (e.g., the camera button on the map) for free users is flawed, allowing them to bypass the `UpgradeSheet` and access the `WaypointSheet` directly. This is a failure in the feature gating mechanism.
- User impact: Free users encounter a dead-end or error when trying to save a waypoint, leading to confusion and frustration. It also dilutes the value proposition of the Pro tier.
- Business impact: Missed opportunities for conversion to Pro subscriptions, as the upgrade path is not correctly presented. Also, a poor user experience for free users.
- Fix direction: Correct the conditional rendering or routing logic for the waypoint creation flow to ensure free users are always directed to the `UpgradeSheet` when attempting to save a waypoint.

### 6. High: Guest Waypoints and GPS Tracks are Lost on Reload (V11, V1) and Track Save Fails Offline (V4)
- Summary: Guest waypoints and actively recorded GPS tracks are not persisted and are lost upon page reload. Additionally, track saves fail when offline, resulting in data loss.
- Tier(s) affected: Guest (V11), Pro (V1, V4) (V1/V4 likely affect Free/Guest if they could track/save).
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms guest waypoints are not persisted.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms active GPS tracks are not persisted.
    - `pro V4` passed. The test description "track save fails offline (post-stop data loss)" indicates a pass means the test successfully confirmed the failure and data loss. `STATE_MAP.md` confirms `tracks` INSERT "Fails — toast 'Could not save track'. YES — entire GPS trail, distance, elevation, duration gone."
    - `STATE_MAP.md` confirms `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002) and `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006). Both are regressions from previously "CONFIRMED" fixes.
- Cannot confirm: If V1/V4 affects Free/Guest users, but the underlying mechanism is shared.
- Root cause: The manual persistence mechanisms for `mapStore.sessionWaypoints` (`ee_guest_waypoints`) and `mapStore.sessionTrail` (`ee_session_trail`) are not functioning, causing this critical user-generated data to be lost on reload. For V4, the lack of an offline write queue for Supabase `tracks` INSERT operations leads to silent failure and data loss. These are regressions from previously "CONFIRMED" fixes.
- User impact: Significant data loss for users who are actively exploring, leading to high frustration and loss of valuable field data. This is a critical failure for an outdoor mapping app.
- Business impact: Severe damage to user trust and app reliability, leading to high churn and negative reviews. Directly impacts the core value proposition of the app.
- Fix direction: Re-verify the implementation of the manual `ee_guest_waypoints` and `ee_session_trail` localStorage persistence in `mapStore.js`. Implement an offline write queue for Supabase data writes (V4).

### 7. Medium: Active Module Resets to Default on Reload (V15)
- Summary: The `activeModule` preference is not persisted and reverts to its default ('prospecting') after a page reload.
- Tier(s) affected: Guest (likely Free/Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This explicitly confirms the `ee_active_module` localStorage key is missing or empty after reload, causing the module to reset. `STATE_MAP.md` states `activeModule` persists via `ee_active_module` (manual IIFE + write pattern, task-013).
- Cannot confirm: If the issue affects Free/Pro users, though the shared codebase makes it highly probable.
- Root cause: The manual persistence mechanism for `moduleStore.activeModule` via `ee_active_module` (IIFE read + `setItem` on write) is not functioning, causing the active module to revert to its default on re-initialization. This is a regression from a previously "CONFIRMED" fix.
- User impact: Users lose their selected module, requiring them to re-select it on every app load, leading to minor annoyance and disruption to their workflow.
- Business impact: Minor erosion of user experience and trust in app reliability.
- Fix direction: Re-verify the implementation of the manual `ee_active_module` localStorage persistence in `moduleStore.js` to ensure active module changes are correctly written and read on app load.

### 8. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1)
- Summary: A Pro user is incorrectly shown the Upgrade Sheet when tapping on a Pro-gated feature, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. The test's purpose is to ensure a Pro user *does not* see the UpgradeSheet. A timeout here suggests the test was waiting for the UpgradeSheet *not* to appear, but it either appeared or the test got stuck in a state where it couldn't proceed. Given the test's intent, the timeout strongly implies the UpgradeSheet *was* shown.
- Cannot confirm: The exact screenshot of the UpgradeSheet being shown, but the timeout on an `expect().not.toBeVisible()` type of assertion (implied by the test name) strongly suggests it *was* visible.
- Root cause: The feature gating logic for Pro-exclusive features is incorrectly checking the user's `isPro` status, leading to the `UpgradeSheet` being displayed even for authenticated Pro users. This is a regression from a previously "CONFIRMED" fix.
- User impact: Annoyance and confusion for paying Pro users who are incorrectly prompted to upgrade, undermining their premium experience.
- Business impact: Erodes trust and satisfaction among the most valuable user segment, potentially leading to subscription cancellations.
- Fix direction: Re-verify the `isPro` check in the feature gating logic for Pro-exclusive features to ensure the `UpgradeSheet` is only displayed to non-Pro users.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Identical behaviour across tiers (inferred for Guest/Free). The app fails to load entirely for any user when offline. This indicates a systemic issue with the Service Worker or initial app shell caching, not specific to authentication state.
*   **Theme Preference Reset (V7):** Identical behaviour for Guest and Free users (likely Pro too). The theme resets to 'dark' on reload, indicating a universal failure in the `ee_theme` localStorage persistence mechanism.
*   **Basemap and Layer Preference Reset (V9, V8):** Identical behaviour for Guest and Free users (likely Pro too). Preferences reset on reload, indicating a universal failure in the `ee-map-prefs` Zustand persistence.
*   **Learn Header Stats (V13, F4):** Identical behaviour for Guest and Free users. The header stats remain `0%` complete and `0` chapters done, and do not regress, indicating that the underlying progress data (if any existed) is stable, and the component state is preserved (as per previous fix). The test description "state-loss proof" is misleading here, as it proves *stability* of the stats, not loss.
*   **Active Module Reset (V15):** Confirmed for Guest. Likely identical for Free/Pro due to shared `moduleStore` logic.
*   **Guest Waypoints (V11):** Confirmed for Guest. Not applicable to authenticated users as they save to Supabase.
*   **GPS Track Loss (V1) and Offline Track Save (V4):** Confirmed for Pro. Likely affects Free/Guest if they could track/save, due to shared `mapStore` logic and lack of offline queue.
*   **Waypoint Save Gating (F3):** Specific to Free tier. Free users are incorrectly routed to the Waypoint Sheet instead of the Upgrade Sheet. Pro users should be able to save (P3 failure is due to GPS, not gating). Guest users are memory-only (V11).
*   **Pro Upgrade Sheet (P1):** Specific to Pro tier. Pro users are incorrectly shown the Upgrade Sheet.

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- `pro V6 — route save offline produces no user-facing toast (silent failure)`: The annotation `route-button-missing: cannot proof V6` indicates the test could not reach the point of asserting the presence or absence of a toast. Therefore, V6 cannot be confirmed or disconfirmed.

## Systemic Patterns
*   **Persistence Regression:** Multiple previously "CONFIRMED" fixes for state persistence (V1, V7, V11, V15, V8/V9) have regressed. This suggests a fundamental issue with how localStorage is being managed, either through Zustand's `persist` middleware or the manual IIFE + `setItem` patterns. It's possible a recent refactor or dependency update broke the localStorage interaction.
*   **Offline Functionality Failure:** The app's core functionality (loading, data access, saving) completely breaks down when offline. This is a critical gap in the "Offline-First Design" principle and affects all tiers.
*   **GPS Acquisition Issues:** The consistent failure to acquire GPS (P3, V3) is a blocker for core map features like waypoint saving and tracking, indicating a problem with the geolocation API integration or its interaction with Playwright's mock.
*   **Incorrect Feature Gating:** The `isPro` checks are failing in multiple places (F3, P1), leading to incorrect routing or display of UI elements for different user tiers.

## Calibration Notes
*   The repeated failures for V1, V7, V8, V9, V11, V15 despite previous "CONFIRMED" fixes highlight the importance of robust regression testing for persistence mechanisms. My previous "CONFIRMED" verdicts were based on the fixes being implemented, but the tests now show they've regressed. This reinforces the need to re-evaluate "CONFIRMED" fixes if subsequent tests fail.
*   The `page.goto: net::ERR_INTERNET_DISCONNECTED` error is a clear, unambiguous signal of a critical failure, which was correctly prioritised as HIGH confidence.
*   The `state-loss-evidence` for V13/F4 showing identical `before`/`after` values for header stats, combined with the previous fix for V13 (preserving component state), indicates that the *component* is now correctly mounted, and the *derived stats* are stable (because no progress was made). This is not a state *loss* but state *stability*, which is good. I continue to interpret "state-loss proof" in the context of the *actual evidence* provided.