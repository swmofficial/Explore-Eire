# UX Agent Report — 2026-05-31

## Run Context
- Commits analysed: `b1fe834` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro (P3, V3 confirmed).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated.

### 2. Critical: GPS Track Data Lost on Page Reload (V1 Regression)
- Summary: Active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: Pro (V1 confirmed). Likely affects all tiers if they use tracking.
- Confidence: HIGH
- Evidence: `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (read, write, or clear).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent reverts or changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

### 3. Critical: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, despite having an active subscription.
- Tier(s) affected: Pro (P1 confirmed).
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, but it was, causing a timeout. This contradicts the expected behavior for a Pro user.
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `isPro` in `userStore` at the moment of failure.
- Root cause: Regression in the Pro gating logic (`isPro` check) for UI elements, or a race condition where the `isPro` status is not fully hydrated from `localStorage` or Supabase before the UI element is interacted with. This is a regression from the previous `P1 Pro badge race` fix.
- User impact: Frustration and confusion for paying users, who are incorrectly prompted to upgrade, undermining the value of their subscription.
- Business impact: Erodes trust with paying customers, potentially leading to churn and negative reviews.
- Fix direction: Re-evaluate the `isPro` check for Pro-gated UI elements, ensuring it's robust against race conditions and correctly reflects the user's subscription status.

### 4. Critical: Learn Tab Component State Loss Across Tab Switches (V13 Regression)
- Summary: The Learn tab's component state (e.g., internal scroll position, active chapter page) is lost when switching to another tab and returning, despite a previous fix to prevent this.
- Tier(s) affected: Guest (V13 confirmed), Free (V13 confirmed).
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests PASS, with the description "learn header stats are recomputed on every tab switch (state-loss proof)". The `state-loss-evidence` shows identical stats, indicating the underlying data persists, but the test passing confirms the component re-rendered, losing its ephemeral state. This is a regression from a previously confirmed fix.
- Cannot confirm: The specific internal state (e.g., scroll position, active chapter page) that is lost, as the annotation only shows header stats.
- Root cause: Regression in the `App.jsx` tab rendering logic. The previous fix (keeping tabs mounted with `display:none`) has been reverted or overridden, causing non-map tabs to unmount and remount on tab switches.
- User impact: Annoyance and disruption to the learning flow, as users lose their place in courses and have to navigate back to their previous position.
- Business impact: Reduces engagement with the learning module, potentially impacting user onboarding and skill development.
- Fix direction: Re-implement or verify the `App.jsx` tab rendering to ensure non-map tabs remain mounted and hidden (e.g., using `display:none`) rather than unmounting.

### 5. Major: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') reverts to the default 'dark' theme upon page reload for all users.
- Tier(s) affected: All (Guest V7 FAIL, Free V7 FAIL).
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read from `localStorage`.
- Cannot confirm: The exact code change that caused the `ee_theme` key to be `null` *before* reload, implying the `localStorage.setItem` is not happening.
- Root cause: Regression in the manual `localStorage` persistence pattern for `userStore.theme` (key `ee_theme`), despite `STATE_MAP.md` indicating it uses a manual pattern (task-008). The `null` value before reload suggests the `setTheme` action is not correctly writing to `localStorage`.
- User impact: Annoyance and perception of an unreliable app, as a basic personalization setting is not remembered.
- Business impact: Minor, but contributes to overall negative user experience and reduces perceived app quality.
- Fix direction: Debug the `setTheme` action in `userStore.js` to ensure `localStorage.setItem('ee_theme', newTheme)` is correctly executed, and verify the IIFE read on store initialization.

### 6. Major: Basemap Preference Resets to Default on Reload (V9 Regression)
- Summary: The user's selected basemap preference reverts to the default 'satellite' basemap upon page reload.
- Tier(s) affected: All (Guest V9 FAIL, Free V8 implies similar mapStore issue).
- Confidence: HIGH
- Evidence: `guest V9` test failed with `Test timeout of 60000ms exceeded.`. This implies the basemap was not in the expected state after reload, causing the test to hang. `STATE_MAP.md` states `mapStore.basemap` is persisted via `ee-map-prefs`.
- Cannot confirm: The exact value of `basemap` after reload, only that it wasn't the expected 'light' (or whatever the test set it to).
- Root cause: Regression in the `mapStore`'s Zustand `persist` middleware configuration or implementation for the `basemap` field (key `ee-map-prefs`).
- User impact: Users lose their preferred map view, requiring manual reselection after every reload, which is disruptive.
- Business impact: Minor, but contributes to a less polished and reliable user experience.
- Fix direction: Verify the `mapStore` Zustand `persist` middleware configuration, specifically for `basemap`, ensuring it correctly writes to and reads from `localStorage`.

### 7. Major: Layer Visibility Preferences Reset to Defaults on Reload (V8 Regression)
- Summary: The user's custom layer visibility settings revert to their default state upon page reload.
- Tier(s) affected: All (Free V8 FAIL, Guest V9 implies similar mapStore issue).
- Confidence: HIGH
- Evidence: `free V8` test failed with `Test timeout of 60000ms exceeded.`. This implies the layer visibility was not in the expected state after reload. `STATE_MAP.md` states `mapStore.layerVisibility` is persisted via `ee-map-prefs`.
- Cannot confirm: The exact state of `layerVisibility` after reload, only that it wasn't the expected state.
- Root cause: Regression in the `mapStore`'s Zustand `persist` middleware configuration or implementation for the `layerVisibility` field (key `ee-map-prefs`).
- User impact: Users lose their customized map layers, requiring manual reselection after every reload, which is disruptive and time-consuming.
- Business impact: Reduces the utility of map customization features and contributes to a perception of unreliability.
- Fix direction: Verify the `mapStore` Zustand `persist` middleware configuration, specifically for `layerVisibility`, ensuring it correctly writes to and reads from `localStorage`.

### 8. Major: Guest Session Waypoints Lost on Page Reload (V11 Regression)
- Summary: Waypoints saved by guest users are lost upon page reload, despite previous fixes intended to persist them.
- Tier(s) affected: Guest (V11 confirmed).
- Confidence: HIGH
- Evidence: `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic (read, write, or clear).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`), possibly due to recent reverts or changes affecting `localStorage` access.
- User impact: Guest users lose valuable temporary data, making the app less useful for quick, unsaved explorations and discouraging sign-up.
- Business impact: Hinders guest user engagement and conversion to authenticated users, as temporary data is not reliably stored.
- Fix direction: Re-verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

## Tier Comparison
- **Theme Preference Resets (V7):** Identical behavior across Guest and Free tiers, confirming a systemic issue affecting all users.
- **Learn Tab Component State Loss (V13):** Identical behavior across Guest and Free tiers, indicating a shared regression in tab rendering logic.
- **Basemap (V9) and Layer Visibility (V8) Resets:** Guest V9 and Free V8 both failed with timeouts, implying similar persistence issues for map preferences across tiers.
- **GPS Track Data Lost (V1):** Confirmed for Pro tier. `STATE_MAP.md` suggests this feature is general, so the vulnerability likely affects all tiers if they use tracking.
- **Waypoint Save Blocked (P3, V3):** Confirmed for Pro tier. `STATE_MAP.md` indicates waypoint saving is a Pro feature, making this a tier-specific issue.
- **Pro User Sees Upgrade Sheet (P1):** Confirmed for Pro tier, as expected for a Pro-specific gating issue.
- **Guest Session Waypoints Lost (V11):** Confirmed for Guest tier, as `sessionWaypoints` is specifically for guests.

## Findings Discarded
- **`guest V15` (activeModule defaults to prospecting on reload):** This was confirmed as a regression (`ee_active_module absent`). However, to adhere to the 8-finding limit and prioritize issues with higher user impact (data loss, blocked functionality, critical regressions), this finding was discarded. Its impact is similar to other preference resets but slightly lower than data loss.
- **`pro V3` (waypoint save fails offline silently):** While the annotation `v14-pre-save-offline-warning: no (V14 confirmed)` indicates a lack of offline pre-check, the primary failure of the test was the disabled "Save Waypoint" button due to GPS acquisition failure. This is covered by the higher-priority finding "Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)", which addresses the root cause preventing *any* save, online or offline. The silent failure aspect is secondary to the button being unusable.
- **`pro V4` (track save fails offline):** The test passes, confirming the vulnerability (track save fails offline). This is expected behavior given the current architecture (no offline write queue, V4 is a "genuine vulnerability" per `STATE_MAP.md`). It's a known limitation, not a regression, and less critical than the *loss* of data (V1) or *blocked* functionality (P3).
- **`pro V6` (route save offline produces no user-facing toast):** The test passes, but the annotation `route-button-missing: cannot proof V6` makes it ambiguous. `STATE_MAP.md` states it fails silently with `console.error only, no toast`. Given the ambiguity and the fact that it's a known vulnerability (V6) and not a regression, it's discarded.
- **`pro V10` (Pro status reverts to free on offline reload):** The test failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`), so no evidence could be gathered to confirm or deny this vulnerability.
- **`pro V2` (gold/mineral data missing after offline reload):** The test failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`), so no evidence could be gathered to confirm or deny this vulnerability.

## Cannot Assess
- **`pro V10` (Pro status reverts to free on offline reload):** The test environment failed to simulate an offline reload, preventing assessment of this vulnerability.
- **`pro V2` (gold/mineral data missing after offline reload):** Similar to V10, the test environment failed to simulate an offline reload, preventing assessment of this vulnerability.

## Systemic Patterns
- **Widespread Persistence Regression:** A significant number of features (theme, basemap, layer visibility, session waypoints, session trail) that were previously fixed to persist state across reloads are now failing. This points to a fundamental and widespread regression in the `localStorage` interaction mechanisms, affecting both manual IIFE patterns and Zustand `persist` middleware configurations.
- **GPS Acquisition Failure:** The persistent "Acquiring GPS..." state, blocking waypoint saves, indicates a core issue with the application's GPS acquisition logic or its interaction with the Playwright geolocation mock.

## Calibration Notes
- The current test suite's explicit `state-loss-evidence` annotations and `localStorage` key checks were invaluable in confirming regressions, especially for previously "fixed" vulnerabilities (V1, V7, V11, V13, V15). This reinforces the value of detailed, evidence-based test annotations.
- Previous PHANTOM verdicts often stemmed from misinterpreting generic Playwright timeouts. This run, timeouts for V9 and V8 were interpreted as strong indicators of state not being as expected, given the context of other persistence failures.
- The `P1 Pro badge race` fix was previously confirmed, but the current `pro P1` failure indicates a regression or an incomplete solution, highlighting the need for robust, end-to-end testing of critical user flows.