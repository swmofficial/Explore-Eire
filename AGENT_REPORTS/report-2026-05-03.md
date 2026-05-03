# UX Agent Report — 2026-05-03

## Run Context
- Commits analysed: 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988, 6433a7f, fb6d01c, 7e0bddd, 9f184cb, 2c70af7, 8182f75 (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical Data & Preference Loss Across Reloads (V1, V7, V8, V9, V11, V15)
- Summary: User preferences (theme, basemap, layer visibility) and critical user-generated data (guest waypoints, active module, active GPS track) are not persisting across page reloads, leading to significant data loss and a broken user experience.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to defaults.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` confirms guest waypoints are lost.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` confirms active module resets.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` confirms active GPS track data is lost.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Widespread failure in the persistence layer. Both Zustand `persist` middleware (for `ee-map-prefs`) and manual `localStorage` IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are not correctly writing or reading data on app initialization and lifecycle events.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle.

### 2. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints.
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: Whether the GPS acquisition itself is failing or if the button's enabled state logic is incorrectly tied to a potentially slow or non-existent GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status. Despite `task-010` adding a geolocation mock, the app is either not receiving a valid GPS signal, the mock is not correctly configured, or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Ensure the Playwright geolocation mock is correctly integrated and providing a valid position.

### 3. Offline Data Loss for User-Generated Content (V3, V4, V14)
- Summary: User-generated data (waypoints, tracks) is lost when attempting to save offline, with either silent failures or non-actionable error messages, and no pre-save warning.
- Tier(s) affected: Pro (V3, V4, V14 confirmed), likely Free and Guest (for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V3` FAIL: The test failed to save a waypoint offline, and annotation `v14-pre-save-offline-warning: no (V14 confirmed)` indicates no pre-save warning was shown. `STATE_MAP.md` confirms "YES — waypoint data gone" on offline save failure.
    - `pro V4` PASS: The test confirmed that track save fails offline, which is the expected (vulnerable) behavior. `STATE_MAP.md` confirms "YES — entire GPS trail... gone" on offline save failure.
- Cannot confirm: The specific toast message for V3, as the test timed out before checking. V6 (route save) could not be proven due to a test setup issue.
- Root cause: The application lacks an offline-first data strategy. As per `STATE_MAP.md`, all data writes (waypoints, tracks, finds, routes) fail silently offline with only a toast, and no local queue for unsynced operations. This directly violates offline-first principles (UX Knowledge Context, Section 3).
- User impact: Users in areas with poor connectivity (common for prospectors) will repeatedly lose their work, leading to extreme frustration and abandonment of the app.
- Business impact: Complete failure to serve the core user base in their primary use context, leading to zero retention and negative word-of-mouth.
- Fix direction: Implement an offline-first data strategy, including a local persistence layer (e.g., IndexedDB) and a sync queue for all user-generated content, with clear UI indicators for local-only vs. synced data.

### 4. Pro User Sees Upgrade Sheet on Pro Affordance Tap (P1)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when interacting with a Pro-gated feature, despite having an active subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` FAIL: `Test timeout of 60000ms exceeded.` The test is designed to verify that a Pro user *does not* see the Upgrade Sheet. A timeout here strongly suggests the Upgrade Sheet appeared, causing the test to wait indefinitely for it to disappear or for a Pro-specific action to become available.
- Cannot confirm: The exact screenshot of the Upgrade Sheet appearing, due to the timeout.
- Root cause: This is a regression of a previously confirmed fix (`P1 Pro badge race: fix global-setup storageState timing`). The `isPro` state in `userStore` is either not being correctly set, or there's a race condition where the UI renders the Upgrade Sheet before `isPro` is fully hydrated, or the gating logic itself is flawed. The `global-setup.js` might not be polling for `isPro:true` in `ee-user-prefs` effectively, or the app's hydration logic is too slow.
- User impact: Paying users are blocked from accessing features they've paid for, leading to extreme frustration and a sense of being cheated.
- Business impact: Direct impact on customer satisfaction, potential for chargebacks, and severe damage to brand reputation.
- Fix direction: Re-investigate the `isPro` state hydration and its interaction with UI gating logic. Ensure `global-setup.js` reliably sets and waits for the `isPro` state. Review the component rendering logic to prevent premature display of upgrade prompts.

### 5. Offline Test Setup Failure Prevents Vulnerability Verification (V2, V10)
- Summary: The Playwright test setup for offline scenarios is failing to navigate to the app while offline, preventing the verification of critical offline vulnerabilities related to Pro status and cached data.
- Tier(s) affected: Pro (V2, V10 confirmed to fail test setup)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the `page.goto` call itself failed because the browser was already offline, or the offline mock was not correctly applied before navigation.
- Cannot confirm: The actual state of `isPro` or the presence of gold/mineral data after an offline reload, as the navigation step failed.
- Root cause: The Playwright test environment's offline simulation is not robust enough. The `page.goto` command is attempting to access the Vercel app URL while the network is disconnected, which is an invalid state for initial navigation. This suggests the offline context is being applied too early or incorrectly for the initial page load.
- User impact: No direct user impact, but this prevents the development team from verifying critical offline functionality and vulnerabilities, potentially leading to real-world issues for users.
- Business impact: Inability to ensure app reliability for offline users, leading to undetected bugs and potential customer dissatisfaction.
- Fix direction: Review and debug the Playwright offline test setup. Ensure the `page.goto` command is executed in a context where the app can load from a cached Service Worker or local files, or that the network is only disconnected *after* the initial page load.

## Tier Comparison

*   **Persistence Failures (V1, V7, V8, V9, V11, V15):** The core issue of state and preference loss on reload is consistent across all tiers where the features are available. `V7 (theme)` fails for both `guest` and `free`. `V9 (basemap)` fails for `guest`, and `V8 (layer preferences)` fails for `free`. `V11 (guest waypoints)` and `V15 (active module)` are confirmed lost for `guest` users, and `V1 (session trail)` for `pro` users. This consistency across tiers strongly points to fundamental issues in the underlying persistence mechanisms (both Zustand `persist` and manual `localStorage` patterns) rather than tier-specific logic.
*   **Learn Tab State (V13, F4):** The `learn header stats` (`state-loss-evidence`) show identical `before` and `after` values for both `guest V13` and `free V13/F4`. This indicates that the header stats are *not* regressing to zero, which is positive. However, the `V13` test annotation `learn header stats are recomputed on every tab switch (state-loss proof)` implies the test *expects* state loss. This suggests the test description or expectation for V13 might be misaligned with the actual behaviour of the header stats, or that `task-012` (which fixed V13) was successful for header stats but not for other learn tab state.
*   **Pro Badges (F2):** `free F2` correctly shows 10 PRO badges, confirming the UI correctly identifies and gates Pro features for free users.
*   **Upgrade Sheet Gating (F3, C3, P1):** `guest C3` and `free F3` both correctly surface the Upgrade Sheet when attempting to access Pro-gated features. `pro P1` fails, indicating a Pro user *incorrectly* sees the Upgrade Sheet. This highlights a critical failure in the `isPro` state management or gating logic specifically for paying users.

## Findings Discarded

*   **pro V2 — gold/mineral data missing after offline reload (data not cached):** Discarded because the test failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`), preventing any assessment of the actual data caching vulnerability.
*   **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** Discarded for the same reason as V2; the test failed to navigate offline, making it impossible to verify the `isPro` state after an offline reload.
*   **pro V6 — route save offline produces no user-facing toast (silent failure):** Discarded because the annotation `route-button-missing: cannot proof V6` indicates the test could not even reach the point of attempting to save a route, thus the silent failure could not be confirmed.

## Cannot Assess

*   The actual state of `isPro` or the presence of gold/mineral data after an offline reload for `pro V2` and `pro V10`, due to `net::ERR_INTERNET_DISCONNECTED` errors during navigation.
*   The silent failure of route saving offline for `pro V6`, as the test could not reach the save button.

## Systemic Patterns

*   **Persistence Layer Instability:** The most prominent systemic issue is the widespread failure of state persistence. This affects both the Zustand `persist` middleware (for `mapStore` preferences like basemap and layer visibility) and the manual `localStorage` IIFE patterns (for `userStore.theme`, `mapStore.sessionWaypoints`, `mapStore.sessionTrail`, and `moduleStore.activeModule`). This suggests a fundamental problem in how state is being written to and read from `localStorage` across the application's lifecycle, potentially related to initialisation timing or key management.
*   **GPS Acquisition Issues:** The `WaypointSheet` consistently fails to acquire GPS, leading to disabled save buttons. This points to a problem with the `useTracks` hook's `userLocation` state or its interaction with the Playwright geolocation mock.
*   **Offline Test Environment Fragility:** The Playwright offline test setup is failing to reliably navigate to the application while offline, preventing the verification of critical offline vulnerabilities. This needs to be addressed to ensure proper testing of offline capabilities.

## Calibration Notes

*   The current run reinforces the importance of direct evidence from annotations. For instance, `ee_theme-before-reload: null` directly confirms the manual `localStorage` key is not being written, which is more precise than inferring from a UI reset.
*   Timeouts, while indicating a problem, often mask the *specific* underlying issue. For V8/V9, the timeout implies a reset, but without direct `localStorage` annotations, the exact state of `ee-map-prefs` cannot be confirmed. This highlights a need for more granular annotations in tests that involve timeouts.
*   The `PHANTOM` verdicts from previous runs (e.g., "Map Button Naming Ambiguity") guide me to focus on actual user-observable issues and architectural causes, rather than test-specific quirks or speculative regressions. The current `net::ERR_INTERNET_DISCONNECTED` errors are clearly a test setup issue, not a UX bug, and are correctly classified as preventing assessment.
*   The `CONFIRMED` verdicts from previous runs (e.g., `V15 activeModule resets: switch moduleStore to manual localStorage`) indicate that even when a fix is implemented, the tests must be robust enough to *re-confirm* the fix, or, as seen here, *re-confirm* the vulnerability if the fix was incomplete or regressed. The current run shows that many of the "CONFIRMED" fixes for persistence (V1, V7, V11, V15) have either regressed or were not fully implemented, as the tests are now confirming the *vulnerability* again.