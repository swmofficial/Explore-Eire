# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `86a220a`, `be55413`, `ca5445a`, `d84b479`, `86a599f`, `10ca499`, `fe53e9b`, `3292a07`, `26b092c`, `9dc98fd`, `06fb774`, `50f3c46`, `394c32c`, `afc08b0`, `47b1264`, `4532bf4`, `f75fb1a`, `44abf7e`, `eeff89e`, `3aa364c` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 3/9
- Historical accuracy: Confirmed: 8 (53%) | Phantom: 5 (33%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Pro Subscription Status Lost on Offline Reload (V10)
- Summary: Paying Pro users lose their subscription status and access to Pro features if the app is reloaded while offline.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro V10` test failed with `error: Error: page.reload: net::ERR_INTERNET_DISCONNECTED`. This directly confirms the scenario where an offline reload occurs. STATE_MAP.md explicitly states `userStore.isPro` and `subscriptionStatus` are hydrated from Supabase and "Fails" offline, causing `isPro` to be "stuck false, Pro features locked".
- Cannot confirm: Visual evidence of the UI state after the offline reload, as the test timed out during the reload itself.
- Root cause: `userStore.isPro` and `userStore.subscriptionStatus` are not persisted locally (e.g., `localStorage`) and rely solely on Supabase reads, which fail without connectivity. The recent commit `d84b479` intended to fix this but appears to have failed for `isPro`/`subscriptionStatus`.
- User impact: Critical loss of functionality for paying users, who are locked out of features they've paid for, leading to extreme frustration and inability to use the app in common offline scenarios.
- Business impact: Severe damage to user trust, high churn risk for Pro subscribers, and potential for refund requests.
- Fix direction: Re-evaluate and debug the `persist` middleware configuration for `userStore.isPro` and `userStore.subscriptionStatus` to ensure they are stored in `localStorage`.

### 2. User-Generated Data Lost on Offline Save Attempts (V3, V4, V6, V14)
- Summary: User-generated content (waypoints, tracks, routes) is lost if the user attempts to save it while offline, with no prior warning or retry mechanism.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless, covered by V11)
- Confidence: HIGH
- Evidence: `pro V3` test failed, but the annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the lack of an offline warning before saving. `pro V6` test *passed*, which, given the test's purpose, confirms the "silent failure" (no user-facing toast) for route saves offline. `pro V3` and `pro V4` tests timed out, but STATE_MAP.md explicitly states `waypoints` INSERT, `tracks` INSERT, and `routes` INSERT "Fails" offline, resulting in "YES — waypoint data gone", "YES — entire GPS trail... gone", and "YES — route points gone".
- Cannot confirm: The exact toast message for V3/V4, as the tests timed out.
- Root cause: Supabase write operations for `waypoints`, `tracks`, and `routes` are performed directly without an offline queue or local-first persistence. V14 is confirmed because there's no pre-save connectivity check.
- User impact: Critical data loss for users who spend significant time creating content, leading to severe frustration and distrust. This is particularly problematic for prospectors who operate in areas with intermittent connectivity.
- Business impact: High churn risk, negative reviews, and a perception of an unreliable and data-unsafe application.
- Fix direction: Implement an offline sync queue (e.g., using `IndexedDB`) for all user-generated content, allowing local-first saves and automatic syncing when connectivity is restored. Add a clear offline warning (V14) before attempting a save.

### 3. Core Map Data Missing After Offline Reload (V2)
- Summary: Critical map data layers like gold samples and mineral localities fail to load after an offline reload, rendering the map largely useless for prospecting.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V2` test failed with `error: Error: page.reload: net::ERR_INTERNET_DISCONNECTED`. This confirms the scenario of an offline reload. STATE_MAP.md explicitly states `gold_samples` and `mineral_localities` queries "No data loads" offline.
- Cannot confirm: Visual evidence of the empty map, as the test timed out during the reload itself.
- Root cause: `useGoldSamples` and `useMineralLocalities` fetch data directly from Supabase on app mount without any local caching mechanism (e.g., `IndexedDB` or `localStorage`).
- User impact: Prevents users from performing core prospecting activities when offline, which is a frequent scenario in rural Ireland, making the app unreliable.
- Business impact: Reduces the app's core value proposition, leading to low user satisfaction, poor retention, and negative word-of-mouth, especially among the target prospector demographic.
- Fix direction: Implement an offline-first strategy using a Service Worker and/or `IndexedDB` to cache critical map data on first load and serve it when offline.

### 4. GPS Tracking Session Lost on Page Reload (V1)
- Summary: Any active GPS tracking session is entirely lost if the app is reloaded (e.g., browser crash, accidental tab close) before the user explicitly saves the track.
- Tier(s) affected: all (though saving is gated for free/pro users)
- Confidence: HIGH
- Evidence: `pro V1` test *passed*, with annotation `track-survived-reload: no (V1 confirmed)`. This directly confirms the vulnerability. STATE_MAP.md states `mapStore.sessionTrail` "accumulate during active user sessions. None are persisted anywhere until the user explicitly saves."
- Cannot confirm: The exact duration or complexity of the lost track.
- Root cause: `mapStore.sessionTrail` is a volatile in-memory Zustand state and is not persisted to `localStorage` or `IndexedDB` during active tracking.
- User impact: Critical data loss for users who spend hours tracking, leading to severe frustration and distrust in the app's reliability.
- Business impact: High churn risk, negative reviews, and a perception of an unreliable and data-unsafe application.
- Fix direction: Implement auto-save or robust persistence for `mapStore.sessionTrail` to `localStorage` or `IndexedDB` at regular intervals during active tracking.

### 5. Guest Waypoints Lost on Reload (V11) / Failed Fix
- Summary: Guest users' waypoints, created during a session, are lost on page reload, despite a recent fix attempt.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test *passed*, explicitly stating "session waypoints are memory-only (vanish on reload)". This directly confirms V11. The git log shows `ca5445a [impl] task-002 — persist guest waypoints to ee_guest_waypoints, clear on sign-in (V11)` was intended to fix this.
- Cannot confirm: Why the fix failed (e.g., implementation error, incorrect persistence key, or a regression).
- Root cause: `mapStore.sessionWaypoints` is not effectively persisted to `localStorage` for guest users, or the persistence mechanism implemented in `task-002` is flawed.
- User impact: Frustration for guest users who expect their temporary data to persist within a session, especially if they are evaluating the app.
- Business impact: Hinders conversion of guest users to free/pro if their initial experience is unreliable and data is lost.
- Fix direction: Re-evaluate and debug the `ee_guest_waypoints` persistence implementation for `mapStore.sessionWaypoints` to ensure guest waypoints survive reloads.

### 6. PRO Badges Visible to Pro Users (P1) / Failed Fix
- Summary: Pro users are still shown "PRO" badges on features they already have access to, despite a recent fix attempt.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test *failed* (timed out), but the annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` provides direct evidence that 8 PRO badges were visible. The git log shows `86a599f [impl] task-004 — hide PRO badges for Pro users in LayerPanel (P1 fix)` was intended to fix this.
- Cannot confirm: Which specific badges are shown, or the exact UI state after the timeout.
- Root cause: The logic to hide PRO badges for `isPro` users in `LayerPanel.jsx` (e.g., using an `!isPro` guard) is either incorrect, not being applied, or has been regressed.
- User impact: Confusing and redundant UI for paying users, potentially making them question their subscription status or the app's reliability.
- Business impact: Erodes trust and perceived value for Pro subscribers, potentially leading to dissatisfaction.
- Fix direction: Debug the `!isPro` guard in `LayerPanel.jsx` to ensure PRO badges are correctly hidden for Pro users.

### 7. User Preferences (Theme, Active Module) Reset on Reload (V7, V15) / Failed Fix
- Summary: User preferences for theme and active module reset to their default values ('dark' theme, 'prospecting' module) on every page reload, despite a recent fix attempt.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests *passed*, with annotations `theme-initial: dark`, `theme-after-flip: light`, `theme-after-reload: dark`. This clearly shows the theme resetting. `guest V15` test *passed*, explicitly confirming "activeModule defaults to prospecting on reload". The git log shows `d84b479 [impl] task-001 — persist theme/isPro/subscriptionStatus, basemap/layerVisibility, activeModule to localStorage` was intended to fix this.
- Cannot confirm: Why the fix failed (e.g., incorrect `persist` middleware configuration, wrong keys being partialize'd, or a regression).
- Root cause: `userStore.theme` and `moduleStore.activeModule` are not effectively persisted to `localStorage` or the `persist` middleware configuration for these specific state keys is flawed.
- User impact: Minor annoyance, but degrades overall user experience and sense of control over the app, requiring users to re-apply preferences frequently.
- Business impact: Contributes to a perception of a less polished or reliable application, potentially impacting user satisfaction.
- Fix direction: Re-evaluate and debug the `persist` middleware configuration for `userStore.theme` and `moduleStore.activeModule` to ensure these preferences are correctly saved and restored.

### 8. Learn Tab Component State Loss Across Tab Switches (V13) / Failed Fix
- Summary: The Learn tab loses its component state (e.g., scroll position, active chapter page, or header stats recomputation) when the user switches to another tab and returns, despite a recent fix attempt.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests *passed*, explicitly stating "learn header stats are recomputed on every tab switch (state-loss proof)". The UX Knowledge Context (Mobile Navigation State) confirms that conditional rendering (unmounting) of tabs leads to state loss. The git log shows `be55413 [impl] task-003 — always-mount non-map tabs with display:none keep-alive, preserve Learn tab state (V13)` was intended to fix this.
- Cannot confirm: Specific component state lost (e.g., scroll position, chapter page). The test only confirms header stats recomputation, which implies the component is re-rendering or re-fetching data.
- Root cause: The "always-mount" fix for non-map tabs in `App.jsx` is either not fully implemented, or the recomputation logic for Learn header stats is separate and still triggers on tab switch, indicating underlying state loss or unnecessary re-renders.
- User impact: Frustration when navigating away from and back to the Learn tab, losing their place in a course or having to wait for content to re-load/re-compute.
- Business impact: Reduces engagement with the learning module, which is key for onboarding and feature adoption, and can lead to users abandoning courses.
- Fix direction: Verify the `App.jsx` conditional rendering logic for non-map tabs to ensure `display:none` is used instead of unmounting. Investigate why Learn header stats are recomputed if the component is always mounted and its state should be preserved.

## Tier Comparison

*   **V13 (Learn tab state loss):** Confirmed for both `guest` and `free` tiers. This indicates the root cause is a structural issue with tab rendering (conditional unmounting) independent of authentication status.
*   **V7 (Theme resets):** Confirmed for both `guest` and `free` tiers. This indicates the root cause is a persistence issue with `userStore.theme` independent of authentication status.
*   **V11 (Guest waypoints memory-only):** Confirmed for `guest` tier only. This is specific to unauthenticated users, as authenticated users save waypoints to Supabase (which has its own offline issues).
*   **V15 (Active module resets):** Confirmed for `guest` tier only. This indicates a persistence issue with `moduleStore.activeModule` independent of authentication status.
*   **F2 (PRO badges for free user):** Confirmed for `free` tier. This is the expected behavior for free users, showing them what they could upgrade to.
*   **F3 (Camera button surfaces UpgradeSheet):** Confirmed for `free` tier. This is the expected behavior for free users, gating Pro features.
*   **P1 (PRO badges for Pro user):** Confirmed as a failure for `pro` tier. This is a specific issue for Pro users, where badges *should not* be visible.
*   **Offline Issues (V2, V3, V4, V6, V10):** Tests for these vulnerabilities failed or confirmed the issue for `pro` users. STATE_MAP.md indicates these are general offline issues affecting authenticated users (free/pro) for data writes/reads. Guest users do not have Supabase write capabilities, so these specific data loss issues don't apply directly to them, but the lack of offline map data (V2) would affect all tiers.

## Findings Discarded

*   **`guest V9` (basemap resets) and `free V8` (layer preferences reset):** These tests timed out. While STATE_MAP.md indicates these are vulnerabilities related to lack of persistence for `mapStore.basemap` and `mapStore.layerVisibility`, the current test run did not produce direct evidence or confirmation due to the timeouts. They are likely related to the same persistence issues as V7/V15, but cannot be confirmed from *this specific run*.
*   **`pro P3` (waypoint save happy path online):** This test timed out. No evidence was gathered to confirm or deny the online happy path for waypoint saving.
*   **`pro V3` (waypoint save fails offline) and `pro V4` (track save fails offline):** These tests timed out. While the lack of pre-save warning (V14) was confirmed within `pro V3`, the full data loss aspect of V3/V4 cannot be confirmed directly from the timeouts. However, the systemic issue of offline data loss is covered by Finding #2, which uses V14 and V6 as direct evidence, and STATE_MAP.md for V3/V4, providing high confidence for the overall problem.

## Cannot Assess

*   The exact visual state of the app after `page.reload` for `pro V10` and `pro V2` due to `net::ERR_INTERNET_DISCONNECTED` errors. While the vulnerability is highly confident from STATE_MAP.md, the visual confirmation of the "locked out" or "empty map" state is missing from the test results.
*   The specific component state lost for V13 (e.g., scroll position, active chapter page) as the test only measures header stats recomputation, which implies state loss but doesn't detail its extent.

## Systemic Patterns

1.  **Inadequate `localStorage` Persistence:** A pervasive issue where multiple user preferences and session states (`theme`, `activeModule`, `isPro`, `subscriptionStatus`, `guestWaypoints`) are not robustly persisted to `localStorage`. This leads to a consistent loss of user settings and temporary data on page reload, indicating a fundamental gap in the application's state management strategy, particularly the `persist` middleware configuration for Zustand stores.
2.  **Absence of Offline-First Data Strategy:** The application lacks a comprehensive offline-first approach for data. Critical map data (`gold_samples`, `mineral_localities`) is not cached locally, and user-generated content (`waypoints`, `tracks`, `routes`) is not saved locally before syncing to Supabase. This results in critical data loss and app unresponsiveness in offline scenarios, which is a severe failure for an outdoor mapping application.
3.  **Failed Fixes and Regressions:** Several vulnerabilities (V13, V11, V7, V15, P1) that were recently addressed in the provided git log (`task-001`, `task-002`, `task-003`, `task-004`) are still confirmed by the current test run. This indicates either the fixes were incomplete, incorrectly implemented, or have been regressed, pointing to potential issues in the development and testing workflow or a misunderstanding of the root causes.
4.  **Conditional Rendering for Tabs:** The conditional rendering of non-map tabs (Dashboard, Settings, Learn, Profile) continues to cause component state loss on tab switches, violating mobile navigation best practices. While a fix was attempted, the tests still confirm state loss, suggesting the "always-mount with `display:none`" strategy is either not fully implemented or not correctly preserving all necessary state.

## Calibration Notes

*   **Interpreting "PASS" for vulnerability tests:** A "PASS" result for a test designed to confirm a vulnerability (e.g., `guest V13`, `pro V1`) is correctly interpreted as the *vulnerability being confirmed*, not that the system passed a check. This aligns with the new "Vulnerability-Proof Test Philosophy."
*   **Leveraging annotations and STATE_MAP.md:** Direct annotations (e.g., `v14-pre-save-offline-warning: no`, `pro-badge-count: 8`) and the architectural ground truth in STATE_MAP.md were crucial for confirming vulnerabilities even when tests timed out or had ambiguous "PASS" results.
*   **Identifying failed fixes:** Cross-referencing test results with recent git commits was critical for identifying that several intended fixes (for V13, V11, V7, V15, P1) appear to have failed or regressed, adding significant context and confidence to these findings.
*   **Handling timeouts:** Timeouts were treated as "cannot confirm" for the specific finding unless other strong evidence was present. This prevents speculative findings based solely on test failures.