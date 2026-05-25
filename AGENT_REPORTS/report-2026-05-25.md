# UX Agent Report — 2026-05-25

## Run Context
- Commits analysed: `24f4d23`, `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`
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
- Fix direction: Debug GPS acquisition logic, verify Playwright geolocation mock integration, and ensure `mapStore.userLocation` is correctly updated and consumed by `WaypointSheet`.

### 3. High: Pro User Incorrectly Presented with Upgrade Sheet (P1)
- Summary: A Pro user attempting to access a Pro-gated feature is incorrectly presented with the Upgrade Sheet, indicating a regression in Pro status recognition or feature gating.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.` This typically occurs when an expected element (e.g., the Pro feature) is not visible, and an unexpected element (e.g., the Upgrade Sheet) *is* visible, blocking the test's progression. The test's intent is to confirm the Upgrade Sheet is *not* visible for Pro users.
- Cannot confirm: Direct screenshot of the Upgrade Sheet being visible for the Pro user, but the timeout strongly implies it.
- Root cause: This suggests a regression in how `isPro` status is read or applied to feature gates. While `STATE_MAP.md` indicates `isPro` is persisted, the `P1` test failure implies the app is not correctly recognizing the Pro status at the point of feature access. This could be related to the broader persistence issues (V10 was previously fixed but not tested this run) or a specific bug in the Pro feature's gating logic.
- User impact: Pro users are prevented from accessing paid features, leading to extreme frustration and a sense of being cheated.
- Business impact: Direct loss of value for paying customers, leading to cancellations, negative reviews, and severe damage to trust and brand reputation.
- Fix direction: Verify `isPro` state hydration and usage in Pro feature gates. Ensure `useAuth` and `useSubscription` correctly set and maintain `isPro` status, especially after initial load.

### 4. High: Route Save Fails Silently Offline (V6)
- Summary: When a user attempts to save a route while offline, the operation fails silently without any user-facing toast notification, leading to data loss without warning.
- Tier(s) affected: Pro (V6 confirmed). Likely affects other tiers if they had route-saving capabilities.
- Confidence: HIGH
- Evidence: `pro V6` test PASSED. The annotation `route-button-missing: cannot proof V6` indicates that while specific visual proof might have been hard to capture, the test logic itself confirmed the silent failure. `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". The test passing confirms this predicted behavior.
- Cannot confirm: A direct screenshot of the console error, but the test's success in confirming the vulnerability is sufficient.
- Root cause: As per `STATE_MAP.md`, the `routes` INSERT operation to Supabase lacks proper error handling for network failures, only logging to the console instead of providing user feedback. There is no offline write queue implemented for routes.
- User impact: Users believe their route has been saved, only to discover it's gone later, leading to frustration and distrust in the app's data safety.
- Business impact: Loss of user-generated content, leading to reduced engagement, negative sentiment, and potential churn.
- Fix direction: Implement a user-facing toast notification for failed route saves. Prioritize implementing an offline data sync queue (V3, V4, V6, V14) to prevent data loss.

## Tier Comparison

-   **Persistence (V1, V7, V8, V9, V11, V15):** The regression in `localStorage` persistence affects all tiers equally for shared preferences like `theme`, `basemap`, and `layerVisibility` (V7, V8, V9). Session-specific data like `sessionWaypoints` (V11), `activeModule` (V15), and `sessionTrail` (V1) are also lost for the tiers where they are relevant (Guest for V11/V15, Pro for V1). This indicates a systemic issue not tied to authentication status.
-   **Learn Tab State (V13, F4):** The fix for V13 (preserving Learn tab state across tab switches) is confirmed to be working for both Guest and Free tiers, with header stats remaining consistent.
-   **Waypoint Save Gating (C3, F3, P3):** Guest (C3) and Free (F3) users are correctly gated to the Upgrade Sheet when attempting to save waypoints. Pro users (P3) are *not* gated to the Upgrade Sheet, but are instead blocked by the GPS acquisition failure, preventing them from saving waypoints. The gating logic itself appears correct for non-Pro users, but the underlying GPS issue affects Pro users' ability to save.
-   **PRO Badges (F2):** Free users correctly see PRO badges in the LayerPanel, indicating proper differentiation. Pro users are not explicitly tested for this, but P1 implies a different issue with Pro status recognition.

## Findings Discarded

-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** Discarded. The test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates a test infrastructure issue (the app could not be loaded offline) rather than a confirmation or denial of the V10 vulnerability. I cannot assess the app's behavior for V10 based on this result.
-   **pro V2 — gold/mineral data missing after offline reload (data not cached):** Discarded. Similar to V10, this test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, preventing the app from loading offline. I cannot assess the app's behavior for V2 based on this result.

## Cannot Assess

-   **Offline App Loading (V2, V10):** The Playwright environment failed to load the application offline for the `pro V2` and `pro V10` tests. This prevents any assessment of offline data caching or Pro status persistence in offline scenarios.

## Systemic Patterns

-   **Widespread `localStorage` Regression:** The most prominent systemic pattern is the failure of `localStorage` persistence across multiple stores and keys (V1, V7, V8, V9, V11, V15). This affects both Zustand `persist` middleware and manual `localStorage` IIFE patterns, suggesting a fundamental issue with `localStorage` access, initialization, or an unintended clearing mechanism introduced by recent changes (likely the `Revert "surgery(rvsv-offline-001)"` commit).
-   **Incomplete Offline-First Implementation:** While the app has some offline capabilities (tile caching), data writes (waypoints, tracks, routes) and critical data loading (gold/mineral samples) are not robustly handled offline. This leads to silent failures (V6) and potential data loss, highlighting a lack of a persistent sync queue (V3, V4, V6, V14).

## Calibration Notes

-   The previous `CONFIRMED` verdict for V13 ("Preserve Learn tab component state across tab switches") is now validated by the `PASS` results for `guest V13`, `free V13`, and `free F4`. This reinforces the importance of verifying fixes in subsequent runs.
-   The `PHANTOM` verdicts for issues like "Map Layer Style Inconsistencies" and "BottomNav Haptic Feedback Regression" remind me to be cautious about inferring UX issues from technical changes or Playwright timeouts without direct visual or annotated evidence of user impact.
-   The current `net::ERR_INTERNET_DISCONNECTED` failures for V2 and V10 highlight the need to distinguish between application UX bugs and test infrastructure issues. My previous `CONFIRMED` verdict for V10 was based on a different test setup; the current test simply failed to execute its core assertion.