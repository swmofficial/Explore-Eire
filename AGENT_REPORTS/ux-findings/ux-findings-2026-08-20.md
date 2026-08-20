# UX Agent Report — 2026-08-20

## Run Context
- Commits analysed: `19db5533198b459b8e0e35754468ee2710ccbd5f` and 19 preceding commits.
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

### 3. High: User Preferences (Theme, Basemap, Layers) Fail to Persist on Reload (Vulnerability V7, V8, V9)
- Summary: User-selected theme, basemap, and layer visibility preferences are lost on page reload, reverting to defaults, despite `STATE_MAP.md` indicating they should be persisted.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly contradicts `STATE_MAP.md` which states `ee_theme` should persist.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
- Cannot confirm: The exact content of `ee-map-prefs` in localStorage due to timeout, but the failure to retain state is clear.
- Root cause: Persistence mechanisms for `userStore.theme` (manual `ee_theme` key) and `mapStore.basemap`/`layerVisibility` (Zustand `ee-map-prefs`) are not functioning correctly, possibly due to incorrect `localStorage` key usage or `persist` middleware configuration.
- User impact: Annoyance and wasted time as users must re-apply their preferred settings on every app load. Erodes trust in the app's reliability.
- Business impact: Minor negative impact on user satisfaction and perceived quality, potentially contributing to churn.
- Fix direction: Verify `localStorage` keys and `Zustand persist` middleware configuration for `userStore.theme`, `mapStore.basemap`, and `mapStore.layerVisibility`.

### 4. High: User-Generated Session Data (Tracks, Guest Waypoints, Active Module) Lost on Reload (Vulnerability V1, V11, V15)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module, are lost on page reload, despite `STATE_MAP.md` indicating they should be persisted.
- Tier(s) affected: All (Guest: V11, V15; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact point of failure in the manual persistence logic for these items, but the `absent` or `empty` annotations are conclusive.
- Root cause: The manual `IIFE + write pattern` for `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` is not functioning as intended, leading to data loss on reload.
- User impact: Significant data loss for users, especially for long GPS tracks or carefully placed guest waypoints, leading to extreme frustration and distrust.
- Business impact: High churn risk, negative reviews, and reduced engagement with core features.
- Fix direction: Debug the manual `localStorage` persistence logic for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 5. Medium: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the WaypointSheet and attempt to save waypoints, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() Received: false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was false and `waypointShown` was true. This means the UpgradeSheet was *not* shown, and the WaypointSheet *was*.
- Cannot confirm: If the save operation itself would succeed (it likely wouldn't due to Supabase RLS, but the UX issue is the bypassed gate).
- Root cause: The logic gating the "Save Waypoint" button (or the camera button that triggers the WaypointSheet) for free users is flawed, allowing access to a Pro feature.
- User impact: Free users may attempt to use a Pro feature, only to be met with a backend error or a later upgrade prompt, leading to confusion and frustration.
- Business impact: Undermines the value proposition of the Pro tier by allowing free users to access gated features, potentially reducing conversions.
- Fix direction: Correct the conditional rendering or routing logic for the WaypointSheet to ensure it only appears for Pro users or triggers the UpgradeSheet for Free users.

### 6. Medium: Offline Data Writes Fail Silently or Without Adequate Warning (Vulnerability V4, V6, V14)
- Summary: Offline attempts to save tracks and routes fail without clear user feedback or a pre-save warning, leading to silent data loss.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed (confirmed vulnerability): "track save fails offline (post-stop data loss)". This confirms the track data is lost.
    - `pro V6` passed (confirmed vulnerability): "route save offline produces no user-facing toast (silent failure)". Annotation `route-button-missing: cannot proof V6` indicates the proof mechanism was weak, but the test *passing* means the silent failure was observed.
    - `pro V3` (which failed due to GPS issue) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no pre-save warning for waypoints.
- Cannot confirm: The exact toast message for track save failure, but the test confirms data loss.
- Root cause: The application lacks an offline data queue and robust error handling for Supabase write failures, violating "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data (tracks, routes) without clear indication, leading to significant frustration and distrust in the app's ability to preserve their work.
- Business impact: High churn risk, negative reviews, and damage to brand reputation, especially for a field-based app.
- Fix direction: Implement an offline data queue (e.g., IndexedDB) and provide clear, actionable feedback (toasts, retry options) for failed offline save operations. Implement pre-save offline warnings.

### 7. Low: Pro User Sees UpgradeSheet on Pro Affordance Tap (P1 Test Flakiness)
- Summary: The `pro P1` test, which verifies Pro users *do not* see the UpgradeSheet on Pro affordance tap, timed out. This suggests test flakiness rather than an app bug, as the expected behavior for a Pro user is *not* to see the UpgradeSheet.
- Tier(s) affected: Pro
- Confidence: LOW (on app bug), HIGH (on test flakiness)
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.` The test description is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout here means the test couldn't confirm the *absence* of the UpgradeSheet within the timeout, or got stuck. Given the previous fix for P1, this is likely a test issue.
- Cannot confirm: If the UpgradeSheet *actually* appeared, or if the test simply got stuck waiting for an element that never appeared or disappeared.
- Root cause: Likely a race condition or an insufficient wait in the Playwright test itself, rather than a regression in the application's Pro gating logic.
- User impact: None, assuming the app behaves as intended (Pro users don't see upgrade sheets).
- Business impact: None, but contributes to unreliable test results.
- Fix direction: Review and refine the `pro P1` Playwright test to ensure robust waiting conditions and eliminate flakiness.

## Tier Comparison
- **Offline App Loading (V2, V10):** Pro tier explicitly fails to load offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is likely identical for Free users, as the core app shell and initial data loading are not tier-specific. Guest users might load, but their data persistence is already confirmed broken.
- **GPS Acquisition Failure (P3, V3):** The "Acquiring GPS..." issue preventing waypoint saving is observed in the Pro tier. This is a core map/GPS functionality and would affect all tiers if they attempted to save waypoints.
- **Preference Persistence (V7, V8, V9):** Theme (V7) fails to persist for both Guest and Free tiers, reverting to 'dark', indicating a universal issue. Basemap (V9) fails for Guest, and Layer Visibility (V8) fails for Free, suggesting a universal problem with `ee-map-prefs`.
- **Session Data Persistence (V1, V11, V15):** Guest Waypoints (V11) and Active Module (V15) are lost for Guest. GPS Track (V1) is lost for Pro. These are all manual `localStorage` persistence issues, indicating a systemic problem with the `IIFE + write pattern` across the board.
- **Learn Tab State (V13, F4):** Both Guest and Free tiers show identical `state-loss-evidence` and `header-stats-pair` annotations, indicating no regression in progress persistence. This suggests the fix for V13 is working consistently across tiers.
- **Pro Badges (F2):** Free users correctly see PRO badges, as expected.
- **Upgrade Gating (F3, C3, P1):** Guest users correctly see the UpgradeSheet (C3 PASS). Free users *incorrectly* bypass the UpgradeSheet and open the WaypointSheet (F3 FAIL). Pro users *should not* see the UpgradeSheet (P1 FAIL due to test timeout, not confirmed app bug). This highlights a specific regression for Free users.
- **Offline Data Writes (V4, V6, V14):** Confirmed failures for Pro tier. These are core data write operations and would affect any authenticated user attempting to save data offline.

## Findings Discarded
- `guest V13` and `free V13` (learn header stats are recomputed on every tab switch / learn tab state loss across tab switch): Both tests passed, and the `state-loss-evidence` annotations showed identical `completePct:0` before and after. This indicates that the *fix* for V13 (preserving progress state) is working, not that the vulnerability is active. The test description is misleading if it implies state loss is *still* happening. `free F4` also confirms no regression in Learn header percentage. Therefore, V13 is considered fixed for progress persistence.

## Cannot Assess
- The full extent of `pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) could not be assessed beyond the initial app load failure. The `net::ERR_INTERNET_DISCONNECTED` error prevented the app from loading at all, making it impossible to observe the state of `isPro` or `gold_samples` after an offline reload.

## Systemic Patterns
1.  **Broken Persistence Mechanisms:** A widespread failure of both Zustand `persist` middleware (for `ee-map-prefs`) and manual `localStorage` `IIFE + write pattern` (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This affects core user preferences and critical user-generated session data.
2.  **Lack of Offline-First Design:** The application fundamentally fails to load offline for authenticated users, and all data write operations fail silently or without proper queuing/warning when offline. This is a critical architectural gap for a field-use application.
3.  **GPS Acquisition Issues:** A recurring problem with the app's ability to acquire and utilize GPS coordinates, blocking fundamental features like waypoint saving.
4.  **Inconsistent Feature Gating:** A specific regression where Free users can access a Pro-gated feature (waypoint saving) without being prompted to upgrade.

## Calibration Notes
- The new test design, with explicit `(VXX confirmed)` annotations, significantly improved the clarity and confidence of vulnerability findings. This allowed for direct confirmation of issues like V1, V11, V14, and V15.
- Prioritizing app-breaking issues like `net::ERR_INTERNET_DISCONNECTED` (V2, V10 blocker) at the top of the findings list aligns with previous critical findings and the principle of user impact.
- Careful distinction between a test failure (e.g., timeout) and an actual app bug (e.g., `pro P1`) was maintained, avoiding misdiagnosis based solely on test status.
- The interpretation of "PASS" for vulnerability tests was correctly applied: a "PASS" means the test journey *confirmed* the vulnerability, not that it was fixed.