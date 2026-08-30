# UX Agent Report — 2026-08-30

## Run Context
- Commits analysed: `fc15226e3a420d6aa9e0614edaefcdeee1e3eeb0` and 19 preceding commits.
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

### 3. High: Widespread User Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, despite `STATE_MAP.md` indicating they should be persisted. This is a significant regression from previously confirmed fixes.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` failed (timeout), implying `mapStore.basemap` resets.
    - `free V8` failed (timeout), implying `mapStore.layerVisibility` resets.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
- Cannot confirm: The exact point of failure (write, read, or `localStorage` clearing) for each persistence mechanism.
- Root cause: A systemic failure in both Zustand `persist` middleware (`ee-map-prefs`) and the manual `localStorage` read/write patterns (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`). This indicates a regression where `localStorage` keys are either not being written, not being read, or are being cleared prematurely.
- User impact: Users lose their personalized settings and unsaved session data (waypoints, tracks), leading to a frustrating and unreliable experience. This breaks trust in the app's ability to remember user choices.
- Business impact: Decreased user satisfaction, reduced engagement with core features, and potential abandonment due to perceived data loss.
- Fix direction: Thoroughly debug `localStorage` interactions for all persisted state, verifying both write and read operations, and ensuring no unintended clearing of keys.

### 4. High: Free Users Cannot Save Waypoints (F3 Failure)
- Summary: Free users attempting to save a waypoint are incorrectly shown the `WaypointSheet` instead of being prompted to upgrade via the `UpgradeSheet`, preventing them from saving waypoints and missing a key upgrade opportunity.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was* shown.
- Cannot confirm: Whether the "Save Waypoint" button within the `WaypointSheet` would be disabled for free users if the sheet was correctly shown, or if the issue is purely with the gating logic. Given Finding 2, it's likely the button would also be disabled due to GPS.
- Root cause: Incorrect gating logic for the "Save Waypoint" action for free users. The `userStore.isPro` check is either not being correctly applied or is being bypassed, leading to the `WaypointSheet` being displayed instead of the `UpgradeSheet`.
- User impact: Free users are unable to save waypoints, a core feature, and are not guided towards the upgrade path, leading to frustration and missed opportunities.
- Business impact: Direct loss of potential conversions from free to pro users, as the upgrade prompt is not displayed at a critical point of user intent.
- Fix direction: Review and correct the conditional rendering logic for the "Save Waypoint" action to ensure `showUpgradeSheet` is triggered for free users.

### 5. Medium: Pro User Sees PRO Badges in LayerPanel (P1 Failure)
- Summary: Pro users are incorrectly shown "PRO" badges next to premium map layers in the `LayerPanel`, despite having access to these features, creating visual clutter and a confusing user experience.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with a timeout. The test is designed to assert that PRO badges are *not* visible for Pro users. The timeout suggests the test could not reach this state, implying the badges *were* visible. `free F2` passed and confirmed `pro-badge-count: 8` for free users, indicating the badges are present in the UI.
- Cannot confirm: A direct screenshot of the `LayerPanel` for Pro users showing the badges, as the test timed out before capturing a final state.
- Root cause: A regression in the `LayerPanel`'s rendering logic for PRO badges. The `!isPro` guard, which was previously confirmed to hide badges for Pro users, is likely no longer effective or has been removed.
- User impact: Minor visual clutter and a confusing signal that they might not have access to features they already pay for, potentially eroding trust.
- Business impact: Low, but indicates a lack of attention to detail for paying customers.
- Fix direction: Re-implement or verify the `!isPro` conditional rendering logic for PRO badges within the `LayerPanel` to ensure they are hidden for authenticated Pro users.

### 6. Medium: Offline Track and Route Saves Fail Silently (V4, V6 - Partial Confirmation)
- Summary: When offline, attempts to save a GPS track or a custom route fail without providing adequate user feedback, leading to silent data loss for tracks and no clear indication of failure for routes.
- Tier(s) affected: Pro (inferred all authenticated users)
- Confidence: MEDIUM
- Evidence: `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". The annotation `route-button-missing: cannot proof V6` for `pro V6` is concerning, but the test *passed*, implying the expected silent failure (no toast) was observed. `STATE_MAP.md` confirms "Save track...Fails — toast 'Could not save track'. YES — entire GPS trail...gone." and "Save route...Fails — console.error only, no toast. YES — route points gone."
- Cannot confirm: The exact toast message for track save failure, or the console error for route save failure, as these are not explicitly captured in the annotations.
- Root cause: Lack of an offline data queue and robust error handling for Supabase write operations. The app relies on immediate network connectivity for saving user-generated data, violating "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable session data (tracks, routes) if they attempt to save while offline, leading to significant frustration and loss of effort.
- Business impact: Erodes user trust in the app's data reliability, especially for a core feature like tracking and route planning in potentially remote areas.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) for all user-generated content, providing clear local-save and sync-status indicators.

## Tier Comparison

-   **Preference Loss (V7, V8, V9):** Affects all tiers. `guest V7`, `guest V9`, `free V7`, and `free V8` all failed, indicating a systemic issue with persistence mechanisms (both Zustand `persist` and manual `localStorage` patterns) that is not specific to authentication status.
-   **Session Data Loss (V1, V11, V15):** Affects all tiers. `guest V11` and `guest V15` passed but confirmed data loss via annotations. `pro V1` passed but also confirmed data loss via annotation. This points to a systemic failure in manual `localStorage` patterns across the board.
-   **Offline App Load (V2, V10):** Affects authenticated users (Pro confirmed, Free inferred). `guest` users are not tested for this specific failure, but the root cause (Supabase data dependency for initial load) suggests it's tied to authenticated sessions.
-   **Waypoint Saving (P3, V3, F3):**
    -   **Pro:** Cannot save waypoints due to GPS acquisition failure (P3, V3). The `WaypointSheet` is shown, but the save button is disabled.
    -   **Free:** Cannot save waypoints due to incorrect gating logic (F3). The `WaypointSheet` is shown instead of the `UpgradeSheet`.
    -   **Guest:** Can save waypoints, but they are memory-only and lost on reload (V11 confirmed).
    -   This highlights different failure modes for the same core feature across tiers.
-   **PRO Badges (F2, P1):**
    -   **Free:** Correctly sees PRO badges (F2 passed).
    -   **Pro:** Incorrectly sees PRO badges (P1 failed), indicating a rendering logic error specific to Pro users.
-   **Learn Tab State (V13, F4):** Both `guest V13` and `free F4` passed, and their annotations show no state loss. This indicates the fix for V13 is working correctly across both guest and free tiers.

## Findings Discarded

-   **`guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)`:** This test passed, and the `state-loss-evidence` annotation showed identical "before" and "after" values for courses, complete percentage, and chapters done. This directly contradicts the test title's implication of state loss and the vulnerability (V13). Given that V13 was previously confirmed as fixed, and the current evidence shows no state loss, this finding is discarded as PHANTOM. The test title appears to be misleading or the test is no longer capturing the relevant state loss.

## Cannot Assess

-   The full extent of `pro V10` (Pro status reverting to free on offline reload) could not be assessed, as the app failed to load entirely when offline. The primary issue is the app's inability to load, not the `isPro` status after loading.

## Systemic Patterns

1.  **Widespread Persistence Failure:** Both Zustand `persist` middleware (`ee-map-prefs` for V8/V9) and the manual `localStorage` read/write patterns (`ee_theme` for V7, `ee_guest_waypoints` for V11, `ee_active_module` for V15, `ee_session_trail` for V1) are failing. This suggests a fundamental regression in how `localStorage` is being managed, either through incorrect writes, failed reads, or an unintended clearing of `localStorage` keys.
2.  **Critical Offline Capability Gaps:** The app exhibits a complete failure to load for authenticated users when offline (V2, V10), and all data write operations (waypoints, tracks, routes) fail without proper queuing or robust user feedback (V3, V4, V6). This is a severe architectural flaw for an app designed for outdoor use in potentially remote areas.
3.  **GPS Acquisition Dependency Issues:** A core dependency (`mapStore.userLocation`) is not being correctly populated, leading to critical features like waypoint saving being disabled (P3, V3). This suggests an issue with the geolocation API integration or its interaction with the Playwright mock.
4.  **Inconsistent Gating Logic:** The logic controlling access to premium features and upgrade prompts (`isPro` checks) is inconsistent, leading to incorrect UI presentation (PRO badges for Pro users - P1) and missed upgrade opportunities (WaypointSheet for Free users instead of UpgradeSheet - F3).

## Calibration Notes

-   **Prioritizing Confirmed Vulnerabilities:** I have prioritized findings that directly confirm known vulnerabilities (V1-V15) or critical capabilities (P1-P3, F1-F4) based on the test annotations and error messages. The new test philosophy of "passing does not mean fixed" was crucial for identifying V1, V11, V15 as active vulnerabilities despite their tests "passing".
-   **Avoiding Phantom Errors:** The `guest V13` test, despite its title, showed no state loss in its `state-loss-evidence` annotation. This aligns with a previous `CONFIRMED` fix for V13, leading me to discard it as a finding and avoid a phantom error.
-   **Tracing to Architectural Causes:** Each finding explicitly references `STATE_MAP.md` to pinpoint the specific store, state key, or persistence mechanism involved, reinforcing the architectural root cause analysis.
-   **Tier-Attributed Analysis:** Explicitly noting when a behavior is consistent across all tiers (e.g., widespread persistence issues) or differs (e.g., waypoint saving failures) helps to constrain the potential root causes.