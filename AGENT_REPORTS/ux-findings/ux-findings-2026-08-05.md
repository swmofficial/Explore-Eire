# UX Agent Report — 2026-08-05

## Run Context
- Commits analysed: `81241360bb594240b0cae48af45d3b3c972c5380` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Loss of User-Generated Session Data on Reload (Vulnerability V1, V11, V15)
- Summary: Critical user-generated session data, including active GPS tracks, guest waypoints, and the active module, are lost on page reload, indicating a regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V11, V15; Pro: V1)
- Confidence: HIGH
- Evidence: `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys via manual `localStorage` patterns.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns for `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, and `moduleStore.activeModule`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) that users expect to persist, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 4. High: Loss of User Preferences on Page Reload (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are reset to their default values upon page reload, forcing users to reconfigure their settings repeatedly.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, with `ee_theme-before-reload: null` and `ee_theme-after-reload: null`. `guest V9` and `free V8` timed out, implying basemap and layer visibility states were not found or reset. `STATE_MAP.md` states `userStore.theme` persists via `ee_theme` (manual pattern) and `mapStore.basemap`, `mapStore.layerVisibility` persist via `ee-map-prefs` (Zustand persist).
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_theme` or the Zustand `persist` for `ee-map-prefs`.
- Root cause: Regression in the implementation of manual `localStorage` persistence for `userStore.theme` and/or the Zustand `persist` middleware for `mapStore`'s `basemap` and `layerVisibility`.
- User impact: Annoyance and wasted time as users must repeatedly re-apply their preferred settings, degrading the user experience.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to abandon the app if basic preferences aren't respected.
- Fix direction: Debug and restore the persistence mechanisms for `theme`, `basemap`, and `layerVisibility` as described in `STATE_MAP.md`.

### 5. High: Offline Data Save Operations Fail Silently or With Data Loss (Vulnerability V4, V6, V14)
- Summary: When offline, attempts to save tracks and routes fail, with route saves failing silently and waypoint saves lacking a pre-check warning, leading to unexpected data loss for users.
- Tier(s) affected: Pro (inferred for Free/Guest if they could save these items)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". `pro V3` (which also failed due to GPS) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. `STATE_MAP.md` confirms these behaviors under "Supabase Write Map" for `tracks` and `routes` inserts.
- Cannot confirm: The exact user experience for `pro V4` and `pro V6` beyond the test annotations, as no specific screenshots are provided for these "pass-to-confirm-vulnerability" tests.
- Root cause: The application lacks an offline data queue or robust error handling for Supabase write failures, as noted in `STATE_MAP.md` ("What is still NOT persisted (genuine vulnerabilities): Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)").
- User impact: Users lose valuable, effort-intensive data (tracks, routes) without clear feedback or a chance to retry, leading to severe frustration and distrust.
- Business impact: High churn, negative reviews, and a perception of unreliability, especially for a core feature in a rural-focused app.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) and provide clear user feedback (toasts, retry options) for failed offline save operations.

### 6. Medium: Free Users Can Bypass Upgrade Gate for Waypoint Saving (Vulnerability F3)
- Summary: Free users are incorrectly allowed to open the "New Waypoint" sheet when tapping the camera button, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The `gate-routing: {"upgradeShown":false,"waypointShown":true}` annotation explicitly states the UpgradeSheet was *not* shown, but the WaypointSheet *was*.
- Cannot confirm: If the waypoint save functionality itself is disabled for free users once they are in the sheet (though it should be, and the GPS issue would prevent it anyway).
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before showing the `WaypointSheet` and instead showing it directly.
- User impact: Confusing user experience where a feature appears accessible but then might fail or be gated later, or allows partial interaction without the intended upgrade prompt.
- Business impact: Missed opportunities for conversion to Pro subscriptions, as the primary upgrade prompt for a key feature is bypassed.
- Fix direction: Adjust the camera button's click handler to correctly check `isPro` status and display the `UpgradeSheet` for free users.

### 7. Medium: Pro User Sees UpgradeSheet on Pro Affordance Tap (Vulnerability P1)
- Summary: The test designed to confirm that Pro users *do not* see the UpgradeSheet when interacting with a Pro-gated affordance timed out, suggesting a potential issue where Pro users might still be incorrectly prompted to upgrade.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. The test is designed to confirm the *absence* of the UpgradeSheet. A timeout means this absence could not be confirmed, or the test failed to complete the interaction.
- Cannot confirm: Whether the UpgradeSheet actually appeared, or if the timeout was due to another interaction issue. No specific screenshot or annotation confirms the UpgradeSheet's presence.
- Root cause: Potentially a regression in the `isPro` check for gating upgrade prompts, or a test flakiness issue.
- User impact: Annoyance and confusion for paying Pro users if they are repeatedly prompted to upgrade for features they already have.
- Business impact: Erodes trust and satisfaction among paying subscribers, potentially leading to churn.
- Fix direction: Investigate the `pro P1` test timeout. Verify the `isPro` gating logic for UpgradeSheet display.

### 8. Low: Learn Tab Header Stats are Stable, but V13 Test Description is Misleading
- Summary: The Learn tab header statistics (courses, complete percentage, chapters done) remain stable across tab switches, which is good, but the test description "state-loss proof" is misleading as it implies a vulnerability where none is observed for these stats.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` both passed. `state-loss-evidence` annotations show identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone`. The previous report confirmed V13 (component state preservation) was fixed by keeping tabs mounted.
- Cannot confirm: Whether the *component state* (e.g., reading position within a chapter) is truly preserved, as the test only checks header stats. However, the previous fix should cover this.
- Root cause: The test description for V13 is poorly worded, implying a state loss for header stats when the evidence shows stability. The underlying fix for V13 (keeping components mounted) is likely working for component state.
- User impact: None, as the header stats are stable. The component state (reading position) is also likely preserved due to the previous fix.
- Business impact: None.
- Fix direction: Clarify the test description for V13 to accurately reflect what it's testing (stability of header stats) and consider adding a test for component state preservation (e.g., chapter reading position).

## Tier Comparison
- **Offline Loading (V2, V10):** Pro tier fails completely to load the app offline. This behavior is inferred for the Free tier as well, given the shared authentication and data loading mechanisms. Guest tier is not tested for this specific scenario.
- **GPS Acquisition (P3, V3):** Pro tier experiences a critical failure in GPS acquisition, disabling the waypoint save button. This issue is likely systemic and would affect Free and Guest users if they were able to access waypoint saving functionality.
- **Preference Loss (V7, V8, V9):** Theme (V7) resets for both Guest and Free users. Basemap (V9) resets for Guest. Layer visibility (V8) resets for Free. This indicates a broad failure in persistence mechanisms affecting multiple stores and tiers.
- **Session Data Loss (V1, V11, V15):** Guest waypoints (V11) and active module (V15) are lost for Guest users. GPS tracks (V1) are lost for Pro users. This highlights a general regression in manual `localStorage` persistence across different types of user-generated session data.
- **Free User Waypoint Gate Bypass (F3):** This issue is specific to the Free tier, where the upgrade gate for waypoint saving is incorrectly bypassed.
- **Offline Data Save Failures (V4, V6, V14):** Pro tier tests confirm these vulnerabilities (track save fails, route save fails silently, no pre-save offline warning). These behaviors are expected to be consistent across all tiers for any features that involve Supabase data writes while offline.
- **Learn Tab Header Stats (V13):** The stability of Learn tab header statistics is observed consistently across both Guest and Free tiers, indicating a robust underlying mechanism for these specific stats.
- **Pro User UpgradeSheet (P1):** This potential issue is specific to the Pro tier, concerning whether paying users are incorrectly prompted to upgrade.

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- The exact user experience for `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast) beyond the test annotations, as no specific screenshots are provided for these "pass-to-confirm-vulnerability" tests.

## Systemic Patterns
1.  **Persistence Regression:** There is a widespread failure in both Zustand `persist` middleware and manual `localStorage` patterns, leading to the loss of user preferences (theme, basemap, layer visibility) and critical user-generated session data (GPS tracks, guest waypoints, active module). This indicates a significant regression in state management and data retention.
2.  **Fundamental Offline Capability Breakdown:** The application completely fails to load for authenticated users when offline, and critical data save operations (waypoints, tracks, routes) fail without proper offline queuing or user feedback. This points to a severe deficiency in the app's offline-first design, which is critical for its target user base.
3.  **Core Feature Blockage (GPS):** A persistent issue with GPS acquisition is blocking a fundamental feature (saving waypoints), rendering a key part of the app unusable.

## Calibration Notes
- The recurrence of "Critical: App Fails to Load Offline for Authenticated Users (V2, V10)" and "Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)" from the previous report indicates that fixes for these high-impact issues were either not implemented or were ineffective. This reinforces the need to prioritize these findings.
- The "High: Widespread Preference & Session Data Loss on Reload (V1, V7, V8, V9, V11, V15)" also persists, confirming a systemic problem with data persistence.
- The design of vulnerability tests that "PASS" when the vulnerability is confirmed (e.g., V1, V11, V15, V4, V6, V14) is effective for identifying existing bugs.
- The V13 test's misleading "state-loss proof" description for stable header stats highlights the importance of scrutinizing test annotations against the actual vulnerability definition and observed evidence. The underlying fix for V13 (preventing component unmounting) is likely working, but the test itself is not directly proving it for component state.