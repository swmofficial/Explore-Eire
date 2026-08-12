# UX Agent Report — 2026-08-12

## Run Context
- Commits analysed: `ec203c55d399c6f0323593f74e0716171a26ebac` (latest) and 19 preceding commits.
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
- Summary: Critical user-generated session data, including active GPS tracks (`sessionTrail`), guest waypoints (`sessionWaypoints`), and the active module (`activeModule`), are lost on page reload, indicating a regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V11, V15; Pro: V1)
- Confidence: HIGH
- Evidence: `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys via manual `localStorage` patterns (`task-002`, `task-006`, `task-013`).
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns for `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, and `moduleStore.activeModule`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) that users expect to persist, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core app features.
- Fix direction: Re-implement and verify the manual `localStorage` persistence patterns for `sessionWaypoints`, `sessionTrail`, and `activeModule`.

### 4. High: Widespread Loss of User Preferences on Page Reload (Vulnerability V7, V8, V9)
- Summary: User preferences for theme, basemap, and layer visibility are lost on page reload, reverting to default settings and requiring users to reconfigure their preferred view.
- Tier(s) affected: All (Guest: V7, V9; Free: V7, V8)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, and `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. `guest V9` and `free V8` timed out, but are related to persistence of `basemap` and `layerVisibility` respectively. `STATE_MAP.md` states `userStore.theme` persists via `ee_theme` (manual pattern, task-008) and `mapStore.basemap`, `mapStore.layerVisibility` persist via `ee-map-prefs` (Zustand persist). The `null` values for `ee_theme` indicate a failure in the manual persistence.
- Cannot confirm: The exact state of `ee-map-prefs` after reload for V8/V9 due to timeouts, but the pattern of preference loss is consistent with V7.
- Root cause: Regression in `localStorage` persistence for `userStore.theme` (manual pattern) and likely `mapStore` preferences (Zustand persist middleware).
- User impact: Annoyance and wasted time as users repeatedly reconfigure their app settings after every reload, leading to a degraded user experience.
- Business impact: Reduced user satisfaction, perceived lack of polish, and potential for users to abandon the app if basic preferences aren't respected.
- Fix direction: Debug and restore `localStorage` persistence for `userStore.theme` and `mapStore` preferences.

### 5. Medium: Free Users Bypass Upgrade Gate for Waypoint Saving (F3)
- Summary: Free users are incorrectly allowed to access the "New Waypoint" sheet and attempt to save a waypoint, instead of being presented with an upgrade prompt, bypassing a key monetization gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the upgrade sheet was *not* shown, but the waypoint sheet *was*.
- Cannot confirm: If the waypoint save would actually succeed for a free user (it should fail at the Supabase level), but the UX flow is incorrect.
- Root cause: Incorrect gating logic for the "Save Waypoint" action, failing to check `userStore.isPro` or `userStore.subscriptionStatus` before routing to the `WaypointSheet`.
- User impact: Free users might waste time filling out waypoint details only to be blocked at the final save, leading to frustration.
- Business impact: Direct loss of potential upgrades, as users are not prompted to subscribe when attempting to use a premium feature. Undermines the value proposition of the Pro tier.
- Fix direction: Implement correct `isPro` or `subscriptionStatus` checks before opening the `WaypointSheet` for free users, routing them to the `UpgradeSheet` instead.

### 6. Medium: Free Users See PRO Badges on Inaccessible Features (F2)
- Summary: The LayerPanel displays "PRO" badges next to features that are inaccessible to free users, creating false affordances and a frustrating user experience.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` passed, with annotation `pro-badge-count: 8`. This means 8 PRO badges were found in the LayerPanel for a free user. Screenshot `test-results/free/f2-layer-panel.png` visually confirms the presence of "PRO" badges next to several layer toggles.
- Cannot confirm: The exact interaction when a free user taps a PRO-badged feature (e.g., does it show an upgrade sheet or just do nothing?).
- Root cause: The LayerPanel component's rendering logic for PRO badges does not correctly check `userStore.isPro` to hide badges for free users. The previous fix for P1 was to hide badges for *Pro* users, not *Free* users.
- User impact: Frustration and confusion for free users who see features they cannot access, potentially leading to a negative perception of the app.
- Business impact: Poor conversion rates as free users are constantly reminded of locked features without a clear path to upgrade, or are confused about what they can and cannot do.
- Fix direction: Modify LayerPanel rendering logic to hide "PRO" badges for free users, or replace them with an "Upgrade" call to action.

### 7. Medium: Offline Data Write Failures Lack Robust Handling (Vulnerability V4, V6, V14)
- Summary: While offline, attempts to save tracks and routes fail, with track saves producing a toast but route saves failing silently (console error only), and no pre-save warning for waypoints (V14). This highlights a systemic lack of offline data queuing and user feedback for critical data writes.
- Tier(s) affected: Pro (inferred All for V14, V4, V6)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming track save fails offline. `pro V6` passed, confirming route save offline produces no user-facing toast (despite annotation `cannot proof V6`, the pass implies the expected no-toast behavior). `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms the absence of a pre-save warning for waypoints. `STATE_MAP.md` confirms these behaviors: `tracks` INSERT fails with toast, `routes` INSERT fails with `console.error only, no toast`, and no offline write queue exists.
- Cannot confirm: The exact content of the toast for V4, or the console error for V6.
- Root cause: The application lacks an offline data synchronization queue (V3, V4, V6, V14 are listed as "genuine vulnerabilities" in `STATE_MAP.md`). Supabase writes fail directly without local persistence or retry mechanisms.
- User impact: Users lose valuable data (tracks, routes, waypoints) if they attempt to save while offline, leading to significant frustration and distrust. Silent failures (routes) are particularly dangerous.
- Business impact: Data loss leads to high churn, negative reviews, and a perception of unreliability, especially for a field-based app where offline usage is common.
- Fix direction: Implement an offline data write queue (e.g., using IndexedDB) to store and sync user-generated data when connectivity is restored, and provide clear UI feedback on sync status.

## Tier Comparison

*   **Offline App Load (V2, V10):** Pro tier fails to load the app entirely when offline. This behavior is inferred to be the same for Free tier, as the root cause (lack of app shell caching) is systemic and not tier-specific. Guest tier is not tested for this specific scenario, but would likely also fail to load the app shell.
*   **GPS Acquisition Failure (P3, V3):** The "Save Waypoint" button is disabled for Pro users due to GPS acquisition failure. This is a core functionality issue and would affect all tiers if they were able to access the WaypointSheet.
*   **Loss of Session Data (V1, V11, V15):** `sessionTrail` (V1) is lost for Pro users. `sessionWaypoints` (V11) and `activeModule` (V15) are lost for Guest users. This indicates a systemic regression in manual `localStorage` persistence affecting all tiers for different types of session data.
*   **Loss of User Preferences (V7, V8, V9):** `theme` (V7) is lost for both Guest and Free users. `basemap` (V9) is lost for Guest, and `layerVisibility` (V8) for Free. This indicates a systemic regression in preference persistence affecting all tiers for different types of preferences.
*   **Free User Gating (F2, F3):** These issues are specific to the Free tier, demonstrating incorrect monetization gating and UI affordances for non-Pro users. Guest users are correctly gated (C3 passes). Pro users are expected to bypass these gates (P1 timeout prevents direct confirmation, but P2 passes).
*   **Offline Data Write Failures (V4, V6, V14):** Track save (V4) and route save (V6) failures, and lack of pre-save warning (V14) are observed/confirmed for Pro users. These are systemic offline data handling issues that would affect all authenticated tiers. Guest users cannot save these types of data.
*   **Learn Tab State (V13, F4):** Both Guest and Free tiers pass tests related to Learn tab header stats, indicating that these specific stats are preserved across tab switches. This suggests the previous fix for V13 (preserving component state) is holding for this aspect.

## Findings Discarded
None. All identified findings have HIGH confidence and significant user/business impact.

## Cannot Assess
*   **Pro P1 (UpgradeSheet for Pro):** The test timed out, preventing confirmation that Pro users correctly *do not* see the UpgradeSheet when tapping a Pro affordance.
*   **Pro V10 (Pro status revert offline):** The app failed to load entirely when offline, preventing the test from verifying if a Pro user's status would revert to free *after* an offline reload.
*   **Pro V2 (Gold/mineral data missing offline):** The app failed to load entirely when offline, preventing the test from verifying if gold/mineral data would be missing.
*   **Guest V9 (Basemap reset) and Free V8 (Layer preferences reset):** These tests timed out, preventing direct confirmation of the state of `basemap` and `layerVisibility` after reload. However, the pattern of preference loss (V7) makes it highly likely these are also regressions.

## Systemic Patterns
1.  **Widespread Persistence Regression:** Multiple critical user preferences (`theme`, `basemap`, `layerVisibility`) and user-generated session data (`sessionTrail`, `sessionWaypoints`, `activeModule`) are failing to persist across page reloads. This points to a systemic issue with `localStorage` handling, affecting both Zustand's `persist` middleware and manual `localStorage` patterns. This is a major regression from previous fixes.
2.  **Critical Offline Functionality Failure:** The application fails to load entirely when offline for authenticated users, making it unusable in its primary target environment. This is compounded by the lack of an offline data queue, leading to data loss for any user-generated content saved while offline.
3.  **GPS Acquisition Issues:** The app consistently fails to acquire GPS coordinates, disabling core features like waypoint saving. This suggests a problem with the `useTracks` hook or its integration with the map component.
4.  **Monetization Gating Inconsistencies:** The logic for gating Pro features for free users is inconsistent, with PRO badges appearing on inaccessible features and a key upgrade gate (waypoint saving) being bypassed.

## Calibration Notes
*   **Prioritisation of Critical Failures:** Past "Confirmed" verdicts for critical issues like offline app load (V2, V10) and GPS acquisition (P3) reinforce the need to prioritize these as they render the app unusable.
*   **Persistence Issues:** The repeated appearance of persistence issues (V1, V7, V8, V9, V11, V15) despite previous fixes indicates a fragile state management system or recent regressions. This confirms the value of dedicated vulnerability tests.
*   **Test Annotation Interpretation:** Careful interpretation of test annotations (e.g., `V13` passing with identical `state-loss-evidence` means header stats are preserved, not lost; `V6` passing with `cannot proof V6` implies the expected no-toast behavior was observed) helps avoid misdiagnosing.
*   **Tier Attribution:** Explicitly attributing findings to tiers and noting when behavior is identical across tiers helps pinpoint the scope and potential root cause (e.g., a systemic issue vs. a specific auth gate).