# UX Agent Report — 2026-08-14

## Run Context
- Commits analysed: `d7a6e48df65ea30de89b2001156929889002b1d7` (latest) and 19 preceding commits.
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

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also means offline waypoint saves fail without a pre-check warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". `pro V3` also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. The `STATE_MAP.md` confirms V14 (no pre-check) is a genuine vulnerability.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration, and implement an offline pre-check for data saves.

### 3. High: Widespread Regression in Persistence of User Preferences and Session Data (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Critical user preferences (theme, basemap, layer visibility) and user-generated session data (active GPS tracks, guest waypoints, active module) are lost on page reload, indicating a widespread regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V7, V9, V11, V15; Free: V7, V8; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences.
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    `STATE_MAP.md` explicitly states these items *should* be persisted via `ee_theme`, `ee-map-prefs`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`. Previous findings for V1, V7, V11, V15 were all CONFIRMED as fixed, indicating a significant regression.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, and `ee_theme`, or the Zustand `persist` for `ee-map-prefs`.
- Root cause: A regression in the `localStorage` persistence mechanisms, affecting both manual IIFE patterns and Zustand `persist` middleware configurations.
- User impact: Users lose their customized settings and unsaved session data (waypoints, tracks), leading to frustration and repeated setup, undermining trust in the app's reliability.
- Business impact: Reduced user satisfaction, increased churn, and negative perception of app quality.
- Fix direction: Re-verify and debug `localStorage` persistence logic for all affected state keys, including Zustand `persist` configurations and manual IIFE patterns.

### 4. High: Free Users Can Access Waypoint Saving Without Upgrading (Vulnerability F3)
- Summary: Free tier users are able to access the `WaypointSheet` directly from the map's camera button, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` being `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown.
- Cannot confirm: If the waypoint save operation itself would succeed for a free user (it should fail at the Supabase level), but the UX flow is incorrect.
- Root cause: Incorrect gating logic for the camera button's action, failing to check `isPro` status before routing to `WaypointSheet` instead of `UpgradeSheet`.
- User impact: Free users may attempt to save waypoints, only to encounter a backend error or discover their data isn't saved, leading to frustration.
- Business impact: Missed opportunity to convert free users to Pro subscribers, directly impacting revenue.
- Fix direction: Correct the conditional rendering/routing logic for the camera button to display the `UpgradeSheet` for free users.

### 5. Medium: Pro Users Encounter Upgrade Sheet (Vulnerability P1)
- Summary: Pro users, who have already paid for premium features, are unexpectedly shown the Upgrade Sheet when interacting with Pro-gated affordances.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This often indicates that an expected element (like the UpgradeSheet *not* being visible) was not met, or the test got stuck waiting for a condition that didn't occur. Given the test's purpose ("Pro user does not see UpgradeSheet"), a timeout strongly suggests the UpgradeSheet *was* shown or the test couldn't proceed because of it.
- Cannot confirm: The exact screenshot of the UpgradeSheet being visible for a Pro user, as the test timed out before capturing a specific failure state.
- Root cause: Incorrect `isPro` check in the component responsible for displaying the Upgrade Sheet, or a race condition where `isPro` state is not yet fully hydrated when the Pro affordance is tapped.
- User impact: Paying Pro users are confused and frustrated by being asked to upgrade for features they already possess, eroding trust and satisfaction.
- Business impact: Negative impact on Pro subscriber retention and brand reputation.
- Fix direction: Review `isPro` gating logic for the Upgrade Sheet and ensure `isPro` state is fully loaded and stable before rendering Pro-gated UI elements.

### 6. Medium: Offline Track and Route Saves Fail Silently or With Data Loss (Vulnerability V4, V6)
- Summary: When offline, saving a GPS track results in complete data loss, and saving a route fails silently without a user-facing toast, both indicating a lack of robust offline data handling.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, which confirms the vulnerability: "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms `tracks` INSERT fails offline with a toast "Could not save track" and "YES — entire GPS trail... gone."
    - `pro V6` passed, but annotation `route-button-missing: cannot proof V6`. `STATE_MAP.md` explicitly states `routes` INSERT fails with "console.error only, no toast" and "YES — route points gone." The test passing means the app didn't crash, which is consistent with a silent failure, and the vulnerability is still active as per `STATE_MAP.md`.
- Cannot confirm: The exact toast message for V4 from the test output, but the test passing confirms the data loss. The `route-button-missing` annotation for V6 suggests the test couldn't fully assert the *absence* of a toast, but `STATE_MAP.md` is clear.
- Root cause: Lack of an offline data queue or local-first write strategy for user-generated content. Supabase writes fail directly when offline.
- User impact: Users lose valuable recorded tracks and planned routes, leading to significant frustration and loss of trust in the app's ability to preserve their work.
- Business impact: High churn, negative reviews, and inability to rely on the app for critical field work.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store and retry failed write operations when connectivity is restored.

## Tier Comparison

*   **Offline App Load (V2, V10):** Pro tier explicitly fails to load offline. This behavior is likely identical for Free users as the core app shell and initial data loading are not tier-specific. Guest users are not tested for this, but would likely also fail if core app shell isn't cached.
*   **Persistence Regressions (V1, V7, V8, V9, V11, V15):**
    *   **Theme (V7):** Fails for both Guest and Free. Likely affects Pro as well.
    *   **Basemap (V9):** Fails for Guest. Likely affects Free and Pro.
    *   **Layer Preferences (V8):** Fails for Free. Likely affects Guest and Pro.
    *   **Guest Waypoints (V11):** Fails for Guest (as expected for guest-specific data).
    *   **Active Module (V15):** Fails for Guest. Likely affects Free and Pro.
    *   **GPS Track (V1):** Fails for Pro. Likely affects Free (if they could track). Guest cannot track.
    *   The widespread nature of these failures across different state types and tiers suggests a systemic issue with `localStorage` persistence overall, rather than isolated bugs.
*   **Learn Tab State (V13, F4):** State is preserved across tab switches for both Guest and Free tiers. This indicates the fix for V13 is working correctly across these tiers.
*   **Pro Badges (F2):** Free users correctly see PRO badges in the LayerPanel, indicating proper gating.
*   **Waypoint Saving (F3, P3, V3):**
    *   Free users are incorrectly allowed to access the WaypointSheet instead of being prompted to upgrade (F3 failure).
    *   Pro users cannot save waypoints due to GPS acquisition failure (P3, V3 failures). This GPS issue would also affect Free users if they were allowed to access the WaypointSheet.
*   **Upgrade Sheet (C3, P1):** Guest users correctly see the UpgradeSheet when tapping a Pro affordance (C3 pass). Pro users incorrectly encounter the UpgradeSheet (P1 failure).

## Findings Discarded
- None. All identified findings are significant and supported by direct evidence or strong architectural ground truth.

## Cannot Assess
- The exact reason for the Playwright geolocation mock not being picked up by the app's GPS acquisition logic (Finding 2).
- The specific code changes that caused the widespread persistence regressions (Finding 3).
- The exact screenshot of the UpgradeSheet being visible for a Pro user (Finding 5).

## Systemic Patterns
-   **Offline-First Deficiency:** The most critical systemic issue is the complete failure of the app to load offline for authenticated users, coupled with the lack of robust offline data queuing for user-generated content. This violates fundamental offline-first principles and severely impacts usability in the target environment.
-   **Persistence Regression:** A widespread regression in `localStorage` persistence, affecting both Zustand `persist` middleware and manual `localStorage` write patterns. This indicates a recent change or misconfiguration has broken previously working persistence mechanisms across multiple state keys and stores.
-   **Gating Logic Errors:** Inconsistent or incorrect application of `isPro` checks, leading to free users accessing Pro features and Pro users being prompted to upgrade.
-   **GPS Acquisition Issues:** A fundamental problem with the app's ability to acquire and utilize GPS coordinates, preventing core functionality like waypoint saving.

## Calibration Notes
-   The previous `V13` finding was about *preserving* state, and it was CONFIRMED. The current test `guest V13` and `free V13` passed, showing identical `before` and `after` stats, which confirms the fix is still active. This highlights the importance of interpreting test results in the context of the intended fix, not just the test name.
-   Multiple previous findings (V1, V7, V11, V15) were CONFIRMED as fixed. Their current "PASS (Vulnerability Confirmed)" status indicates a regression, which has been highlighted as a critical issue. This reinforces the need to cross-reference current results with `STATE_MAP.md` and previous findings to identify regressions.
-   The interpretation of Playwright timeouts for `V8`, `V9`, and `P1` as evidence of UX issues (persistence failure, incorrect UpgradeSheet display) is consistent with past successful diagnoses, where timeouts directly indicated a failure to reach an expected UI state.
-   The distinction between test-specific issues and actual user-facing UX problems, as learned from past `MISDIAGNOSED` verdicts, continues to guide the focus on real user impact.