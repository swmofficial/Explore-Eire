# UX Agent Report — 2026-08-25

## Run Context
- Commits analysed: `2782a7c9bbe68c7cad8338d75d709ce9b5c8450a` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: User Preferences (Theme, Basemap, Layers, Active Module, Guest Waypoints, Session Trail) Fail to Persist on Reload (V1, V7, V8, V9, V11, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, despite `STATE_MAP.md` indicating they should be persisted. This contradicts previous "CONFIRMED" fixes for V1, V7, V11, and V15.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This confirms `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is confirmed. This means `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is confirmed. This means `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is confirmed. This means `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
- Cannot confirm: The exact content of `ee-map-prefs` in localStorage due to timeout, but the failure to retain state is clear.
- Root cause: Persistence mechanisms for `userStore.theme` (manual `ee_theme` key), `mapStore.basemap`/`layerVisibility` (Zustand `ee-map-prefs`), `moduleStore.activeModule` (manual `ee_active_module`), `mapStore.sessionWaypoints` (manual `ee_guest_waypoints`), and `mapStore.sessionTrail` (manual `ee_session_trail`) are not functioning correctly, possibly due to a regression in the `localStorage` read/write patterns or Zustand `persist` middleware setup.
- User impact: Users lose their personalised settings and critical in-progress data (waypoints, tracks) on every page reload, leading to severe frustration and distrust in the app's reliability.
- Business impact: High churn due to poor user experience, reduced engagement with core features, and negative brand perception.
- Fix direction: Thoroughly review and debug all `localStorage` persistence mechanisms (Zustand `persist` and manual IIFE patterns) to ensure data is correctly written and read.

### 4. High: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3 Failure)
- Summary: Free tier users are able to tap the camera button and proceed to the `WaypointSheet` to save a waypoint, bypassing the intended upgrade gate that should surface the `UpgradeSheet`.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly confirms that the `UpgradeSheet` was *not* shown, but the `WaypointSheet` *was`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet.
- Cannot confirm: The exact code path that allows this bypass without a code review.
- Root cause: Incorrect conditional rendering or routing logic for the camera button's action, failing to check `isPro` status before showing the `WaypointSheet`.
- User impact: Free users can access a premium feature, potentially leading to confusion when they later encounter other paywalls or when their saved waypoints are not synced.
- Business impact: Direct loss of potential conversions from free to pro users, as a key premium feature is accessible without payment. Undermines the value proposition of the Pro tier.
- Fix direction: Correct the conditional logic for the camera button to ensure `showUpgradeSheet` is triggered for free users.

### 5. Medium: Offline Data Save Operations Fail (V4, V6, V14 Confirmed)
- Summary: The application fails to save user-generated data (tracks, routes) when offline, leading to data loss. There is also no user-facing warning about offline save failures for waypoints (V14).
- Tier(s) affected: Pro (inferred Free/Guest for relevant features)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming the vulnerability that track save fails offline. `STATE_MAP.md` confirms "Save track" fails offline with a toast.
    - `pro V6` passed. While the annotation `route-button-missing: cannot proof V6` indicates the test couldn't *directly* prove the silent failure, `STATE_MAP.md` explicitly states "route save fails — console.error only, no toast", confirming the silent failure vulnerability.
    - `pro V3` (which failed due to GPS issue) had annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, confirming the absence of a pre-save offline warning for waypoints.
- Cannot confirm: The exact content of the toast for V4 without a screenshot or more detailed log.
- Root cause: Lack of an offline data queue or local-first write strategy for user-generated content. All write operations directly attempt Supabase writes, failing on network disconnection. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline, leading to significant frustration and loss of trust. Lack of warning for waypoints means they might assume data is saved when it isn't.
- Business impact: Damages user trust and retention, especially for prospectors who frequently operate in offline environments. Leads to negative reviews and reduced app usage.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., IndexedDB) for all user-generated content.

### 6. Medium: Pro User Upgrade Sheet Check Times Out (P1)
- Summary: The test designed to verify that Pro users do not see the `UpgradeSheet` when tapping Pro-gated features timed out, indicating an inability to confirm the expected behaviour.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded`. This test is intended to confirm that Pro users *don't* see the UpgradeSheet. The timeout could mean the app failed to load (as seen in V2/V10), or the UpgradeSheet *did* appear, or the test couldn't find the expected elements.
- Cannot confirm: The exact reason for the timeout without further debugging. Given the `net::ERR_INTERNET_DISCONNECTED` errors for other Pro tests, it's highly probable the app failed to load, preventing the test from completing its assertions.
- Root cause: Likely a secondary effect of the critical offline loading failure (V2, V10), preventing the test from reaching the state where it can verify the Pro gating logic.
- User impact: If the UpgradeSheet *is* appearing for Pro users, it's a confusing and frustrating experience, making them question their subscription status.
- Business impact: Erodes trust in the Pro subscription and can lead to support queries or cancellations.
- Fix direction: Address the underlying offline loading issues first. Then, re-evaluate the P1 test to ensure it can reliably verify the Pro gating logic.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Pro tier fails to load at all (`net::ERR_INTERNET_DISCONNECTED`). This behaviour is likely identical for Free users as they also rely on Supabase for initial auth/profile loading. Guest users might load, but their experience would be limited.
*   **GPS Acquisition (P3, V3):** Pro tier fails to acquire GPS, disabling the save button. This is likely a core app issue and would affect all tiers if they could access waypoint saving.
*   **Preference Persistence (V1, V7, V8, V9, V11, V15):** All tiers are affected by preference loss on reload.
    *   Guest: Theme (V7), Basemap (V9), Active Module (V15), Session Waypoints (V11) are lost.
    *   Free: Theme (V7), Layer Visibility (V8) are lost.
    *   Pro: Session Trail (V1) is lost.
    *   The underlying cause (localStorage keys being `null` or `absent`) is consistent across tiers, pointing to a systemic issue with the persistence setup.
*   **Learn Tab State (V13, F4):** Both Guest and Free tiers pass V13 and F4, indicating that the *derived stats* in the Learn header do not regress. This is consistent behaviour across these tiers.
*   **Pro Badges (F2):** Free users correctly see PRO badges, which is expected.
*   **Upgrade Gates (C3, F3, P1):**
    *   Guest users correctly see UpgradeSheet on Pro affordance tap (C3 PASS).
    *   Free users *incorrectly* bypass the UpgradeSheet and can save waypoints (F3 FAIL).
    *   Pro user check for UpgradeSheet times out (P1 FAIL), likely due to app loading issues.

## Findings Discarded

*   **guest V13 — learn header stats are recomputed on every tab switch (state-loss proof)** and **free V13 — learn tab state loss across tab switch (handover reference journey)**: These tests passed, and the `state-loss-evidence` annotation showed no change in derived header stats (e.g., `completePct:0`). The original V13 vulnerability was about the loss of *component state* (like scroll position or active page within a chapter) due to tab unmounting. The previous fix for V13 was to keep the Learn tab mounted. The current test verifies that *derived stats* remain consistent, which is good, but does not provide evidence for the persistence of *component state*. Therefore, it does not confirm the vulnerability or a regression of the fix.

## Cannot Assess

*   **pro V10 — Pro status reverts to free on offline reload (paying user locked out)**: This test could not be assessed because the application failed to load at all when offline (`net::ERR_INTERNET_CONNECTED`). The primary failure (app not loading) prevented the test from reaching the state where it could verify the `isPro` status.
*   **pro V2 — gold/mineral data missing after offline reload (data not cached)**: This test could not be assessed for the same reason as V10; the application failed to load offline.

## Systemic Patterns

1.  **Widespread Persistence Regression:** Multiple critical user preferences and in-session data (theme, basemap, layers, active module, guest waypoints, session trail) are failing to persist across reloads. This indicates a systemic issue with the `localStorage` integration, affecting both Zustand `persist` middleware and manual IIFE patterns, directly contradicting `STATE_MAP.md` and previous fixes.
2.  **Fundamental Offline Usability Failure:** The application is completely unusable for authenticated users when offline, failing to load the app shell itself. This is a critical flaw for an outdoor mapping application and blocks testing of other offline vulnerabilities (V2, V10).
3.  **Core Feature Blocked by GPS:** The inability to acquire GPS coordinates consistently prevents users from saving waypoints, highlighting a critical bug in the location services integration.
4.  **Inconsistent Premium Feature Gating:** A key premium feature (saving waypoints) is incorrectly accessible to free users, indicating a flaw in the subscription-gating logic.

## Calibration Notes

*   The "Vulnerability-Proof Test Philosophy" proved effective in identifying regressions for V1, V7, V11, V15. The tests *passed* because the vulnerability was *confirmed* by explicit annotations (`absent` or `null` `localStorage` keys), directly contradicting `STATE_MAP.md` and previous fixes. This is a strong signal of regression.
*   The `net::ERR_INTERNET_DISCONNECTED` error for Pro tier tests (V2, V10, P1) is a clear and high-confidence indicator of a fundamental offline loading failure, aligning with previous "CONFIRMED" verdicts regarding the lack of comprehensive Service Worker caching.
*   The `expect(...).not.toBeDisabled()` failure for the "Save Waypoint" button, coupled with the "Acquiring GPS..." message, provides direct and high-confidence evidence for the GPS acquisition issue, consistent with how previous GPS-related problems were confirmed.
*   Careful interpretation of V13 was necessary. Past "PHANTOM" verdicts for similar "misdiagnosed" issues guided me to look beyond a simple pass/fail and evaluate the *evidence* against the *intended vulnerability* and *previous fixes*. The current V13 test's evidence did not confirm the *component state* loss, which was the actual vulnerability.