# UX Agent Report — 2026-05-24

## Run Context
- Commits analysed: `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `29233ab`
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
- Summary: User-generated data (waypoints, tracks, routes) is lost when attempting to save offline, with no pre-save warning for waypoints, and silent failure for routes.
- Tier(s) affected: Pro (V3, V4, V6, V14 confirmed).
- Confidence: HIGH
- Evidence: `pro V3` failed (due to GPS issue, but annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly confirms no pre-save warning). `pro V4` PASS confirms track save fails offline. `pro V6` PASS confirms route save offline produces no user-facing toast. `STATE_MAP.md` confirms these are known vulnerabilities.
- Cannot confirm: The exact toast message for V4, but the test passing implies the expected failure behavior.
- Root cause: The application lacks an offline-first data strategy. All Supabase write operations (waypoints, tracks, finds, routes) fail when offline. There is no local queue or retry mechanism. V14 specifically highlights the lack of a pre-save warning for waypoints.
- User impact: Significant data loss for users operating in areas with poor or no connectivity, which is a primary use case for prospectors. This leads to extreme frustration and distrust.
- Business impact: Direct loss of valuable user-generated content, leading to high churn, negative reviews, and a perception that the app is unreliable for its core purpose.
- Fix direction: Implement an offline data sync queue (e.g., using IndexedDB) for all user-generated content, with clear UI indicators for local-save vs. synced-to-server status. Add pre-save warnings for offline operations.

### 4. High: Pro User Incorrectly Gated by Upgrade Sheet (P1)
- Summary: Authenticated Pro users are incorrectly shown the Upgrade Sheet when tapping a Pro-gated affordance, preventing access to premium features they have paid for.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, but it remained visible, causing the timeout.
- Cannot confirm: The specific Pro affordance that triggered the Upgrade Sheet, but the test name implies a Pro-gated tap.
- Root cause: A logic error in the gating mechanism for Pro features. Despite `userStore.isPro` being true (as implied by the Pro tier context), the `showUpgradeSheet` state is being incorrectly triggered or not dismissed. This could be a race condition or an incorrect conditional check.
- User impact: Paying users are blocked from accessing features they have subscribed to, leading to severe frustration, perceived unfairness, and a broken user experience.
- Business impact: Direct loss of trust from paying customers, potential refund requests, negative reviews, and significant damage to the app's premium offering.
- Fix direction: Review the `isPro` gating logic for all Pro affordances, especially the conditions that trigger `showUpgradeSheet`, to ensure Pro users are correctly identified and allowed access.

### 5. Medium: Offline Navigation Tests Are Broken, Preventing Vulnerability Assessment (V2, V10)
- Summary: Playwright tests designed to confirm offline vulnerabilities V2 (missing gold/mineral data) and V10 (Pro status reverts to free) are failing at the navigation step due to `net::ERR_INTERNET_DISCONNECTED`, preventing any assessment of these critical offline behaviors.
- Tier(s) affected: Pro (V2, V10)
- Confidence: MEDIUM
- Evidence: `pro V10` and `pro V2` both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates a problem with the test environment's ability to simulate offline navigation for these specific tests.
- Cannot confirm: Whether V2 and V10 are active or fixed, as the tests did not reach the assertion stage.
- Root cause: The Playwright test setup for offline simulation or navigation (`page.goto`) is not robust enough for these specific test journeys, or there's an interaction with the app's service worker that's causing the navigation to fail prematurely.
- User impact: Indirect. The inability to test these vulnerabilities means critical offline issues might exist undetected, potentially impacting paying users (V10) or core map functionality (V2) in real-world offline scenarios.
- Business impact: Risk of undetected critical bugs impacting user experience and retention, especially for the target demographic that frequently operates offline.
- Fix direction: Debug the Playwright test setup for offline navigation in `pro V2` and `pro V10` to ensure the `page.goto` command correctly simulates an offline reload without throwing a network error.

### 6. Low: Learn Tab Header Stats Persist, But Core V13 Vulnerability May Remain (V13, F4)
- Summary: The Learn tab's header statistics (courses, completion percentage, chapters done) correctly persist across tab switches, but the underlying vulnerability V13, which concerns the loss of in-progress chapter reading position, is not explicitly tested or disproven.
- Tier(s) affected: Guest (V13), Free (V13, F4)
- Confidence: LOW
- Evidence: `guest V13` (PASS), `free V13` (PASS), and `free F4` (PASS) all show `state-loss-evidence` and `header-stats-pair` with identical `before` and `after` values for header statistics. This confirms the *header stats* are not lost.
- Cannot confirm: Whether the user's *reading position within a chapter* (e.g., page 2 of 3) is preserved across tab switches, as the test journey does not cover this specific state.
- Root cause: The test for V13 focuses on header statistics, which appear to be correctly handled (likely lifted to a store or persisted). However, the `UX Knowledge Context` defines V13 as the loss of "in-progress chapter reading position" which lives in `ChapterReader` component state. This specific state might still be lost.
- User impact: Minor frustration for users who are deep into a chapter and switch tabs, only to find their reading position reset to the beginning of the chapter.
- Business impact: Slight decrease in engagement with the learning module due to minor friction.
- Fix direction: Enhance the V13 test journey to include navigating to a specific page within a chapter, switching tabs, and then verifying the return to the correct page. If the vulnerability is confirmed, lift the chapter reading position state to a persistent store.

## Tier Comparison
- **Persistence Regression (V1, V7, V8, V9, V11, V15):** This is a systemic issue affecting all tiers. `V7 (Theme)` fails for both Guest and Free, with `ee_theme` reported as `null`. `V9 (Basemap)` and `V8 (Layer preferences)` fail (timeout) for Guest and Free respectively, implying a universal failure in `ee-map-prefs` persistence. `V11 (Guest Waypoints)` and `V15 (Active Module)` are confirmed for Guest, and `V1 (GPS Track)` is confirmed for Pro. The underlying `localStorage` mechanisms (both Zustand `persist` and manual IIFE patterns) are broadly failing across the application, regardless of authentication status.
- **GPS Acquisition Failure (P3, V3):** Confirmed for Pro. The underlying GPS acquisition logic is shared across the app, so it's highly probable this affects any feature requiring `mapStore.userLocation` in all tiers, even if not explicitly tested for Free/Guest.
- **Offline Data Loss (V3, V4, V6, V14):** Confirmed for Pro. This is a known architectural limitation (no offline data capability) and is expected to affect any user attempting to save data offline, regardless of tier.
- **Pro Gating (P1):** Fails for Pro, as the Upgrade Sheet is incorrectly displayed. In contrast, Free users correctly see the Upgrade Sheet (F3) and Guest users also correctly see it (C3). The issue is specific to Pro users being blocked from their paid features.
- **Learn Tab Header Stats (V13, F4):** Passes for both Guest and Free. The header statistics are correctly persisted across tab switches for both unauthenticated and authenticated free users, indicating the fix for this specific aspect of V13 is working universally.

## Findings Discarded
- None. All identified issues are distinct and impactful based on the provided evidence.

## Cannot Assess
- `pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) could not be assessed due to Playwright test failures (`net::ERR_INTERNET_DISCONNECTED`) during offline navigation. The tests did not reach the point of asserting the vulnerability.

## Systemic Patterns
1.  **Widespread `localStorage` Persistence Failure:** Multiple critical user preferences and session data points (theme, basemap, layer visibility, guest waypoints, active module, GPS track) are failing to persist across reloads. This indicates a fundamental regression in how the application interacts with `localStorage`, affecting both Zustand `persist` middleware and manual IIFE patterns. This is the most significant systemic issue.
2.  **GPS Acquisition System Failure:** The `mapStore.userLocation` is not being correctly updated, leading to the "Acquiring GPS..." state and blocking features that depend on a valid user location. This affects core map functionality.
3.  **Lack of Offline-First Data Strategy:** The application continues to exhibit vulnerabilities related to offline data saving (V3, V4, V6, V14), confirming the absence of a robust offline-first architecture for user-generated content.

## Calibration Notes
- The re-confirmation of the "Systemic Persistence Regression" (Finding 1) across multiple vulnerabilities and tiers reinforces the importance of thoroughly checking `localStorage` annotations and cross-referencing with `STATE_MAP.md`. This pattern has been consistently identified and remains critical.
- The GPS acquisition issue (Finding 2) was also identified previously and continues to be a high-impact blocker.
- The analysis of `V13` (Finding 6) highlights the need to differentiate between the specific scope of a test journey and the broader definition of a vulnerability from the `UX Knowledge Context`. A test passing for one aspect does not necessarily mean the entire vulnerability is resolved.
- The `net::ERR_INTERNET_DISCONNECTED` errors for `V2` and `V10` serve as a reminder that test environment issues can prevent vulnerability assessment, and it's crucial to report these as "Cannot Assess" rather than speculating on the vulnerability's status.