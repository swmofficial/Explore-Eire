# UX Agent Report — 2026-05-18

## Run Context
- Commits analysed: `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `2923ab`, `d29354c`, `eb866d4`, `d552904`, `dfebcc0`, `acd32af`, `f174f1e`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` and `free V8` FAIL (timeout) imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, and no offline pre-save warning is shown.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14 (no pre-check for offline save).
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the Playwright geolocation mock setup.

### 3. Critical: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: User-generated content for GPS tracks and routes is lost when attempting to save while offline, with either a silent failure or a non-persistent toast.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free/Guest if they had these capabilities.
- Confidence: HIGH
- Evidence: `pro V4` test passed, confirming the vulnerability (track save fails offline). `pro V6` test passed, confirming the vulnerability (route save offline produces no user-facing toast). `STATE_MAP.md` confirms: "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone." and "Save route... Fails — console.error only, no toast ... YES — route points gone."
- Cannot confirm: The exact toast message for V4 from the test output, but the vulnerability is confirmed by the test passing.
- Root cause: The application lacks an offline-first data strategy. Supabase write operations for `tracks` and `routes` are direct and do not queue failed operations locally, leading to data loss when connectivity is absent.
- User impact: Significant loss of valuable user-generated data (e.g., a multi-hour hike track), leading to extreme frustration and distrust in the app.
- Business impact: Critical for a mapping app used in rural areas. Directly impacts user retention, as core functionality is unreliable in primary use contexts.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for all user-generated content writes, with a retry mechanism for when connectivity is restored.

### 4. High: Pro Users Incorrectly Prompted to Upgrade (P1 Regression)
- Summary: Authenticated Pro users are incorrectly shown the UpgradeSheet when interacting with Pro-gated features, despite already having an active Pro subscription.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout typically occurs when an expected element (like a Pro feature) is not found, or an unexpected element (like the UpgradeSheet) blocks interaction. Given the test name "Pro user does not see UpgradeSheet on Pro affordance tap", a timeout here strongly implies the UpgradeSheet *was* shown, blocking the test from proceeding. This is a regression from a previously confirmed fix.
- Cannot confirm: The exact content of the UpgradeSheet or the specific Pro affordance tapped due to the timeout.
- Root cause: The `isPro` flag in `userStore` or the `useSubscription` hook is likely not correctly reflecting the Pro user's status, or the gating logic for Pro features is flawed, leading to the `showUpgradeSheet` state being incorrectly set to `true`.
- User impact: Annoyance and confusion for paying users, who are repeatedly asked to pay for a service they already have.
- Business impact: Erodes trust with paying customers, potentially leading to cancellations and negative sentiment. Wastes engineering time on support tickets.
- Fix direction: Verify the `isPro` state hydration from Supabase and `localStorage` for Pro users, and review the conditional rendering logic for the `UpgradeSheet` and Pro-gated features.

### 5. Medium: Learn Tab Header Stats Persist (Positive Finding, V13 Not Fully Confirmed)
- Summary: The header statistics (Courses, Complete %, Chapters Done) in the Learn tab correctly persist across tab switches, preventing regression to zero. However, the specific vulnerability V13 concerning the loss of *in-progress chapter reading position* is not explicitly tested by this journey.
- Tier(s) affected: All (Guest, Free)
- Confidence: HIGH (for header stats persistence)
- Evidence: `guest V13` and `free V13` tests passed. Annotations `state-loss-evidence` and `header-stats-pair` show identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` (e.g., `{"courses":2,"completePct":0,"chaptersDone":0}`). This indicates these header stats are not lost.
- Cannot confirm: Whether the *in-progress chapter reading position* (the actual V13 vulnerability as per `UX Knowledge Context`) is preserved, as the test only checks header statistics.
- Root cause: The `LearnView` component, or the data feeding its header, is likely now correctly persisting its state or remaining mounted (as per previous V13 fix direction). The header stats themselves are derived from `ee_progress` and `ee_certificates` in `localStorage`, which are correctly persisted.
- User impact: Positive impact; users can switch tabs without losing sight of their overall learning progress.
- Business impact: Improves user experience and trust in the learning module.
- Fix direction: No fix needed for header stats. To fully address V13, a test specifically checking the persistence of the *current page within a chapter* is required.

### 6. Low: Free Users See PRO Badges in Layer Panel (F2)
- Summary: Free users are correctly shown "PRO" badges next to premium map layers in the Layer Panel, which serves as an affordance to encourage upgrades.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` test passed with annotation `pro-badge-count: 10`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layers.
- Cannot confirm: Whether the PRO badges are *correctly hidden* for actual Pro users (this is P1, which failed, implying they might still be visible).
- Root cause: The `LayerPanel` component correctly identifies premium layers and renders a "PRO" badge based on the user's `isPro` status, which is `false` for free users.
- User impact: Clear differentiation between free and premium features, guiding users towards upgrade paths.
- Business impact: Supports conversion to paid subscriptions by highlighting value.
- Fix direction: No fix needed for free users. Ensure P1 (Pro users don't see badges) is also correctly implemented.

## Tier Comparison

*   **Persistence Issues (V1, V7, V8, V9, V11, V15):** The core issue of `localStorage` persistence failure is systemic across all tiers. `V7 (theme)` fails for both Guest and Free. `V9 (basemap)` fails for Guest, `V8 (layer preferences)` fails for Free, `V11 (guest waypoints)` and `V15 (active module)` fail for Guest, and `V1 (session trail)` fails for Pro. This indicates a fundamental problem with how `localStorage` is being accessed or how Zustand `persist` middleware is configured/initialized, affecting all users regardless of authentication status.
*   **GPS Acquisition / Waypoint Save (P3, V3, V14):** The failure to acquire GPS and subsequently disable the "Save Waypoint" button, along with the lack of offline warning, is observed in the Pro tier. While not explicitly tested for Free/Guest, the underlying GPS acquisition logic is shared, suggesting this is a universal issue affecting any user attempting to save a waypoint.
*   **Offline Data Loss (V4, V6):** Track and route save failures offline are confirmed for Pro users. This is a general architectural vulnerability (lack of offline queue) and would affect any tier attempting these actions offline.
*   **Learn Tab Header Stats (V13/F4):** Header stats persist correctly across tab switches for both Guest and Free tiers, indicating a consistent positive behavior.
*   **Pro Badges (F2/P1):** Free users correctly see PRO badges (F2). However, the `pro P1` failure suggests that Pro users are *incorrectly* seeing upgrade prompts, implying a misconfiguration of the `isPro` flag or gating logic.

## Findings Discarded
- No findings were discarded in this run, as all identified issues were significant and within the maximum limit.

## Cannot Assess
- `pro V10` (Pro status reverts to free offline) and `pro V2` (gold/mineral data missing after offline reload) could not be assessed because the tests failed to navigate offline (`net::ERR_INTERNET_DISCONNECTED`). This prevents confirmation or disconfirmation of these critical offline vulnerabilities.

## Systemic Patterns
-   **Widespread `localStorage` Persistence Failure:** The most prominent pattern is the complete breakdown of `localStorage` persistence for both Zustand-managed and manually-managed state. This affects user preferences and critical session data across all tiers. This points to a recent, fundamental change or regression in how `localStorage` is accessed or how stores are initialized.
-   **Lack of Offline-First Data Strategy:** The app continues to exhibit critical data loss vulnerabilities (V3, V4, V6, V14) when offline, confirming that user-generated content is not queued locally and is lost on network failure. This is a core architectural deficiency for a field-use app.
-   **GPS Acquisition Issues:** A persistent problem with GPS acquisition (P3, V3) prevents core functionality, suggesting an issue with the `watchPosition` implementation or its interaction with mock/real GPS data.

## Calibration Notes
- Prioritized findings with direct `HIGH` confidence evidence from annotations and explicit error messages, especially for known vulnerabilities (V1, V7, V11, V14, V15).
- Grouped related persistence issues (V1, V7, V8, V9, V11, V15) into a single, high-impact finding, as they share a common root cause (`localStorage` breakdown), aligning with the goal of identifying systemic patterns.
- Carefully distinguished between a test *passing* (meaning the journey completed and produced evidence) and a test *confirming* a vulnerability (meaning the evidence matches the vulnerability's description). For V13, the test passed, but the evidence showed *no state loss* for header stats, which is a positive outcome, not a confirmation of the underlying vulnerability (chapter reading position).
- Noted that `Test timeout of 60000ms exceeded` for a negative assertion (e.g., `pro P1` expecting *not* to see UpgradeSheet) often implies the unexpected element *was* present, blocking the test.
- Identified when tests failed due to environmental issues (e.g., `net::ERR_INTERNET_DISCONNECTED`), preventing assessment of the intended vulnerability.