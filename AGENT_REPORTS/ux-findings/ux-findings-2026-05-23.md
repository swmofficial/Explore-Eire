# UX Agent Report — 2026-05-23

## Run Context
- Commits analysed: `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `2923ab`, `d29354c`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm the `ee_theme` key is not being written or read. `guest V9` and `free V8` FAIL (timeout) strongly imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clearly implied.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access, affecting both Zustand `persist` and manual `localStorage` patterns.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, preventing users from saving waypoints.
- Tier(s) affected: Pro (P3, V3 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and consumed by `WaypointSheet`.

### 3. Critical: Offline Data Loss with No Pre-Save Warning (V3, V4, V6, V14)
- Summary: User-generated data (waypoints, tracks, routes) is lost when attempting to save offline, and for waypoints, no pre-save warning is provided to the user.
- Tier(s) affected: Pro (V3, V4, V6, V14 confirmed).
- Confidence: HIGH
- Evidence: `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. `pro V4` PASS (track save fails offline). `pro V6` PASS (route save offline produces no user-facing toast, confirming silent failure). `STATE_MAP.md` confirms these are expected vulnerabilities.
- Cannot confirm: The specific toast message for track save failure, but the test passing confirms the failure.
- Root cause: The app lacks an offline-first data strategy. All Supabase data writes fail directly when offline, with no local queue or retry mechanism. V14 specifically points to the absence of a pre-save network check. This aligns with `STATE_MAP.md`'s "What is still NOT persisted (genuine vulnerabilities): Any form of offline write queue (V3, V4, V6, V14 — large scope, deferred)".
- User impact: Users lose valuable work (waypoints, tracks, routes) when operating in expected offline environments, leading to severe frustration and distrust.
- Business impact: App is unusable in its primary target environment (rural Ireland), leading to high churn, negative reviews, and failure to meet core user needs.
- Fix direction: Implement an offline-first data strategy with a local persistence layer (e.g., IndexedDB) and a sync queue for all user-generated content. Add pre-save network checks and clear user feedback for offline operations.

### 4. Major: Pro Status Reversion and Offline Data Access Untestable (V2, V10)
- Summary: Critical vulnerabilities related to Pro status reversion on offline reload (V10) and missing gold/mineral data offline (V2) cannot be assessed due to a broken Playwright offline navigation setup.
- Tier(s) affected: Pro (V2, V10).
- Confidence: HIGH (in the test setup being broken, not in the vulnerability status itself)
- Evidence: `pro V10` and `pro V2` FAIL with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the `page.goto` call itself failed because the browser was disconnected from the network, preventing the app from loading at all.
- Cannot confirm: Whether V10 is active or fixed, or if V2 (missing offline data) is present. The test setup prevents the app from even loading in an offline state.
- Root cause: Playwright's offline test configuration is not correctly applied or is being overridden, causing `page.goto` to fail when the network is disconnected. This prevents the app from loading in the intended offline state for testing.
- User impact: If these vulnerabilities are active, Pro users would be locked out or lose critical data offline, making the app unusable. The inability to test them means these risks are unmitigated.
- Business impact: Significant risk of Pro user churn and negative perception if V10 is active. V2 directly impacts the core utility of the app for prospectors offline.
- Fix direction: Debug and fix the Playwright test setup for offline navigation to ensure the app loads correctly in a disconnected state, allowing V2 and V10 to be properly tested.

### 5. Minor: Learn Header Stats Misleadingly "Consistent" (V13, F4)
- Summary: The tests for Learn tab state loss (V13) and header percentage persistence (F4) consistently report 0% completion for guest and free users, making it impossible to verify if *actual* in-progress learning state (e.g., chapter page position) is preserved or lost.
- Tier(s) affected: Guest (V13), Free (V13, F4).
- Confidence: MEDIUM
- Evidence: `guest V13`, `free V13`, and `free F4` all PASS with `state-loss-evidence` or `header-stats-pair` showing `{"courses":2,"completePct":0,"chaptersDone":0}` before and after tab switches.
- Cannot confirm: Whether the underlying component state (like current page in a chapter) is preserved. The test only checks header stats, which are 0 for a fresh user.
- Root cause: The test design for V13 and F4 focuses on header statistics which are always zero for users without progress, rather than testing the persistence of granular component state (e.g., scroll position, active chapter page) which was the original intent of V13. The previous report confirmed a fix for V13 by keeping components mounted, but this test does not verify that specific aspect.
- User impact: Users might lose their place in a chapter if they switch tabs, leading to minor frustration and disruption of the learning flow. The test's current form doesn't provide confidence in the fix.
- Business impact: Minor impact on learning module engagement and user satisfaction.
- Fix direction: Revise V13 and F4 tests to simulate actual progress (e.g., navigate to page 2 of a chapter) and then assert that this specific state is preserved across tab switches, rather than just checking static header stats.

## Tier Comparison

*   **Persistence Regression (V1, V7, V8, V9, V11, V15):**
    *   **V7 (Theme):** Fails for both Guest and Free tiers, indicating a core application-level issue with `ee_theme` persistence, independent of authentication status.
    *   **V9 (Basemap) / V8 (Layer Visibility):** Fail (timeout) for Guest and Free respectively, suggesting the `ee-map-prefs` persistence issue is also general, affecting all users.
    *   **V11 (Guest Waypoints) / V15 (Active Module):** Confirmed loss for Guest, as expected for guest-specific or module-specific state.
    *   **V1 (GPS Track):** Confirmed loss for Pro, indicating the `ee_session_trail` persistence issue is also general, affecting all users who track.
    *   **Overall:** The persistence issues are systemic, affecting both authenticated and unauthenticated users, and both Zustand-persisted and manually-persisted `localStorage` keys. This points to a deep-seated problem with `localStorage` access or initialization logic.

*   **Waypoint Save & GPS (P3, V3, V14):**
    *   Fails for Pro tier. The underlying GPS acquisition logic is shared across all tiers. If Guest/Free users were allowed to save waypoints, they would likely experience the same disabled "Save Waypoint" button. The V14 (no offline warning) is also a general system behavior.

*   **Offline Data Access (V2, V10):**
    *   Untestable for Pro tier due to broken test setup. If test setup were fixed, V10 would be specific to authenticated users (Pro/Free) and V2 would affect all users relying on cached data.

*   **Learn Header Stats (V13, F4):**
    *   Behaves identically for Guest and Free tiers (always 0% complete), indicating the test's inability to verify component state persistence is consistent across unauthenticated/free users.

## Findings Discarded

- No findings were discarded as the total number of findings (5) is below the maximum limit of 8.

## Cannot Assess

-   **Pro V10 (Pro status reverts to free on offline reload):** Cannot assess due to `net::ERR_INTERNET_DISCONNECTED` error during `page.goto`, preventing the app from loading offline.
-   **Pro V2 (Gold/mineral data missing after offline reload):** Cannot assess due to `net::ERR_INTERNET_DISCONNECTED` error during `page.goto`, preventing the app from loading offline.
-   **Specific content of `ee-map-prefs` for V8/V9:** The tests timed out, implying a reset, but did not provide direct `localStorage` content annotations for `ee-map-prefs`.

## Systemic Patterns

1.  **Widespread `localStorage` Persistence Failure:** The most critical systemic pattern is the failure of `localStorage` persistence across multiple features (theme, basemap, layers, guest waypoints, active module, GPS tracks). This affects both Zustand `persist` middleware and manual `localStorage` patterns, suggesting a global issue with `localStorage` access, initialization, or a recent code change (like the `Revert "surgery(rvsv-offline-001)"`) that inadvertently broke these mechanisms.
2.  **GPS Acquisition Failure:** A consistent failure in GPS acquisition prevents core functionality (waypoint saving) across tiers, indicating a problem with the `watchPosition` implementation or its interaction with Playwright's geolocation mock.
3.  **Lack of Offline-First Data Strategy:** The app continues to exhibit vulnerabilities (V3, V4, V6, V14) related to data loss and silent failures when offline, confirming the absence of a robust offline-first data architecture.
4.  **Broken Offline Test Setup:** The Playwright environment is failing to correctly simulate offline conditions for `page.goto`, rendering critical offline vulnerabilities (V2, V10) untestable.

## Calibration Notes

-   Prioritized findings with HIGH confidence based on direct evidence from annotations and error messages, especially those confirming known vulnerabilities (V-numbers).
-   Avoided inferring issues where the test itself was flawed (e.g., V13/F4 not testing component state, but header stats), explicitly noting when a test *couldn't* confirm a vulnerability due to setup issues (V2, V10).
-   Consistently traced findings back to `STATE_MAP.md` and architectural components (Zustand, `localStorage`, `useTracks`).
-   Noted that the `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect for the widespread persistence regression, given its recent and broad impact.
-   Acknowledged that while V13 was previously confirmed fixed for component unmount, the current test for V13 is not adequately verifying that specific fix.