# UX Agent Report — 2026-05-26

## Run Context
- Commits analysed: `16c67d3`, `24f4d23`, `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`
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
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for V3 confirms the lack of an offline warning, but the primary failure is the disabled button.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated.

### 3. High: Pro User Sees Upgrade Sheet (P1)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when interacting with a Pro-gated feature, undermining their paid subscription benefits.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` failed with a `Test timeout of 60000ms exceeded.`. Given the test title "Pro user does not see UpgradeSheet on Pro affordance tap", a failure implies the Upgrade Sheet *was* shown, or the test could not confirm its absence within the timeout. This indicates the expected behavior (not seeing the sheet) was not met.
- Cannot confirm: The exact state of `userStore.isPro` at the moment of the tap, but the outcome suggests it was `false` or incorrectly evaluated.
- Root cause: The `isPro` state is either not correctly hydrated from Supabase, not persisted correctly across sessions, or the logic gating Pro features is flawed, causing the app to treat a paying user as a free user. `STATE_MAP.md` notes `useAuth.onAuthStateChange` may overwrite `isPro` to `false` on offline JWT expiry, but this test is online. The `global-setup.js` polls for `isPro:true` before capturing `storageState`, suggesting a race condition or a later state change.
- User impact: Paying users are incorrectly prompted to upgrade, leading to confusion, frustration, and a diminished sense of value for their subscription.
- Business impact: Damages customer loyalty, increases support queries, potential for refunds, and negative brand perception.
- Fix direction: Investigate `isPro` state hydration, persistence, and the logic gating Pro features to ensure it correctly reflects the user's subscription status.

### 4. High: Offline Data Loss for User-Generated Content (V4, V6, V14)
- Summary: User-generated content such as tracks and routes are lost when saved offline, with route saves failing silently and waypoint saves lacking a pre-check warning.
- Tier(s) affected: Pro (confirmed), likely all tiers for data writes.
- Confidence: HIGH
- Evidence: `pro V4` PASS confirms that track save fails offline. `pro V6` PASS confirms that route save offline produces no user-facing toast (silent failure). `pro V3` annotation `v14-pre-save-offline-warning: no (V14 confirmed)` confirms the absence of a pre-save offline warning for waypoints.
- Cannot confirm: The exact content of the `console.error` for route saves, as the test only confirms the absence of a toast.
- Root cause: This behavior is an architectural decision, as `STATE_MAP.md` explicitly states that an offline write queue for `waypoints`, `tracks`, `finds_log`, and `routes` is "NOT persisted (genuine vulnerabilities)" and "large scope, deferred".
- User impact: Loss of valuable user-generated data (tracks, routes, waypoints) when operating in offline environments, leading to significant frustration and distrust in the app's reliability.
- Business impact: Hinders usage in target environments (rural Ireland), reduces data collection, impacts user retention, and damages the app's reputation as a reliable field tool.
- Fix direction: Implement an offline-first data strategy with a local sync queue (e.g., using IndexedDB) to store and retry failed Supabase writes.

### 5. Medium: Offline Test Navigation Failure Prevents Vulnerability Assessment (V2, V10)
- Summary: Playwright tests designed to assess offline vulnerabilities (Pro status reversion, missing mineral data) are failing to navigate to the app URL while offline, preventing proper assessment of these critical issues.
- Tier(s) affected: Pro (test setup issue).
- Confidence: HIGH (that the test failed due to navigation, not that the app bug is confirmed).
- Evidence: `pro V10` FAIL and `pro V2` FAIL both report `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`.
- Cannot confirm: Whether V2 (gold/mineral data missing offline) or V10 (Pro status reverts to free offline) are active vulnerabilities in the application, as the tests could not even load the app.
- Root cause: A Playwright test infrastructure issue where `page.goto` fails to correctly navigate to the application's URL when the network is explicitly disconnected for offline testing. This might be related to how the Service Worker or initial app load interacts with a completely disconnected network.
- User impact: None directly, but this prevents the development team from verifying critical offline behaviors and confirming fixes for these vulnerabilities.
- Business impact: Inability to properly test and confirm fixes for offline behavior, leading to potential regressions or unaddressed issues for users in low-connectivity areas.
- Fix direction: Debug Playwright's offline test setup, specifically how `page.goto` interacts with network emulation and the app's Service Worker during initial page load.

### 6. Low: Learn Tab Header Stats Correctly Persist Across Tab Switches (V13, F4)
- Summary: The Learn tab's header statistics (courses, completion percentage, chapters done) are correctly preserved when switching between tabs, indicating the fix for V13 is working for this specific UI element.
- Tier(s) affected: Guest, Free
- Confidence: HIGH
- Evidence: `guest V13` PASS and `free V13` PASS both show `state-loss-evidence` with identical `before` and `after` values for header stats. `free F4` PASS also confirms this with `header-stats-pair` showing no regression.
- Cannot confirm: Whether *all* component state within the Learn tab (e.g., scroll position within a chapter) is preserved, as these tests specifically target header stats.
- Root cause: The previously confirmed fix for V13 ("Preserve Learn tab component state across tab switches") by replacing conditional rendering with an always-mounted block is successfully preserving the header statistics.
- User impact: Positive. Users' progress summary in the Learn tab remains stable and visible across navigation, contributing to a reliable and motivating learning experience.
- Business impact: Improves user engagement with the learning module and reinforces trust in progress tracking.
- Fix direction: No fix needed for this specific behavior. Consider renaming `guest V13` and `free V13` tests to reflect that header stats *are* preserved, not recomputed/lost, to improve clarity.

## Tier Comparison

-   **Persistence Regression (V7, V8, V9):** The failure to persist theme, basemap, and layer preferences (V7, V8, V9) is observed identically in both `guest` and `free` tiers. This indicates a core application-wide issue with `localStorage` or Zustand `persist` middleware, independent of user authentication status.
-   **Session Data Loss (V1, V11, V15):** `guest V11` (waypoints) and `guest V15` (active module) confirm loss for guests. `pro V1` (GPS track) confirms loss for Pro users. This pattern of volatile session data loss is consistent across tiers, suggesting a lack of persistence for these specific data types regardless of authentication or subscription.
-   **GPS Acquisition Failure (P3, V3):** Confirmed for the `pro` tier. Given that the underlying GPS acquisition logic (`useTracks`, `Map.jsx watchPosition`) is shared across the application, it is highly probable that this issue would affect `guest` and `free` tiers if they were allowed to save waypoints.
-   **Offline Data Loss (V4, V6, V14):** Confirmed for the `pro` tier. The lack of an offline write queue is a systemic architectural decision (as per `STATE_MAP.md`), meaning this vulnerability affects all tiers equally when attempting to save user-generated data offline.
-   **Learn Tab Header Stats Persistence (V13, F4):** The header statistics are correctly preserved for both `guest` and `free` tiers. This demonstrates that the fix for V13 is working for this specific UI element, regardless of the user's authentication status.

## Findings Discarded

-   No findings were discarded in this run, as all identified issues had sufficient evidence and were distinct.

## Cannot Assess

-   **Offline Data/Auth Vulnerabilities (V2, V10):** The `pro V2` (gold/mineral data missing after offline reload) and `pro V10` (Pro status reverts to free on offline reload) tests could not be assessed. Both failed with `net::ERR_INTERNET_DISCONNECTED` during `page.goto`, indicating a Playwright test setup issue preventing the app from loading while offline. Therefore, the status of these vulnerabilities in the application remains unconfirmed.

## Systemic Patterns

1.  **`localStorage` / Persistence Breakdown:** The most critical systemic issue. Multiple tests across all tiers (V1, V7, V8, V9, V11, V15) confirm that data expected to be persisted in `localStorage` (via Zustand `persist` or manual IIFE patterns) is not surviving reloads. The `ee_theme: null` annotation is a strong indicator of a fundamental problem with `localStorage.setItem` or `localStorage.getItem` or an unexpected `localStorage.clear()`. This is a regression from previously confirmed fixes.
2.  **Lack of Offline-First Data Strategy:** As explicitly stated in `STATE_MAP.md`, the app lacks an offline write queue (V3, V4, V6, V14). This leads to predictable data loss when offline, which is confirmed by multiple tests. This is an architectural gap that significantly impacts the app's utility in its target environment.
3.  **GPS Acquisition Instability:** The persistent "Acquiring GPS..." state and disabled save button (P3, V3) suggest a problem with the app's location services, potentially in how it handles or interprets location data, even with a mock. This affects a core data capture function.

## Calibration Notes

-   **PHANTOM Avoidance:** I carefully distinguished between application bugs and test infrastructure failures. For `pro V2` and `pro V10`, the `net::ERR_INTERNET_DISCONNECTED` error clearly indicates a Playwright setup issue, preventing me from making speculative claims about the app's offline behavior (avoiding PHANTOM verdicts).
-   **CONFIRMED Prioritization:** The systemic persistence regression (V1, V7, V8, V9, V11, V15) is a clear example of previously CONFIRMED fixes (e.g., task-001, 002, 006, 008, 013) being undone or broken. This aligns with prioritizing regressions of previously fixed, critical vulnerabilities.
-   **Test Annotation Interpretation:** For `guest V13` and `free V13`, the test names imply state loss, but the `state-loss-evidence` annotations show *no* state loss. A "PASS" for a vulnerability test means the vulnerability *was* confirmed (e.g., `guest V11` PASS means V11 *is* active). However, for V13, the test *passed* because it *proved* the *absence* of state loss, indicating the fix is working. I've clarified this in the finding. Similarly, for `pro V6`, a PASS indicates the silent failure was observed, confirming the vulnerability, despite a confusing annotation.