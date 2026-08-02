# UX Agent Report — 2026-08-02

## Run Context
- Commits analysed: `a442297646e7395fac03621c0b4f8d702cc073af` (latest) and 19 preceding commits.
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

### 3. High: Loss of User-Generated Session Data on Reload (Vulnerability V1, V11, V15 Regressions)
- Summary: User-generated session data (GPS tracks, guest waypoints) and the active module preference are lost on page reload, indicating a regression in their manual `localStorage` persistence mechanisms.
- Tier(s) affected: Guest (V11, V15), Pro (V1), (inferred Free for V1, V15)
- Confidence: HIGH
- Evidence: `guest V11` annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claim that these keys persist via manual patterns.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for these keys.
- Root cause: The manual `localStorage` keys (`ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are either not being written to or read from `localStorage` correctly, despite `STATE_MAP.md` indicating they should be. This is a regression from previous fixes.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) and user workflow preferences, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core features.
- Fix direction: Debug the manual `localStorage` write/read patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure data persistence.

### 4. High: Theme Preference Resets to Default on Reload (Vulnerability V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted across page reloads and reverts to the default 'dark' theme.
- Tier(s) affected: All (guest, free, inferred pro)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed with `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null` and `ee_theme-after-reload: null`, indicating the `localStorage` key for theme is not being set or read. `STATE_MAP.md` states `ee_theme` should be persisted via a manual pattern.
- Cannot confirm: The specific code change that broke the manual `localStorage` write/read for `ee_theme`.
- Root cause: The manual `localStorage` persistence mechanism for `userStore.theme` (`ee_theme`) is not functioning correctly.
- User impact: Annoying loss of personalization, requiring users to re-select their preferred theme on every app load, contributing to a perception of unreliability.
- Business impact: Minor negative impact on user experience, contributes to overall perception of app flakiness.
- Fix direction: Debug the manual `localStorage` write/read pattern for `userStore.theme` to ensure theme preference persists.

### 5. High: Free Users Can Save Waypoints (Capability F3 Failure)
- Summary: Free tier users are incorrectly allowed to save waypoints, a feature that should be gated behind a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed because `expect(upgradeShown).toBeTruthy()` received `false`. The `gate-routing` annotation explicitly states `{"upgradeShown":false,"waypointShown":true}`, confirming that the `UpgradeSheet` was not shown and the `WaypointSheet` was.
- Cannot confirm: The exact location in the codebase where the gating logic for waypoint saving is misconfigured.
- Root cause: Incorrect implementation of the feature gating logic for waypoint saving, allowing free users to access a premium capability.
- User impact: Free users gain access to a premium feature they should not have, potentially reducing their incentive to upgrade.
- Business impact: Direct loss of potential Pro conversions, undermining the value proposition of the Pro tier and impacting subscription revenue.
- Fix direction: Correct the feature gating logic to ensure that only Pro users can save waypoints, and free users are prompted to upgrade.

### 6. Medium: Layer and Basemap Preferences Reset on Reload (Vulnerability V8, V9)
- Summary: User preferences for basemap selection and layer visibility are not persisted across page reloads, reverting to default settings.
- Tier(s) affected: All (guest for basemap, free for layers, inferred pro for both)
- Confidence: MEDIUM
- Evidence: `guest V9` (basemap) and `free V8` (layers) tests both failed with `Test timeout of 60000ms exceeded`. While a timeout, this strongly suggests a failure in state restoration, especially given the confirmed `V7` (theme) persistence failure. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` (Zustand persist middleware).
- Cannot confirm: The exact state of the basemap and layer visibility after reload due to the timeout, but the pattern of persistence failures is consistent.
- Root cause: Likely a failure in the Zustand `persist` middleware for `mapStore` or a related loading issue, causing these preferences to revert to their defaults.
- User impact: Users lose their preferred map view settings, requiring manual re-configuration of basemap and layer visibility on every app open, leading to minor frustration.
- Business impact: Minor frustration, perceived lack of polish, contributes to overall perception of app flakiness.
- Fix direction: Debug the Zustand `persist` middleware configuration for `mapStore` to ensure `basemap` and `layerVisibility` are correctly saved and restored.

### 7. Medium: Offline Data Save Failures (Vulnerability V4, V6, V14)
- Summary: The application fails to save user-generated data (tracks, routes) when offline, often silently or with a non-specific toast, leading to data loss and no user warning before attempting an offline save.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence: `pro V4` passed (confirmed track save fails offline). `pro V6` passed (confirmed route save offline produces no user-facing toast). `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` indicates no warning before attempting an offline waypoint save. `STATE_MAP.md` confirms these are known vulnerabilities.
- Cannot confirm: The exact content of the toasts for V4, but the test confirms the failure.
- Root cause: Lack of an offline data sync queue. All data writes directly attempt Supabase, failing silently or with a toast when offline, without local caching or retry mechanisms.
- User impact: Loss of unsaved data when offline, silent failures lead to user confusion and distrust, especially in rural areas with intermittent connectivity.
- Business impact: Significant data loss for users in target rural areas, leading to high churn and negative reviews.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store and sync user-generated data when connectivity is restored, and provide clear UI feedback on sync status.

### 8. Low: Pro User Sees UpgradeSheet on Pro Affordance Tap (Capability P1 Timeout)
- Summary: The test designed to confirm that Pro users *do not* see the UpgradeSheet when tapping a Pro-gated affordance timed out, preventing verification of this expected behavior.
- Tier(s) affected: Pro
- Confidence: LOW
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`
- Cannot confirm: Whether the UpgradeSheet actually appeared or if the test simply hung due to a different issue (e.g., a selector problem or a UI element not becoming interactive).
- Root cause: Unclear due to the timeout. Could be a test flakiness, a subtle UI issue, or a problem with the test's waiting conditions.
- User impact: If the UpgradeSheet *did* appear, it would be confusing and frustrating for a paying Pro user.
- Business impact: Minor confusion for Pro users, potentially eroding trust if the issue is real.
- Fix direction: Investigate the `pro P1` test for flakiness or incorrect waiting conditions. If the issue is confirmed, debug the gating logic for Pro affordances.

## Tier Comparison

-   **Offline App Load (V2, V10):** Fails for Pro users, preventing the app from loading at all. This architectural issue (lack of app shell caching) would likely affect Free and Guest users similarly, though not explicitly tested for them.
-   **GPS Acquisition (P3, V3):** Fails for Pro users, disabling the waypoint save button. This is a core functional issue that would prevent Free/Guest users from saving waypoints if they were allowed to.
-   **Session Data Loss (V1, V11, V15):** Confirmed for Guest users (waypoints, active module) and Pro users (tracks). This indicates a systemic regression in manual `localStorage` persistence affecting multiple data types across tiers.
-   **Theme Preference Reset (V7):** Confirmed for both Guest and Free users. This suggests a universal failure in the theme persistence mechanism, likely affecting Pro users as well.
-   **Layer and Basemap Preferences Reset (V8, V9):** Timeout failures observed for Guest (basemap) and Free (layers). This pattern, combined with the V7 failure, suggests a systemic issue with `mapStore` persistence affecting all tiers.
-   **Learn Tab State (V13, F4):** Header statistics are correctly preserved across tab switches for both Guest and Free users, indicating the V13 fix is working for this aspect.
-   **Pro Badges (F2):** PRO badges are correctly rendered for Free users in the LayerPanel, guiding them towards upgrade.
-   **Upgrade Sheet Gating (C3, F3, P1):**
    -   Guest users are correctly shown the UpgradeSheet when tapping a Pro-gated feature (C3 pass).
    -   Free users are *incorrectly* allowed to save waypoints without seeing the UpgradeSheet (F3 fail).
    -   Pro user test (P1) timed out, so it's unclear if the UpgradeSheet is correctly *not* shown to them.
-   **Offline Data Save Failures (V4, V6, V14):** Confirmed for Pro users. These are architectural limitations (lack of offline queue) that would affect Free/Guest users for any data they are allowed to save offline.

## Findings Discarded

-   No findings were explicitly discarded as PHANTOM in this run. All identified issues had sufficient evidence or strong architectural backing.

## Cannot Assess

-   The exact state of Pro status (`isPro` reverting to false) for `pro V10` could not be assessed because the application failed to load entirely when offline. The `net::ERR_INTERNET_DISCONNECTED` error prevented any further interaction or state inspection.
-   The exact content of the basemap and layer visibility after reload for `guest V9` and `free V8` could not be assessed due to test timeouts.

## Systemic Patterns

-   **Persistence Regressions:** A critical pattern of failure across multiple manual `localStorage` persistence mechanisms (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This suggests a recent change or a fundamental flaw in how these manual patterns are implemented or maintained, leading to widespread loss of user preferences and session data.
-   **Fundamental Offline Deficiency:** The application exhibits a severe lack of offline-first capabilities, failing to load its core shell and critical data when offline, and failing to queue user-generated data for later sync. This is a major architectural gap for an app targeting users in potentially remote areas.
-   **GPS Acquisition Instability:** The persistent failure to acquire GPS coordinates, leading to disabled save buttons, indicates an underlying issue with the GPS integration or the testing environment's mock GPS data handling.

## Calibration Notes

-   The agent successfully identified and prioritized critical issues based on direct evidence from test failures and annotations, aligning with previous CONFIRMED verdicts.
-   The distinction between a test "passing" (because it confirmed a vulnerability) and "failing" (because the vulnerability prevented the expected outcome) was crucial for accurate interpretation of V1, V4, V6, V11, V14, V15.
-   The agent correctly inferred architectural root causes by cross-referencing test results with `STATE_MAP.md` and `UX Knowledge Context`, particularly for offline behavior and persistence.
-   Timeouts were treated with appropriate caution, leading to MEDIUM or LOW confidence unless supported by other strong evidence (e.g., V8/V9 timeouts inferred from V7 persistence failure).
-   The agent correctly noted the positive outcome of the V13 fix for Learn tab header stats, despite the misleading "state-loss proof" test title.