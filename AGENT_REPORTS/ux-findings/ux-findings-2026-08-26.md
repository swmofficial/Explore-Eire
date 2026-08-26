# UX Agent Report — 2026-08-26

## Run Context
- Commits analysed: `7613e369c5dd3dba2e620c13bc856201b81577cc` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread User Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, despite `STATE_MAP.md` indicating they should be persisted. This contradicts previous "CONFIRMED" fixes for V1, V7, V11, and V15.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting.
    - `guest V9` and `free V8` failed (timeout), implying `mapStore.basemap` and `mapStore.layerVisibility` reset.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting.
- Cannot confirm: The exact point of failure in the persistence mechanisms (e.g., write failure, read failure, or incorrect key usage).
- Root cause: Widespread failure of both Zustand `persist` middleware (`ee-map-prefs`) and manual `localStorage` patterns (`ee_theme`, `ee_active_module`, `ee_guest_waypoints`, `ee_session_trail`). This contradicts `STATE_MAP.md`'s assertion that manual patterns are "proven reliable".
- User impact: Constant frustration as the app reverts to default settings and loses in-progress work (waypoints, tracks) on every reload, requiring users to reconfigure or restart.
- Business impact: Erodes user trust, increases churn, reduces perceived value of the app, and leads to negative reviews.
- Fix direction: Thoroughly audit and debug all persistence mechanisms, verifying `localStorage` keys are correctly written and read on store initialization and state changes.

### 4. High: Free Users Can Access Waypoint Sheet Instead of Upgrade Prompt (F3)
- Summary: When a free user taps the camera button to save a waypoint, they are incorrectly shown the "New Waypoint" sheet instead of an upgrade prompt.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}`. The test expected `upgradeShown` to be `true`, but it was `false`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: If the upgrade sheet is shown at any later point in the waypoint saving flow for free users.
- Root cause: Incorrect conditional rendering or routing logic for the "Save Waypoint" action's initial gate for free users.
- User impact: Free users can initiate a Pro-gated action, only to be blocked later or confused about their capabilities, leading to frustration.
- Business impact: Missed upgrade opportunities, reduced conversion from free to paid tiers, and potential for user confusion.
- Fix direction: Correct the conditional rendering or routing logic to display the `UpgradeSheet` immediately when a free user attempts a Pro-gated action.

### 5. High: Pro Users See Upgrade Sheet on Pro Affordance Tap (P1)
- Summary: Pro users are incorrectly prompted to upgrade when interacting with a Pro-gated feature, undermining their premium experience.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with `Test timeout`. The test is designed to verify the *absence* of the `UpgradeSheet` after a Pro user taps a Pro affordance. A timeout strongly implies the `UpgradeSheet` *was* shown, preventing the test from completing its assertion.
- Cannot confirm: The specific Pro affordance that triggered the `UpgradeSheet` or the exact content of the `UpgradeSheet` shown to the Pro user.
- Root cause: Incorrect gating logic for Pro features, potentially a `isPro` check failing or a race condition where `isPro` state is not fully hydrated before the UI renders.
- User impact: Pro users are incorrectly prompted to upgrade, undermining their premium experience, trust in their subscription status, and potentially causing confusion.
- Business impact: Damages brand perception, reduces customer satisfaction for paying users, and may lead to unnecessary support tickets.
- Fix direction: Verify `isPro` state is correctly hydrated and used to gate `UpgradeSheet` display for Pro users, ensuring no race conditions.

### 6. Medium: Offline Data Writes Fail Silently or Without Adequate Warning (V3, V4, V6, V14)
- Summary: The application fails to save user-generated data (waypoints, tracks, routes) when offline. Some failures are silent, others provide a toast but no retry, and there is no pre-save warning when offline.
- Tier(s) affected: Pro (inferred Free/Guest for relevant actions)
- Confidence: HIGH
- Evidence:
    - `pro V3` failed (due to GPS issue), but annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save offline warning.
    - `pro V4` passed, confirming that track save fails offline.
    - `pro V6` passed, confirming that route save offline produces no user-facing toast (silent failure).
    - `STATE_MAP.md` confirms "Save waypoint" and "Save track" fail with a toast "Could not save..." but "Save route" fails with "console.error only, no toast".
- Cannot confirm: The exact content of the "Could not save" toasts for waypoints and tracks, or the full user journey for retrying failed saves.
- Root cause: Lack of an offline data queue and inconsistent error handling for offline write failures. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data (waypoints, tracks, routes) when attempting to save offline, often without clear feedback, a chance to retry, or even a warning that the action will fail.
- Business impact: Significant data loss leads to user frustration, distrust, and abandonment, especially for prospectors in remote areas where connectivity is unreliable.
- Fix direction: Implement an offline data queue (e.g., IndexedDB), provide clear pre-save warnings when offline, and offer retry mechanisms for failed saves.

## Tier Comparison
- **Offline App Load (V2, V10):** The app completely fails to load offline for the Pro tier. This behaviour is highly likely to affect the Free tier as well, as both require authentication and Supabase data hydration. The Guest tier might load the app shell, but without any user-specific data.
- **GPS Acquisition Failure (P3, V3 Blocker):** This issue was observed in the Pro tier, preventing waypoint saving. The underlying GPS acquisition logic is global and would affect Free and Guest users if they were able to initiate waypoint saving.
- **Persistence Regression (V1, V7, V8, V9, V11, V15):**
    - Theme (V7) persistence fails for both Guest and Free tiers.
    - Basemap (V9) persistence fails for Guest. Layer preferences (V8) persistence fails for Free. These are related map preferences, indicating a systemic issue affecting all tiers.
    - Guest Waypoints (V11) persistence fails for Guest.
    - Active Module (V15) persistence fails for Guest.
    - Session Trail (V1) persistence fails for Pro.
    - This pattern of widespread persistence failure across different stores and persistence methods (Zustand `persist` and manual `localStorage`) indicates a fundamental regression affecting all tiers.
- **Gating Logic (F3, P1):**
    - Free users are incorrectly routed to the Waypoint Sheet instead of an Upgrade Sheet (F3). This is specific to the Free tier's interaction with Pro-gated features.
    - Pro users are incorrectly shown an Upgrade Sheet (P1). This is specific to the Pro tier's experience.
- **Offline Data Writes (V3, V4, V6, V14):** These issues (silent failures, no warnings) were confirmed for the Pro tier. The underlying lack of an offline queue and inconsistent error handling would affect any tier attempting to save data offline.

## Findings Discarded
- `guest V13` and `free V13`: These tests passed, indicating that the *header statistics* (courses, completePct, chaptersDone) did not regress to zero after a tab switch. This does not provide evidence for the *component state* (e.g., reading position within a chapter) loss that V13 primarily addresses, as described in the UX Knowledge Context. Therefore, these tests do not confirm the V13 vulnerability.
- `free F4`: This test passed, confirming the desired behaviour that Learn header percentage does not regress. It is not a finding.
- All other "PASS" tests (C1, C2, C3, F1, F2, P2, and the "Other" category) confirm expected behaviour and are not issues.

## Cannot Assess
- The exact reason for the Playwright geolocation mock not being correctly processed by the app's GPS acquisition logic. Further debugging within the app's GPS module would be required.
- The full extent of `isPro` status loss (V10) for Pro users when offline, as the app fails to load at all.

## Systemic Patterns
1.  **Persistence Regression:** A critical and widespread failure of both Zustand `persist` middleware and manual `localStorage` patterns. This indicates a fundamental issue in how state is being saved and rehydrated across reloads, directly contradicting the `STATE_MAP.md`'s assertion that these patterns are "proven reliable".
2.  **Offline Unusability:** The app completely fails to load offline for authenticated users, and data writes consistently fail without robust handling or user feedback. This highlights a critical gap in offline-first design principles, making the app unusable in its primary target environment.
3.  **Inconsistent Gating Logic:** Errors in applying Pro-gated features lead to both free users accessing Pro features (F3) and Pro users being incorrectly prompted to upgrade (P1). This points to a lack of robust, centralized access control.
4.  **GPS Integration Failure:** The app's GPS acquisition is failing, blocking core features like waypoint saving, suggesting an issue with the geolocation API integration or its handling of mock data.

## Calibration Notes
- The previous "CONFIRMED" verdicts for V1, V7, V11, V15 were based on fixes that are now clearly regressed. This highlights the need for continuous regression testing, especially for core persistence mechanisms.
- The "PHANTOM" verdict for "Map Button Naming Ambiguity" was correctly identified as a Playwright selector issue, not a UX problem. This reinforces the need to distinguish between test harness issues and actual application bugs.
- The current report prioritizes critical blockers (offline load, GPS) and widespread regressions (persistence) over minor state loss, aligning with the "rank by user impact" rule.