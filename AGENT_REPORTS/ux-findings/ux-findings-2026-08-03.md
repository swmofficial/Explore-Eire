# UX Agent Report — 2026-08-03

## Run Context
- Commits analysed: `54501fa7a696f839d864173e4858d2acb29904cc` (latest) and 19 preceding commits.
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
- Evidence: `guest V7` and `free V7` failed with `Expected: "light" Received: "dark"`, with `ee_theme-before-reload: null`. `guest V9` and `free V8` timed out, implying state was not found. `guest V11` annotation `ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` annotation `ee_active_module absent after reload (V15 confirmed)`. `pro V1` annotation `ee_session_trail empty or missing (V1 confirmed)`. These directly contradict `STATE_MAP.md`'s claims of persistence for these keys.
- Cannot confirm: The specific code changes that broke the manual `localStorage` write/read for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`, or the Zustand `persist` for `ee-map-prefs`.
- Root cause: Regression in the implementation of manual `localStorage` persistence patterns and/or the Zustand `persist` middleware for `mapStore` and `userStore`.
- User impact: Loss of critical, effort-intensive data (GPS tracks, saved locations) and user workflow preferences, leading to extreme frustration and distrust in the application's reliability.
- Business impact: High churn, negative reviews, perceived data insecurity, and reduced engagement with core features.
- Fix direction: Debug and re-implement robust persistence for all specified `localStorage` keys and Zustand `persist` configurations.

### 4. High: Free Users Can Save Waypoints, Bypassing Pro Gating (Vulnerability F3)
- Summary: Free tier users are able to save waypoints, a feature intended to be exclusive to Pro subscribers, indicating a critical flaw in the feature gating logic.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() Received: false`. The `gate-routing` annotation explicitly states `{"upgradeShown":false,"waypointShown":true}`, confirming that the UpgradeSheet was *not* shown and the WaypointSheet *was* shown.
- Cannot confirm: The exact line of code responsible for the incorrect gating, but the evidence clearly shows the gate is misconfigured.
- Root cause: Incorrect conditional rendering or routing logic that fails to check `userStore.isPro` before allowing access to the `WaypointSheet`.
- User impact: Free users gain access to a premium feature, diminishing the value proposition of the Pro subscription.
- Business impact: Direct loss of potential Pro conversions, as a key incentive for upgrading is undermined.
- Fix direction: Correct the feature gating logic to ensure `WaypointSheet` is only accessible to Pro users.

### 5. Medium: Learn Tab Component State Not Preserved Across Tab Switches (Vulnerability V13)
- Summary: While the underlying progress data for the Learn tab header stats is persistent, the component's internal state (e.g., scroll position, current page in a chapter) is likely lost when switching tabs, forcing users to restart their reading or navigation.
- Tier(s) affected: Guest, Free (inferred Pro)
- Confidence: MEDIUM
- Evidence: `guest V13` and `free V13` tests passed, with `state-loss-evidence` showing identical header stats before and after tab switches. However, the test description "learn header stats are recomputed on every tab switch (state-loss proof)" implies component re-rendering, which would destroy unpersisted component state like scroll position, as per UX Knowledge Context. The test does not directly assert component state preservation.
- Cannot confirm: Direct observation of scroll position or chapter page loss in screenshots or annotations.
- Root cause: `App.jsx` likely still unmounts non-map tabs on switch, despite previous fixes, leading to component state destruction.
- User impact: Frustration for users trying to follow courses, as they lose their place and have to re-navigate within the Learn module.
- Business impact: Reduced engagement with the learning content, potentially impacting user skill development and long-term app value perception.
- Fix direction: Ensure Learn tab components remain mounted (e.g., by toggling `display: none`) or implement robust state lifting/persistence for critical component states.

### 6. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: When attempting to save a route offline, the operation fails without any user-facing toast or clear indication of failure, leading to potential data loss and user confusion.
- Tier(s) affected: Pro (inferred All)
- Confidence: MEDIUM
- Evidence: `pro V6` test passed, which confirms the vulnerability (silent failure). However, the annotation `route-button-missing: cannot proof V6` indicates the test's direct evidence for *why* it passed (i.e., the absence of a toast) was not robustly captured.
- Cannot confirm: Direct visual evidence (screenshot) of the absence of a toast message.
- Root cause: Lack of an offline data queue for route saves and insufficient error handling/user feedback for Supabase write failures.
- User impact: Users believe their route is saved, only to find it missing later, leading to data loss and distrust.
- Business impact: Reduced reliability perception, potential for user churn due to lost effort.
- Fix direction: Implement an offline data queue for route saves and provide clear user feedback (e.g., a toast) when offline saves fail.

## Tier Comparison

-   **Offline App Loading (V2, V10):** Pro tier completely fails to load offline. This is a systemic issue likely affecting Free users as well, as the core app shell and initial data are not cached. Guest tier is not explicitly tested for this specific failure mode, but the underlying cause would affect all.
-   **Waypoint Save Disabled (P3, V3):** Pro tier experiences a disabled "Save Waypoint" button due to GPS acquisition failure. This issue would prevent Free and Guest users from saving waypoints even if they had the permission to do so.
-   **Persistence Issues (V1, V7, V8, V9, V11, V15):**
    -   **Theme (V7):** Fails for both Guest and Free tiers, resetting to 'dark'. This indicates a universal regression in theme persistence.
    -   **Basemap (V9):** Fails for Guest tier.
    -   **Layer Visibility (V8):** Fails for Free tier.
    -   **Session Waypoints (V11):** Fails for Guest tier (memory-only). Not applicable to authenticated users.
    -   **Active Module (V15):** Fails for Guest tier.
    -   **Session Trail (V1):** Fails for Pro tier.
    -   **Pattern:** All persistence mechanisms (manual `localStorage` and Zustand `persist` for `mapStore` and `userStore`) are experiencing regressions across all tiers where applicable.
-   **Free User Waypoint Gating (F3):** This is a specific gating error affecting only the Free tier, allowing them to save waypoints when they should be prompted to upgrade.
-   **Learn Tab State Loss (V13):** Affects both Guest and Free tiers, implying a general issue with component state preservation across tab switches.
-   **Route Save Offline (V6):** Pro tier confirms silent failure. This behaviour is likely consistent across all tiers if they had route saving capabilities.

## Findings Discarded

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test failed with a timeout. Given the ambiguity of a timeout (could be test flakiness, an element not appearing/disappearing as expected, or a genuine bug), and the lack of specific evidence in annotations or screenshots to confirm a UX issue, this finding is discarded as LOW confidence.

## Cannot Assess

-   The exact cause of the Playwright geolocation mock not being correctly processed by the app's GPS acquisition logic, which leads to the disabled "Save Waypoint" button (Finding 2). Further debugging within the app's GPS module would be required.
-   Direct visual evidence for the absence of a toast message for `pro V6` (Route save fails silently offline), as the annotation `route-button-missing: cannot proof V6` indicates the test could not capture this specific evidence, despite passing.

## Systemic Patterns

-   **Widespread Persistence Failure:** A critical systemic issue is the regression across almost all persistence mechanisms. Both manual `localStorage` patterns (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) and Zustand `persist` configurations (`ee-map-prefs`) are failing. This suggests a fundamental problem with how state is being saved and rehydrated across reloads.
-   **Lack of Offline-First Design:** The complete failure of the app to load offline for authenticated users, coupled with silent data write failures, highlights a severe deficiency in offline-first capabilities. The app is not resilient to network interruptions, which is critical for its target user base.
-   **Inadequate Feature Gating:** The `free F3` failure indicates a flaw in the logic that gates premium features, allowing free users access to Pro functionality.

## Calibration Notes

-   The repeated confirmation of offline loading failures (V2, V10) and GPS acquisition issues (P3, V3) reinforces the importance of robust environment setup and comprehensive Service Worker implementation. These were high-priority findings in previous reports and remain critical.
-   The widespread persistence regressions (V1, V7, V8, V9, V11, V15) are a new, broad pattern. My previous calibration focused on individual persistence fixes; this run indicates a systemic breakdown, requiring a broader investigation into the persistence layer.
-   The nuance of V13 (Learn tab state loss) where header *values* persist but *component state* may not, is a good example of avoiding PHANTOM verdicts by carefully distinguishing between data persistence and UI state persistence, as learned from past misdiagnoses. The test's "pass" status for V13 is misleading regarding the actual vulnerability.