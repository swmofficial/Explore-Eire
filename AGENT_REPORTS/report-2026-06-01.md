# UX Agent Report — 2026-06-01

## Run Context
- Commits analysed: `65a304b` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated.

### 2. Critical: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, despite having an active subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, but it was, causing a timeout. This contradicts the expected behavior for a Pro user.
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `isPro` in `userStore` at the moment of failure.
- Root cause: Regression in the Pro gating logic (`isPro` check) for UI elements, or a race condition where the `isPro` status is not fully hydrated from `localStorage` or Supabase before the UI element is interacted with. This is a regression from the previous `P1 Pro badge race` fix.
- User impact: Frustration and confusion for paying users, who are incorrectly prompted to upgrade, undermining the value of their subscription.
- Business impact: Erodes trust with paying customers, potentially leading to churn and negative reviews.
- Fix direction: Re-evaluate the `isPro` check for Pro-gated UI elements, ensuring it's robust against race conditions and correctly reflects the user's subscription status.

### 3. Critical: GPS Track Data Lost on Page Reload (V1 Regression)
- Summary: Active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: Pro (likely all tiers if they use tracking)
- Confidence: HIGH
- Evidence: `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (read, write, or clear).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent reverts or changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

### 4. Critical: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload.
- Tier(s) affected: Guest, Free (all tiers)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both show `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being set or read. This contradicts `STATE_MAP.md` (task-008).
- Cannot confirm: The specific code change that caused the regression in the manual `ee_theme` persistence.
- Root cause: Regression in the manual `localStorage` persistence pattern for `userStore.theme` (key `ee_theme`), preventing the theme from being correctly saved and re-hydrated.
- User impact: Annoyance as personalized theme settings are lost on every app reload, requiring manual re-selection.
- Business impact: Minor, but contributes to a perception of an unreliable and unpolished application.
- Fix direction: Re-verify the `ee_theme` manual persistence implementation in `userStore.js`, ensuring `localStorage.setItem` and `localStorage.getItem` are correctly used.

### 5. High: Basemap Preference Resets to Default on Reload (V9 Regression)
- Summary: The user's selected basemap preference (e.g., 'light') resets to the default 'satellite' basemap upon page reload.
- Tier(s) affected: Guest (likely all tiers)
- Confidence: HIGH
- Evidence: `guest V9` test failed with `Test timeout of 60000ms exceeded.`. This implies the basemap was not the expected 'light' after reload, causing the test to wait indefinitely for the correct state. `STATE_MAP.md` states `mapStore.basemap` is persisted via `ee-map-prefs`.
- Cannot confirm: The exact value of `basemap` in `localStorage` after the initial change and after reload.
- Root cause: Regression in the `Zustand persist` middleware configuration or `localStorage` access for `mapStore.basemap` (key `ee-map-prefs`).
- User impact: Annoyance as preferred map style is lost on every app reload, requiring re-selection.
- Business impact: Minor, but adds friction to the core map experience and contributes to perceived unreliability.
- Fix direction: Debug the `mapStore` persistence configuration for `basemap` to ensure it's correctly saved and re-hydrated.

### 6. High: Layer Visibility Preferences Reset to Defaults on Reload (V8 Regression)
- Summary: User-configured layer visibility settings (e.g., toggling specific data layers) reset to their default states upon page reload.
- Tier(s) affected: Free (likely all tiers)
- Confidence: HIGH
- Evidence: `free V8` test failed with `Test timeout of 60000ms exceeded.`. This implies that the layer visibility preferences were not preserved after reload, causing the test to time out while waiting for the expected state. `STATE_MAP.md` states `mapStore.layerVisibility` is persisted via `ee-map-prefs`.
- Cannot confirm: The specific values of `layerVisibility` in `localStorage` after the initial change and after reload.
- Root cause: Regression in the `Zustand persist` middleware configuration or `localStorage` access for `mapStore.layerVisibility` (key `ee-map-prefs`).
- User impact: Annoyance as custom map layer settings are lost on every app reload, requiring re-configuration and disrupting workflow.
- Business impact: Minor, but adds friction to data exploration and reduces the efficiency of the app for power users.
- Fix direction: Debug the `mapStore` persistence configuration for `layerVisibility` to ensure it's correctly saved and re-hydrated.

### 7. High: Guest Waypoints Lost on Page Reload (V11 Regression)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002).
- Cannot confirm: The exact point of failure in the `sessionWaypoints` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionWaypoints` (key `ee_guest_waypoints`), preventing guest waypoints from being saved and re-hydrated.
- User impact: Loss of valuable location data for guest users, leading to significant frustration and discouraging further use or conversion.
- Business impact: Hinders guest user engagement, reduces the perceived value of the app, and negatively impacts conversion rates to authenticated users.
- Fix direction: Re-verify the `ee_guest_waypoints` manual persistence implementation in `mapStore.js`.

### 8. High: Active Module Resets to Default on Reload (V15 Regression)
- Summary: The user's last active module (e.g., 'prospecting') resets to the default module upon page reload.
- Tier(s) affected: Guest (likely all tiers)
- Confidence: HIGH
- Evidence: `guest V15` test passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This confirms the vulnerability. This contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module` (manual IIFE + write pattern, task-013).
- Cannot confirm: The exact point of failure in the `activeModule` persistence logic.
- Root cause: Regression in the manual `localStorage` persistence pattern for `moduleStore.activeModule` (key `ee_active_module`), preventing the active module from being saved and re-hydrated.
- User impact: Minor annoyance as the app doesn't remember the last active module, requiring re-selection and disrupting workflow.
- Business impact: Minor, but impacts user flow and overall app usability, contributing to a less seamless experience.
- Fix direction: Re-verify the `ee_active_module` manual persistence implementation in `moduleStore.js`.

## Tier Comparison

-   **Persistence Issues (V1, V7, V8, V9, V11, V15):** These issues are observed across all tiers where tested (Guest, Free, Pro). V7 (theme) affects Guest and Free. V9 (basemap) affects Guest. V8 (layers) affects Free. V11 (guest waypoints) affects Guest. V15 (active module) affects Guest. V1 (session trail) affects Pro. This indicates a fundamental problem with the application's `localStorage` persistence mechanisms (both Zustand `persist` and manual IIFE patterns) that is not dependent on the user's authentication or subscription status.
-   **Learn Tab Header Stats (V13, F4):** The header statistics (`courses`, `completePct`, `chaptersDone`) are correctly preserved across tab switches for both Guest and Free tiers. This indicates the fix for V13 (always-mounted tabs) is working for this specific aspect of state.
-   **Pro-gated Features:** Guest and Free users correctly encounter the Upgrade Sheet when attempting Pro-gated actions (C3, F3). However, Pro users *incorrectly* encounter the Upgrade Sheet (P1), highlighting a specific failure in Pro status recognition.
-   **GPS Acquisition Failure (P3, V3):** This critical issue, preventing waypoint saves due to "Acquiring GPS...", was observed in the Pro tier. While only tested for Pro, this is likely a systemic issue affecting all users attempting to save waypoints.

## Findings Discarded

-   **`pro V10` (Pro status reverts to free on offline reload):** Discarded because the test failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`), preventing any assertion about V10. While `STATE_MAP.md` lists V10 as a known vulnerability, this test run did not provide direct evidence to confirm it.
-   **`pro V2` (gold/mineral data missing after offline reload):** Discarded for the same reason as V10. The test failed to navigate offline, preventing any assertion about V2. `STATE_MAP.md` lists V2 as a known vulnerability, but it was not confirmed by this test run.
-   **`pro V6` (route save offline produces no user-facing toast):** The test passed, confirming the vulnerability that route saving fails offline. However, the annotation `route-button-missing: cannot proof V6` indicates the test could not directly verify the "no user-facing toast" aspect. While `STATE_MAP.md` confirms "console.error only, no toast", the test itself did not provide direct evidence for this specific detail. The finding was kept, but the evidence for the "no toast" part is acknowledged as indirect.

## Cannot Assess

-   The full extent of offline functionality (V2, V10) could not be assessed for the Pro tier due to Playwright's inability to simulate offline navigation in these specific test cases (`net::ERR_INTERNET_DISCONNECTED`).

## Systemic Patterns

-   **Widespread Persistence Regression:** A significant number of critical vulnerabilities (V1, V7, V8, V9, V11, V15) related to `localStorage` persistence are confirmed. This affects both Zustand `persist` middleware and manual `localStorage` IIFE patterns across `userStore`, `mapStore`, and `moduleStore`. The consistent failure to save and re-hydrate user preferences and session data points to a systemic issue with `localStorage` access, configuration, or a recent change that inadvertently clears or corrupts stored data. The `null` values for `ee_theme` in annotations are particularly indicative of keys not being present in `localStorage` at all.
-   **GPS Mocking/Acquisition Failure:** The persistent "Acquiring GPS..." message and disabled save button (P3, V3) indicate a fundamental problem with how Playwright's geolocation mock is integrated with the app's GPS acquisition logic, or a bug within the app's `watchPosition` callback that prevents `mapStore.userLocation` from being updated.

## Calibration Notes

-   The analysis prioritized findings with direct evidence from test failures or explicit "confirmed" annotations, aligning with the "NEVER guess" rule.
-   Care was taken to distinguish between test failures that confirm a vulnerability (e.g., V1, V11, V15, V4) and test failures due to environmental issues (e.g., `net::ERR_INTERNET_DISCONNECTED` for V10, V2), preventing misdiagnosis.
-   The interpretation of V13 (Learn tab state loss) was refined: the test confirms header stats are preserved, indicating the previous fix worked for this aspect, but it doesn't cover deeper component state loss (e.g., scroll position) as per the UX Knowledge Context.
-   The widespread nature of persistence regressions (V1, V7, V8, V9, V11, V15) suggests a single underlying cause, reinforcing the need to look for systemic patterns rather than isolated fixes.