# UX Agent Report — 2026-10-08

## Run Context
- Commits analysed: `dae3b74f0906017a41d9f2189aaf2ed47e2c8097` and 19 preceding commits.
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

### 3. Critical Regression: Theme Preference Resets on Reload (V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted and reverts to the default 'dark' theme after a page reload, despite previous fixes.
- Tier(s) affected: Guest, Free (likely Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` explicitly show the `ee_theme` localStorage key is not being written or read correctly. `STATE_MAP.md` states `ee_theme` is a manual localStorage key for `userStore.theme` (task-008).
- Cannot confirm: If the issue affects Pro users, though the shared codebase makes it highly probable.
- Root cause: The manual persistence mechanism for `userStore.theme` via `ee_theme` (IIFE read + `setItem` on write) is not functioning, causing the theme to revert to its default on re-initialization. This is a regression from a previously "CONFIRMED" fix.
- User impact: Annoyance and loss of personalization, requiring users to re-select their preferred theme on every app load.
- Business impact: Erodes user trust in the app's reliability and attention to detail, potentially impacting retention.
- Fix direction: Re-verify the implementation of the manual `ee_theme` localStorage persistence in `userStore.js` to ensure `setItem` is called on theme change and the IIFE correctly hydrates on store initialization.

### 4. Critical Regression: Guest Waypoints Lost on Reload (V11)
- Summary: Waypoints created by guest users are lost upon page reload, despite a previous fix intended to persist them to localStorage.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the `ee_guest_waypoints` localStorage key was missing, confirming the vulnerability. `STATE_MAP.md` states `sessionWaypoints` persists via `ee_guest_waypoints` (manual pattern, task-002).
- Cannot confirm: The exact moment of failure (write or read).
- Root cause: The manual persistence mechanism for `mapStore.sessionWaypoints` via `ee_guest_waypoints` is not functioning, causing guest waypoints to be lost on reload. This is a regression from a previously "CONFIRMED" fix.
- User impact: Loss of user-generated data, leading to significant frustration and a perception of an unreliable application. Guests may abandon the app if their initial efforts are not saved.
- Business impact: Prevents guest users from experiencing the value of the app, hindering conversion to authenticated or paying users.
- Fix direction: Re-verify the implementation of the manual `ee_guest_waypoints` localStorage persistence in `mapStore.js` to ensure `setItem` is called on waypoint save and the IIFE correctly hydrates on store initialization.

### 5. Critical Regression: Active Module Resets on Reload (V15)
- Summary: The user's active module preference resets to 'prospecting' after a page reload, despite a previous fix intended to persist it to localStorage.
- Tier(s) affected: Guest (likely Free/Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V15` passed, but the annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the `ee_active_module` localStorage key was missing, confirming the vulnerability. `STATE_MAP.md` states `activeModule` persists via `ee_active_module` (manual pattern, task-013).
- Cannot confirm: If the issue affects Free/Pro users, though the shared codebase makes it highly probable.
- Root cause: The manual persistence mechanism for `moduleStore.activeModule` via `ee_active_module` is not functioning, causing the active module to revert to its default on re-initialization. This is a regression from a previously "CONFIRMED" fix.
- User impact: Annoyance and inefficiency, requiring users to re-select their desired module on every app load.
- Business impact: Hinders user flow and engagement, especially for users who prefer specific modules for their work.
- Fix direction: Re-verify the implementation of the manual `ee_active_module` localStorage persistence in `moduleStore.js` to ensure `setItem` is called on module change and the IIFE correctly hydrates on store initialization.

### 6. Critical Regression: GPS Track Lost on Reload (V1)
- Summary: An active GPS track is lost upon page reload, despite a previous fix intended to auto-persist it to localStorage during tracking.
- Tier(s) affected: Pro (likely Free/Guest if they could track, but tracking is a Pro feature)
- Confidence: HIGH
- Evidence: `pro V1` passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the `ee_session_trail` localStorage key was empty or missing, confirming the vulnerability. `STATE_MAP.md` states `sessionTrail` persists via `ee_session_trail` (manual pattern, task-006).
- Cannot confirm: The exact moment of failure (write or read).
- Root cause: The manual persistence mechanism for `mapStore.sessionTrail` via `ee_session_trail` is not functioning, causing active GPS tracks to be lost on reload. This is a regression from a previously "CONFIRMED" fix.
- User impact: Catastrophic loss of critical user-generated data (entire track of a hike/prospecting session), leading to extreme frustration and complete distrust in the application.
- Business impact: Direct loss of value proposition for paying Pro users, leading to high churn and negative reviews.
- Fix direction: Re-verify the implementation of the manual `ee_session_trail` localStorage persistence in `mapStore.js` to ensure `setItem` is called on every `appendSessionTrailPoint` and the IIFE correctly hydrates on store initialization.

### 7. Free Users Bypass Upgrade Gate for Waypoints (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to create waypoints, bypassing the intended upgrade gate for a Pro feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was `false` and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet is visible.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the gate.
- Root cause: The logic gating waypoint creation for free users is flawed. Instead of showing the `UpgradeSheet`, the app proceeds to show the `WaypointSheet`. This is a business logic error in the `useWaypoints` hook or the `CornerControls` component.
- User impact: Free users can attempt to use a premium feature, only to potentially hit a failure later, leading to frustration and a poor user experience.
- Business impact: Direct loss of potential conversions from free to Pro users, as the primary upgrade incentive (saving waypoints) is bypassed.
- Fix direction: Correct the conditional logic in `CornerControls` or `useWaypoints` to ensure `showUpgradeSheet` is set to `true` when a free user attempts to access waypoint creation.

### 8. Layer and Basemap Preferences Reset on Reload (V8, V9)
- Summary: User preferences for basemap selection and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: Guest (V9), Free (V8) (likely Pro too, but not explicitly tested)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded.` While a timeout, these tests are specifically designed to check persistence of `basemap` and `layerVisibility`. The timeout suggests the expected state was not reached or the UI elements were not interactive. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state after reload, only that the test failed to verify persistence.
- Root cause: The `mapStore`'s `persist` middleware for `basemap` and `layerVisibility` (key `ee-map-prefs`) is either failing to write to localStorage, or failing to hydrate correctly on store initialization.
- User impact: Annoyance and inefficiency, requiring users to re-configure their map display preferences on every app load.
- Business impact: Degrades the user experience and makes the app feel less professional and reliable.
- Fix direction: Debug the `mapStore`'s Zustand `persist` middleware configuration and ensure `ee-map-prefs` is correctly writing and reading `basemap` and `layerVisibility` to/from localStorage.

## Tier Comparison
- **App Loading Offline (V2, V10):** Identical behavior across tiers (inferred for Guest/Free, confirmed for Pro). The app fails to load entirely, preventing any functionality. This indicates a fundamental Service Worker or app shell caching issue, not specific to authentication state.
- **Theme Persistence (V7):** Identical failure behavior for Guest and Free tiers. The theme resets to 'dark' on reload, and the `ee_theme` localStorage key is `null`. This suggests a universal issue with the manual theme persistence mechanism.
- **Learn Header Stats (V13, F4):** Identical *correct* behavior for Guest and Free tiers. The header stats (courses, completePct, chaptersDone) are preserved across tab switches and reloads. This confirms the fix for V13 is working for these specific stats.
- **Waypoint Save Button Disabled (P3, V3):** Identical behavior for Pro tier (and inferred for Free/Guest if they could save waypoints). The "Save Waypoint" button is disabled due to GPS acquisition failure.
- **Waypoint Upgrade Gate (F3):** Specific to the Free tier, where the upgrade gate is bypassed. Guest users are not expected to save waypoints to the database, and Pro users have access.
- **Guest Waypoint Persistence (V11):** Specific to the Guest tier, where waypoints are lost on reload. Authenticated users save waypoints to Supabase, not `sessionWaypoints`.
- **Active Module Persistence (V15):** Specific to the Guest tier (tested), where the active module resets.
- **GPS Track Persistence (V1):** Specific to the Pro tier (tested), where the track is lost on reload.

## Findings Discarded
- `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: Discarded due to `Test timeout of 60000ms exceeded.` The timeout makes it impossible to confidently determine if the UpgradeSheet was shown or not.
- `pro V6 — route save offline produces no user-facing toast (silent failure)`: Discarded due to `route-button-missing: cannot proof V6` annotation. The test explicitly states it cannot prove the vulnerability, making it unreliable evidence for this run.

## Cannot Assess
- The full extent of `V2` (gold/mineral data missing offline) and `V10` (Pro status reverts offline) due to the app failing to load entirely when offline. The `page.goto: net::ERR_INTERNET_DISCONNECTED` error prevents reaching the state where these specific data points would be checked.
- The full extent of `V3` (waypoint save fails offline silently) as the "Save Waypoint" button is disabled due to GPS acquisition failure, preventing the offline save path from being triggered.

## Systemic Patterns
- **Regression in Manual LocalStorage Persistence:** A significant pattern is the failure of multiple manual localStorage persistence mechanisms (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`). These were previously marked as "CONFIRMED" fixed, but the current tests show them as active vulnerabilities. This suggests a systemic issue with how these manual persistence patterns are implemented or maintained, possibly due to refactoring or an incorrect understanding of their lifecycle.
- **Offline App Shell Failure:** The app's inability to load at all when offline points to a fundamental gap in Service Worker caching for the core application shell and initial data, making the app unusable in its primary target environment.
- **GPS Acquisition Issues:** The persistent "Acquiring GPS..." state leading to disabled save buttons indicates a problem with the app's geolocation integration or its interaction with the Playwright mock.

## Calibration Notes
- **Trusting Annotations:** This run heavily relied on explicit annotations like `ee_theme-before-reload: null` or `V11 confirmed` to identify regressions, even when the test itself "passed". This is a crucial aspect of the "Vulnerability-Proof Test Philosophy" and proved effective in uncovering issues that might otherwise be missed by simple pass/fail.
- **Distinguishing Timeout Causes:** Timeouts (e.g., `guest V9`, `free V8`, `pro P1`) are still challenging. While they often indicate a problem, they don't pinpoint the *exact* UX issue as clearly as assertion failures or specific annotations. I've scored these as MEDIUM confidence unless other evidence (like `STATE_MAP.md` or related failures) strongly supports a specific UX bug.
- **Revisiting "CONFIRMED" Fixes:** The multiple regressions in previously "CONFIRMED" fixes (V1, V7, V11, V15) highlight the importance of continuous regression testing and the need for robust test assertions that truly validate the fix, not just that a journey completed. The new test design with explicit state-loss annotations is proving valuable here.
- **Masked Vulnerabilities:** The GPS acquisition failure (P3) masking V3, and the app loading failure masking V2/V10, demonstrates how one critical bug can hide others. This reinforces the need to address foundational issues first.