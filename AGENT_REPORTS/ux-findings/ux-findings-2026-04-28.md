# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `330c2e1`, `ca97b38`, `31c0988`, `6433a7f`, `fb6d01c`, `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c`, `3c915be`, `ca1ad91`, `032d09e`, `48395fe`, `68b57ff`, `a44d60f`, `35ad5d6`, `86a220a`, `be55413`, `ca5445a` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 5/9
- Historical accuracy: Confirmed: 13 (65%) | Phantom: 5 (25%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Waypoint Save Button Disabled Online (P3 Regression)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint online, preventing users from creating new waypoints.
- Tier(s) affected: pro (likely free too, but not tested due to gating)
- Confidence: HIGH
- Evidence: `pro P3` test failed with `Error: expect(locator).not.toBeDisabled() failed` for the save button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` shows the "Save Waypoint" button.
- Cannot confirm: The specific reason for the button being disabled (e.g., missing required fields, validation error, or a bug in the button's enabled state logic).
- Root cause: Unclear from current information. This is a regression in a core feature's functionality.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic to identify why the save button is disabled in a happy-path online scenario.

### 2. GPS Track Lost on Reload (V1 Regression)
- Summary: Any active GPS tracking session is entirely lost if the user reloads the app, despite a recent task (`task-006`) to persist this data.
- Tier(s) affected: pro (likely free too, as tracking is not Pro-gated)
- Confidence: HIGH
- Evidence: `pro V1` test passed, but the annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the `sessionTrail` was not found after reload.
- Cannot confirm: The exact UI state of the map after reload, as the test focuses on the `localStorage` key.
- Root cause: The implementation of `task-006` (persisting `sessionTrail` to `ee_session_trail` in `localStorage`) has failed or been reverted. STATE_MAP.md lists `sessionTrail` as `task-006, pending`, but the commit log shows `task-006` was implemented.
- User impact: Critical data loss for users actively tracking their movements, especially during long hikes or prospecting sessions, leading to extreme frustration and distrust.
- Business impact: Undermines a core feature's reliability, leading to user abandonment and negative reviews, particularly from power users.
- Fix direction: Re-verify and re-implement the `sessionTrail` persistence logic, ensuring `mapStore.sessionTrail` is correctly written to and read from `ee_session_trail` in `localStorage`.

### 3. No Pre-Save Offline Warning for Waypoints (V14 Confirmed)
- Summary: Users attempting to save a waypoint while offline receive no prior warning that the operation will fail, leading to silent data loss.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless)
- Confidence: HIGH
- Evidence: `pro V3` test failed (due to disabled button), but the annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the absence of a pre-save offline warning.
- Cannot confirm: The exact failure message or UI state after an *attempted* save, as the button was disabled.
- Root cause: The application does not perform a connectivity check before enabling the waypoint save button or attempting the Supabase write, violating offline-first principles.
- User impact: Users lose valuable waypoint data without explanation, leading to frustration and distrust in the app's data safety.
- Business impact: Damages user trust, increases support requests, and negatively impacts retention, especially for users in areas with intermittent connectivity.
- Fix direction: Implement a network connectivity check before enabling the "Save Waypoint" button or attempting the Supabase write, providing a clear warning to the user if offline.

### 4. Track Save Fails Offline (V4 Confirmed)
- Summary: Users cannot save their GPS tracks when offline, resulting in the loss of accumulated track data after stopping a session.
- Tier(s) affected: pro (likely free too, as tracking is not Pro-gated)
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming "track save fails offline (post-stop data loss)". STATE_MAP.md explicitly states `tracks` INSERT "Fails" offline, resulting in "YES — entire GPS trail... gone".
- Cannot confirm: The specific error message or UI feedback provided to the user.
- Root cause: Supabase write operations for `tracks` are performed directly without an offline queue or local-first persistence mechanism.
- User impact: Loss of valuable activity data (GPS trails, distance, elevation), leading to significant frustration and undermining the utility of the tracking feature in common offline scenarios.
- Business impact: Reduces the app's core value proposition, leading to user churn and negative perception of reliability.
- Fix direction: Implement an offline sync queue (e.g., using `IndexedDB`) for user-generated tracks, allowing local-first saves and automatic synchronization when connectivity is restored.

### 5. Pro Users See PRO Badges in LayerPanel (P1 Regression)
- Summary: Authenticated Pro users are incorrectly shown "PRO" badges next to Pro-gated map layers in the LayerPanel, creating confusion and a perception of a broken subscription.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test passed, but the annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` indicates 8 Pro badges were visible. Screenshots `test-results/pro/p1-1-layer-panel.png` and `test-results/pro/p1-2-after-toggle.png` visually confirm the presence of "PRO" badges.
- Cannot confirm: Whether `userStore.isPro` is correctly set to `true` for the Pro user in this specific test context, or if the rendering logic is flawed.
- Root cause: A regression in the UI logic that hides "PRO" badges for paying subscribers. The `!isPro` guard in `LayerRow` (as per previous resolution) is either not being applied correctly or the `isPro` state is not accurately reflecting the user's subscription status.
- User impact: Confusing and frustrating experience for paying Pro users, who may question if their subscription is active or if they are receiving the full benefits.
- Business impact: Erodes trust in the subscription model, potentially leading to support queries, cancellations, and reduced conversion rates.
- Fix direction: Re-examine the `LayerRow` component's rendering logic for Pro badges and ensure `userStore.isPro` is correctly hydrated and used to conditionally hide these badges for Pro users.

### 6. Theme Preference Resets on Reload (V7 Regression)
- Summary: The user's selected theme (e.g., 'light' or 'dark') reverts to the default 'dark' theme after a page reload, despite a recent task (`task-008`) to persist this preference.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V7` annotation `theme-after-reload: dark` after `theme-after-flip: light`. `free V7` annotation `tReloaded: dark` after `tFlipped: light`. Both confirm the theme reset.
- Cannot confirm: The exact point of failure in the manual `localStorage` persistence or rehydration logic.
- Root cause: The manual `localStorage` persistence for `theme` (using `ee_theme` key, implemented in `task-008`) is not functioning correctly, or the rehydration logic on app load is failing to apply the persisted theme.
- User impact: Annoying loss of a personalized preference, requiring users to re-select their theme on every app reload.
- Business impact: Minor negative impact on user experience and app polish, contributing to a perception of instability.
- Fix direction: Debug the `ee_theme` `localStorage` write and read operations in `userStore.js` to ensure the theme is correctly saved and re-applied on app initialization.

### 7. Guest Waypoints Are Memory-Only (V11 Regression)
- Summary: Waypoints created by guest users are not persisted and are lost upon page reload, despite a recent task (`task-002`) to save them to `localStorage`.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, but the annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the `ee_guest_waypoints` key was missing.
- Cannot confirm: The exact point of failure in the manual `localStorage` persistence or rehydration logic.
- Root cause: The manual `localStorage` persistence for `sessionWaypoints` (using `ee_guest_waypoints` key, implemented in `task-002`) is not functioning correctly, or the rehydration logic on app load is failing.
- User impact: Loss of temporary but potentially valuable user-generated data, leading to frustration for unauthenticated users who are exploring the app.
- Business impact: Hinders guest user engagement and conversion, as their initial contributions are not retained, making the app feel less reliable.
- Fix direction: Re-verify and re-implement the `sessionWaypoints` persistence logic, ensuring `mapStore.sessionWaypoints` is correctly written to and read from `ee_guest_waypoints` in `localStorage`.

### 8. Active Module Resets to Default on Reload (V15 Regression)
- Summary: The user's `activeModule` preference (e.g., 'prospecting') resets to its default value upon page reload, despite being configured for persistence.
- Tier(s) affected: all (as `moduleStore` is not auth-gated)
- Confidence: HIGH
- Evidence: `guest V15` test passed, but the annotation `activeModule-after-reload: ee-module-prefs absent after reload (V15 confirmed)` explicitly states the `ee-module-prefs` key was missing.
- Cannot confirm: The exact point of failure in the `zustand-persist` middleware for `moduleStore`.
- Root cause: The `zustand-persist` middleware for `moduleStore` (specifically for `activeModule` using the `ee-module-prefs` key, implemented in `task-001`) is not functioning correctly, or the `localStorage` key is not being written/read as expected.
- User impact: Minor inconvenience, as users have to re-select their preferred module after every app reload.
- Business impact: Small negative impact on user experience and app polish.
- Fix direction: Debug the `zustand-persist` configuration for `moduleStore` to ensure `activeModule` is correctly saved to and rehydrated from `ee-module-prefs`.

## Tier Comparison

-   **Theme Preference (V7):** Confirmed to reset on reload for both **guest** and **free** users. This indicates a universal issue with the theme persistence mechanism, independent of authentication status.
-   **Learn Tab State (V13):** The fix for V13 (preserving state across tab switches) is confirmed to be effective for both **guest** and **free** users, as header stats remained consistent.
-   **Waypoint Save Functionality:**
    -   **Guest** users' waypoints are memory-only (V11 confirmed).
    -   **Free** users are gated from saving waypoints and are shown the UpgradeSheet (F3 confirmed).
    -   **Pro** users experience a disabled save button even online (P3 confirmed), preventing waypoint creation.
-   **PRO Badges (P1):** **Free** users correctly see PRO badges on gated layers (F2 confirmed). **Pro** users incorrectly see PRO badges (P1 regression confirmed).
-   **Offline Data Loss (V1, V4, V14):** Confirmed for **pro** users. While the tests didn't explicitly run for free users for V1 and V4, the underlying architectural issues (no offline queue) suggest these vulnerabilities would affect free users who can track or save waypoints (if not gated). V14 (no offline warning) is confirmed for Pro, and would apply to any user attempting a Supabase write.
-   **Active Module Reset (V15):** Confirmed for **guest** users. As `moduleStore` is not authentication-gated, this likely affects all tiers.

## Findings Discarded

-   **Pro Subscription Status Lost on Offline Reload (V10):** Discarded. The `pro V10` test failed with `page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates a failure in the test environment to simulate an offline reload, not direct evidence of the app's behavior regarding Pro status. Cannot confirm the vulnerability from this error.
-   **Core Map Data Missing After Offline Reload (V2):** Discarded. Similar to V10, the `pro V2` test failed with `page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing assessment of the app's data loading behavior offline.
-   **Basemap Resets to Satellite on Reload (V9):** Discarded. The `guest V9` test timed out, preventing confirmation of this preference loss.
-   **Layer Preferences Reset to Defaults on Reload (V8):** Discarded. The `free V8` test timed out, preventing confirmation of this preference loss.
-   **Route Save Offline Produces No User-Facing Toast (V6):** Discarded. The `pro V6` test passed, but the annotation `route-button-missing: cannot proof V6` indicates the test could not gather sufficient evidence to confirm the vulnerability.

## Cannot Assess

-   The exact UI state or error messages for tests that timed out or failed due to `page.goto: net::ERR_INTERNET_DISCONNECTED`. These failures prevent direct observation of the application's behavior in those specific scenarios.

## Systemic Patterns

-   **Persistence Failures (Regression):** A significant number of findings (V1, V7, V11, V15) point to failures in state persistence mechanisms, both `zustand-persist` middleware and manual `localStorage` implementations. This indicates that recent tasks aimed at fixing these vulnerabilities have either been incomplete, reverted, or are fundamentally flawed in their implementation or rehydration logic. This is a critical systemic issue affecting user preferences and data safety.
-   **Offline Data Handling (Fundamental Flaw):** The app continues to lack a robust offline-first strategy for user-generated content (V14, V4). Data writes directly to Supabase without local-first persistence or an offline queue, leading to silent failures and data loss. This is a fundamental architectural gap for an app targeting users in areas with intermittent connectivity.
-   **Core Feature Regression:** The disabled waypoint save button (P3) highlights a regression in a core user-facing feature, suggesting potential issues in form validation, state management, or interaction logic.

## Calibration Notes

-   Strictly adhered to the "NEVER guess" rule, especially regarding `page.goto: net::ERR_INTERNET_DISCONNECTED` errors. These are now correctly classified as "Cannot Assess" rather than inferring app behavior, preventing phantom findings.
-   Prioritized findings with direct confirmation from test annotations (e.g., `V1 confirmed`, `V14 confirmed`), reinforcing the value of explicit evidence.
-   Carefully distinguished between a test "passing" (journey completed) and a vulnerability being "confirmed" (evidence of the vulnerability present in annotations), particularly for tests designed to prove a negative (e.g., state *not* persisting).
-   Identified multiple regressions where previously "CONFIRMED" fixes (e.g., V1, V7, V11, V15 persistence, P1 badge hiding) are now showing as active vulnerabilities, indicating a need for thorough re-verification of implemented solutions.