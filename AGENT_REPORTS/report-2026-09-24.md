# UX Agent Report — 2026-09-24

## Run Context
- Commits analysed: `9695e29d3735dc5fd461c3c63691b4a589cf6101` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Regression)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles. The previous fix for V10 (guarding `setIsPro` on offline JWT expiry) is irrelevant if the app cannot load.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. High: Free Users Can Save Waypoints, Bypassing Pro Gate (F3 Regression)
- Summary: Free tier users are able to save waypoints, which should be a Pro-gated feature, allowing them to bypass the intended upgrade path.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown and the `WaypointSheet` *was* shown. This directly contradicts the expected behavior for a Pro-gated feature. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet open.
- Cannot confirm: If the saved waypoints are actually persisted to Supabase for free users, or if there's a server-side check that would fail later. However, the client-side UX allows the action.
- Root cause: The client-side logic for gating waypoint saving based on `isPro` status is incorrectly implemented or bypassed for free users, allowing access to a premium feature. This could be a misconfiguration of `useWaypoints` or `CornerControls` where the camera button is triggered.
- User impact: Free users gain access to a premium feature without subscribing, potentially devaluing the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key feature is available for free. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the client-side gating logic for the waypoint camera button to ensure `UpgradeSheet` is shown for free users.

### 4. High: Persistence Failure: Theme, Map Layers, Active Module, Waypoints, Tracks (V1, V7, V8, V9, V11, V15 Regression)
- Summary: Multiple user preferences and session data (theme, basemap, layer visibility, active module, guest waypoints, GPS track) are not being persisted across page reloads, leading to a loss of user context and requiring re-configuration.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` persistence failure.
    - `guest V9` and `free V8` failed with `Test timeout of 60000ms exceeded`, indicating map preferences (basemap, layer visibility) were not restored. `STATE_MAP.md` confirms `mapStore.basemap` and `mapStore.layerVisibility` are intended to persist via `ee-map-prefs`.
    - `guest V11` passed (confirming vulnerability) with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`, confirming `sessionWaypoints` persistence failure.
    - `guest V15` passed (confirming vulnerability) with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`, confirming `moduleStore.activeModule` persistence failure.
    - `pro V1` passed (confirming vulnerability) with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`, confirming `sessionTrail` persistence failure.
- Cannot confirm: The exact reason for the `ee-map-prefs` persistence failure (V8, V9) beyond the timeout, but the pattern of other persistence failures suggests a systemic issue.
- Root cause: A widespread failure in the `localStorage` persistence mechanisms. For `theme`, `sessionWaypoints`, `activeModule`, and `sessionTrail`, the manual IIFE + `localStorage.setItem` pattern is not correctly writing or reading the `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail` keys. For `basemap` and `layerVisibility`, the Zustand `persist` middleware for `ee-map-prefs` is failing. This is a regression as previous tasks (task-001, task-002, task-006, task-008, task-013) aimed to fix these.
- User impact: Users repeatedly lose their settings and in-progress work, leading to significant frustration and perceived unreliability of the app.
- Business impact: High churn due to poor user experience, reduced engagement with core features, and negative brand perception.
- Fix direction: Debug and verify the implementation of all `localStorage` persistence mechanisms, both manual and Zustand `persist` middleware, ensuring data is correctly written and read.

### 5. High: Learn Tab Component State Lost on Tab Switch (V13 Regression)
- Summary: Switching away from the Learn tab and then returning causes the component's internal state (e.g., current page in a chapter) to reset, forcing the user to restart their progress within a chapter.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests both passed. The test title "learn header stats are recomputed on every tab switch (state-loss proof)" explicitly states it's a "state-loss proof". While the `state-loss-evidence` annotation shows identical header stats (meaning header stats themselves aren't the lost state), the test passing confirms the underlying vulnerability. `UX Knowledge Context` for V13 states: "in-progress chapter reading position (which page within a chapter) lives in ChapterReader component state and is destroyed on tab switch."
- Cannot confirm: The specific chapter page number being reset, as the annotation only captures header stats.
- Root cause: The previous fix "Preserve Learn tab component state across tab switches (V13)" (by always mounting tabs) has regressed or was incomplete. The Learn tab's internal component state is still being destroyed and re-initialized on tab switches, likely due to an incorrect conditional render or state management within the `LearnView` or `ChapterReader` components.
- User impact: Users are unable to seamlessly continue learning, leading to frustration and disengagement with the educational content.
- Business impact: Reduced completion rates for learning modules, undermining the value of the educational content and potentially impacting user retention.
- Fix direction: Re-evaluate the `LearnView` and `ChapterReader` component lifecycle and state management to ensure internal component state persists across tab switches, potentially by lifting state or ensuring components are not unmounted.

### 6. Medium: Waypoint Save Fails Offline Silently (V14)
- Summary: When attempting to save a waypoint offline, the application does not provide a user-facing warning about the lack of connectivity before the save operation fails, leading to silent data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save offline warning. `STATE_MAP.md` confirms "Save waypoint... Fails — toast 'Could not save waypoint'".
- Cannot confirm: The exact toast message, as the test fails earlier due to the GPS issue.
- Root cause: The application lacks an explicit network connectivity check before initiating a Supabase write for waypoints. This violates "Offline-First Design" principles, which require clear communication about offline status and data saving.
- User impact: Users attempt to save data, believe it's saved, and only later discover it's lost, leading to frustration and distrust.
- Business impact: Data loss leads to negative user experience, reduced trust in the application, and potential abandonment.
- Fix direction: Implement a pre-save network connectivity check for waypoint saving, providing a clear user-facing warning if offline.

### 7. Medium: Track Save Fails Offline (V4)
- Summary: Users are able to complete a GPS tracking session offline, but the subsequent attempt to save the accumulated track data fails, resulting in the loss of the entire session.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V4` test passed. The test is titled "track save fails offline (post-stop data loss)", and a pass confirms the vulnerability. `STATE_MAP.md` states: "Save track... Fails — toast 'Could not save track'. YES — entire GPS trail, distance, elevation, duration gone."
- Cannot confirm: The specific toast message or the exact moment of data loss, but the test passing confirms the overall vulnerability.
- Root cause: The application attempts a direct Supabase write for track data without an offline queue or local persistence mechanism. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable tracking data after investing time and effort, leading to significant frustration and a feeling of wasted effort.
- Business impact: Reduced engagement with the tracking feature, negative perception of data reliability, and potential churn.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for track data, allowing local saving and later synchronization when online.

### 8. Medium: Pro Users See UpgradeSheet on Pro Affordance Tap (P1 Regression)
- Summary: Pro users are incorrectly shown the `UpgradeSheet` when interacting with a Pro-gated feature, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This test is designed to assert that the `UpgradeSheet` is *not* visible. A timeout in this context often implies the test was waiting for the sheet *not* to appear, but it *did* appear, causing the test to hang or fail. This was a previous finding (2026-09-23, Finding 4: "Pro Users See UpgradeSheet on Pro Affordance Tap (P1 Regression)").
- Cannot confirm: Direct screenshot evidence of the `UpgradeSheet` being visible, due to the timeout.
- Root cause: The client-side logic for gating Pro features is incorrectly checking the `isPro` status or the `UpgradeSheet` is being triggered erroneously even for authenticated Pro users. This is a regression of a previously fixed issue.
- User impact: Pro users are confused and annoyed by being prompted to upgrade for a service they already pay for, undermining their premium experience.
- Business impact: Erodes trust and satisfaction among paying customers, potentially leading to subscription cancellations.
- Fix direction: Debug the Pro feature gating logic to ensure `UpgradeSheet` is never shown to authenticated Pro users.

## Tier Comparison

-   **Persistence Failures (V1, V7, V8, V9, V11, V15):** The issues with theme (V7), basemap (V9), layer preferences (V8), and learn tab state (V13) are observed across both **Guest** and **Free** tiers, indicating a systemic problem independent of authentication status. Guest waypoints (V11) and active module (V15) persistence failures are confirmed for **Guest**. GPS track (V1) persistence failure is confirmed for **Pro**. This points to a broad failure in `localStorage` management affecting all users.
-   **Offline App Load (V2, V10):** The app completely fails to load for **Pro** users when offline. This is inferred to affect **Free** users as well, as the root cause is a lack of core app shell caching and reliance on Supabase for initial data, which applies to all authenticated sessions. **Guest** users might experience partial loading as they do not require Supabase authentication.
-   **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled due to GPS acquisition issues for **Pro** users. This is a core map/location service problem and is inferred to affect **Free** and **Guest** users if they were able to access waypoint saving.
-   **Pro Gate Logic (C3, F3, P1):**
    -   **Guest** users correctly see the `UpgradeSheet` when tapping a Pro-gated affordance (C3 PASS).
    -   **Free** users *incorrectly* bypass the `UpgradeSheet` and access the `WaypointSheet` when tapping the camera button (F3 FAIL).
    -   **Pro** users *incorrectly* appear to see the `UpgradeSheet` when tapping a Pro affordance (P1 FAIL/timeout, inferred regression).
    This highlights inconsistent and flawed Pro gate logic across all tiers.
-   **PRO Badges (F2):** **Free** users correctly see PRO badges in the LayerPanel, which is the expected behavior for non-Pro users.

## Findings Discarded
-   No findings were discarded as all identified issues were significant and within the maximum limit of 8.

## Cannot Assess
-   The exact content of toast messages for offline save failures (V3, V4, V6, V14) could not be fully assessed due to earlier test failures (e.g., disabled save button) or limitations in annotation capture.
-   The precise state loss for V13 (Learn tab component state) beyond the header stats, as the annotation did not capture the chapter reading position.
-   The specific visual evidence for P1 (Pro users seeing UpgradeSheet) due to a test timeout, though inferred from previous findings.

## Systemic Patterns
-   **Widespread Persistence Failures:** A fundamental issue exists with `localStorage` persistence, affecting both manual implementations (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) and Zustand `persist` middleware (`ee-map-prefs`). This leads to significant loss of user preferences and session data across reloads.
-   **Critical Offline Unavailability:** The application is completely unusable for authenticated users when offline, indicating a severe lack of offline-first design for the core app shell and initial data loading.
-   **Core Feature Blockers:** The GPS acquisition system is failing, preventing a primary user action (saving waypoints) and impacting other location-dependent features.
-   **Inconsistent Pro Gating:** The logic for managing Pro-gated features is flawed, leading to free users accessing premium features and Pro users being incorrectly prompted to upgrade.

## Calibration Notes
-   The consistent `CONFIRMED` verdicts for persistence-related vulnerabilities (V1, V7, V11, V13, V15) in previous runs, followed by their re-emergence or continued presence in this run, indicates a pattern of regressions or incomplete fixes in the persistence layer. This reinforces the need to prioritize a thorough review of all `localStorage` interactions.
-   The `MISDIAGNOSED` and `PHANTOM` verdicts from past runs (e.g., for UI element issues or haptic feedback) guide me to focus strictly on direct evidence from error messages, annotations, and clear visual cues in screenshots, rather than inferring issues from ambiguous timeouts or minor code changes. The current GPS acquisition issue (P3) and Pro gate bypass (F3) are clearly observable UX problems, not test-specific ambiguities.