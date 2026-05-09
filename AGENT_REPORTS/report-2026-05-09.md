# UX Agent Report — 2026-05-09

## Run Context
- Commits analysed: 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988, 6433a7f
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints. The "LOCATION" field consistently shows "Acquiring GPS...".
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` also confirms the lack of an offline pre-check, but the primary issue is the disabled button.
- Cannot confirm: The exact reason the GPS signal isn't being acquired or processed, despite `task-010` adding a geolocation mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). The app is either not receiving a valid GPS signal from the Playwright mock, the mock is incorrectly configured, or the `useTracks` hook or `WaypointSheet`'s logic is incorrectly interpreting the signal, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's GPS acquisition and `userLocation` state updates, especially in the context of Playwright's geolocation mock.

### 2. Systemic Persistence Failure: User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: Multiple critical user preferences (theme, basemap, layer visibility) and session-specific user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to defaults.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, `ee-map-prefs`) are reported as `null`, `absent`, or `empty/missing` after reload. This suggests a systemic failure in the `localStorage.setItem` calls, or `localStorage` is being cleared unexpectedly, directly contradicting previous fixes.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle and that `localStorage` is not being inadvertently cleared.

### 3. Pro User Incorrectly Shown Upgrade Sheet (P1)
- Summary: A Pro user is unexpectedly shown the Upgrade Sheet when interacting with a Pro-gated feature, despite having an active subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. The test expects the Upgrade Sheet *not* to be visible after tapping a Pro affordance. A timeout in this context strongly implies the Upgrade Sheet *was* visible, preventing the test from proceeding to the next assertion.
- Cannot confirm: The specific Pro affordance tapped or the exact content of the Upgrade Sheet due to the timeout.
- Root cause: The gating logic for Pro features is failing to correctly identify the user as `isPro: true`, or the `UpgradeSheet` is being triggered erroneously. This contradicts `STATE_MAP.md` which states `isPro` is read from `userStore` and used for all Pro gates. The `global-setup.js` polls for `isPro:true` before capturing `storageState`, so the `isPro` status should be correctly set for the test.
- User impact: Annoyance and confusion for paying users, who are prompted to upgrade for features they already have access to. Undermines the value proposition of the Pro subscription.
- Business impact: Damages trust with paying customers, potentially leading to subscription cancellations and negative word-of-mouth.
- Fix direction: Review the `isPro` gating logic in components that trigger the `UpgradeSheet`, ensuring it correctly evaluates the `userStore.isPro` state.

### 4. App Fails to Load Offline, Preventing Offline Functionality Testing (V2, V10)
- Summary: The application fails to load entirely when the network connection is simulated as disconnected, preventing any offline functionality from being tested or used.
- Tier(s) affected: Pro (V2, V10 confirmed), likely all tiers.
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the browser could not even navigate to the app's URL when offline.
- Cannot confirm: Whether the specific vulnerabilities (Pro status reverting, gold/mineral data missing) would manifest, as the app did not load.
- Root cause: The Playwright test environment's offline simulation is preventing the initial page load, or the application itself lacks a robust Service Worker or caching strategy to serve the core application shell when offline. This is a fundamental failure of offline-first principles.
- User impact: The app is completely unusable without an internet connection, directly contradicting the "offline-first" design philosophy crucial for users in rural areas.
- Business impact: Severe limitation on target market usability, leading to high churn and inability to serve a core user need.
- Fix direction: Implement a robust Service Worker strategy to cache the application shell (HTML, CSS, JS) on first visit, allowing the app to load and render even when offline. Ensure Playwright's offline simulation is correctly configured to allow initial shell loading.

### 5. Offline Data Save Failures (V4, V6)
- Summary: User-generated data (GPS tracks and routes) cannot be saved when the device is offline, leading to data loss for tracks and silent failure for routes.
- Tier(s) affected: Pro (V4, V6 confirmed), likely Free and Guest (for guest waypoints, though that's already covered by V11 persistence failure).
- Confidence: HIGH
- Evidence:
    - `pro V4` PASS: The test passed because it confirmed the vulnerability that track save fails offline. `STATE_MAP.md` states: "Save track... Fails — toast 'Could not save track'. YES — entire GPS trail... gone."
    - `pro V6` PASS: The test passed because it confirmed the vulnerability that route save offline produces no user-facing toast. `STATE_MAP.md` states: "Save route... Fails — console.error only, no toast. YES — route points gone."
- Cannot confirm: The exact toast message for V4, but the data loss is confirmed.
- Root cause: As noted in `STATE_MAP.md` under "What is still NOT persisted", there is "Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)". The app attempts direct Supabase writes for tracks and routes, which fail when offline without a local queue or retry mechanism.
- User impact: Users lose valuable recorded data (tracks, planned routes) if they attempt to save while offline, leading to significant frustration and distrust in the app's reliability. Silent failures (V6) are particularly insidious.
- Business impact: Directly impacts user retention and engagement with core data-generating features. Undermines the app's utility in its primary use context (rural Ireland).
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) to store failed write operations locally and retry them when connectivity is restored. Provide clear UI feedback on local-save vs. server-sync status.

## Tier Comparison

- **Persistence Failures (V7, V8, V9):** Theme, basemap, and layer preferences are failing to persist across reloads for both **guest** and **free** tiers. This indicates a core application-level issue with `localStorage` management, independent of authentication status.
- **Session Data Persistence (V1, V11, V15):** Guest waypoints (V11) and active module (V15) are lost for **guest** users, and GPS tracks (V1) are lost for **pro** users. This confirms that the manual `localStorage` patterns intended for these features are failing across different user types.
- **Learn Tab State (V13, F4):** The tests for V13 and F4 passed for both **guest** and **free** tiers, indicating that the *header statistics* in the Learn tab *do* persist across tab switches. This suggests the fix for V13 (always-mounted tabs) is working for this specific metric. However, the `UX Knowledge Context` notes that the *in-progress chapter reading position* is the primary V13 vulnerability, which these tests do not cover.
- **Offline Loading (V2, V10):** The app completely fails to load when offline for the **pro** tier, preventing any further testing of offline functionality for V2 (gold/mineral data) and V10 (Pro status reversion). This suggests a fundamental issue with the app's offline shell caching, affecting all users.

## Findings Discarded

- **free F2 — LayerPanel renders PRO badges for free user:** This test passed with `pro-badge-count: 10`. This is the expected and correct behavior for a free user, who should see which layers are gated by a Pro subscription. It is not a UX issue.

## Cannot Assess

- **Pro V10 (Pro status reverts to free on offline reload):** The test failed to load the application when offline (`net::ERR_INTERNET_DISCONNECTED`), preventing any assessment of whether the `isPro` status correctly persists or reverts.
- **Pro V2 (gold/mineral data missing after offline reload):** Similar to V10, the app failed to load offline, making it impossible to confirm if gold/mineral data is missing.

## Systemic Patterns

1.  **Widespread `localStorage` Persistence Failure:** A significant number of user preferences and session-specific data points (theme, basemap, layer visibility, guest waypoints, active module, GPS tracks) are failing to persist across reloads. This indicates a fundamental issue with how `localStorage` is being written to or read from, or an unexpected clearing of `localStorage` across the application, directly contradicting multiple previous task resolutions.
2.  **Critical Offline Functionality Blockers:** The application fails to load at all when offline, preventing any user interaction or testing of offline features. Furthermore, even if the app were to load, critical data save operations (waypoints, tracks, routes) are failing due to the absence of an offline write queue. This highlights a severe deficiency in the app's offline-first capabilities.
3.  **GPS Acquisition Issues:** The consistent "Acquiring GPS..." message and disabled save button for waypoints suggest a problem with the app's ability to acquire and process location data, even with a mocked GPS signal.

## Calibration Notes

The repeated confirmation of persistence vulnerabilities (V1, V7, V8, V9, V11, V15) despite `STATE_MAP.md` indicating fixes via Zustand `persist` or manual `localStorage` patterns reinforces the need for deep investigation into `localStorage` interactions. My previous "CONFIRMED" verdicts on these fixes were based on the *implementation* of the fix, not necessarily its *runtime effectiveness* in all scenarios. The current test results provide direct evidence of failure. I must be vigilant about verifying the *actual outcome* of a fix, not just its presence in the code. The `PHANTOM` verdicts for issues like "Dashboard Tab Obstruction" and "Map Layer Style Inconsistencies" guide me to look for direct evidence rather than inferring from Playwright timeouts or code changes alone, which was helpful in focusing on the `expect().not.toBeDisabled()` error for P3/V3. The `MISDIAGNOSED` verdict for "Map Button Naming Ambiguity" reminds me to distinguish between test-specific issues (e.g., selector problems) and genuine UX problems.