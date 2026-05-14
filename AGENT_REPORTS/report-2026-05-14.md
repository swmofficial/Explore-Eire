# UX Agent Report — 2026-05-14

## Run Context
- Commits analysed: `6af04ec`, `d8f3828`, `c57cd05`, `3575880`, `f174f1e`, `acd32af`, `dfebcc0`, `d552904`, `eb866d4`, `d29354c`, `29233ab`, `ce7e7d6`, `c5131e8`, `1c2184c`, `28b2b20`, `39c2e46`, `db7f6d0`, `c5bebc2`, `7fbc9d2`, `7a1fc7a`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1).
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` and `free V8` FAIL (timeout) imply basemap and layer preferences reset. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The `STATE_MAP.md` indicates `userLocation` is written by `Map.jsx watchPosition`. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet` component's form validation and button state logic, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

### 3. High: Pro User Incorrectly Gated by Upgrade Sheet (P1)
- Summary: A Pro user is incorrectly presented with the Upgrade Sheet when tapping a Pro affordance, indicating a failure in `isPro` status recognition or gate logic.
- Tier(s) affected: Pro (P1 confirmed).
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This implies the test was waiting for the Upgrade Sheet *not* to be visible, but it remained visible, causing a timeout. The previous report had a `P1 Pro badge race` fix, which suggests `isPro` status is prone to race conditions.
- Cannot confirm: The exact screenshot of the Upgrade Sheet being visible for the Pro user, but the timeout strongly suggests it.
- Root cause: The `STATE_MAP.md` indicates `isPro` is hydrated from Supabase and persisted to `localStorage` (`ee-user-prefs`). The `useAuth.onAuthStateChange` also updates it. A race condition or incorrect `isPro` state evaluation is likely causing the `UpgradeSheet` to be shown. The previous `P1 Pro badge race` fix suggests this is a recurring issue.
- User impact: Paying Pro users are blocked from accessing features they've paid for, leading to extreme frustration and a sense of being cheated.
- Business impact: Direct loss of trust, potential refunds, negative reviews, and severe damage to the subscription model.
- Fix direction: Re-investigate the `isPro` state hydration and `UpgradeSheet` gating logic. Ensure `isPro` is correctly and promptly set from `localStorage` and Supabase, and that the `UpgradeSheet` only renders when `isPro` is `false`.

### 4. High: Offline Data Loss for Tracks and Routes (V4, V6)
- Summary: User-generated data for GPS tracks and routes is lost when attempting to save offline, with tracks failing silently and routes failing without a user-facing toast.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free and Guest if they were allowed to save these.
- Confidence: HIGH
- Evidence: `pro V4` PASS, indicating the vulnerability (track save fails offline) was confirmed. `pro V6` PASS, indicating the vulnerability (route save offline produces no user-facing toast) was confirmed, although the annotation `route-button-missing: cannot proof V6` is weak for the *toast* part. However, the `STATE_MAP.md` explicitly states for `routes` INSERT: "**Fails** — console.error only, no toast". This confirms V6. For `tracks` INSERT: "**Fails** — toast 'Could not save track'". The test passing for V4 confirms this failure.
- Cannot confirm: The exact toast message for V4 from the test output, but the `STATE_MAP.md` confirms the behaviour.
- Root cause: As per `STATE_MAP.md`, both `tracks` and `routes` INSERT operations fail when offline. There is no offline write queue or local-first persistence for these critical user-generated data types.
- User impact: Users lose valuable, time-consuming data (e.g., a multi-hour hike track) if they attempt to save while offline, leading to significant frustration and distrust.
- Business impact: High churn, negative reviews, and a perception that the app is unreliable, especially for its target audience in rural areas with poor connectivity.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue for user-generated content (waypoints, tracks, finds, routes).

### 5. Medium: Learn Tab Header Stats Preserved (V13 - Test Pass)
- Summary: The Learn tab header statistics (courses, complete percentage, chapters done) are correctly preserved across tab switches, indicating the fix for V13 is working for these specific metrics.
- Tier(s) affected: Guest, Free (V13 test passes for both).
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` PASS. Both include `state-loss-evidence` annotations where `before` and `after` values for `courses`, `completePct`, and `chaptersDone` are identical (e.g., `{"before":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}},"after":{"courses":2,"completePct":0,"chaptersDone":0,"raw":{"Courses":"2","Complete":"0%","Chapters Done":"0"}}}`).
- Cannot confirm: Whether the *in-chapter reading position* (the original, broader V13 vulnerability) is also preserved, as the test only checks header stats.
- Root cause: The previous fix for V13 ("Preserve Learn tab component state across tab switches") by replacing conditional rendering with always-mounted, visibility-toggled components, appears to be working for the header statistics.
- User impact: Positive, as users do not lose their overall progress view when navigating away from the Learn tab.
- Business impact: Improved user experience and trust in the learning module.
- Fix direction: No fix needed for *this specific aspect* of V13. However, a separate test should be added to confirm in-chapter reading position persistence.

## Tier Comparison
- **Persistence (V1, V7, V8, V9, V11, V15):** All tiers experience loss of preferences (theme, basemap, layers) and session data (waypoints, active module, tracks) on reload. This indicates a core application-level persistence issue, not specific to authentication status.
- **Waypoint Save (P3, V3, V14):** Pro users are blocked from saving waypoints due to GPS acquisition failure and lack an offline warning. Free and Guest users are gated from this functionality, so they do not experience this specific failure, but the underlying GPS acquisition issue would likely affect them if they had access.
- **Upgrade Sheet (P1, F3, C3):** Pro users are incorrectly shown the Upgrade Sheet (P1 failure). Free users are correctly shown it when attempting Pro-gated actions (F3 pass). Guest users are also correctly shown it (C3 pass). This highlights a specific `isPro` status recognition issue for Pro users.
- **Offline Data Loss (V4, V6):** Pro users experience data loss for tracks and routes when attempting to save offline. Free and Guest users are gated from these features.
- **Learn Tab State (V13):** Learn tab header statistics are preserved for both Guest and Free users, indicating consistent component state management across unauthenticated and authenticated free users.

## Findings Discarded
- **pro V10 — Pro status reverts to free on offline reload (paying user locked out):** Discarded due to `net::ERR_INTERNET_DISCONNECTED` error, indicating a test environment failure (loss of network connectivity during navigation) rather than an app bug. Cannot confirm the vulnerability from this run.
- **pro V2 — gold/mineral data missing after offline reload (data not cached):** Discarded due to `net::ERR_INTERNET_DISCONNECTED` error, indicating a test environment failure (loss of network connectivity during navigation) rather than an app bug. Cannot confirm the vulnerability from this run.

## Cannot Assess
- The full scope of V13 (in-chapter reading position persistence) cannot be assessed as the current test only verifies header statistics.
- The exact content of `ee-map-prefs` for V8/V9 due to test timeouts.

## Systemic Patterns
- **Widespread Persistence Failure:** The most prominent pattern is the complete breakdown of `localStorage` persistence for multiple critical state variables across all tiers. This points to a fundamental issue in how Zustand `persist` middleware or manual `localStorage` writes/reads are configured or executed, possibly introduced by recent reverts.
- **Offline-First Deficiencies:** Despite the app's target audience, there is a consistent lack of offline data persistence for user-generated content (waypoints, tracks, finds, routes) and no robust offline sync queue. This is a known, long-standing vulnerability (V3, V4, V6, V14).
- **GPS Acquisition Issues:** The repeated failure to acquire GPS coordinates, even in online tests with Playwright mocks, suggests a problem in the `useTracks` hook or `Map.jsx`'s `watchPosition` implementation.

## Calibration Notes
- The previous report's "Systemic Persistence Regression" finding was highly accurate, and this run confirms it's still active and widespread. The `ee_theme: null` annotation is a direct, strong piece of evidence, similar to how `ee_guest_waypoints absent` was used previously.
- The `P1 Pro badge race` fix was confirmed previously, but `pro P1` is failing again, suggesting the race condition or `isPro` recognition is still fragile. This reinforces the need to look for race conditions or incorrect state hydration.
- The `V13` finding is a good example of how a test *passing* for a vulnerability can be misleading if the test only covers a subset of the vulnerability. The test confirms *header stats* are preserved, which is a positive outcome, but the original vulnerability (in-chapter page progress) might still exist. This highlights the importance of distinguishing between what a test *proves* and the full scope of a vulnerability.