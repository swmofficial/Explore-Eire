# UX Agent Report — 2026-08-04

## Run Context
- Commits analysed: `2e55e578cc326369e332fe2c7efc84fcf8172dd3` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (Vulnerability P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: Widespread Preference & Session Data Loss on Reload (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Multiple user preferences (theme, basemap, layer visibility) and critical user-generated session data (guest waypoints, active module, GPS tracks) are lost on page reload, indicating a regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V7, V9, V11, V15; Free: V7, V8; Pro: V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, with `ee_theme-before-reload: null`. `guest V9` and `free V8` timed out, implying state was not found for basemap and layer visibility respectively. `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, or the Zustand `persist` for `ee-map-prefs`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns and/or the Zustand `persist` middleware for `mapStore` and `userStore`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) and user workflow preferences, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core features.
- Fix direction: Debug persistence mechanisms for all affected state keys, verifying `localStorage` reads/writes and Zustand `persist` configuration.

### 4. High: Free Users Can Save Waypoints (Feature F3)
- Summary: Free tier users are incorrectly allowed to save waypoints, a feature intended to be gated for Pro subscribers.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: The `free F3` test failed because it expected `upgradeShown` to be `true` after tapping the camera button, but the annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` shows `upgradeShown` was `false` and `waypointShown` was `true`. This means the `WaypointSheet` was displayed instead of the `UpgradeSheet`.
- Cannot confirm: The specific code responsible for the incorrect gating logic.
- Root cause: Incorrect feature gating logic for the "Save Waypoint" functionality, failing to direct free users to the `UpgradeSheet`.
- User impact: Free users can access a feature intended for Pro, potentially leading to confusion or devaluing the Pro subscription.
- Business impact: Undermines the value proposition of the Pro tier, potentially reducing conversions and perceived value of the subscription.
- Fix direction: Correct the feature gating logic to ensure "Save Waypoint" is restricted to Pro users or surfaces the `UpgradeSheet` for free users.

### 5. High: Offline Data Write Failures & No Pre-Save Warning (Vulnerability V4, V6, V14)
- Summary: User-generated data (tracks, routes) fails to save when the application is offline, leading to data loss, and the user is not warned about the offline condition before attempting to save.
- Tier(s) affected: Pro (inferred for all tiers for these features)
- Confidence: HIGH
- Evidence: `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the absence of a pre-save warning. `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast) both passed, indicating the vulnerabilities were confirmed as per the test design (i.e., the expected failure/silent failure occurred). `STATE_MAP.md` confirms these operations fail offline.
- Cannot confirm: The specific toast messages or UI states for V4 and V6 beyond the test passing.
- Root cause: Lack of an offline data queue and explicit offline handling for write operations. The app attempts direct Supabase writes without local persistence or network status checks.
- User impact: Loss of valuable user-generated content (tracks, routes) when offline, leading to significant frustration. Users are not informed of the high risk of data loss before committing to a save action.
- Business impact: Erodes user trust, leads to negative perception of data safety, and reduces engagement with content creation features.
- Fix direction: Implement an offline data queue (e.g., IndexedDB) for user-generated content and introduce clear pre-save offline warnings (V14).

### 6. Medium: Pro User Sees Upgrade Sheet on Pro Affordance Tap (Vulnerability P1 - Ambiguous Timeout)
- Summary: A Pro user's attempt to access a Pro-gated feature results in a test timeout, ambiguously suggesting that an `UpgradeSheet` might have been displayed or the feature was not accessible as expected.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. The test expects a Pro user *not* to see the `UpgradeSheet` when tapping a Pro affordance. A timeout could mean the `UpgradeSheet` *was* shown, or the test couldn't proceed to verify its absence.
- Cannot confirm: Whether the `UpgradeSheet` was actually shown, or if the timeout was due to another issue in the test flow (e.g., element not becoming interactive).
- Root cause: Potentially incorrect gating logic for Pro features, or a race condition in the test setup that prevents the assertion from being reached.
- User impact: Pro users are incorrectly prompted to upgrade or experience unexpected behavior, causing confusion and frustration.
- Business impact: Degrades the Pro user experience, potentially leading to cancellations or negative sentiment.
- Fix direction: Investigate the `pro P1` test timeout and verify Pro feature gating logic to ensure `UpgradeSheet` is never shown to active Pro subscribers.

### 7. Low: Learn Tab Header Stats Persistence (Vulnerability V13 - Test Name vs. Outcome)
- Summary: The `guest V13` and `free V13` tests, despite their names implying state loss, actually confirm that Learn tab header statistics (courses, completion percentage, chapters done) *persist* correctly across tab switches.
- Tier(s) affected: All
- Confidence: HIGH (on the observation, LOW on it being a *vulnerability*)
- Evidence: `guest V13` and `free V13` both passed, with `state-loss-evidence` showing identical `before` and `after` values for header stats (`"courses":2,"completePct":0,"chaptersDone":0`).
- Cannot confirm: Whether *in-progress chapter reading position* (the actual V13 vulnerability per UX Context) is still lost, as this specific test only checks header stats, which are derived from persisted `ee_progress` and `ee_certificates`.
- Root cause: The test name is misleading; the observed behavior is a positive outcome (persistence of header stats). The underlying V13 (in-chapter progress loss) might still exist but is not tested by this specific annotation.
- User impact: No negative user impact for header stats; positive impact as they persist.
- Business impact: None, or positive for user retention.
- Fix direction: Clarify test name to reflect actual assertion (e.g., "Learn header stats persist across tab switches"). Add a new test specifically for in-chapter reading position persistence.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Fails for Pro users (and inferred Free). Guest users are not explicitly tested for this, but the root cause (lack of app shell caching) would likely affect them too if they tried to load the app offline.
*   **Waypoint Save Button Disabled (P3, V3):** Affects Pro users. Inferred to affect Free/Guest if they were allowed to save waypoints.
*   **Preference & Session Data Loss (V1, V7, V8, V9, V11, V15):** This is a systemic failure in persistence across all tiers, affecting different specific items depending on the tier's features.
    *   **Theme (V7):** Fails for Guest and Free. Inferred to fail for Pro.
    *   **Basemap (V9):** Fails for Guest.
    *   **Layer Visibility (V8):** Fails for Free.
    *   **Guest Waypoints (V11):** Fails for Guest.
    *   **Active Module (V15):** Fails for Guest.
    *   **GPS Track (V1):** Fails for Pro.
*   **Free Users Can Save Waypoints (F3):** This issue is specific to the Free tier, as Pro users *should* save waypoints and Guest users *should not* have access to this feature.
*   **Offline Data Write Failures (V4, V6, V14):** Affects Pro users for tracks and routes. Inferred to affect Free/Guest for any data writes they might attempt offline.
*   **Pro User Sees Upgrade Sheet (P1):** This potential issue is specific to the Pro tier.
*   **Learn Tab Header Stats Persistence (V13):** Behaves identically across Guest and Free tiers (header stats persist).

## Findings Discarded
- No findings were discarded in this run, as the total number of identified findings (7) was within the maximum limit of 8.

## Cannot Assess
- The exact cause of the `pro P1` timeout could not be definitively assessed without further debugging of the test or application state during the timeout. It's unclear if the `UpgradeSheet` was shown or if another issue prevented the test from completing.

## Systemic Patterns
-   **Persistence Regression:** A major regression in `localStorage` persistence mechanisms (both manual IIFE patterns and Zustand `persist` middleware) is evident across multiple vulnerabilities (V1, V7, V8, V9, V11, V15). This suggests a recent change to how state is managed or how `localStorage` is accessed/initialized.
-   **Offline Capability Failure:** The app fundamentally fails to operate offline for authenticated users (V2, V10) and lacks robust offline data saving (V3, V4, V6, V14). This indicates a critical gap in the offline-first strategy, which is essential for the target user base.
-   **GPS Acquisition Issues:** The consistent failure to acquire GPS (P3, V3) points to a problem with the geolocation API integration or its interaction with the testing environment/mock.
-   **Feature Gating Errors:** Inconsistent application of feature gates (F3, P1) leads to either free users accessing Pro features or Pro users being incorrectly prompted.

## Calibration Notes
-   I've learned to carefully interpret test results where a "PASS" indicates the *confirmation of a vulnerability* (e.g., V1, V11, V15, V4, V6) rather than a fix. This aligns with the "Vulnerability-Proof Test Philosophy" where tests produce evidence.
-   The critical issues identified in the previous report (2026-08-03) regarding offline app loading (V2, V10) and disabled waypoint save buttons (P3, V3) are re-confirmed with high confidence, indicating these remain unresolved.
-   The widespread preference and session data loss (V1, V7, V8, V9, V11, V15) is a recurring and expanded finding, reinforcing the need to address persistence mechanisms comprehensively.
-   I've avoided speculating on "unforeseen side effects" or "disconnected listeners" without direct evidence, consistent with past PHANTOM verdicts, focusing instead on directly observable failures or annotations.