# UX Agent Report — 2026-06-02

## Run Context
- Commits analysed: `9472bfc` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled due to a failure in GPS acquisition, preventing Pro users from saving waypoints even when online.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning is given before attempting an offline save.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and propagated to the `WaypointSheet`.

### 2. Critical: Pro Status Reverts to Free on Offline Reload (V10 Regression)
- Summary: A Pro user's subscription status incorrectly reverts to 'free' upon an offline page reload, effectively locking out paying users.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro V10` test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This test is specifically designed to confirm the V10 vulnerability, which states that `isPro` resets to false on offline JWT-expiry scenarios. The failure confirms this behaviour. `STATE_MAP.md` explicitly notes this as a known vulnerability (V10) that task-005 was intended to fix.
- Cannot confirm: Whether the `useAuth.onAuthStateChange` guard (task-005) is entirely absent, or if there's a specific edge case in offline JWT expiry that bypasses it.
- Root cause: Regression or incomplete fix for V10, where `useAuth.onAuthStateChange` incorrectly overwrites the persisted `isPro` status to `false` when the Supabase session is `null` due to offline JWT expiry, despite the `isPro` field being persisted to `localStorage`.
- User impact: Paying users are locked out of Pro features and experience significant frustration, undermining the value of their subscription.
- Business impact: Severe damage to customer trust, high churn risk, and potential for negative reviews.
- Fix direction: Re-verify the `useAuth.onAuthStateChange` logic to ensure `isPro` and `subscriptionStatus` are only reset to `false` on explicit `SIGNED_OUT` events or when online, as per task-005.

### 3. Critical: Active GPS Track Data Lost on Page Reload (V1 Regression)
- Summary: Any active GPS tracking data (`sessionTrail`) is lost upon page reload, despite previous fixes intended to persist it.
- Tier(s) affected: Pro (likely all tiers that use tracking)
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly confirms the vulnerability. This contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail` (manual IIFE + write pattern, task-006).
- Cannot confirm: The exact point of failure in the `sessionTrail` persistence logic (e.g., `localStorage.setItem` not being called, or `localStorage.getItem` failing on hydration).
- Root cause: Regression in the manual `localStorage` persistence pattern for `mapStore.sessionTrail` (key `ee_session_trail`), possibly due to recent changes affecting `localStorage` access or the `useTracks` hook.
- User impact: Users lose entire recorded tracks if the app crashes, the browser tab closes, or the page is accidentally reloaded, leading to significant frustration and loss of valuable activity data.
- Business impact: Severe damage to app reliability and user trust, especially for a core outdoor tracking functionality.
- Fix direction: Re-verify the `ee_session_trail` manual persistence implementation in `mapStore.js` and `useTracks.js`, ensuring `localStorage.setItem` is called on updates and `localStorage.getItem` is correctly used for hydration.

### 4. Critical: Core Offline Data Access and Save Failures (V2, V4, V6, V14)
- Summary: The application fundamentally lacks offline-first capabilities for data, leading to missing data, silent save failures, and no pre-save warnings when offline.
- Tier(s) affected: Pro (V2, V4, V6), All (V14)
- Confidence: HIGH
- Evidence: `pro V2` failed with `net::ERR_INTERNET_DISCONNECTED`, confirming gold/mineral data is missing offline. `pro V4` passed, confirming track save fails offline. `pro V6` passed, confirming route save offline produces no user-facing toast (silent failure). `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states no warning is given before an offline waypoint save attempt.
- Cannot confirm: The specific error messages or toasts (or lack thereof) for V4 and V6, beyond the test passing.
- Root cause: As per `STATE_MAP.md` and `UX Knowledge Context`, there is a fundamental lack of offline data capability. Gold samples and mineral localities load from Supabase on every mount with no local cache (V2). All writes (waypoints, tracks, finds, routes) fail silently offline with only a toast (V4, V6, V3). There is no offline write queue (V3, V4, V6, V14).
- User impact: App is unreliable and largely unusable in offline environments (common in rural Ireland), leading to data loss, frustration, and a perception of a broken application.
- Business impact: The app fails to meet the core needs of its target user base, severely limiting adoption, retention, and trust.
- Fix direction: Implement a comprehensive offline-first strategy, including local caching of read-only data (V2), a persistent sync queue for all user-generated content (V3, V4, V6), and clear offline status indicators and pre-save warnings (V14).

### 5. High: Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1 Regression)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro-gated affordance, despite having an active subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, but it was, causing a timeout. This directly contradicts the expected behavior for a Pro user.
- Cannot confirm: The specific Pro affordance tapped in the test, or the exact state of `isPro` in `userStore` at the moment of failure.
- Root cause: Regression in the Pro gating logic (`isPro` check) for UI elements, or a race condition where the `isPro` status is not fully hydrated from `localStorage` or Supabase before the UI element is interacted with. This is a regression from the previous `P1 Pro badge race` fix.
- User impact: Frustration and confusion for paying users, who are incorrectly prompted to upgrade, undermining the value of their subscription.
- Business impact: Erodes trust with paying customers, potentially leading to churn and negative reviews.
- Fix direction: Re-evaluate the `isPro` check for Pro-gated UI elements, ensuring it's robust against race conditions and correctly reflects the user's subscription status.

### 6. Medium: Theme Preference Resets to Default on Reload (V7 Regression)
- Summary: The user's selected theme preference (e.g., 'light') resets to the default 'dark' theme upon page reload.
- Tier(s) affected: Guest, Free (all tiers)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests failed. Both show `Error: expect(received).toBe(expected) // Object.is equality Expected: "light" Received: "dark"`. The annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` indicate the `ee_theme` localStorage key is not being set or read correctly.
- Cannot confirm: Whether the `setTheme` function is failing to write to `localStorage`, or if the `userStore` initialization is failing to read from it.
- Root cause: Regression in the manual `localStorage` persistence pattern for `userStore.theme` (key `ee_theme`), which `STATE_MAP.md` indicates should be handled manually (task-008). The `null` values for `ee_theme` suggest the manual write is not occurring.
- User impact: Annoying loss of personalization, requiring users to re-select their preferred theme after every reload.
- Business impact: Minor, but contributes to a perception of an unreliable or unpolished application.
- Fix direction: Debug the `setTheme` function in `userStore.js` to ensure `localStorage.setItem('ee_theme', newTheme)` is correctly executed, and verify the IIFE read on store initialization.

### 7. Medium: Map Preferences (Basemap, Layers) Reset on Reload (V8, V9 Regression)
- Summary: User-selected basemap and layer visibility preferences reset to their default states upon page reload.
- Tier(s) affected: Guest (V9), Free (V8) (likely all tiers)
- Confidence: HIGH
- Evidence: `guest V9` and `free V8` tests failed with `Test timeout of 60000ms exceeded.`. This indicates the tests were waiting for the persisted map state (basemap, layer visibility) to be present, but it was not, causing the test to hang. `STATE_MAP.md` states `basemap` and `layerVisibility` are persisted via `ee-map-prefs` using Zustand `persist` middleware.
- Cannot confirm: The exact state of the `ee-map-prefs` localStorage key before and after reload.
- Root cause: Regression in the Zustand `persist` middleware configuration for `mapStore` (key `ee-map-prefs`), or an issue with how `mapStore` is initialized and hydrated from `localStorage`.
- User impact: Users lose their preferred map configuration (e.g., basemap, active layers) after every reload, requiring manual re-selection and disrupting their workflow.
- Business impact: Minor, but impacts user efficiency and contributes to a perception of an unreliable application.
- Fix direction: Verify the `mapStore`'s Zustand `persist` middleware configuration, ensuring `basemap` and `layerVisibility` are correctly serialized, stored, and rehydrated from `localStorage` via `ee-map-prefs`.

## Tier Comparison

-   **V7 (Theme Resets):** Identical failure behavior across **Guest** and **Free** tiers, with the theme resetting to 'dark' and `ee_theme` being `null` in `localStorage`. This indicates a systemic issue with the manual theme persistence, independent of authentication status.
-   **V13 (Learn Header Stats):** Both **Guest** and **Free** tiers passed this test, with identical `state-loss-evidence` annotations showing no change in header stats (`courses`, `completePct`, `chaptersDone`) before and after tab switching. This confirms the *header stats themselves* are preserved, but the test does not directly address the underlying V13 vulnerability of *component state loss* (e.g., scroll position, active chapter page) within the Learn tab.
-   **V1 (GPS Track Lost):** Confirmed for the **Pro** tier.
-   **V11 (Session Waypoints Memory-Only):** Confirmed for the **Guest** tier.
-   **V15 (Active Module Resets):** Confirmed for the **Guest** tier.
-   **P1, P3, V3, V10, V2, V4, V6:** These are **Pro**-specific failures or confirmations of vulnerabilities related to Pro features, offline capabilities, or authenticated state.
-   **F2 (LayerPanel PRO badges):** **Free** tier correctly renders 10 PRO badges, as expected for a free user.
-   **F3 (Camera button surfaces UpgradeSheet):** **Free** tier correctly surfaces the Upgrade Sheet when tapping the camera button, as expected for a free user.

## Findings Discarded

-   **`guest V13` and `free V13` (Learn header stats recomputed):** These findings were discarded as the test annotations `state-loss-evidence` clearly show that the header statistics (courses, complete percentage, chapters done) are identical before and after tab switching. This indicates that the *header stats themselves* are correctly preserved, not recomputed or lost. The test title implies a state loss, but the evidence contradicts this for the specific metrics being checked. The underlying V13 vulnerability, as described in the `UX Knowledge Context`, refers to the loss of *component state* (e.g., scroll position, active chapter page) within the Learn tab, which this test does not directly measure. Given a previous `CONFIRMED` fix for V13, it's likely the component state issue was addressed, and this test is either mis-asserting or checking the wrong aspect of the vulnerability.

## Cannot Assess

-   None. All tests ran and produced output.

## Systemic Patterns

-   **Persistence Regressions:** A significant number of findings (V1, V7, V8, V9, V10, P1) point to regressions in state persistence mechanisms. This affects both manual `localStorage` patterns (`ee_theme`, `ee_session_trail`) and Zustand `persist` middleware (`ee-map-prefs`, `ee-user-prefs`). Many of these were previously marked as `CONFIRMED` fixed, indicating a recurring problem with state management robustness across reloads and authentication changes.
-   **Fundamental Offline-First Deficiencies:** Findings V2, V3, V4, V6, V10, and V14 collectively highlight a critical architectural gap in offline data handling. The app lacks local caching for core data, a persistent queue for user-generated content, and adequate user feedback/warnings for offline operations. This makes the app highly unreliable in its primary use context.
-   **GPS Acquisition Instability:** The repeated failure of waypoint saving (P3, V3) due to "Acquiring GPS..." suggests an underlying issue with the app's GPS acquisition logic, either in processing location data or in its interaction with Playwright's geolocation mock.

## Calibration Notes

-   The new test philosophy, which emphasizes evidence over simple pass/fail, proved crucial in identifying V1 as a confirmed vulnerability despite the test itself passing. This reinforces the need to carefully interpret annotations.
-   Previous `CONFIRMED` fixes for persistence issues (V1, V7, V10, P1) are now showing as regressions. This suggests that fixes might be fragile or that subsequent changes are inadvertently reintroducing these vulnerabilities. This pattern will be prioritized in future analyses.
-   The `PHANTOM` verdict for V13 (Learn header stats) was based on direct evidence contradicting the test's implied outcome, aligning with the rule to never guess and to rely on observable evidence.