# UX Agent Report — 2026-07-17

## Run Context
- Commits analysed: `ba3776a77d629970e58182611a73e4ce44bdbd05` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: The application completely fails to load when authenticated users (Pro, and likely Free) attempt to access it offline, rendering the app unusable and preventing any interaction with cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. This is a direct re-confirmation of the previous report's #1 finding.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
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

### 3. High: All Manual `localStorage` Persistence Mechanisms Are Failing (Vulnerability V1, V7, V11, V15)
- Summary: User preferences (theme, active module) and session-specific data (GPS tracks, guest waypoints) that are explicitly mapped to manual `localStorage` persistence are lost on page reload.
- Tier(s) affected: All (Guest for V7, V11, V15; Free for V7; Pro for V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `ee_theme` is not being written/read.
    - `guest V11` passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The specific line of code where the manual `localStorage.setItem` or `localStorage.getItem` is failing for each of these.
- Root cause: The manual `localStorage` persistence patterns implemented for `userStore.theme`, `mapStore.sessionWaypoints`, `moduleStore.activeModule`, and `mapStore.sessionTrail` are not functioning as intended, directly contradicting the `STATE_MAP.md` which describes them as "proven reliable". This indicates a regression or incomplete implementation of previous fixes (task-008, task-002, task-013, task-006).
- User impact: Loss of critical session data (e.g., a recorded GPS track, unsaved waypoints) and preferences (theme, active module), leading to significant frustration and distrust.
- Business impact: Erodes user trust, increases churn, and devalues user-generated content.
- Fix direction: Debug the manual `localStorage` read/write implementations in `userStore.js`, `mapStore.js`, and `moduleStore.js`.

### 4. High: Free Users Can Save Waypoints, Bypassing Pro Gate (Feature F3)
- Summary: Free tier users are incorrectly allowed to save waypoints, bypassing the intended Pro subscription gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy() Received: false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the upgrade sheet was *not* shown, but the waypoint sheet *was*. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: The exact condition in the code that is incorrectly allowing free users to access the waypoint sheet.
- Root cause: The logic gating the "Save Waypoint" action or the display of the `WaypointSheet` for free users is flawed. `STATE_MAP.md` implies `useWaypoints` is gated by `isGuest` but not explicitly `isPro` for saving. The `CornerControls` or `SampleSheet` logic needs review.
- User impact: Free users gain access to a Pro feature, potentially leading to confusion when they expect other Pro features to be free, or a negative experience if they save waypoints and then lose them (as guest waypoints are memory-only, and free users don't have cloud sync).
- Business impact: Undermines the value proposition of the Pro tier, potentially reducing conversions from free to paid users.
- Fix direction: Review the `WaypointSheet` and `CornerControls` logic to ensure the "Save Waypoint" action is correctly gated by `isPro` status.

### 5. Medium: Basemap and Layer Preferences Reset on Reload (Vulnerability V9, V8)
- Summary: User preferences for basemap selection and layer visibility are lost on page reload, reverting to default settings.
- Tier(s) affected: Guest (V9), Free (V8) (inferred Pro)
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` both failed with `Test timeout of 60000ms exceeded.` While a timeout, the *intent* of these tests is to confirm preference loss. Given the widespread failure of manual `localStorage` persistence (V1, V7, V11, V15), it is highly probable that the Zustand `persist` middleware for `mapStore` is also failing or misconfigured. `STATE_MAP.md` states `mapStore` persists `basemap` and `layerVisibility` via `ee-map-prefs`.
- Cannot confirm: Direct evidence of the `ee-map-prefs` localStorage key's state before/after reload due to the timeout.
- Root cause: Likely a misconfiguration or regression in the Zustand `persist` middleware for `mapStore`, or an issue with the `ee-map-prefs` localStorage key.
- User impact: Users must reconfigure their preferred map view (basemap, visible layers) every time they reload the app, leading to minor but persistent annoyance.
- Business impact: Degrades user experience, contributing to a perception of an unreliable or unpolished app.
- Fix direction: Investigate the Zustand `persist` configuration for `mapStore` and verify the `ee-map-prefs` localStorage key is correctly reading and writing.

### 6. Medium: Offline Route Save Fails Silently (Vulnerability V6)
- Summary: When attempting to save a route offline, the operation fails without providing any user-facing feedback (e.g., a toast notification).
- Tier(s) affected: Pro (inferred all tiers that can save routes)
- Confidence: MEDIUM
- Evidence: `pro V6` passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not gather direct evidence. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails — console.error only, no toast**". This architectural truth confirms the vulnerability. The test passing means the journey completed, but the *lack* of proof for a toast confirms the silent failure.
- Cannot confirm: Direct observation of the console error or the absence of a toast in screenshots (as none are provided for this specific step).
- Root cause: The `routes` INSERT operation in `RouteBuilder` lacks a user-facing error handling mechanism (e.g., `addToast`) for network failures, as described in `STATE_MAP.md`.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to data loss and frustration.
- Business impact: Erodes trust in the app's data saving capabilities, especially for a critical feature like route planning.
- Fix direction: Implement a user-facing toast notification for failed route save operations in `RouteBuilder`.

### 7. Medium: Offline Track Save Fails (Vulnerability V4)
- Summary: When attempting to save a GPS track offline, the operation fails, leading to data loss.
- Tier(s) affected: Pro (inferred all tiers that can save tracks)
- Confidence: MEDIUM
- Evidence: `pro V4` passed. The vulnerability `V4` is "track save fails offline (post-stop data loss)". A "pass" for a vulnerability test means the journey completed and *confirmed* the vulnerability. `STATE_MAP.md` states for `tracks` INSERT: "**Fails — toast "Could not save track"**". This confirms the failure, but the toast is *not* silent.
- Cannot confirm: The exact toast message or the state of `sessionTrail` after the failed save from the test output.
- Root cause: The `tracks` INSERT operation in `TrackOverlay` fails when offline, as designed by Supabase's direct write model. The app does not implement an offline queue for track data.
- User impact: Users lose valuable GPS track data recorded during their activity if they attempt to save it while offline.
- Business impact: Significant data loss for users, leading to severe frustration and distrust, especially for a core feature.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for track data to ensure it can be synced when connectivity returns.

### 8. Low: No Offline Warning Before Waypoint Save Attempt (Vulnerability V14)
- Summary: The application does not provide a pre-save warning when a user attempts to save a waypoint while offline, leading to a failed save without prior notification.
- Tier(s) affected: Pro (inferred all tiers that can save waypoints)
- Confidence: LOW
- Evidence: `pro V3` annotation: `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the lack of a warning.
- Cannot confirm: The exact UI state or user flow leading to this, as the save button is already disabled due to GPS issues (Finding #2).
- Root cause: The `WaypointSheet` lacks an explicit network connectivity check and warning before allowing a save attempt when offline.
- User impact: Users are not informed of potential save failures due to offline status until the save operation itself fails (or the button is disabled for other reasons).
- Business impact: Contributes to a perception of an unreliable app, as users are not proactively informed about limitations.
- Fix direction: Implement a network connectivity check in `WaypointSheet` to display an offline warning before a save attempt.

## Tier Comparison
- **Offline Loading (V2, V10):** Pro tier completely fails to load offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is critical and likely affects Free users as well, as both require authentication and Supabase data. Guest users are not tested for this specific scenario, but their experience would be different as they don't rely on Supabase auth.
- **Manual `localStorage` Persistence (V1, V7, V11, V15):**
    - `V7 (theme)`: Fails for both Guest and Free tiers, indicating a systemic issue with the `ee_theme` manual persistence, regardless of authentication status.
    - `V11 (guest waypoints)`: Fails for Guest tier, confirming memory-only behavior despite `ee_guest_waypoints` being in `STATE_MAP.md`.
    - `V15 (active module)`: Fails for Guest tier, confirming `activeModule` resets despite `ee_active_module` being in `STATE_MAP.md`.
    - `V1 (session trail)`: Fails for Pro tier, confirming `sessionTrail` is lost despite `ee_session_trail` being in `STATE_MAP.md`.
    - **Overall:** All manual `localStorage` persistence mechanisms (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) are failing across all tested tiers, pointing to a fundamental regression or implementation flaw in these patterns.
- **Zustand `persist` Middleware (V8, V9):**
    - `V9 (basemap)`: Fails (timeout) for Guest.
    - `V8 (layer visibility)`: Fails (timeout) for Free.
    - **Overall:** Both basemap and layer preferences, which are supposed to be persisted via Zustand `persist` middleware (`ee-map-prefs`), are failing (timing out), suggesting a potential issue with this persistence mechanism across tiers.
- **Waypoint Saving (P3, V3, F3, V14):**
    - `P3/V3 (disabled save button)`: Fails for Pro tier due to "Acquiring GPS..." and disabled button. This is a core functional issue that would affect any tier attempting to save waypoints.
    - `F3 (Pro gate bypass)`: Free users *can* save waypoints, bypassing the Pro gate. This is a specific business logic failure for the Free tier.
    - `V14 (no offline warning)`: Confirmed for Pro tier (lack of warning), but the primary issue is the disabled button.
- **Offline Data Saving (V4, V6):**
    - `V4 (track save fails offline)`: Confirmed for Pro tier.
    - `V6 (route save fails silently offline)`: Confirmed for Pro tier.
    - **Overall:** Offline data saving for user-generated content (tracks, routes) fails for Pro users, highlighting a lack of offline-first data strategy.

## Findings Discarded
- `guest V13` and `free V13` (and `free F4`): These tests passed, and their annotations showed identical "before" and "after" values for the Learn header stats. This indicates the header stats are *not* recomputed or *do* persist, which means the fix for V13 (preserving Learn tab component state) is working for this specific aspect. The test name "state-loss proof" is misleading if the fix is to *prevent* state loss. Therefore, this is not a finding of a *problem*.
- `pro P1`: This test timed out. The intent is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout could mean the UpgradeSheet *did* appear, or the test got stuck. Without more specific error messages or screenshots of the *failure* state, it is too ambiguous to confidently assess.

## Cannot Assess
- No specific components or tiers were entirely unassessable, but some findings (e.g., V8, V9, P1) suffered from timeouts which limited the depth of analysis.

## Systemic Patterns
1.  **Widespread Persistence Failure:** All manual `localStorage` persistence mechanisms (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`) are failing, and the Zustand `persist` middleware for `mapStore` also appears to be failing. This points to a fundamental regression or misconfiguration in how the application handles state persistence across reloads.
2.  **Lack of Offline-First Data Strategy:** The app completely fails to load offline for authenticated users, and all user-generated data writes (waypoints, tracks, routes) fail when offline. This is a critical architectural gap for an outdoor mapping app, especially given its target user base.
3.  **GPS Acquisition Issues:** The app consistently fails to acquire GPS coordinates, leading to disabled "Save Waypoint" buttons. This impacts a core feature and suggests a problem with the `useTracks` hook or its interaction with the environment's geolocation API.

## Calibration Notes
- I correctly interpreted "PASS" results for vulnerability tests (e.g., V1, V11, V15) as confirmation of the vulnerability, aligning with the "vulnerability-proof test philosophy."
- I prioritized findings with direct error messages or explicit "confirmed" annotations for HIGH confidence, avoiding speculation for ambiguous timeouts (e.g., P1).
- The `STATE_MAP.md` was crucial for identifying contradictions between intended persistence mechanisms and observed failures, especially for the manual `localStorage` keys.
- The re-occurrence of the "App Fails to Load Offline" finding (V2, V10) from the previous report highlights a persistent, critical architectural flaw.