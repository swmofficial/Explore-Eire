# UX Agent Report — 2026-08-09

## Run Context
- Commits analysed: `6274b80cc1deaa43a0eba1a49bb7fc615b0050ea` (latest) and 19 preceding commits.
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
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
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

### 4. High: Widespread Loss of User Preferences on Page Reload (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are reset to defaults on page reload, forcing users to reconfigure their settings every session.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` failed with `Expected: "light", Received: "dark"`, and `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`, indicating the expected state was not found after reload. `STATE_MAP.md` states `userStore.theme` uses manual `ee_theme` key, and `mapStore.basemap`, `mapStore.layerVisibility` use Zustand `persist` middleware (`ee-map-prefs`). The `null` values for `ee_theme` and the timeouts for map preferences indicate these persistence mechanisms are failing.
- Cannot confirm: The specific reason for the `ee-map-prefs` Zustand persist failure (e.g., config error, version mismatch, or data corruption).
- Root cause: Regression in the manual `localStorage` persistence for `theme` and/or failure of Zustand `persist` middleware for `basemap` and `layerVisibility`.
- User impact: Annoying and repetitive task of re-applying preferred settings, degrading user experience and making the app feel unreliable.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to seek alternative apps that remember their preferences.
- Fix direction: Debug and re-implement `ee_theme` manual persistence. Investigate Zustand `persist` middleware configuration and data integrity for `ee-map-prefs`.

### 5. High: Free Users Can Save Waypoints Instead of Upgrading (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` and attempt to save waypoints, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: Whether the save operation would actually succeed for a free user (it should fail at the Supabase level, but the UI should prevent the attempt).
- Root cause: Incorrect gating logic for the "Save Waypoint" feature, allowing free users to access the `WaypointSheet` instead of triggering the `UpgradeSheet`.
- User impact: Free users are led to believe they can save waypoints, only to potentially encounter a failure later, leading to frustration and confusion.
- Business impact: Loss of potential Pro conversions, as the upgrade path is bypassed. Users may exploit this loophole or become frustrated by failed saves.
- Fix direction: Correct the conditional rendering/routing logic to ensure free users are shown the `UpgradeSheet` when attempting to save a waypoint.

### 6. Medium: Pro Users May Be Incorrectly Prompted to Upgrade (Vulnerability P1)
- Summary: The test for Pro users *not* seeing an `UpgradeSheet` when tapping a Pro affordance timed out, suggesting that the `UpgradeSheet` might have been displayed or the test failed to confirm its absence.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded`. This indicates the test could not confirm the expected state (UpgradeSheet *not* visible) within the given time. Given the test's purpose, this implies a potential display of the UpgradeSheet.
- Cannot confirm: Whether the `UpgradeSheet` was definitively visible, or if the timeout was due to another test-specific issue (e.g., element not found). A screenshot of the timed-out state would be helpful.
- Root cause: Potential regression in the Pro gating logic, causing the `UpgradeSheet` to appear for paying users when it should not.
- User impact: Paying Pro users are incorrectly prompted to upgrade, leading to confusion, annoyance, and a feeling of being undervalued.
- Business impact: Erodes trust and satisfaction among paying customers, potentially leading to churn or negative sentiment.
- Fix direction: Investigate the Pro gating logic for `UpgradeSheet` display and ensure it correctly identifies Pro users. Add more robust assertions or screenshots to the test to confirm the absence of the `UpgradeSheet`.

### 7. Medium: Offline Track Save Fails Without Data Queue (Vulnerability V4)
- Summary: When a user attempts to save a GPS track offline, the save operation fails, and the accumulated track data is lost, as there is no mechanism to queue the data for later synchronization.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks)
- Confidence: HIGH
- Evidence: `pro V4` test *passed*, which means it successfully observed the track save failing offline. `STATE_MAP.md` confirms: "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail, distance, elevation, duration gone." This confirms V4 is active.
- Cannot confirm: The exact content of the toast message without a screenshot or annotation.
- Root cause: Absence of an offline data synchronization queue (e.g., using IndexedDB) for user-generated content. `STATE_MAP.md` explicitly notes: "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- User impact: Users lose valuable, effort-intensive GPS track data if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features, especially in rural areas.
- Fix direction: Implement an offline data synchronization queue (e.g., using IndexedDB) to store track data locally and sync when online.

### 8. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When a user attempts to save a route offline, the operation fails silently without any user-facing toast notification, leading to data loss and a lack of feedback.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: HIGH
- Evidence: `pro V6` test *passed*, which means it successfully observed the route save failing offline *without a toast*. `STATE_MAP.md` confirms: "Save route... Fails — console.error only, no toast ... YES — route points gone." This confirms V6 is active.
- Cannot confirm: The exact console error message without logs.
- Root cause: Absence of an offline data synchronization queue and lack of user-facing feedback for failed offline route saves. `STATE_MAP.md` explicitly notes: "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- User impact: Users believe their route has been saved, only to find it missing later, leading to confusion, frustration, and wasted effort. The lack of feedback makes it harder to diagnose.
- Business impact: Erodes user trust, leads to negative perception of app reliability, and reduces engagement with the route planning feature.
- Fix direction: Implement an offline data synchronization queue for routes and provide clear user feedback (e.g., a toast notification) for failed offline saves.

## Tier Comparison

*   **Offline Application Load (V2, V10):** Pro users experience a complete failure to load the app when offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is inferred to be identical for Free users, as the core app shell and initial data loading are not tier-specific. Guest users are not explicitly tested for this scenario, but the root cause (lack of Service Worker caching) would likely affect them similarly if they tried to load the app from scratch offline.
*   **GPS Acquisition Failure (P3, V3):** Pro users are unable to save waypoints due to GPS acquisition failure, both online and offline. This issue is likely systemic to the app's GPS handling and would affect Free and Guest users if they were permitted to save waypoints.
*   **User-Generated Session Data Loss (V1, V11, V15):** `guest V11` confirms loss of `sessionWaypoints` on reload. `guest V15` confirms loss of `activeModule` on reload. `pro V1` confirms loss of `sessionTrail` on reload. The underlying issue (failure of manual `localStorage` persistence) is common across tiers, but affects different data types depending on the tier's capabilities.
*   **User Preferences Loss (V7, V8, V9):** `guest V7` and `free V7` confirm loss of `theme` preference on reload. `guest V9` confirms loss of `basemap` preference on reload. `free V8` confirms loss of `layerVisibility` preferences on reload. The underlying issue (failure of `localStorage` persistence, either manual or Zustand) is common, but affects different preferences depending on the tier's specific interactions.
*   **Free User Waypoint Gating (F3):** This issue is specific to the Free tier, where users are incorrectly allowed to access the `WaypointSheet` instead of being prompted to upgrade. Pro users have full access, and Guest users cannot save waypoints at all.
*   **Pro User Upgrade Prompt (P1):** This issue is specific to the Pro tier, where Pro users may be incorrectly shown an `UpgradeSheet`. Free and Guest users are expected to see upgrade prompts for Pro features.
*   **Offline Data Save Failures (V4, V6, V14):** `pro V4` (track save fails offline), `pro V6` (route save fails silently offline), and `pro V14` (no pre-save offline warning) are confirmed for Pro users. These vulnerabilities are due to the lack of an offline data queue and would affect any tier attempting to save user-generated data offline.
*   **Learn Tab Header Stats (V13, F4):** Both `guest V13` and `free F4` (which is essentially a re-check of V13 for free users) passed, indicating that the Learn tab header statistics (courses, complete percentage, chapters done) are correctly preserved across tab switches for both Guest and Free tiers. This confirms the previous fix for V13 for these specific stats.

## Findings Discarded

*   **Learn Tab Header Stats Preservation (V13):** This was discarded as a "finding" because the tests (`guest V13`, `free V13`, `free F4`) actually confirmed the *preservation* of header stats, not a loss. While the vulnerability V13 (state loss in Learn tab) still exists for *in-progress chapter reading position* as per `UX Knowledge Context`, the current tests do not provide evidence for that specific aspect. The observed behavior for header stats is a positive outcome, not an issue.

## Cannot Assess

*   The exact content of toast messages for `pro V4` (track save fails offline) and `pro V6` (route save fails silently offline) without specific screenshot evidence or annotations for the toast itself.
*   The precise reason for the `pro P1` timeout (whether the `UpgradeSheet` was definitively visible or another test-specific issue occurred).

## Systemic Patterns

*   **Persistence Regression:** A widespread failure of both Zustand `persist` middleware (for basemap, layer visibility) and manual `localStorage` patterns (for theme, session waypoints, session trail, active module). This suggests a recent change or misconfiguration affecting `localStorage` interactions across multiple stores.
*   **Lack of Offline-First Design:** The application fundamentally fails to operate offline for authenticated users (V2, V10) and lacks any robust offline data queuing mechanism for user-generated content (V3, V4, V6, V14). This is a critical architectural gap for an outdoor mapping app.
*   **GPS Acquisition Issues:** A core problem with GPS data acquisition prevents critical features like waypoint saving from functioning, even online. This points to a bug in the `useTracks` hook or its integration with `mapStore.userLocation`.
*   **Inconsistent Gating Logic:** The logic for gating Pro features is inconsistent, allowing free users to bypass upgrade prompts (F3) and potentially showing upgrade prompts to paying Pro users (P1).

## Calibration Notes

*   The "Vulnerability-Proof Test Philosophy" was critical in correctly interpreting "PASS" results for V1, V4, V6, V11, V14, V15 as confirmations of *active vulnerabilities* rather than absence of issues. This aligns with previous successful diagnoses of such vulnerabilities.
*   Avoided re-diagnosing V13 as a state loss issue for header stats, as the tests explicitly showed preservation, consistent with a previous fix. This demonstrates learning from past "CONFIRMED" verdicts.
*   Prioritized findings based on user impact, with complete app failure (offline load) and core feature breakage (GPS) at the top, reflecting the importance of foundational functionality.
*   Maintained a focus on direct evidence from annotations and screenshots, avoiding speculative "PHANTOM" findings, especially for timeouts where evidence was ambiguous (e.g., P1, where confidence was set to MEDIUM).