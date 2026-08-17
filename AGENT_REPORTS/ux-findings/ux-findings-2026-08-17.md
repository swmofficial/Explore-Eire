# UX Agent Report — 2026-08-17

## Run Context
- Commits analysed: `fe9d34e3c5071807bc477e6342b02a01b31b502d` and 19 preceding commits.
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

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

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
    - `STATE_MAP.md` explicitly states these items *should* be persisted via `ee_theme`, `ee-map-prefs`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`. The test results directly contradict this.
- Cannot confirm: The specific code change that caused the regression for each manual persistence key.
- Root cause: Failure in the manual `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, and potentially `ee-map-prefs` (Zustand persist).
- User impact: Annoying and frustrating, users constantly reconfigure the app and lose unsaved work.
- Business impact: Erodes trust, increases friction, reduces engagement.
- Fix direction: Re-verify and debug all manual `localStorage` persistence patterns and Zustand `persist` configurations.

### 4. High: Offline Data Save Failures and Missing Pre-Check (Vulnerability V4, V6, V14)
- Summary: User-generated data (tracks, routes, waypoints) fails to save offline, leading to data loss. Waypoint saves specifically lack a pre-check warning (V14) before attempting an impossible save.
- Tier(s) affected: Pro (V4, V6, V14); Free/Guest (V14 for waypoints, if GPS worked)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed (confirmed vulnerability): track save fails offline.
    - `pro V6` passed (confirmed vulnerability): route save offline produces no user-facing toast (silent failure).
    - `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` for waypoints.
    - `STATE_MAP.md` confirms these behaviors: `Save track` fails, `Save route` fails silently, `Save waypoint` fails.
- Cannot confirm: The exact toast message for track/waypoint failures (beyond "Could not save...").
- Root cause: Lack of an offline data queue or local-first write strategy.
- User impact: Loss of valuable user-generated data, leading to significant frustration and distrust.
- Business impact: Erodes user trust, makes the app unreliable for its core purpose in target environments.
- Fix direction: Implement an offline data queue (e.g., IndexedDB) for user-generated content and add pre-save offline warnings.

### 5. Medium: Free Users Incorrectly Allowed to Save Waypoints (Feature F3)
- Summary: Free users are incorrectly allowed to open the WaypointSheet and attempt to save waypoints, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() Received: false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` shows the UpgradeSheet was not shown, but the WaypointSheet was.
- Cannot confirm: If the save operation would actually succeed (it's blocked by GPS anyway).
- Root cause: Incorrect gating logic for the "Save Waypoint" action for free users.
- User impact: Free users waste time filling out a form they cannot submit, leading to frustration.
- Business impact: Missed upgrade opportunities, potential for user confusion and negative perception of business model.
- Fix direction: Correct the gating logic for waypoint saving to show the UpgradeSheet for free users.

### 6. Medium: Pro Badges Visible to Free Users (Feature F2)
- Summary: Pro badges are visible in the LayerPanel for free users, creating confusion and potentially false expectations about feature availability.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` passed with `pro-badge-count: 8`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layer toggles.
- Cannot confirm: If tapping these badges correctly surfaces the UpgradeSheet (though `free F3` suggests gating logic is inconsistent).
- Root cause: `LayerPanel` component logic for rendering PRO badges does not correctly check `isPro` status for free users.
- User impact: Confusion for free users about what features are available, potentially leading to frustration when they try to access them.
- Business impact: Poor user experience, unclear value proposition for Pro.
- Fix direction: Adjust `LayerPanel` rendering logic to hide PRO badges for free users, or clearly differentiate them as upgrade prompts.

## Tier Comparison

-   **V7 (Theme Reset):** Identical failure for Guest and Free tiers. Both show `ee_theme` as `null` after reload and revert to 'dark'. This indicates a systemic issue with the `ee_theme` manual persistence, affecting all users regardless of authentication.
-   **V9 (Basemap Reset) / V8 (Layer Preferences Reset):** Both Guest (V9) and Free (V8) tests timed out, implying similar persistence failures for map-related preferences. This suggests a common issue with `ee-map-prefs` persistence.
-   **V13 (Learn Tab State):** Passed for both Guest and Free, with identical `state-loss-evidence` showing no change in header stats. This confirms the fix for V13 (preserving component state across tab switches) is holding for header stats.
-   **Offline Loading (V2, V10):** Pro tier completely fails to load offline. This is likely true for Free users too, as the core app shell and initial data loading are not tier-specific. Guest users might load partially but would still lack data.
-   **Waypoint Saving (P3, V3):** Pro tier fails to save waypoints due to GPS acquisition. Free users are incorrectly allowed to open the WaypointSheet (F3), but would also likely be blocked by GPS. Guest users cannot save waypoints at all. The GPS issue is systemic.
-   **Data Loss (V1, V4, V6, V11, V15):** V1 (track loss), V11 (guest waypoints loss), V15 (active module loss) are confirmed for Guest/Pro. V4 (track save offline fails), V6 (route save offline fails silently) are confirmed for Pro. These are all persistence or offline-write issues, indicating a systemic problem with data safety across tiers.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** Discarded as PHANTOM. The previous fix for P1 was to *hide* PRO badges for Pro users. If the test attempts to tap a PRO badge, it would fail to find it, leading to a timeout. This is a test design issue, not a UX bug.

## Cannot Assess

-   The full impact of V10 (Pro status reverting to free offline) cannot be assessed because the app fails to load at all when offline (V2).

## Systemic Patterns

-   **Offline Inability:** The most critical systemic pattern is the app's complete failure to load offline for authenticated users, making it unusable in its target environment. This is a foundational architectural flaw.
-   **Persistence Regression:** There's a widespread regression in `localStorage` persistence, affecting both Zustand `persist` middleware keys (`ee-map-prefs`) and manual `IIFE + setItem` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This suggests a recent change or environment issue affecting `localStorage` operations or the store initialization logic.
-   **GPS Acquisition Failure:** The app consistently fails to acquire GPS, blocking core functionality like waypoint saving. This points to an issue with the `useTracks` hook or its interaction with the browser's geolocation API/Playwright mock.
-   **Offline Data Loss:** Beyond the app not loading, any data generated *during* an online session is lost if the user goes offline and tries to save, or if the app crashes. This highlights the complete absence of an offline data queue.

## Calibration Notes

-   Prioritized findings based on user impact, especially for the target audience (prospectors in rural Ireland). Offline functionality and data safety are paramount.
-   Carefully distinguished between a test *passing* because it *confirmed* a vulnerability (e.g., V1, V11, V15) versus a test *failing* because the expected *fix* was not present (e.g., V7).
-   Applied the "NEVER guess" rule, especially for timeouts (V9, V8, P1). For P1, the previous fix (hiding badges) made the test's intent problematic, leading to a PHANTOM verdict.
-   Used `STATE_MAP.md` as the ground truth for what *should* be persisted, directly contradicting test annotations where persistence was expected but absent. This indicates a regression or a bug in the persistence implementation despite previous "CONFIRMED" fixes.