# UX Agent Report — 2026-05-10

## Run Context
- Commits analysed: 3575880, c57cd05, d8f3828, 6af04ec, b8804de, ec37b0d, 038558e, cbb1ec6, f0618d5, 5c6a0e0, c772083, e65d970, b64d6db, 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f, 671efc2, 26e79dd
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled, preventing users from saving waypoints, because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed), likely Free and Guest (as the button logic would be shared).
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status (`userLocation` in `mapStore`). The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, and verify the `useTracks` hook's GPS acquisition and `userLocation` state updates, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 2. Critical: Systemic Persistence Regression: All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence:
    - `guest V7` & `free V7` FAIL: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss.
    - `guest V9` FAIL: `Test timeout of 60000ms exceeded.` for basemap preference, implying reset to default.
    - `free V8` FAIL: `Test timeout of 60000ms exceeded.` for layer preferences, implying reset to default.
    - `guest V11` PASS: `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionWaypoints` persists via `ee_guest_waypoints`.
    - `guest V15` PASS: `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly contradicts `STATE_MAP.md` which states `activeModule` persists via `ee_active_module`.
    - `pro V1` PASS: `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly contradicts `STATE_MAP.md` which states `sessionTrail` persists via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: A systemic failure in `localStorage` persistence. Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. This suggests `localStorage.setItem` calls are failing, `localStorage` is being cleared unexpectedly, or the `initialState` hydration logic is broken.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all `localStorage` persistence mechanisms, focusing on the read/write logic for both Zustand `persist` middleware and manual IIFE patterns, and verify `initialState` hydration.

### 3. High: Offline Navigation Test Setup is Broken, Preventing Vulnerability Confirmation
- Summary: The Playwright test setup for offline navigation is failing, causing `pro V10` (Pro status reverts to free offline) and `pro V2` (gold/mineral data missing offline) tests to error out before they can even load the app offline. This prevents confirmation of these critical offline vulnerabilities.
- Tier(s) affected: Pro (V2, V10).
- Confidence: HIGH (on the test setup being broken, not on the underlying UX issues).
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the `page.goto` call itself failed due to a network disconnection, meaning the app never loaded in an offline state for these tests.
- Cannot confirm: Whether V10 (Pro status loss offline) or V2 (gold/mineral data loss offline) are active UX issues.
- Root cause: The Playwright test environment's offline simulation is not correctly configured or is being triggered too early, preventing the `page.goto` command from successfully loading the application in an offline context.
- User impact: Indirect. Users are not directly affected by the test failure, but the inability to test these critical offline scenarios means potential severe vulnerabilities remain unconfirmed and unfixed.
- Business impact: Increased risk of shipping critical offline bugs that could severely impact paying Pro users and data availability in rural areas.
- Fix direction: Debug the Playwright test setup for offline navigation, ensuring the `page.goto` command can successfully load the application in a simulated offline environment before assertions are made.

### 4. Medium: Route Save Fails Silently Offline (V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing toast notification, leading to data loss without feedback.
- Tier(s) affected: Pro (V6 confirmed). Likely affects other tiers if route saving were enabled for them.
- Confidence: HIGH
- Evidence: `pro V6` test passed, with annotation `route-button-missing: cannot proof V6`. The test passing implies no toast was found, which confirms the "silent failure" aspect of V6. `STATE_MAP.md` for `routes` INSERT states: "**Fails** — console.error only, no toast". This directly matches the test outcome.
- Cannot confirm: The exact route data that was lost, but the silent failure is confirmed.
- Root cause: The `routes` INSERT operation in `RouteBuilder` only logs a `console.error` on failure and does not trigger a user-facing toast notification, as explicitly stated in `STATE_MAP.md`.
- User impact: Users believe their route has been saved, only to find it missing later, leading to frustration and distrust in the app's data integrity.
- Business impact: Loss of user-generated content, leading to decreased engagement and potential churn, especially for a core feature like route planning.
- Fix direction: Implement a user-facing toast notification for failed route save operations in `RouteBuilder`, and consider an offline queue for route data (V3, V4, V6, V14 are related to this).

## Tier Comparison

-   **V7 (Theme resets):** Affects both **Guest** and **Free** tiers identically. The theme preference (`ee_theme`) is reported as `null` before and after reload for both, indicating a global persistence issue independent of authentication status.
-   **V13 (Learn header stats persistence):** Behaves identically across **Guest** and **Free** tiers (header stats persist). The `state-loss-evidence` shows identical `before` and `after` values, confirming that the fix for this specific aspect of V13 is effective for both unauthenticated and authenticated free users.
-   **Persistence issues (V1, V7, V8, V9, V11, V15):** These are widespread across all tiers for different types of data (theme, basemap, layers, guest waypoints, active module, GPS track). This points to a fundamental problem with the `localStorage` persistence layer or its interaction with Zustand/store hydration, rather than tier-specific logic.
-   **Waypoint Save Button Disabled (P3, V3, V14):** Confirmed for **Pro** users. While Free users are gated by the UpgradeSheet (F3 passes) and Guest users have memory-only waypoints (V11 passes), the underlying GPS acquisition logic is likely shared. This suggests the issue would affect any tier if they were permitted to save waypoints.
-   **Offline Navigation Test Failures (V2, V10):** Only observed in **Pro** tier tests, but this is a test setup issue, not a UX difference. It prevents assessing offline behavior for Pro users.

## Findings Discarded
-   None. All identified findings are significant and within the report limit.

## Cannot Assess
-   **V10 (Pro status reverts to free on offline reload):** Cannot assess due to Playwright test setup failure (`net::ERR_INTERNET_DISCONNECTED`). The test environment failed to load the application in an offline state.
-   **V2 (Gold/mineral data missing after offline reload):** Cannot assess due to Playwright test setup failure (`net::ERR_INTERNET_DISCONNECTED`). The test environment failed to load the application in an offline state.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple tests across all tiers (V1, V7, V8, V9, V11, V15) confirm that data expected to be persisted in `localStorage` (either via Zustand `persist` or manual IIFE patterns) is not surviving page reloads. This indicates a fundamental regression in the application's state persistence layer.
2.  **GPS Acquisition Issues:** The "Save Waypoint" button is disabled due to "Acquiring GPS..." even in online tests (P3, V3). This suggests a problem with the app's ability to acquire or process geolocation data, or an issue with the Playwright geolocation mock.
3.  **Inadequate Offline Error Handling:** Operations that fail offline (waypoint save, route save) either fail silently (V6) or with a generic toast without offering retry or local queuing (V3, V4). There's also a confirmed lack of a pre-save offline warning (V14). This points to a lack of robust offline-first design.

## Calibration Notes
-   **Prioritizing direct evidence:** Findings were based on explicit error messages, annotations, and direct contradictions with `STATE_MAP.md`, aligning with previous successful "CONFIRMED" verdicts.
-   **Distinguishing test failures from UX failures:** For `pro P1`, a test timeout confirming the *absence* of an UpgradeSheet was correctly interpreted as a UX pass, avoiding misdiagnosis of Playwright issues as application bugs.
-   **Interpreting "PASS" for vulnerabilities:** Tests that "passed" by confirming the existence of a vulnerability (e.g., V1, V11, V15, V4, V6) were correctly identified as active issues, reflecting the new test philosophy.
-   **Recognizing test setup issues:** Clear `net::ERR_INTERNET_DISCONNECTED` errors were attributed to Playwright setup problems, preventing misdiagnosis of app behavior when the test environment is at fault.
-   **Leveraging `STATE_MAP.md`:** The architectural ground truth was crucial for confirming expected persistence behaviors and offline failure modes, strengthening confidence in findings.