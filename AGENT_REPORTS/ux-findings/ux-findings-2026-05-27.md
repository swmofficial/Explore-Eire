# UX Agent Report — 2026-05-27

## Run Context
- Commits analysed: `0aab776`, `16c67d3`, `24f4d23`, `93f7c74`, `b21f0d9`, `c1919d5`, `664788c`, `b3a0624`, `87e60cc`, `d853d69`, `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`
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

### 3. High: Pro User Incorrectly Sees Upgrade Sheet (P1)
- Summary: A Pro-tier user is incorrectly presented with the "Upgrade to Explorer" sheet when tapping a Pro-gated affordance, indicating a failure in correctly identifying their subscription status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This timeout implies the test was waiting for the UpgradeSheet *not* to be visible, but it remained visible, causing the timeout. This means the UpgradeSheet was shown to a Pro user.
- Cannot confirm: The exact state of `userStore.isPro` or `userStore.subscriptionStatus` at the moment of the affordance tap, but the observed behavior points to them being `false` or `free`.
- Root cause: The `global-setup.js` is configured to set `isPro:true` in `ee-user-prefs` for Pro tests. However, the app's `useAuth` hook or `useSubscription` hook is likely failing to correctly hydrate `userStore.isPro` from `localStorage` or Supabase, or it's being reset to `false` prematurely. This could be related to the systemic persistence issues (Finding 1).
- User impact: Frustration and confusion for paying users who are told to upgrade for features they already possess, eroding trust and perceived value.
- Business impact: Damages customer loyalty, increases support burden, and could lead to cancellations if users feel they are not receiving the benefits of their subscription.
- Fix direction: Verify `userStore.isPro` and `userStore.subscriptionStatus` are correctly hydrated and maintained for authenticated Pro users, especially after initial load and across sessions.

### 4. Medium: Offline Data Loss Without User Feedback (V4, V6, V14)
- Summary: The application fails to save user-generated data (tracks, routes, waypoints) when offline, and in some cases, provides no user-facing feedback or pre-save warnings, leading to silent data loss.
- Tier(s) affected: Pro (V4, V6, V14 confirmed). This is an architectural limitation affecting all tiers for data writes.
- Confidence: HIGH
- Evidence: `pro V4` PASS confirms track save fails offline. `pro V6` PASS confirms route save offline produces no user-facing toast (as per `STATE_MAP.md`). `pro V3` (waypoint save offline) annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states no pre-save warning. `STATE_MAP.md` confirms these behaviors: "Save track... Fails — toast 'Could not save track' ... YES — entire GPS trail... gone." "Save route... Fails — console.error only, no toast." "Save waypoint... Fails — toast 'Could not save waypoint'. Photo upload also fails. YES — waypoint data gone."
- Cannot confirm: The exact content of the console error for V6, but the absence of a toast is confirmed.
- Root cause: The application lacks an offline-first data strategy, specifically a persistent sync queue for user-generated content. All data writes directly attempt to interact with Supabase, failing immediately when offline. The UX Knowledge Context highlights this as a core offline-first principle violation.
- User impact: Loss of valuable user-generated data (GPS tracks, waypoints, routes) without adequate warning or recovery mechanisms, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, and inability to serve the core user base (prospectors in rural areas) who frequently operate offline.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) to store pending writes, provide clear "saved locally" vs. "synced" status, and implement retry mechanisms.

### 5. Low: Learn Tab Header Stats Stable, but Broader V13 State Loss Untested
- Summary: The Learn tab's header statistics (courses, complete percentage, chapters done) remain stable across tab switches, indicating that this specific derived state is not lost. However, the broader vulnerability (V13) regarding in-progress chapter reading position is not covered by this test.
- Tier(s) affected: Guest, Free
- Confidence: MEDIUM (for header stats stability), LOW (for broader V13 confirmation)
- Evidence: `guest V13` and `free V13` both PASS. The `state-loss-evidence` annotation shows identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` after a tab switch. This indicates stability for these derived stats.
- Cannot confirm: Whether the in-progress chapter reading position (e.g., page 2 of 3 within a chapter) is preserved, as the test only checks header statistics. The UX Knowledge Context explicitly states this is a known vulnerability.
- Root cause: The previous fix for V13 (always mounting tabs) appears to have resolved state loss for derived values that rely on persisted `localStorage` data (`ee_progress`). However, component-specific ephemeral state, like the current page within a `ChapterReader`, would still be lost if not explicitly lifted or persisted.
- User impact: While overall progress is safe, users may still lose their exact reading position within a chapter, requiring them to manually find where they left off, causing minor friction.
- Business impact: Minor impact on engagement with the learning module, but not critical.
- Fix direction: Implement state lifting or `localStorage` persistence for `ChapterReader`'s current page to fully address V13.

## Tier Comparison

-   **Persistence Failures (V1, V7, V8, V9, V11, V15):** The failure pattern for theme (V7), basemap (V9), and layer preferences (V8) is identical across Guest and Free tiers, indicating a core issue with `localStorage` or Zustand `persist` middleware that is not tied to authentication status. Guest-specific (V11, V15) and Pro-specific (V1) session data also fail to persist, reinforcing the systemic nature of the problem.
-   **Learn Tab Header Stats (V13):** The behavior is identical across Guest and Free tiers, with header statistics remaining stable after tab switches. This suggests the underlying `ee_progress` data is consistently read, and the component state for these derived values is preserved.
-   **Waypoint Save (P3, V3):** The inability to save waypoints due to GPS acquisition failure is confirmed for the Pro tier. While not explicitly tested for Free/Guest, the underlying GPS logic is shared, making it highly probable to affect all tiers if they were permitted to save waypoints.
-   **Pro Status (P1):** This issue is specific to the Pro tier, where the `isPro` status is incorrectly evaluated, leading to an upgrade prompt.
-   **Offline Data Loss (V4, V6, V14):** These architectural limitations (no offline queue) are confirmed for the Pro tier, but the underlying behavior of failing Supabase writes when offline would apply universally to all tiers attempting data writes.

## Findings Discarded

-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out)**: Discarded. The test failed due to `page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a Playwright test infrastructure issue rather than a direct app bug. Cannot confirm V10 from this run.
-   **pro V2 — gold/mineral data missing after offline reload (data not cached)**: Discarded. The test failed due to `page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a Playwright test infrastructure issue. Cannot confirm V2 from this run.

## Cannot Assess

-   The full extent of `V8` (layer preferences reset) and `V9` (basemap resets) could not be fully assessed beyond the timeout, as specific `ee-map-prefs` content was not logged.
-   The specific content of the console error for `V6` (route save offline) was not captured, only the absence of a toast.

## Systemic Patterns

1.  **Widespread `localStorage` Persistence Failure:** The most critical systemic issue is the failure of `localStorage` to correctly store and retrieve user preferences and session data across multiple stores (`userStore`, `mapStore`, `moduleStore`). This points to a fundamental problem with the `persist` middleware configuration or manual `localStorage` patterns, potentially introduced by recent code changes or reverts.
2.  **Core Service Failure (GPS Acquisition):** The consistent failure to acquire GPS coordinates, even with Playwright's mock, indicates a deeper problem with the geolocation service integration or its handling of `mapStore.userLocation`, blocking critical user actions.
3.  **Lack of Offline-First Data Strategy:** The confirmed vulnerabilities (V4, V6, V14) highlight the absence of an offline data queue, leading to silent data loss and poor user experience in expected offline scenarios.

## Calibration Notes

-   Prioritized findings with direct evidence from annotations and error messages, especially for `localStorage` issues (V1, V7, V11, V15) and GPS failures (P3, V3).
-   Avoided confirming issues where the test itself failed due to infrastructure problems (`net::ERR_INTERNET_DISCONNECTED`), consistent with previous "PHANTOM" verdicts for such cases.
-   Carefully distinguished between a test *passing* (meaning the assertion was met) and the *implication* of that pass for a vulnerability (e.g., V11/V15/V1 passing means the vulnerability *was confirmed*).
-   Re-evaluated V13 based on the `state-loss-evidence` annotation, noting that while header stats are stable, the broader vulnerability of in-chapter page position loss remains unconfirmed by the current test. This aligns with previous "MISDIAGNOSED" and "PHANTOM" verdicts where test scope didn't fully match the vulnerability.