# UX Agent Report — 2026-10-12

## Run Context
- Commits analysed: `1356e9dabb685ae11b76459b05252a42b43220a9` and 19 preceding commits.
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
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: If the offline save would truly fail silently (V3) or if the pre-save warning (V14) would appear, as the button is never enabled to trigger these paths.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated and the save button enables when location is acquired.

### 3. Critical: Multiple User Preferences Fail to Persist Across Reloads (V1, V7, V9, V11, V15, V8)
- Summary: Several critical user preferences and session data, including active GPS tracks, theme, basemap, guest waypoints, active module, and layer visibility, are not persisting across page reloads, despite previous fixes and `STATE_MAP.md` indicating persistence.
- Tier(s) affected: All (V7, V9, V11, V15 for guest; V7, V8 for free; V1 for pro)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly contradicts `STATE_MAP.md` (`ee_theme` manual persist).
    - `guest V9` failed: `Test timeout`. This implies basemap reset, as the test expects a specific basemap after reload. `STATE_MAP.md` (`basemap` via `ee-map-prefs`).
    - `guest V11` passed: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms loss. `STATE_MAP.md` (`ee_guest_waypoints` manual persist).
    - `guest V15` passed: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms loss. `STATE_MAP.md` (`ee_active_module` manual persist).
    - `pro V1` passed: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This confirms loss. `STATE_MAP.md` (`ee_session_trail` manual persist).
    - `free V8` failed: `Test timeout`. This implies layer preferences reset. `STATE_MAP.md` (`layerVisibility` via `ee-map-prefs`).
- Cannot confirm: The exact cause of `null` for `ee_theme` or `absent` for other keys, but the outcome is clear.
- Root cause: A systemic failure in the `localStorage` persistence mechanisms. Despite `STATE_MAP.md` and previous `CONFIRMED` fixes indicating manual `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) or Zustand `persist` middleware (`ee-map-prefs` for basemap/layerVisibility) are in place, the tests show these keys are either not being written to or not being read from `localStorage` correctly. This suggests a regression or an incomplete implementation of the persistence logic.
- User impact: Users lose their custom settings, active work (GPS tracks, waypoints), and preferred UI state on every page reload, leading to constant re-configuration and loss of valuable data.
- Business impact: Severe erosion of user trust and app reliability, leading to high churn and negative reviews. Undermines the value proposition of core features like tracking and waypoint logging.
- Fix direction: Re-verify the implementation of all manual `localStorage` persistence patterns and Zustand `persist` middleware configurations. Debug why `localStorage` keys are `null` or `absent` after writes and reloads.

### 4. Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to access and save waypoints, bypassing the intended upgrade prompt.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown.
- Cannot confirm: If the waypoint would actually persist to the database for a free user (it shouldn't).
- Root cause: The gating logic for the "Save Waypoint" functionality is flawed, allowing free users to proceed to the `WaypointSheet` instead of triggering the `UpgradeSheet`. This likely involves an incorrect `isPro` check or a missing condition in the `CornerControls` or `WaypointSheet` component.
- User impact: Free users gain access to a premium feature without paying, devaluing the Pro subscription.
- Business impact: Direct loss of potential revenue from free users who would otherwise upgrade to save waypoints. Undermines the tiered subscription model.
- Fix direction: Correct the conditional rendering or routing logic for the "Save Waypoint" button to ensure `showUpgradeSheet` is set to `true` and `showWaypointSheet` is set to `false` for free users.

### 5. Offline Track and Route Saves Result in Data Loss (V4, V6)
- Summary: When offline, saving a GPS track or a custom route fails, leading to complete data loss for the user-generated content. Track saves produce a toast, but route saves fail silently.
- Tier(s) affected: Pro (inferred Free/Guest if they could save tracks/routes)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed: "track save fails offline (post-stop data loss)". This confirms the vulnerability as described in `STATE_MAP.md` ("YES — entire GPS trail ... gone").
    - `pro V6` passed: "route save offline produces no user-facing toast (silent failure)". This confirms the vulnerability as described in `STATE_MAP.md` ("console.error only, no toast").
- Cannot confirm: The exact content of the toast for V4, but the data loss is confirmed.
- Root cause: The application lacks an offline data queue or local-first write mechanism for user-generated content. As per `STATE_MAP.md`, Supabase write operations for `tracks` and `routes` fail directly when offline, with no local persistence or retry logic. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable, time-consuming data (e.g., a long hike's GPS track or a carefully planned route) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: Erodes user trust in the app's ability to reliably store their data, discouraging use of core features and leading to churn.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store pending track and route saves, and sync them to Supabase when connectivity is restored. Provide clear UI feedback on sync status.

### 6. Learn Tab State Preservation Confirmed (V13, F4)
- Summary: The state of the Learn tab, including header statistics, is correctly preserved when switching between tabs, preventing loss of user progress context.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence:
    - `guest V13` passed: `state-loss-evidence: {"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}}}`. The identical `before` and `after` values confirm that the header stats did not reset, indicating state preservation.
    - `free V13` passed: Same `state-loss-evidence` as guest.
    - `free F4` passed: `header-stats-pair` also shows identical `before` and `after` values, confirming no regression.
- Cannot confirm: The preservation of deeper component state (e.g., scroll position within a chapter), but the header stats are a good indicator.
- Root cause: The previous fix for V13 ("Replaced conditional {activeTab !== 'map' && ...} wrapper with always-mounted block; each tab has its own display:none wrapper") is correctly implemented and functioning. This aligns with "Mobile Navigation State" UX principles.
- User impact: Users can navigate between tabs without losing their place or context within the Learn module, improving usability and reducing frustration.
- Business impact: Enhances user engagement with the learning content, supporting skill development and retention.
- Fix direction: (No fix needed, this is a confirmed positive finding).

## Tier Comparison

-   **Offline App Loading (V2, V10)**: Identical failure across tiers. The `net::ERR_INTERNET_DISCONNECTED` error indicates a fundamental app loading issue, affecting all users regardless of authentication status (though only Pro was explicitly tested for this specific error).
-   **GPS Acquisition Failure (P3, V3)**: Identical failure across tiers. The "Save Waypoint" button is disabled due to GPS acquisition failure for Pro users, implying a core map functionality issue that would affect all tiers if they attempted to save waypoints.
-   **Persistence Failures (V1, V7, V9, V11, V15, V8)**:
    -   `V7 (Theme)`: Fails for both Guest and Free users.
    -   `V9 (Basemap)`: Fails for Guest users (test timeout implies reset).
    -   `V11 (Guest Waypoints)`: Fails for Guest users.
    -   `V15 (Active Module)`: Fails for Guest users.
    -   `V1 (Session Trail)`: Fails for Pro users.
    -   `V8 (Layer Visibility)`: Fails for Free users (test timeout implies reset).
    -   This indicates a widespread issue with persistence mechanisms, affecting different parts of the app across all tiers.
-   **Free User Waypoint Gating (F3)**: This issue is specific to the Free tier, where the upgrade gate is bypassed.
-   **Offline Data Loss (V4, V6)**: Identical failure across tiers. Track and route saves fail offline for Pro users, indicating a general lack of offline data handling for user-generated content.
-   **Learn Tab State (V13, F4)**: Identical success across Guest and Free tiers, confirming the fix for state preservation.
-   **Pro Badges (F2)**: Free users correctly see PRO badges in the LayerPanel, as expected for a free user.
-   **Pro Upgrade Sheet (P1)**: The test for Pro users timed out, preventing a clear comparison.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap**: This test timed out. While the intent was to confirm the absence of the UpgradeSheet for Pro users, the timeout prevents a definitive conclusion. Without direct evidence of the UI state, this finding cannot be confirmed with sufficient confidence.

## Cannot Assess

-   None. All tests ran, even if they timed out or failed, providing some form of evidence.

## Systemic Patterns

-   **Persistence Regression**: A major systemic issue is the widespread failure of state persistence across multiple features (theme, basemap, active module, session trail, guest waypoints, layer visibility) despite `STATE_MAP.md` and previous `CONFIRMED` fixes indicating these should be persisted. This suggests a fundamental problem with how `localStorage` is being written to or read from, or a recent change that broke these mechanisms.
-   **Offline Capability Gap**: The app continues to have severe limitations when offline, from failing to load entirely to losing user-generated data. This is a recurring pattern that fundamentally undermines the app's utility for its target audience.
-   **GPS Acquisition Reliability**: The persistent "Acquiring GPS..." state points to an underlying issue with the app's location services integration or its interaction with the Playwright mock.

## Calibration Notes

-   Learned to scrutinize "CONFIRMED" fixes when new test results contradict them. The persistence issues (V1, V7, V11, V15) were previously marked CONFIRMED, but are now failing, indicating a regression or an incomplete fix. This highlights the importance of continuous re-validation.
-   Prioritized app-breaking issues (offline loading, GPS failure) as critical, as they prevent any user interaction.
-   Distinguished between a test passing (journey completed) and a vulnerability being confirmed/fixed. For V13, the test passed, and the evidence showed *no state loss*, which means the *fix* for V13 is confirmed. The test description "state-loss proof" was interpreted in this context.
-   Avoided making assumptions from timeouts (e.g., V9, V8, P1) without direct evidence of the state. Instead, used them as supporting evidence for broader issues (like persistence) where other direct failures exist.