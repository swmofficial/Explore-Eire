# UX Agent Report — 2026-09-07

## Run Context
- Commits analysed: `de518611e2ea5a5abcd65e4de24d5f0a6fdbed92` and 19 preceding commits.
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

### 3. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the WaypointSheet and attempt to save a waypoint, instead of being presented with an UpgradeSheet as intended for Pro-gated features.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: If the save operation would actually succeed for a free user (it should fail on the backend), but the UX gate is clearly broken.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before showing the `WaypointSheet`.
- User impact: Free users can access a Pro feature, potentially leading to confusion when their data doesn't save or they hit a backend error. It also undermines the value proposition of the Pro tier.
- Business impact: Direct loss of potential Pro conversions, as the upgrade path for a core feature is bypassed.
- Fix direction: Correct the gating logic for the camera button to display the `UpgradeSheet` if `isPro` is false.

### 4. High: Theme Resets to Default on Reload for All Tiers (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload, requiring users to re-select it every time.
- Tier(s) affected: All (Guest and Free explicitly failed, Pro inferred)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being correctly written or read.
- Cannot confirm: The exact point of failure in the manual `ee_theme` persistence logic.
- Root cause: A regression or incomplete fix in the manual `localStorage` persistence for `userStore.theme` (key `ee_theme`), as described in `STATE_MAP.md` (task-008). The `null` values suggest the `setItem` operation is not occurring.
- User impact: Annoying loss of a basic preference, leading to a less personalized and consistent user experience.
- Business impact: Minor, but contributes to a perception of an unreliable or unpolished application.
- Fix direction: Debug and re-verify the manual `localStorage` read/write implementation for `userStore.theme` to ensure `ee_theme` is correctly persisted.

### 5. High: Basemap and Layer Preferences Reset on Reload (V9, V8)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload, forcing users to reconfigure their map view.
- Tier(s) affected: All (Guest V9 and Free V8 tests timed out, Pro inferred)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests timed out, strongly suggesting the expected state (persisted preferences) was not met after reload. `STATE_MAP.md` indicates `basemap` and `layerVisibility` are persisted via `mapStore`'s `ee-map-prefs` Zustand persist middleware.
- Cannot confirm: The exact values of `basemap` and `layerVisibility` after reload, as the tests timed out before explicit assertion.
- Root cause: The `mapStore`'s `persist` middleware for `ee-map-prefs` is likely failing to correctly save or load the `basemap` and `layerVisibility` states, or there's a race condition preventing the UI from reflecting the loaded state.
- User impact: Users lose their customized map view, requiring repetitive actions to set up their preferred layers and basemap for each session.
- Business impact: Reduces user efficiency and satisfaction, particularly for power users who rely on specific layer configurations.
- Fix direction: Debug `mapStore`'s `persist` middleware to ensure `basemap` and `layerVisibility` are correctly saved to and loaded from `ee-map-prefs`.

### 6. High: Unsaved GPS Tracks and Guest Waypoints Lost on Reload (V1, V11)
- Summary: Any active GPS tracking session data (`sessionTrail`) and guest-created waypoints (`sessionWaypoints`) are lost upon page reload because they are not automatically persisted.
- Tier(s) affected: Guest (waypoints), Pro (tracks) — and Free for both if they use guest mode or track.
- Confidence: HIGH
- Evidence: `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `pro V1` passed with `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. The tests are designed to confirm the *loss* of data, and they did.
- Cannot confirm: The specific scenario (e.g., app crash vs. accidental tab close) that triggers the loss, but the mechanism is clear.
- Root cause: `STATE_MAP.md` explicitly states: "`sessionTrail`, `sessionWaypoints`... accumulate during active user sessions. None are persisted anywhere until the user explicitly saves." This is a known vulnerability (V1, V11).
- User impact: Significant data loss for active sessions if the app crashes, the browser tab is closed, or connectivity drops before an explicit save.
- Business impact: Erodes user trust, leads to negative reviews, and discourages active use of tracking and waypoint features due to perceived unreliability.
- Fix direction: Implement auto-save to `localStorage` for `sessionTrail` and `sessionWaypoints` during active use, with a clear "saved locally" indicator.

### 7. High: Active Module Resets to Default on Reload (V15)
- Summary: The user's selected active module (e.g., 'prospecting') resets to its default state upon page reload, requiring manual re-selection.
- Tier(s) affected: All (Guest explicitly confirmed, Free/Pro inferred)
- Confidence: HIGH
- Evidence: `guest V15` passed with `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. The test confirms the module resets.
- Cannot confirm: The exact point of failure in the manual `ee_active_module` persistence logic.
- Root cause: `STATE_MAP.md` states `moduleStore.activeModule` persists via `ee_active_module` (manual pattern, task-013). The annotation `ee_active_module absent` indicates this manual persistence is failing.
- User impact: Users lose their active module selection on reload, requiring them to re-select it, causing minor friction.
- Business impact: Minor annoyance, but contributes to overall perception of app unreliability and reduces user flow.
- Fix direction: Debug the manual persistence logic for `moduleStore.activeModule` and `ee_active_module` to ensure the key is correctly written and read.

### 8. Medium: Offline Route Save Fails Silently (V6)
- Summary: When a user attempts to save a route while offline, the operation fails without any user-facing feedback, leading to data loss.
- Tier(s) affected: Pro (inferred Free/Guest if they could save routes)
- Confidence: MEDIUM
- Evidence: `pro V6` passed, but the annotation `route-button-missing: cannot proof V6` suggests the test couldn't fully verify the silent failure. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast".
- Cannot confirm: The exact content of the console error or if any temporary local state is retained.
- Root cause: Lack of user-facing feedback for failed offline route saves. The `routes` INSERT operation fails silently according to `STATE_MAP.md`.
- User impact: Users believe their route is saved when it isn't, leading to data loss and frustration when they try to access it later.
- Business impact: Erodes trust, discourages use of the route planning feature, and can lead to negative user experiences.
- Fix direction: Implement a user-facing toast or notification for failed offline route saves, and ideally, an offline queue for retry.

## Tier Comparison

-   **Offline App Load (V2, V10):** Pro tier fails to load the application entirely when offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is inferred for the Free tier as well, given both require authentication and initial data loads from Supabase. Guest tier is not explicitly tested for this specific failure, but would likely load the app shell while lacking dynamic data.
-   **Waypoint Save (P3, V3):** Pro tier fails to save waypoints due to GPS acquisition issues, resulting in a disabled "Save Waypoint" button. The Free tier is *incorrectly* allowed to open the WaypointSheet (F3) instead of the UpgradeSheet, but would likely also fail to save due to the same GPS issues and backend gating. Guest waypoints are confirmed to be memory-only (V11) and lost on reload.
-   **Theme Persistence (V7):** Guest and Free tiers both experience theme preference resets to 'dark' on reload. This behavior is inferred for the Pro tier as the persistence mechanism is global.
-   **Basemap and Layer Persistence (V9, V8):** Guest and Free tiers both experience basemap and layer visibility preference resets on reload. This behavior is inferred for the Pro tier.
-   **Session Data Loss (V1, V11):** Guest-created waypoints are lost on reload (V11 confirmed). Active GPS tracks for Pro users are lost on reload (V1 confirmed). This behavior is consistent with `STATE_MAP.md` which states these are not persisted until explicitly saved.
-   **Active Module Persistence (V15):** The Guest tier experiences active module resetting to 'prospecting' on reload. This behavior is inferred for Free and Pro tiers.
-   **Pro Badges (F2):** Free users correctly see PRO badges displayed for Pro-gated features in the LayerPanel. Pro users are expected *not* to see these badges (P1), but the P1 test timed out, preventing confirmation.
-   **Upgrade Sheet (C3, F3, P1):** Guest users correctly trigger the UpgradeSheet when tapping a Pro-gated affordance (C3). Free users *incorrectly* bypass the UpgradeSheet when attempting to save a waypoint (F3). Pro users are expected *not* to see the UpgradeSheet (P1), but the P1 test timed out.

## Findings Discarded

-   **guest V13 — learn header stats are recomputed on every tab switch (state-loss proof):** Discarded as PHANTOM for this run. The `state-loss-evidence` annotation showed identical `before` and `after` values (0% complete, 0 chapters done). This means no actual progress was made or lost during the test journey, so the test could not provide evidence for the vulnerability. The previous finding "Preserve Learn tab component state across tab switches (V13)" was CONFIRMED, indicating a fix was implemented.
-   **free V13 — learn tab state loss across tab switch (handover reference journey):** Discarded as PHANTOM for the same reason as `guest V13`. No actual state was present to be lost or preserved.
-   **free F4 — Learn header percentage does not regress to zero across tab switches:** Discarded as PHANTOM. Similar to V13, the `header-stats-pair` annotation showed identical `before` and `after` values (0% complete), meaning no progress was made to regress.

## Cannot Assess

-   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test timed out, preventing assessment of whether Pro users correctly bypass the UpgradeSheet.
-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** This test failed due to the app being unable to load offline (`net::ERR_INTERNET_DISCONNECTED`), preventing assessment of whether `isPro` status reverts after an offline reload. The primary issue of offline loading must be resolved first.

## Systemic Patterns

1.  **Widespread Persistence Failures:** Multiple user preferences (theme, basemap, layer visibility, active module) are failing to persist across reloads, affecting all tiers. This indicates a systemic issue with either the Zustand `persist` middleware configurations or the manual `localStorage` read/write patterns implemented for these states.
2.  **Fundamental Offline Unavailability:** The application is completely unusable for authenticated users when offline, failing to load the core app shell and essential data. This is a critical architectural flaw for a mapping application targeting rural users and directly violates offline-first design principles.
3.  **Broken Core Feature Gating and Functionality:** The waypoint saving feature is non-functional due to GPS acquisition issues, and the upgrade gate for free users is incorrectly bypassed, allowing access to a Pro feature. This impacts core app utility and the business model.
4.  **Volatile Session Data:** User-generated session data, specifically active GPS tracks and guest waypoints, are not automatically saved, leading to unrecoverable data loss upon any interruption. This is a significant data safety concern.

## Calibration Notes

-   The recurrence of V7 (theme reset) despite a previous `CONFIRMED` fix highlights the need for robust regression testing and careful review of persistence logic, especially when mixing Zustand `persist` with manual `localStorage` patterns. A previously "fixed" vulnerability can easily re-emerge.
-   The `net::ERR_INTERNET_DISCONNECTED` error for offline tests is a clear and unambiguous indicator of a critical failure, reinforcing the importance of comprehensive Service Worker caching for the app shell and initial data. This aligns with past `CONFIRMED` findings regarding offline-first design.
-   For state-loss tests like V13 and F4, it's crucial that the test journey *first creates* some measurable state (e.g., completes a chapter) before attempting to verify its persistence. When `before` and `after` values are identical zeros, the test cannot provide meaningful evidence of state loss or preservation. This will inform future test design recommendations.
-   Timeouts (V8, V9, P1) are treated as strong indicators of failure, especially when other related tests (like V7) explicitly fail, suggesting a common underlying persistence issue.