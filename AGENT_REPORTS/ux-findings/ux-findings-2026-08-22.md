# UX Agent Report — 2026-08-22

## Run Context
- Commits analysed: `e3b4baf7cf0946d5ab88e4f96654e4c473f087d2` and 19 preceding commits.
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

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: User Preferences (Theme, Basemap, Layers, Active Module) Fail to Persist on Reload (Vulnerability V7, V8, V9, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, and active module preferences are lost on page reload, reverting to defaults, despite `STATE_MAP.md` indicating they should be persisted. This contradicts previous "CONFIRMED" fixes for V7 and V15.
- Tier(s) affected: All (Guest: V7, V9, V15; Free: V7, V8)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly contradicts `STATE_MAP.md` which states `ee_theme` should persist.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_active_module` is not persisting.
- Cannot confirm: The exact content of `ee-map-prefs` in localStorage due to timeout, but the failure to retain state is clear.
- Root cause: Persistence mechanisms for `userStore.theme` (manual `ee_theme` key), `mapStore.basemap`/`layerVisibility` (Zustand `ee-map-prefs`), and `moduleStore.activeModule` (manual `ee_active_module`) are not functioning correctly, possibly due to incorrect implementation or a regression.
- User impact: Annoying resets of customisation, requiring users to re-apply preferences on every app load.
- Business impact: Reduced user satisfaction, perceived unreliability, and increased cognitive load.
- Fix direction: Debug and re-implement the `localStorage` persistence logic for `ee_theme`, `ee-map-prefs`, and `ee_active_module` as per `STATE_MAP.md`.

### 4. High: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3 - Gating Error)
- Summary: Free tier users are incorrectly allowed to save waypoints directly via the camera button, bypassing the expected upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` indicates that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*. The test expected `upgradeShown` to be `true`.
- Cannot confirm: The exact line of code where the gating logic fails, but the observed behavior is clear.
- Root cause: Incorrect conditional rendering or routing logic for the "Save Waypoint" feature, failing to check the user's `isPro` status before displaying the `WaypointSheet`.
- User impact: Free users can access a premium feature without subscribing, leading to an inconsistent and potentially confusing experience.
- Business impact: Direct revenue loss by allowing free access to a paid feature, undermining the subscription model and perceived value of the Pro tier.
- Fix direction: Correct the conditional logic that determines whether to show the `UpgradeSheet` or `WaypointSheet` when a free user attempts to save a waypoint.

### 5. High: Guest-Generated Data (Waypoints, Active Module) is Lost on Reload (Vulnerability V11, V15 Confirmed)
- Summary: Guest users' session waypoints and active module selection are lost upon page reload, despite `STATE_MAP.md` indicating that these should be persisted to `localStorage`.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability.
- Cannot confirm: The specific reason for the failure in the manual persistence implementation.
- Root cause: The manual `localStorage` persistence patterns for `sessionWaypoints` (`ee_guest_waypoints`) and `activeModule` (`ee_active_module`) are not functioning as intended or have been regressed.
- User impact: Loss of unsaved work (waypoints) and preferred module settings, leading to a frustrating and unreliable experience for guest users.
- Business impact: Prevents guest users from experiencing the app's full value, hindering conversion to authenticated or paid tiers. Reduces trust in the app's ability to retain user data.
- Fix direction: Debug and ensure the manual `localStorage` read/write patterns for `ee_guest_waypoints` and `ee_active_module` are correctly implemented and functioning.

### 6. High: In-Progress GPS Tracks are Lost on Reload (Vulnerability V1 Confirmed)
- Summary: Any GPS track accumulated during an active tracking session is lost if the application is reloaded or crashes before the user explicitly saves it.
- Tier(s) affected: Pro (inferred Free/Guest if tracking was enabled)
- Confidence: HIGH
- Evidence: `pro V1` test passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the vulnerability.
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic, but the outcome is clear.
- Root cause: `mapStore.sessionTrail` accumulates GPS points in volatile memory and is not persisted to `localStorage` (`ee_session_trail`) during active tracking, despite `STATE_MAP.md` indicating manual persistence for `ee_session_trail`.
- User impact: Users undertaking long tracking sessions risk losing all their accumulated track data if the app unexpectedly closes or reloads.
- Business impact: Severe data loss for a core feature, leading to extreme user frustration, negative reviews, and abandonment of the app.
- Fix direction: Implement continuous, automatic persistence of `sessionTrail` to `ee_session_trail` in `localStorage` during active tracking sessions.

### 7. High: Offline Data Saves (Tracks, Routes) Fail Silently or with Toasts (Vulnerability V4, V6 Confirmed)
- Summary: When offline, attempts to save user-generated data such as GPS tracks and routes fail without proper user feedback or a retry mechanism, leading to data loss.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V4` test passed, confirming that track save fails offline.
    - `pro V6` test passed, confirming that route save offline produces no user-facing toast (silent failure). `STATE_MAP.md` explicitly states route saves fail silently with only a `console.error`.
- Cannot confirm: The exact toast message for V4, but the failure is confirmed.
- Root cause: The application lacks an offline data sync queue. All data writes (tracks, routes) attempt direct Supabase inserts, which fail when offline.
- User impact: Users believe their data is saved when it is not, leading to unexpected data loss and a complete lack of trust in the app's reliability, especially in rural areas with poor connectivity.
- Business impact: Erodes user trust, makes the app unusable for its primary purpose in target environments, leading to high churn and negative word-of-mouth.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., using IndexedDB) for all user-generated content.

### 8. Medium: Pro User Sees UpgradeSheet on Pro Affordance Tap (Vulnerability P1 - Regression/Test Issue)
- Summary: A Pro user attempting to access a Pro-gated feature (implied by "Pro affordance tap") might be incorrectly shown the `UpgradeSheet`, indicating a regression in the gating logic.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This indicates the test could not confirm the *absence* of the `UpgradeSheet` within the allotted time. While not direct proof of the sheet being shown, it suggests a failure in the expected gating behavior for Pro users.
- Cannot confirm: Whether the `UpgradeSheet` was definitively displayed, or if the test timed out due to other factors.
- Root cause: Possible regression in the `isPro` gating logic that controls the display of the `UpgradeSheet` for authenticated Pro users.
- User impact: Pro users are incorrectly prompted to upgrade, leading to confusion and frustration, undermining the value of their subscription.
- Business impact: Damages the perceived value of the Pro subscription and can lead to customer dissatisfaction and churn.
- Fix direction: Investigate the gating logic for `UpgradeSheet` to ensure it correctly identifies and bypasses Pro users.

## Tier Comparison

*   **Offline Load Failure (V2, V10):** Only tested for Pro, but the underlying issue (lack of app shell caching) would prevent Free users from loading offline as well. Guest users might load, but their experience would be fundamentally different without authentication.
*   **GPS Acquisition Failure (P3, V3):** Tested for Pro, but the core GPS acquisition logic is shared. This issue would prevent Free and Guest users from saving waypoints if they were permitted to do so.
*   **Preference Loss (V7, V8, V9, V15):** This is a systemic issue affecting all tiers. `guest V7, V9, V15` and `free V7, V8` all failed, indicating a widespread regression in `localStorage` persistence.
*   **Learn Tab State Loss (V13):** Both Guest and Free tests passed, showing no state loss for header stats. This suggests the previous fix for component state (scroll, page number) might be working, or the test isn't capturing that specific state.
*   **PRO Badges (F2):** Free users correctly see PRO badges in the LayerPanel. Pro users are expected *not* to see them (though this was not directly tested in this run, a previous fix addressed it).
*   **Waypoint Gating (F3, C3):** Free users incorrectly bypass the upgrade prompt (F3 failure). Guest users correctly see the upgrade prompt (C3 pass). This highlights a specific bug in the Free tier's gating logic.
*   **Guest Data Loss (V11, V15):** These vulnerabilities are specific to the Guest tier's unauthenticated session data.
*   **GPS Track Loss (V1):** Tested for Pro, but the `sessionTrail` mechanism is generic and would affect any user tier capable of tracking.
*   **Offline Data Saves (V4, V6):** Tested for Pro, but the lack of an offline queue affects all authenticated users attempting to save data when offline.

## Findings Discarded

*   **`guest V13` and `free V13` (Learn header stats recomputed/no regression):** These tests passed, and the `state-loss-evidence` annotation showed identical `completePct:0` before and after. This indicates no *change* in header stats, not necessarily a *loss* of in-progress chapter reading position (which was the original V13 vulnerability). The previous fix for V13 was about preserving *component state* (like scroll position within a chapter), which these tests do not directly measure. Therefore, I cannot confirm a state loss for the *intended* V13 vulnerability based on these results, and the header stats themselves are not showing a loss. This finding is discarded as a PHANTOM/misinterpreted test for the *specific* state loss it claims to prove.

## Cannot Assess

*   No specific components or features were entirely unassessable beyond the blocking issues identified in the findings.

## Systemic Patterns

*   **Persistence Layer Regression:** A critical regression has occurred across multiple `localStorage` persistence mechanisms (both Zustand `persist` and manual IIFE patterns). This affects user preferences (theme, basemap, layers, active module) and unsaved user-generated data (guest waypoints, active GPS tracks). This is a widespread and high-impact issue.
*   **Non-Existent Offline Functionality:** The application fundamentally fails to operate offline, from initial load to data saving. This is a severe architectural flaw for an outdoor mapping app targeting rural users.
*   **GPS Integration Issues:** The consistent failure to acquire GPS coordinates points to a problem within the `useTracks` hook or its interaction with the environment/mock data, impacting core map features.
*   **Inconsistent Gating Logic:** There is a specific error in the gating logic for Free users, allowing access to a premium feature, while Guest users are correctly gated. This indicates a need for a review of authentication and subscription checks across the application.

## Calibration Notes

*   The new test philosophy, where a "PASS" can confirm a vulnerability, was crucial for identifying V1, V4, V6, V11, and V15. This required careful reading of annotations.
*   `Test timeout` errors were treated as strong indicators of underlying failures (e.g., app not loading, button remaining disabled), rather than just test flakiness.
*   `STATE_MAP.md` was used as the architectural ground truth, but direct test evidence (e.g., `ee_theme-before-reload: null`) took precedence when contradicting the map, indicating a regression.
*   Prioritization focused heavily on critical blockers (app not loading, core functionality broken) and data loss, aligning with past successful diagnoses.
*   Avoided speculating on issues not directly evidenced by screenshots or annotations (e.g., specific chapter scroll positions for V13), preventing "PHANTOM" findings.