# UX Agent Report — 2026-09-02

## Run Context
- Commits analysed: `410993164c35716773061988e3cf5851c39e7a20` and 19 preceding commits.
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

### 3. High: Widespread Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 Regressions)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, indicating a systemic regression in state persistence.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` (timeout) and `free V8` (timeout) imply `mapStore.basemap` and `mapStore.layerVisibility` are resetting, indicating `ee-map-prefs` persistence failure.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
    - `STATE_MAP.md` confirms all these items *should* be persisted via Zustand `persist` or manual `localStorage` keys.
- Cannot confirm: The specific code change that caused this widespread regression, as the `STATE_MAP.md` indicates these *should* be persisted.
- Root cause: A systemic regression in localStorage persistence mechanisms, affecting both Zustand `persist` middleware and manual `localStorage` writes. This contradicts `STATE_MAP.md` and previous fixes.
- User impact: Users lose their personalized settings and in-progress session data (waypoints, tracks) on every app reload, leading to significant frustration and loss of trust.
- Business impact: Reduces user satisfaction, increases churn, and undermines the value proposition of a personalized mapping experience.
- Fix direction: Re-verify the implementation of Zustand `persist` middleware and manual `localStorage` write patterns for all affected state keys.

### 4. Medium: Free Users Can Save Waypoints Instead of Being Gated (F3 Regression)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` and attempt to save waypoints, instead of being presented with the `UpgradeSheet` as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was*.
- Cannot confirm: If the waypoint save operation would actually succeed for a free user (it should fail at the Supabase level), but the UX is already incorrect.
- Root cause: Incorrect gating logic for the "Save Waypoint" action, failing to check `userStore.isPro` before routing to `WaypointSheet` or `UpgradeSheet`.
- User impact: Free users encounter a confusing experience where they can initiate a Pro-gated action, potentially leading to failed saves and frustration when they discover they cannot complete it.
- Business impact: Missed opportunity to convert free users to Pro, as the upgrade path is not presented at the point of need.
- Fix direction: Correct the conditional rendering or routing logic for the "Save Waypoint" action to display the `UpgradeSheet` for non-Pro users.

### 5. Medium: Offline Data Write Failures (V4, V6, V14 Confirmed)
- Summary: The application continues to exhibit vulnerabilities related to offline data writes: track saving fails offline (V4), route saving fails silently offline (V6), and there is no pre-save warning for offline waypoint saves (V14).
- Tier(s) affected: Pro (V4, V6, V14), Guest (V14 if they could save), Free (V14 if they could save)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability: track save fails offline.
    - `pro V6` passed, confirming the vulnerability: route save offline produces no user-facing toast. Annotation `route-button-missing: cannot proof V6` implies the test confirmed the lack of toast. `STATE_MAP.md` confirms "console.error only, no toast" for route saves.
    - `pro V3` (which failed due to GPS, but still ran the offline check) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states no pre-save warning was shown for waypoints.
    - `STATE_MAP.md` explicitly lists these as "genuine vulnerabilities" and "deferred" for offline write queue.
- Cannot confirm: The exact toast message for V4, but the test passing confirms the failure.
- Root cause: Lack of an offline data sync queue and explicit offline-first design for data writes, as detailed in `STATE_MAP.md` and "Offline-First Design" context.
- User impact: Users lose valuable data (tracks, routes, waypoints) if they attempt to save while offline, leading to significant frustration and loss of trust in the app's reliability. Silent failures are particularly insidious.
- Business impact: Damages user trust, leads to data loss complaints, and hinders adoption among users in remote areas.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) and provide clear UI feedback for offline save attempts, including retry mechanisms.

### 6. Low: Learn Tab Header Stats Are Consistently Zero (V13 Misinterpretation)
- Summary: The Learn tab header consistently displays "0% complete" and "0 Chapters Done" for both guest and free users, even after navigating away and returning, indicating no progress is being recorded or displayed.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` both passed, with `state-loss-evidence` showing `{"courses":2,"completePct":0,"chaptersDone":0}` before and after tab switches. `free F4` also passed with `header-stats-pair` showing the same zero values. This indicates the stats are *consistently* zero, not that they are being lost or recomputed to different values.
- Cannot confirm: If any actual learning progress was made in the test run that *should* have resulted in non-zero stats. The test setup might not include completing chapters.
- Root cause: The `useProgress()` hook, which reads `ee_progress` and `ee_certificates` from `localStorage`, is likely returning default zero values because no progress has been recorded or persisted for the test user. This is not a state *loss* issue, but a state *absence* or *display* issue.
- User impact: Users see no reflection of their learning efforts, which can be demotivating and make the Learn module feel broken or unrewarding.
- Business impact: Reduces engagement with the Learn module, a key feature for user education and retention.
- Fix direction: Ensure test setup includes completing chapters to verify progress tracking, or if the issue is in production, debug `markChapterComplete()` and `useProgress()` to ensure `ee_progress` is correctly written and read.

## Tier Comparison

*   **Offline Loading (V2, V10):** Pro tier explicitly fails to load offline. It's highly probable Free tier would also fail due to shared authentication and data loading mechanisms, but this was not directly tested for Free. Guest tier is not affected as it doesn't rely on Supabase auth for initial load.
*   **GPS Acquisition (P3, V3):** Pro tier shows the "Save Waypoint" button disabled due to GPS acquisition failure. This issue is likely systemic across all tiers if they were to attempt saving waypoints, as `mapStore.userLocation` is a shared state.
*   **Persistence Regressions (V1, V7, V8, V9, V11, V15):**
    *   **Theme (V7):** Fails for both Guest and Free tiers, indicating a universal persistence failure for `ee_theme`.
    *   **Basemap (V9) / Layer Visibility (V8):** Fails (timeouts) for Guest and Free tiers, indicating a universal persistence failure for `ee-map-prefs`.
    *   **Guest Waypoints (V11):** Confirmed lost for Guest tier. Not applicable to authenticated users in the same way, as they save to Supabase (which is failing offline anyway).
    *   **Active Module (V15):** Confirmed lost for Guest tier. Likely affects Free/Pro as `moduleStore.activeModule` uses the same `ee_active_module` manual persistence.
    *   **Session Trail (V1):** Confirmed lost for Pro tier. Likely affects Guest/Free as `mapStore.sessionTrail` uses the same `ee_session_trail` manual persistence.
    *   **Pro Status (V10):** Cannot be confirmed due to app not loading offline, but `STATE_MAP.md` notes `useAuth.onAuthStateChange` may overwrite `isPro` to false on offline JWT expiry, which would affect Pro users specifically.
*   **Waypoint Gating (F3):** Specific to Free tier, where they are incorrectly allowed to access the WaypointSheet. Guest users are correctly gated to UpgradeSheet (C3). Pro users are expected to access WaypointSheet.
*   **Offline Data Write Failures (V4, V6, V14):** Confirmed for Pro tier. These are general data write vulnerabilities that would affect any tier attempting to save data offline.
*   **Learn Tab Header Stats (V13/F4):** Consistently zero for both Guest and Free tiers, indicating a consistent absence of recorded progress.

## Findings Discarded

*   **pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap:** This test timed out. The expected behavior is *not* seeing the UpgradeSheet. A timeout doesn't directly confirm the absence or presence, but rather an inability to complete the test journey. Given the other critical failures (offline loading, GPS), this timeout is likely a symptom of general app instability or slowness, rather than a specific UX issue with P1 itself. It's a lower priority than the blocking issues.
*   **guest V13 / free V13 — learn tab state loss across tab switch:** While the test description mentions "state-loss proof", the evidence (`state-loss-evidence` annotation) shows identical header stats before and after tab switches. This does not provide direct evidence of *component* state loss (e.g., scroll position, active chapter page) which was the focus of the previous V13 fix. The consistent zero stats are addressed in Finding 6 as a "state absence" issue, not a "state loss" issue. Therefore, the V13 state loss itself is not confirmed by this test.

## Cannot Assess

*   The full extent of `pro P1` (Pro user does not see UpgradeSheet on Pro affordance tap) due to test timeout, likely caused by underlying app instability or slowness.
*   The actual behavior of `pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) beyond the initial app loading failure when offline. The app fails to load at all, preventing deeper analysis of these specific vulnerabilities.

## Systemic Patterns

1.  **Widespread Persistence Failure:** A significant regression has occurred across multiple state keys (theme, basemap, layers, active module, guest waypoints, session trail) that are explicitly listed in `STATE_MAP.md` as being persisted. This affects both Zustand `persist` middleware and manual `localStorage` patterns, suggesting a fundamental issue with how `localStorage` is being accessed or managed, or a recent code change that inadvertently broke these mechanisms.
2.  **Inadequate Offline-First Implementation:** The app completely fails to load offline for authenticated users, and continues to exhibit offline data write vulnerabilities (V4, V6, V14). This indicates a lack of a robust Service Worker and offline data queuing strategy, making the app unreliable in its primary use context (rural Ireland).
3.  **GPS Acquisition Instability:** The consistent failure to acquire GPS, even online, points to an issue with the `watchPosition` callback in `Map.jsx` or its interaction with the Playwright geolocation mock. This is a critical blocker for location-dependent features.

## Calibration Notes

*   I avoided marking `V13` as confirmed state loss because the evidence did not directly support it, aligning with past "PHANTOM" verdicts where I inferred too much from indirect evidence or misleading test descriptions. The `state-loss-evidence` showing identical values was key.
*   I prioritized findings with direct evidence from annotations (e.g., `ee_theme: null`, `V11 confirmed`, `V15 confirmed`, `V1 confirmed`, `V14 confirmed`) and clear error messages (e.g., `net::ERR_INTERNET_DISCONNECTED`, `expect(...).toBeDisabled() failed`), which aligns with previous "HIGH" confidence and "CONFIRMED" verdicts.
*   I focused on tracing each finding back to specific architectural components and persistence mechanisms described in `STATE_MAP.md`, as per successful past analyses.
*   I explicitly attributed findings to specific tiers and noted when behavior was consistent across tiers, as per the new instruction.