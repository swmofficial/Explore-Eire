# UX Agent Report — 2026-04-29

## Run Context
- Commits analysed: `bd2ce22`, `330c2e1`, `ca97b38`, `31c0988`, `6433a7f`, `fb6d01c`, `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c`, `3c915be`, `ca1ad91`, `032d09e`, `48395fe`, `68b57ff`, `a44d60f`, `35ad5d6`, `86a220a`, `be55413` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 5/9
- Historical accuracy: Confirmed: 13 (65%) | Phantom: 5 (25%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Waypoint Save Button Disabled Online (P3 Regression)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint online, preventing users from creating new waypoints.
- Tier(s) affected: pro (likely free too, as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` test failed with `Error: expect(locator).not.toBeDisabled() failed` for the save button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` shows the "Save Waypoint" button.
- Cannot confirm: The specific reason for the button being disabled (e.g., missing required fields, validation error, or a bug in the button's enabled state logic).
- Root cause: Unclear from current information. This is a regression in a core feature's functionality.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic to identify why the save button is disabled in a happy-path online scenario.

### 2. GPS Track Lost on Reload (V1 Regression)
- Summary: Any active GPS tracking session is entirely lost if the user reloads the app, despite `task-006` which was intended to persist this data.
- Tier(s) affected: pro (likely free too, as tracking is not Pro-gated)
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the `sessionTrail` was not found after reload.
- Cannot confirm: The exact UI state of the map after reload, as the test focuses on the `localStorage` key.
- Root cause: The implementation of `task-006` (persisting `sessionTrail` to `ee_session_trail` in `localStorage`) has failed or been reverted, or the test is correctly identifying a flaw in its implementation. STATE_MAP.md lists `sessionTrail` as `task-006, pending`, which contradicts the commit log saying it was implemented. The test evidence confirms the vulnerability.
- User impact: Critical data loss for users actively tracking their movements, especially during long hikes or prospecting sessions, leading to extreme frustration and distrust.
- Business impact: Undermines a core feature's reliability, leading to user abandonment and negative reviews, particularly from power users.
- Fix direction: Re-verify and re-implement the `sessionTrail` persistence logic, ensuring `mapStore.sessionTrail` is correctly written to and read from `ee_session_trail` in `localStorage`.

### 3. Pro Badges Visible to Pro Users (P1 Regression)
- Summary: Pro-gated features in the LayerPanel still display "PRO" badges to authenticated Pro users, creating confusion and a perception of being upsold to a service they already pay for.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test passed, but the annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` clearly indicates 8 PRO badges were visible. Screenshot `test-results/pro/p1-1-layer-panel.png` shows these badges.
- Cannot confirm: If this affects other Pro-gated UI elements outside the LayerPanel.
- Root cause: The conditional rendering logic for PRO badges (`!isPro` guard) in `LayerRow` (as per previous fix direction) is either missing, incorrect, or `isPro` is not being correctly read/set for Pro users in this context.
- User impact: Confuses paying Pro users, making them question their subscription status and the value they are receiving.
- Business impact: Erodes trust with paying customers, potentially leading to churn or negative sentiment.
- Fix direction: Correct the conditional rendering logic for PRO badges in `LayerRow` and other Pro-gated components to ensure they are hidden when `isPro` is true.

### 4. No Pre-Save Offline Warning for Waypoints (V14 Confirmed)
- Summary: Users attempting to save a waypoint while offline receive no prior warning that the operation will fail, leading to silent data loss.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless)
- Confidence: HIGH
- Evidence: `pro V3` test failed (due to disabled button), but the annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the absence of a pre-save offline warning.
- Cannot confirm: The exact failure message or UI state after an *attempted* save, as the button was disabled.
- Root cause: The application does not perform a connectivity check before enabling the waypoint save button or attempting the Supabase write, violating offline-first principles.
- User impact: Users lose valuable waypoint data without explanation, leading to frustration and distrust in the app's data safety.
- Business impact: Damages user trust, increases support requests, and negatively impacts retention, especially for users in areas with intermittent connectivity.
- Fix direction: Implement a network connectivity check before enabling the "Save Waypoint" button or attempting the Supabase write, providing a clear warning to the user if offline.

### 5. Theme Resets to Default on Reload (V7 Confirmed)
- Summary: The user's selected theme (e.g., light mode) reverts to the default 'dark' theme after a page reload, failing to persist user preferences.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests passed. Annotations `theme-after-flip: light` and `theme-after-reload: dark` (for guest) and `tFlipped: light`, `tReloaded: dark` (for free) directly confirm the theme reset.
- Cannot confirm: If this affects other minor user preferences not explicitly tested.
- Root cause: Despite `task-008` attempting to fix this by using a manual `ee_theme` localStorage key, the evidence shows it is not working. The `userStore`'s `theme` state is not being correctly written to or read from `localStorage` on reload.
- User impact: Annoyance and a perception of an unreliable application, requiring users to re-apply their aesthetic preferences repeatedly.
- Business impact: Minor, but contributes to overall user dissatisfaction and a lack of polish.
- Fix direction: Re-verify the manual `ee_theme` localStorage implementation in `userStore` and `SettingsView` to ensure the theme is correctly persisted and rehydrated.

### 6. Guest Waypoints Lost on Reload (V11 Confirmed)
- Summary: Waypoints saved by guest users are not persisted across page reloads, resulting in the loss of all accumulated waypoint data.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed. Annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the `ee_guest_waypoints` localStorage key was missing.
- Cannot confirm: If the waypoints are visible on the map *before* reload.
- Root cause: Despite `task-002` (and `task-009` confirming the test checks for it) intending to persist `sessionWaypoints` to `ee_guest_waypoints` in `localStorage`, the evidence shows this is not working. The manual persistence for guest waypoints is failing.
- User impact: Significant data loss for unauthenticated users who might be testing the app or using it casually, leading to frustration and a disincentive to sign up.
- Business impact: Prevents guest users from experiencing the value of the app, hindering conversion to free/pro tiers.
- Fix direction: Re-verify the manual `ee_guest_waypoints` localStorage implementation in `mapStore` to ensure guest waypoints are correctly persisted and rehydrated.

### 7. Active Module Resets to Default on Reload (V15 Confirmed)
- Summary: The user's `activeModule` preference (e.g., 'geology') resets to the default 'prospecting' module after a page reload, failing to persist user context.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V15` test passed. Annotation `activeModule-after-reload: ee-module-prefs absent after reload (V15 confirmed)` explicitly states the `ee-module-prefs` localStorage key was missing.
- Cannot confirm: If this affects other module-related preferences.
- Root cause: Despite `task-001` intending to persist `activeModule` via `ee-module-prefs` using Zustand's `persist` middleware, the evidence shows this is not working. The `moduleStore`'s `activeModule` state is not being correctly written to or read from `localStorage`.
- User impact: Annoyance and inefficiency as users must repeatedly re-select their preferred module after every app reload.
- Business impact: Minor, but contributes to a less polished and less efficient user experience.
- Fix direction: Investigate the `moduleStore`'s `persist` middleware configuration and implementation to ensure `activeModule` is correctly persisted and rehydrated.

### 8. Basemap and Layer Preferences Reset on Reload (V8/V9 - Inferred)
- Summary: The user's selected basemap and layer visibility preferences likely reset to defaults after a page reload, failing to persist map configuration.
- Tier(s) affected: all
- Confidence: MEDIUM
- Evidence: `guest V9` and `free V8` tests timed out with `Target page, context or browser has been closed`, preventing direct confirmation. However, STATE_MAP.md explicitly states `basemap` and `layerVisibility` *should* be persisted via `ee-map-prefs` using Zustand's `persist` middleware. Given the confirmed failures of other `persist` middleware and manual `localStorage` implementations (V7, V11, V15), it is highly probable that `ee-map-prefs` persistence is also failing.
- Cannot confirm: Direct observation of the basemap or layer state after reload due to test timeouts.
- Root cause: Inferred to be a failure of the `mapStore`'s `persist` middleware, similar to the issues seen with `userStore` and `moduleStore`.
- User impact: Users lose their customized map view, requiring them to re-select their preferred basemap and re-enable desired layers after every reload.
- Business impact: Reduces efficiency and customizability, making the map less useful for power users.
- Fix direction: Investigate the `mapStore`'s `persist` middleware configuration and implementation to ensure `basemap` and `layerVisibility` are correctly persisted and rehydrated.

## Tier Comparison
- **Learn Tab State (V13):** The `guest V13` and `free V13` tests both passed, and their `state-loss-evidence` annotations show identical "before" and "after" header statistics. This confirms that the fix (`task-003`) to preserve Learn tab state across tab switches is working correctly for both guest and free users.
- **Theme Persistence (V7):** The theme resets to default on reload for both `guest` and `free` tiers, indicating identical behavior across authenticated and unauthenticated sessions.
- **Map Preferences Persistence (V8/V9):** Both `guest V9` (basemap) and `free V8` (layer preferences) tests timed out with the same browser crash error, suggesting identical underlying issues preventing the tests from completing their checks across tiers.
- **PRO Badges (P1/F2):** `free F2` correctly shows 10 PRO badges for a free user, while `pro P1` incorrectly shows 8 PRO badges for a Pro user (expected 0). This highlights a specific logic error for Pro users, whereas the badge display for Free users is as expected.

## Findings Discarded
- **`pro V10` (Pro status reverts to free offline) and `pro V2` (gold/mineral data missing offline):** These tests failed due to `net::ERR_INTERNET_DISCONNECTED` during a `page.goto` operation for an offline reload. This indicates a test infrastructure issue (browser crash/disconnect) preventing the test from reaching the point of checking the vulnerability, rather than direct evidence of the app's bug in this specific run. While STATE_MAP.md confirms these are real vulnerabilities, this run did not produce direct evidence.
- **`guest V13` and `free V13` (Learn tab state loss):** These tests passed, and their annotations (`state-loss-evidence`) confirm that the state *did not* regress. This indicates the vulnerability has been successfully addressed by `task-003`.
- **`free F4` (Learn header percentage does not regress):** This test passed with annotations confirming no regression, indicating the fix for V13 also resolved this related issue.
- **`pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast):** These tests passed, confirming the expected offline failure behavior as per STATE_MAP.md. While these represent poor UX due to the lack of an offline queue, the more critical aspect of *silent data loss* (V14) is covered in a separate finding. The absence of an offline write queue is a known, large-scope, deferred vulnerability (V3, V4, V6, V14).

## Cannot Assess
- The specific UI feedback for `pro V4` (track save fails offline) and `pro V6` (route save offline produces no user-facing toast) could not be fully assessed from the provided annotations. `pro V6` explicitly states `route-button-missing: cannot proof V6`, meaning the test couldn't confirm the "no toast" aspect.

## Systemic Patterns
A critical systemic pattern observed is the widespread failure of state persistence mechanisms across the application. This affects both Zustand's `persist` middleware (for `activeModule`, and likely `basemap`/`layerVisibility`) and manual `localStorage` implementations (for `theme` and `sessionWaypoints`). This indicates a fundamental issue in how user preferences and session-specific data are being saved to and rehydrated from `localStorage` across page reloads.

## Calibration Notes
- I learned to critically evaluate "PASS" results, especially when accompanied by "V-confirmed" annotations, as they often signify that a vulnerability *was* confirmed by the test, not that the vulnerability was absent.
- Cross-referencing test annotations with STATE_MAP.md and the commit log was crucial for resolving contradictions, particularly regarding the intended persistence of `theme`, `sessionWaypoints`, and `activeModule` versus the observed test evidence. This revealed that recent "fixes" (`task-002`, `task-006`, `task-008`, `task-001`'s `persist` middleware) are not functioning as intended.
- I distinguished between test infrastructure failures (e.g., `net::ERR_INTERNET_DISCONNECTED` leading to timeouts) and direct application bugs, using architectural knowledge to infer likely related issues where direct evidence was missing.
- I confirmed the successful resolution of `V13` (`task-003`), preventing me from re-reporting it as a bug.