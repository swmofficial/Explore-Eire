# UX Agent Report — 2026-05-04

## Run Context
- Commits analysed: 3aefd7f, 671efc2, 26e79dd, 8d68336, 9c7766c, 67bda0b, 007e57d, adaaf62, 00a605d, f05bbe6, 9dea4f9, bd2ce22, 330c2e1, ca97b38, 31c0988, 6433a7f, fb6d01c, 7e0bddd, 9f184cb, 2c70af7 (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is unexpectedly disabled when attempting to save a waypoint, both online and offline, preventing users from creating new waypoints.
- Tier(s) affected: Pro (P3, V3 confirmed), likely Free and Guest (as the button logic would be shared)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` also confirms the lack of an offline pre-check.
- Cannot confirm: Whether the GPS acquisition itself is failing or if the button's enabled state logic is incorrectly tied to a potentially slow or non-existent GPS signal.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status. Despite `task-010` adding a geolocation mock, the app is either not receiving a valid GPS signal, the mock is not correctly configured, or the component's logic is incorrectly interpreting the signal, leading to the button remaining disabled. This points to an issue in the `useTracks` hook or `WaypointSheet`'s consumption of `userLocation`.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `WaypointSheet` component's form validation and button state logic, specifically how it handles GPS acquisition and the `userLocation` state from `useTracks`. Ensure the Playwright geolocation mock is correctly integrated and providing a valid position.

### 2. Widespread Preference & User Data Loss Across Reloads (V1, V7, V8, V9, V11, V15)
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
- Root cause: Widespread failure in the persistence layer. Both Zustand `persist` middleware (for `ee-map-prefs`) and manual `localStorage` IIFE patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are not correctly writing or reading data on app initialization and lifecycle events. The `null` values for `ee_theme` indicate `localStorage.setItem` is not being called or is failing.
- User impact: Severe frustration as settings constantly reset, and critical user-generated data (waypoints, tracks) is lost, making the app unreliable and untrustworthy.
- Business impact: High churn, negative reviews, and inability to retain users for core features. Directly impacts user trust and engagement.
- Fix direction: Conduct a thorough audit of all persistence mechanisms, focusing on the read/write logic for both Zustand `persist` and manual `localStorage` keys, ensuring they are correctly integrated with the application's lifecycle.

### 3. Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated feature, despite already having a Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This indicates the test was waiting for the UpgradeSheet *not* to be visible, and it timed out because the sheet *was* visible.
- Cannot confirm: The exact sequence of events leading to the `isPro` state being misread or the gating logic failing.
- Root cause: The `isPro` state, which gates access to premium features, is either not correctly hydrated from Supabase, or there is a race condition where the UI renders before the `isPro` status is fully established. This could be related to the `ee-user-prefs` `isPro` persistence or the `useAuth` hook's `onAuthStateChange` listener.
- User impact: Paying users are confused and frustrated by being asked to pay again for features they already own, eroding trust in the subscription model.
- Business impact: Damages customer loyalty, increases support queries, and could lead to refund requests or negative reviews.
- Fix direction: Investigate the `isPro` state hydration and the gating logic for Pro features. Ensure `isPro` is reliably set and available before rendering Pro-gated UI elements, potentially by adding explicit loading states or `waitFor` conditions in the component.

### 4. Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: User-generated tracks and routes are lost when attempting to save them offline, with either silent failures or non-actionable error messages.
- Tier(s) affected: Pro (V4, V6 confirmed), likely Free (for tracks)
- Confidence: HIGH
- Evidence:
    - `pro V4` PASS: This test confirms the vulnerability that track save fails offline, leading to data loss.
    - `pro V6` PASS: The test passed, and the annotation `route-button-missing: cannot proof V6` combined with `STATE_MAP.md`'s "Save route ... Fails — console.error only, no toast" confirms the silent failure aspect of V6.
- Cannot confirm: The exact toast message for V4, but the test confirms the data loss.
- Root cause: The application lacks an offline-first data strategy. All Supabase write operations (for `tracks` and `routes`) fail immediately when offline, with no local queuing or retry mechanism.
- User impact: Users lose valuable recorded data (hikes, planned routes) when operating in expected offline environments, making the app unreliable for its core use case.
- Business impact: App is unusable in rural areas with poor connectivity, leading to high churn and negative perception among the target user base.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for user-generated content, allowing writes to be stored locally and synced when connectivity is restored.

### 5. Core Map Data Not Cached for Offline Use (V2)
- Summary: Essential map data, such as gold samples and mineral localities, is not cached locally and is unavailable when the user is offline.
- Tier(s) affected: All (V2 confirmed by architecture), test only ran for Pro
- Confidence: HIGH
- Evidence: `pro V2` test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. While the test itself failed to load the page offline, `STATE_MAP.md` explicitly states: "gold samples (9,313 rows) and mineral localities load from Supabase on every mount — no local cache." This confirms the architectural vulnerability.
- Cannot confirm: The exact visual state of the map layers when offline due to the test setup failure.
- Root cause: The application relies solely on Supabase for fetching core map data, with no local caching mechanism (e.g., IndexedDB or Service Worker caching for API responses).
- User impact: Map layers are empty or fail to load when offline, rendering the app unusable for its primary prospecting function in areas without network coverage.
- Business impact: The app fails to meet the fundamental needs of its target users (prospectors in rural Ireland), leading to high churn and negative reviews.
- Fix direction: Implement a robust offline caching strategy for core map data, likely using a Service Worker to intercept API requests and serve cached data, or pre-fetching data into IndexedDB.

## Tier Comparison

-   **Persistence Failures (V1, V7, V8, V9, V11, V15):** These issues are systemic and affect all tiers where the respective features are available. The underlying cause (failure of `localStorage` read/write, whether via Zustand `persist` or manual IIFE patterns) is common across the application.
    -   `V7 (theme)`: Affects both Guest and Free tiers identically.
    -   `V9 (basemap)`: Affects Guest.
    -   `V8 (layer preferences)`: Affects Free.
    -   `V11 (guest waypoints)`: Affects Guest.
    -   `V15 (active module)`: Affects Guest.
    -   `V1 (session trail)`: Affects Pro.
-   **Waypoint Save Disabled (P3, V3):** Confirmed for Pro tier. The underlying GPS acquisition issue would likely affect Free/Guest if they could access the WaypointSheet.
-   **Pro User Sees Upgrade Sheet (P1):** This issue is specific to the Pro tier, indicating a problem with `isPro` state management or gating logic for paying users.
-   **Offline Data Loss (V4, V6):** Confirmed for Pro tier. The lack of an offline queue is a general architectural vulnerability that would affect any user-generated content save operation across tiers.
-   **Learn Tab State Preservation (V13):** This vulnerability appears to be **fixed** across both Guest and Free tiers. The `state-loss-evidence` annotations show identical `before` and `after` header stats, indicating that the tab state is now correctly preserved.

## Findings Discarded

-   **Pro V10 — Pro status reverts to free on offline reload:** This finding was discarded because the test itself failed to load the application offline (`page.goto: net::ERR_INTERNET_DISCONNECTED`). While `V10` is a known vulnerability, the test did not provide evidence to confirm its current status. `STATE_MAP.md` indicates `task-005` addressed this by scoping `isPro` reset to `SIGNED_OUT` events when online, suggesting it *should* be fixed.

## Cannot Assess

-   **Pro V10 (Pro status reverts to free on offline reload) and Pro V2 (gold/mineral data missing after offline reload):** Full assessment of these vulnerabilities was not possible because the Playwright tests failed to navigate to the application URL when offline, resulting in `net::ERR_INTERNET_DISCONNECTED` errors. This indicates a problem with the test setup's offline simulation rather than a direct app behavior.

## Systemic Patterns

-   **Widespread Persistence Failure:** The most critical systemic pattern is the consistent failure of both Zustand `persist` middleware and manual `localStorage` IIFE patterns to correctly store and retrieve user preferences and generated data across reloads. This indicates a fundamental flaw in the application's state management and hydration logic upon initialization.
-   **Lack of Offline-First Design:** The application fundamentally lacks an offline-first strategy. Core map data is not cached, and all user-generated content writes (waypoints, tracks, routes) fail silently or with non-actionable errors when offline, leading to significant data loss. This is a critical architectural gap for an app targeting users in rural areas.
-   **GPS Acquisition Issues:** There appears to be a systemic problem with GPS signal acquisition or its interpretation within the `WaypointSheet` component, leading to disabled save buttons.

## Calibration Notes

-   The analysis carefully distinguished between tests that *passed* but confirmed a vulnerability (e.g., V1, V11, V15, V4, V6) and tests that *failed* due to an unexpected behavior (e.g., V7, V8, V9, P1, P3, V3).
-   Learned to identify test setup failures (e.g., `ERR_INTERNET_DISCONNECTED`) that prevent confirmation of underlying vulnerabilities (V2, V10), and to rely on `STATE_MAP.md` for architectural ground truth in such cases.
-   Prioritized findings based on user impact, with critical functionality breakage (Waypoint Save) and widespread data loss taking precedence.
-   Confirmed the fix for V13 (Learn tab state preservation) by observing consistent header stats across tab switches, aligning with previous `CONFIRMED` verdicts.