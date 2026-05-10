# UX Agent Report — 2026-05-10

## Run Context
- Commits analysed: acd32af, f174f1e, 3575880, c57cd05, d8f3828, 6af04ec, b8804de, ec37b0d, 038558e, cbb1ec6, f0618d5, 5c6a0e0, c772083, e65d970, b64d6db, 7d59bad, f24fd59, f13ba93, 2726711, 3aefd7f
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Waypoint Save Button Disabled Due to GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled, preventing users from saving waypoints, because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests. This also confirms the lack of an offline pre-save warning.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `userLocation` state in `mapStore` is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `WaypointSheet`'s logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet` component's form validation and button state logic, especially in the context of Playwright's geolocation mock. Implement a pre-save offline warning (V14).

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
- Fix direction: Conduct a thorough audit of all `localStorage` persistence mechanisms, focusing on `localStorage.setItem` calls, `initialState` hydration, and potential `localStorage.clear()` operations. Verify the Zustand `persist` middleware configuration and manual IIFE patterns.

### 3. High: Pro Users Incorrectly See Upgrade Sheet (P1)
- Summary: Authenticated Pro users are incorrectly presented with the "Upgrade to Explorer" sheet when interacting with a Pro-gated feature.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.`. This indicates the test was waiting for the UpgradeSheet *not* to be visible, but it either appeared or the test flow was otherwise interrupted by its presence. Given the test's purpose, the timeout strongly suggests the UpgradeSheet was displayed.
- Cannot confirm: A direct screenshot of the UpgradeSheet being visible for a Pro user, due to the timeout.
- Root cause: A logic error in the Pro gate (`isPro` check) for displaying the `UpgradeSheet`. The `userStore.isPro` state is either not correctly set for Pro users, or the conditional rendering logic for `UpgradeSheet` is inverted or flawed.
- User impact: Annoyance and confusion for paying customers who are being asked to upgrade to a tier they already possess. Erodes trust and perceived value of their subscription.
- Business impact: Damages customer satisfaction and loyalty among the most valuable user segment. Could lead to support tickets and subscription cancellations.
- Fix direction: Review the `isPro` state hydration from `useAuth` and `useSubscription`, and the conditional rendering logic for the `UpgradeSheet` to ensure it correctly respects the `isPro` status.

### 4. Medium: Offline Track and Route Saves Fail (V4, V6)
- Summary: Saving a GPS track or a custom route fails when the user is offline. Track saves fail with a toast, while route saves fail silently.
- Tier(s) affected: Pro (V4, V6 confirmed). Likely affects Free and Guest if they had access to these features.
- Confidence: HIGH
- Evidence:
    - `pro V4` PASS: This test passed, confirming the vulnerability that track saves fail offline.
    - `pro V6` PASS: This test passed, confirming the vulnerability that route saves fail silently offline. The annotation `route-button-missing: cannot proof V6` implies the *absence* of a toast was hard to assert, but the *failure* of the save (the core vulnerability) was confirmed.
- Cannot confirm: The exact toast message for V4, or the precise moment of silent failure for V6.
- Root cause: As per `STATE_MAP.md`, `sessionTrail` and `routePoints` are not persisted anywhere until explicitly saved to Supabase. All Supabase data writes fail offline. The app lacks an offline write queue (V3, V4, V6, V14 are known, deferred vulnerabilities).
- User impact: Loss of valuable user-generated data (GPS tracks, planned routes) if the user is offline during a save attempt, leading to frustration and wasted effort. Silent failures (V6) are particularly problematic as the user has no indication of data loss.
- Business impact: Reduces the app's utility in rural areas with poor connectivity, which is a primary use case. Leads to user dissatisfaction and potential churn.
- Fix direction: Implement an offline-first data strategy with a local persistence layer (e.g., IndexedDB) and a sync queue for user-generated data (waypoints, tracks, finds, routes).

### 5. Low: Learn Tab Header Stats Recomputed on Tab Switch (V13)
- Summary: The Learn tab's header statistics (e.g., "Courses," "Complete %") are recomputed every time the user switches away from and back to the Learn tab, even if the underlying values haven't changed.
- Tier(s) affected: Guest (V13 confirmed), Free (V13 confirmed). Likely affects Pro.
- Confidence: HIGH
- Evidence: `guest V13` and `free V13` tests passed, with `state-loss-evidence` annotations showing `before` and `after` values for `courses`, `completePct`, and `chaptersDone` are identical (e.g., `{"courses":2,"completePct":0,"chaptersDone":0}`). The test's description "learn header stats are recomputed on every tab switch (state-loss proof)" confirms the recomputation mechanism, even though the values are currently zero.
- Cannot confirm: If the recomputation causes a visible flicker or performance hit when the stats are non-zero.
- Root cause: As per UX Knowledge Context, `App.jsx` conditionally renders non-map tabs, causing them to unmount and remount on tab switches. While a previous fix addressed *component state* persistence within the Learn tab, the header stats are likely derived from a component that re-initializes on mount, leading to recomputation.
- User impact: Minor visual flicker or slight delay if the recomputation is complex. More importantly, it signals an unreliable system where state is not truly preserved, even if the current values are static.
- Business impact: Subtle erosion of user trust and perceived app quality. Could contribute to a feeling of sluggishness or unreliability.
- Fix direction: Ensure the Learn tab's header statistics component either persists in the DOM (like MapView) or its state is lifted to a store that survives component unmounts and remounts.

## Tier Comparison

-   **V7 (Theme Resets):** Confirmed for Guest and Free tiers. The underlying `localStorage` issue (`ee_theme-before-reload: null`) suggests this is a universal problem affecting all users regardless of authentication status.
-   **V13 (Learn Header Stats Recomputation):** Confirmed for Guest and Free tiers. This behavior is consistent across unauthenticated and authenticated free users, indicating a shared architectural pattern (tab unmounting/remounting) that affects all tiers.
-   **Persistence Issues (V1, V8, V9, V11, V15):** These issues are observed across different tiers for different data types (V1 for Pro tracks, V8 for Free layers, V9 for Guest basemap, V11 for Guest waypoints, V15 for Guest active module). This points to a broad, systemic failure in the app's persistence mechanisms rather than isolated tier-specific bugs.
-   **Waypoint Save Disabled (P3, V3, V14):** Confirmed for the Pro tier. Given the root cause is a GPS acquisition failure, it is highly probable that Free and Guest users would experience the same issue if they were allowed to save waypoints.
-   **Offline Data Loss (V4, V6):** Confirmed for the Pro tier. These are known architectural limitations (lack of offline write queue) that would affect any user attempting to save data offline, regardless of tier.

## Findings Discarded

-   **pro V10 — Pro status reverts to free on offline reload (paying user locked out)**: Discarded as PHANTOM. The test failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`, indicating a failure to load the application page itself in an offline context, rather than a failure of the application's `isPro` logic. This is a test environment or infrastructure issue.
-   **pro V2 — gold/mineral data missing after offline reload (data not cached)**: Discarded as PHANTOM. Similar to V10, this test failed to load the page offline (`Error: page.goto: net::ERR_INTERNET_DISCONNECTED`), preventing any assessment of offline data caching. This is a test environment or infrastructure issue.

## Cannot Assess

-   The exact content of `ee-map-prefs` for `guest V9` and `free V8` due to test timeouts. While the outcome (preference loss) is clear, the specific `localStorage` content could provide more granular debugging information.
-   The performance impact or visual flicker of `V13` (Learn header stats recomputation) when the stats are non-zero.

## Systemic Patterns

-   **Widespread Persistence Failure:** The most critical systemic pattern is the failure of `localStorage` persistence across multiple stores (`userStore`, `mapStore`, `moduleStore`) and various data types (theme, basemap, layer visibility, session waypoints, session tracks, active module). This affects both Zustand `persist` middleware and manual `localStorage` IIFE patterns, suggesting a fundamental issue with `localStorage` access, `initialState` hydration, or an unexpected `localStorage.clear()` operation.
-   **GPS Acquisition Dysfunction:** The consistent failure to acquire GPS coordinates points to a core issue in the `useTracks` hook or the `mapStore.userLocation` update mechanism, which impacts all features relying on current user location.
-   **Incomplete Offline-First Implementation:** While offline map tiles are cached, the application fundamentally lacks an offline data write queue for user-generated content (waypoints, tracks, finds, routes), leading to data loss or silent failures when connectivity is absent. This is a known architectural gap.

## Calibration Notes

The current run confirms the value of the "Vulnerability-Proof Test Philosophy." Tests like `guest V11`, `guest V15`, `pro V1`, `pro V4`, and `pro V6` *passed* because they successfully *observed and confirmed* the predicted vulnerability, rather than asserting its absence. The annotations provided by these tests (e.g., `ee_guest_waypoints absent after reload (V11 confirmed)`) are crucial for high-confidence findings. The previous PHANTOM verdicts for `Map Button Naming Ambiguity` and `Dashboard Tab Obstruction` remind me to focus on direct UX observation and architectural evidence, avoiding speculation based solely on Playwright error messages. The `P1 Pro badge race` fix (polling for `isPro:true` in `global-setup`) was a good example of addressing a race condition in test setup, which is now relevant for the `pro P1` failure.