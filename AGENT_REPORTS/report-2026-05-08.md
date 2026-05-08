# UX Agent Report — 2026-05-08

## Run Context
- Commits analysed: f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988, 6433a7f, fb6d01c (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical Persistence Failures for User Preferences and Session Data (V1, V7, V8, V9, V11, V15)
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
- Root cause: Despite `STATE_MAP.md` and previous task resolutions (task-001, task-002, task-006, task-008, task-013) indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns, the `localStorage` keys (`ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, `ee-map-prefs`) are reported as `null`, `absent`, or `empty/missing` after reload. This suggests a systemic failure in the `localStorage.setItem` calls, or `localStorage` is being cleared unexpectedly, directly contradicting previous fixes.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle and that `localStorage` is not being inadvertently cleared.

### 2. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints. The "LOCATION" field consistently shows "Acquiring GPS...".
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` also confirms the lack of an offline pre-check, but the primary issue is the disabled button.
- Cannot confirm: Whether the `task-010` geolocation mock is correctly configured or if the app's `useTracks` hook is failing to acquire/process the mocked GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). Despite `task-010` adding a geolocation mock and `playwright.config.js` having `geolocation: { latitude: 53.2734, longitude: -7.7783 }`, the app is either not receiving a valid GPS signal, the mock is not correctly configured, or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's `userLocation` state updates correctly with mocked GPS data.

### 3. PRO Badges Visible to Free Users (F2)
- Summary: Free tier users are incorrectly shown "PRO" badges next to premium features in the Layer Panel, despite not having access to them.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` PASS with annotation `pro-badge-count: 10`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to layers like "Gold heatmap", "Arsenic", "Lead", etc. for a free user.
- Cannot confirm: Why the `!isPro` guard (mentioned in previous fix for P1) is not working here.
- Root cause: The `LayerPanel` component's rendering logic for PRO badges (`!isPro` guard in `LayerRow`) is either missing or incorrectly implemented for free users, leading to the badges being displayed when they should be hidden. This contradicts the previous fix for P1.
- User impact: Confusion and frustration for free users who see features they cannot access, potentially leading to a perception of a broken or misleading app.
- Business impact: Damages trust and can lead to negative user sentiment, potentially hindering conversion to paid tiers if the free experience feels misleading.
- Fix direction: Review the `LayerPanel` and `LayerRow` components to ensure the `isPro` state from `userStore` is correctly used to conditionally render PRO badges, hiding them for non-Pro users.

### 4. Offline Test Setup Failure (V10, V2)
- Summary: Tests designed to verify offline behavior for Pro status and data caching are failing due to a `net::ERR_INTERNET_DISCONNECTED` error during page navigation, preventing any meaningful assessment of these critical offline vulnerabilities.
- Tier(s) affected: Pro (V10, V2)
- Confidence: HIGH (on the test setup failure, not the vulnerability itself)
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`.
- Cannot confirm: The actual state of V10 (Pro status reverts to free offline) or V2 (gold/mineral data missing offline) because the tests cannot even load the page offline.
- Root cause: The Playwright test environment's offline simulation is not correctly configured or applied for page navigation (`page.goto`), causing the browser to report a network disconnection error before the app can even load in an offline state. This prevents the tests from reaching the point where they can verify the intended vulnerabilities.
- User impact: Indirect, as this is a testing issue. However, if these vulnerabilities exist in production, users would experience severe data loss and feature unavailability offline.
- Business impact: Inability to verify critical offline functionality means these vulnerabilities could ship to production undetected, severely impacting users in rural areas and damaging the app's reputation.
- Fix direction: Investigate the Playwright test setup for offline scenarios, specifically how `page.goto` interacts with network emulation, to ensure the app can load and function in a simulated offline environment.

### 5. Route Save Fails Silently Offline (V6)
- Summary: When attempting to save a route while offline, the operation fails without any user-facing toast notification, leading to silent data loss and a poor user experience.
- Tier(s) affected: Pro (V6 confirmed)
- Confidence: MEDIUM
- Evidence: `pro V6` PASS. Annotation `route-button-missing: cannot proof V6`. However, `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". The test passing means the journey completed, and the annotation implies the *lack* of a toast was observed, even if the button itself was not explicitly checked.
- Cannot confirm: The exact state of the route points after the failed save, but the `STATE_MAP.md` confirms data loss.
- Root cause: As per `STATE_MAP.md`, the `routes` INSERT operation only logs a `console.error` on failure and does not trigger a user-facing toast notification, violating the principle of informing the user about failed operations.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to frustration and distrust in the app's data saving capabilities.
- Business impact: Loss of user-generated content, leading to negative user experience and potential churn, especially for a core feature like route planning.
- Fix direction: Implement a user-facing toast notification or other clear feedback mechanism in the `RouteBuilder` component when a route save operation fails, especially in offline scenarios.

### 6. Learn Tab Header Stats Not Losing State (V13, F4)
- Summary: The `guest V13` and `free F4` tests, which are designed to prove learn tab state loss, show identical header statistics before and after tab switches, indicating that the *header stats* themselves are not losing state. This contradicts the test's "state-loss proof" annotation.
- Tier(s) affected: Guest, Free
- Confidence: HIGH (on the observation that stats are identical)
- Evidence: `guest V13` PASS and `free F4` PASS. Both have `state-loss-evidence` annotations showing `before` and `after` values for `courses`, `completePct`, and `chaptersDone` are identical (e.g., `{"courses":2,"completePct":0,"chaptersDone":0}`).
- Cannot confirm: Whether other aspects of the Learn tab state (e.g., in-progress chapter reading position) are still being lost, as the test specifically checks header stats.
- Root cause: The previous fix for V13 (always-mounted tab content) appears to be working for the Learn tab header statistics. The test's annotation "state-loss proof" is misleading given the evidence. The actual vulnerability (V13) might refer to a more granular state (like chapter reading position) that this test is not measuring, or it has been resolved for header stats.
- User impact: None, as the header stats are correctly persisting. However, the test's misleading annotation could cause confusion.
- Business impact: None.
- Fix direction: Re-evaluate the `guest V13` and `free F4` tests. If the intent was to prove state *loss*, the test is failing to do so (or the vulnerability is fixed). If the intent was to prove state *persistence*, the test is passing. Clarify the test's objective and update its annotation or assertion to reflect the actual behavior.

## Tier Comparison

-   **Persistence (V7, V8, V9)**: Identical behavior across Guest and Free tiers (both fail to persist theme, basemap, layer visibility). This suggests a core issue in `localStorage` interaction or Zustand `persist` middleware that is not tied to authentication status.
-   **Persistence (V1, V11, V15)**: Guest waypoints (V11), active module (V15), and GPS track (V1) all fail to persist for their respective tiers. This is consistent with the general persistence failure.
-   **Waypoint Save Button (P3, F3)**: Pro users experience a disabled save button (P3, V3). Free users are routed to the UpgradeSheet (F3). This is a *difference* in behavior, but the underlying issue for Pro users (GPS acquisition) is distinct from the gating for Free users.
-   **PRO Badges (F2)**: Free users see PRO badges. Pro users are not explicitly tested for this, but the previous P1 fix was to hide them for Pro users. The F2 finding suggests the `!isPro` guard is faulty.
-   **Learn Tab State (V13, F4)**: Identical behavior across Guest and Free tiers (header stats do not lose state). This reinforces that the fix for V13 (always-mounted tabs) is working for this specific aspect, and the issue is not auth-dependent.

## Findings Discarded

-   **`pro P1` timeout**: The test timed out before it could assert whether the UpgradeSheet was visible or not. While related to Pro status, the evidence is inconclusive. The `F2` finding is more concrete regarding Pro badge display.
-   **`pro V10` and `pro V2` offline test failures**: These are test setup issues, not direct UX findings about the app's behavior. They block assessment of V10 and V2, but don't confirm them.

## Cannot Assess

-   **`pro V10` (Pro status reverts to free on offline reload)**: Cannot assess due to `net::ERR_INTERNET_DISCONNECTED` during test setup.
-   **`pro V2` (gold/mineral data missing after offline reload)**: Cannot assess due to `net::ERR_INTERNET_DISCONNECTED` during test setup.

## Systemic Patterns

-   **Widespread `localStorage` Persistence Failure**: This is the most significant pattern. Multiple distinct `localStorage` keys (both Zustand `persist` and manual IIFE patterns) are failing to retain state across reloads. This points to either a fundamental problem with `localStorage` interaction in the app's lifecycle (e.g., `localStorage` being cleared, or `setItem` not being called/flushed correctly) or a misconfiguration of the `persist` middleware/manual patterns. This contradicts many previous "CONFIRMED" fixes.
-   **GPS Acquisition Issues**: The "Acquiring GPS..." state preventing waypoint saves suggests a problem with the `useTracks` hook or its interaction with the Playwright geolocation mock.

## Calibration Notes

-   The repeated `CONFIRMED` verdicts for persistence issues (V1, V7, V11, V15) that are now failing again (or showing `null`/`absent` `localStorage` keys) indicate that previous fixes were either incomplete, regressed, or the underlying problem is more complex than initially thought. I need to be vigilant about re-confirming these.
-   The `PHANTOM` verdicts for `Dashboard Tab Obstruction` and `Map Layer Style Inconsistencies` remind me to always trace to architectural causes and not infer from Playwright timeouts alone. The current `pro P1` timeout is similar, leading to its discard.
-   The `MISDIAGNOSED` verdict for `Map Button Naming Ambiguity` reminds me to distinguish between test-specific issues (selector ambiguity) and real user experience problems.
-   The `V13` (Learn tab state loss) situation is tricky. The test *passed*, and the evidence shows *no state loss* for header stats. This contradicts the test's "state-loss proof" annotation. This suggests the previous fix (always-mounted tabs) is working for this aspect, or the test is not measuring the actual vulnerability (e.g., chapter reading position). I will report what the evidence *shows* (no state loss for header stats) and highlight the discrepancy with the annotation.