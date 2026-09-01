# UX Agent Report — 2026-09-01

## Run Context
- Commits analysed: `83cee57baefa3c65699442cd987eec135d615fa0` and 19 preceding commits.
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

### 3. High: Widespread Preference and Session Data Loss on Reload (V1, V7, V8, V9, V11, V15 Regressions)
- Summary: User-selected theme, basemap, layer visibility, active module, guest waypoints, and active GPS session trail are lost on page reload, reverting to defaults or vanishing entirely, indicating a systemic regression in state persistence.
- Tier(s) affected: All
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm `userStore.theme` is not persisting via `ee_theme`.
    - `guest V9` (timeout) and `free V8` (timeout) imply `mapStore.basemap` and `mapStore.layerVisibility` are resetting, indicating `ee-map-prefs` persistence failure.
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states `mapStore.sessionWaypoints` is not persisting via `ee_guest_waypoints`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states `moduleStore.activeModule` is not persisting via `ee_active_module`.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states `mapStore.sessionTrail` is not persisting via `ee_session_trail`.
    - `STATE_MAP.md` confirms all these items *should* be persisted via Zustand `persist` or manual `localStorage` keys.
- Cannot confirm: The exact state of `ee-map-prefs` for V8/V9, only that the tests timed out trying to assert their persistence.
- Root cause: Despite `STATE_MAP.md` indicating persistence mechanisms (Zustand `persist` or manual `localStorage` IIFE patterns) for these items, the test results show these mechanisms are either not active, misconfigured, or being overwritten. The `null` values for `ee_theme` suggest the `localStorage` key itself is not being written or read correctly.
- User impact: Users constantly lose their settings, active work (tracks, waypoints), and preferred view, leading to high frustration and a perception of an unreliable app.
- Business impact: Decreased user satisfaction, reduced engagement, and potential abandonment.
- Fix direction: Investigate `localStorage` read/write patterns for `ee_theme`, `ee_guest_waypoints`, `ee_active_module`, `ee_session_trail`, and the Zustand `persist` configuration for `ee-map-prefs`.

### 4. Medium: Free User Can Save Waypoints Instead of Being Prompted to Upgrade (F3)
- Summary: A free tier user is incorrectly allowed to access the `WaypointSheet` via the camera button, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failing (`Received: false`). Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the UpgradeSheet was *not* shown, but the WaypointSheet *was*. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the WaypointSheet.
- Cannot confirm: If attempting to save a waypoint as a free user would result in a specific error message or silent failure, as the test only covers the gating.
- Root cause: The gating logic for the camera button (which triggers waypoint saving) is incorrectly allowing free users to access the `WaypointSheet` instead of redirecting them to the `UpgradeSheet`.
- User impact: Free users can attempt to save waypoints, only to likely encounter a save failure later (as saving to Supabase is a Pro feature), leading to confusion and frustration. It also misses an opportunity to upsell.
- Business impact: Lost conversion opportunities from free to Pro, and potential negative user experience when free users hit a paywall unexpectedly after attempting to save.
- Fix direction: Correct the conditional rendering/routing logic for the camera button based on `userStore.isPro` to ensure free users are directed to the `UpgradeSheet`.

### 5. Medium: Offline Data Write Failures (V4, V6, V14 Confirmed)
- Summary: The app confirms known vulnerabilities where user-generated data (tracks, routes) fails to save offline, and there's no pre-save warning for offline status.
- Tier(s) affected: Pro (inferred Free/Guest for relevant features).
- Confidence: HIGH
- Evidence:
    - `pro V4` passed: This test confirms the vulnerability that track save fails offline.
    - `pro V6` passed: This test confirms the vulnerability that route save offline produces no user-facing toast.
    - `pro V3` (though blocked by GPS issue) includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the absence of an offline warning before attempting to save.
    - `STATE_MAP.md` explicitly lists `V3, V4, V6, V14` as "still NOT persisted (genuine vulnerabilities)" and "large scope, deferred".
- Cannot confirm: The exact toast message for V4, as the test only confirms the failure.
- Root cause: Absence of an offline data sync queue or local-first write strategy. Supabase write operations fail directly when offline.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline, without adequate warning or recovery mechanisms.
- Business impact: Significant data loss leads to user distrust and abandonment, especially for core prospecting activities.
- Fix direction: Implement an offline-first data strategy with a local sync queue (e.g., IndexedDB) and clear offline status indicators/warnings.

### 6. Low: Free User Incorrectly Displayed as "Pro Member" in Profile View (F1 related)
- Summary: A free tier user is incorrectly displayed with a "Pro Member" badge in their profile view, creating confusion and misrepresenting their subscription status.
- Tier(s) affected: Free.
- Confidence: HIGH
- Evidence: Screenshot `test-results/free/f1-profile.png` clearly shows "test-free" with a "Pro Member" badge. The `free F1` test *passed* because it asserts "authenticated profile is loaded from storageState", which it is, but the *content* of the profile is incorrect.
- Cannot confirm: If this is a display-only bug or if `userStore.isPro` is actually `true` for this free user. The `global-setup.js` for free tier should ensure `isPro: false`.
- Root cause: Likely a display logic error in `ProfileView` or an incorrect `isPro` state hydration for free users. `STATE_MAP.md` indicates `isPro` is hydrated from Supabase `profiles.is_pro` and persisted to `ee-user-prefs`.
- User impact: Misleading information for the user, potentially causing confusion about their subscription status and benefits.
- Business impact: Undermines the value proposition of the Pro tier if free users appear to have Pro status. Could lead to support queries.
- Fix direction: Investigate the `ProfileView` rendering logic for the "Pro Member" badge and ensure `userStore.isPro` is correctly `false` for free users.

## Tier Comparison

-   **Offline App Loading (V2, V10):** The Pro tier explicitly fails to load offline (`net::ERR_INTERNET_DISCONNECTED`). This behavior is inferred for the Free tier as it also relies on authentication and initial data loading from Supabase. The Guest tier is not tested for this scenario, but as it does not rely on Supabase authentication, it might exhibit different (potentially partial) loading behavior.
-   **GPS Acquisition (P3, V3):** The Pro tier consistently fails to acquire GPS, leading to a disabled "Save Waypoint" button. This issue would prevent waypoint saving for Free and Guest tiers as well, if they were permitted to save waypoints.
-   **Preference and Session Data Loss (V1, V7, V8, V9, V11, V15):** This is a widespread issue affecting all tiers. Theme (V7) resets for both Guest and Free users. Basemap (V9) and Layer Visibility (V8) preferences appear to reset for Guest and Free users (indicated by test timeouts). Guest Waypoints (V11) and Active Module (V15) are lost for Guest users. Session Trail (V1) is lost for Pro users. This indicates a systemic failure in `localStorage` persistence mechanisms across the application.
-   **Free User Waypoint Gating (F3):** This issue is specific to the Free tier, where tapping the camera button incorrectly opens the `WaypointSheet` instead of the `UpgradeSheet`.
-   **Offline Data Writes (V4, V6, V14):** The vulnerabilities for offline data writes (track save failure, silent route save failure, no pre-save warning) are confirmed for the Pro tier. These are general offline data handling issues that would affect any tier attempting to save data offline.
-   **Free User "Pro Member" Badge (F1 related):** This visual misrepresentation is specific to the Free tier, where the profile incorrectly displays a "Pro Member" badge.
-   **Learn Tab Header Stats Persistence (V13):** The behavior is identical across Guest and Free tiers. The `state-loss-evidence` annotation confirms that Learn tab header statistics (`courses`, `completePct`, `chaptersDone`) *do not* regress to zero after a tab switch. This indicates that the previous fix for V13 (making tabs always-mounted) is successfully preventing state loss for these specific metrics.

## Findings Discarded

-   **Pro User UpgradeSheet Not Triggered on Pro Affordance Tap (P1 Timeout):** This finding was discarded due to low confidence. The `pro P1` test failed with a timeout, which is ambiguous. It does not directly confirm whether the `UpgradeSheet` was incorrectly shown or if the Pro affordance tap itself failed or led to an unexpected state. This suggests a test reliability issue rather than a clear UX bug related to the UpgradeSheet.
-   **Learn Tab Header Stats Recomputation (V13):** This was initially considered as a potential issue based on the test description "state-loss proof". However, the `state-loss-evidence` annotation clearly shows that the header stats (`courses`, `completePct`, `chaptersDone`) are identical before and after tab switching. Since the test *passed* and the evidence shows *no state loss* for the measured metric, this indicates the previous fix for V13 (preserving tab state) is working as intended for these stats. Therefore, it is not a finding of a UX issue.

## Cannot Assess

-   The exact state of `ee-map-prefs` in `localStorage` for the `guest V9` and `free V8` tests, as these tests timed out rather than providing explicit `localStorage` values. While the timeouts strongly imply a reset to defaults, direct evidence of the `localStorage` key's content would provide higher confidence.
-   The specific error messages or toasts for offline data write failures (V4, V6) beyond the confirmation that the operations failed or were silent.

## Systemic Patterns

-   **Persistence Regression**: A critical and widespread regression in `localStorage` persistence mechanisms is evident. Multiple user preferences (theme, basemap, layer visibility) and session-specific data (guest waypoints, active module, GPS session trail) are failing to persist across page reloads, affecting all user tiers. This points to a systemic issue with how `localStorage` is being written to or read from, potentially due to recent changes affecting Zustand's `persist` middleware or the manual IIFE patterns.
-   **Incomplete Offline-First Implementation**: The application demonstrates a fundamental lack of robust offline capability for authenticated users. The core app shell and critical initial data are not adequately cached, leading to complete app failure when offline. Furthermore, user-generated data writes (waypoints, tracks, routes) lack local queuing and proper user feedback when offline, resulting in data loss and poor user experience.
-   **Inconsistent Gating Logic**: There are specific flaws in how user subscription status (`isPro`) is applied to UI elements and feature access. This is seen in the Free user being incorrectly granted access to the `WaypointSheet` and being visually misrepresented as a "Pro Member" in the profile. This suggests inconsistencies or bugs in the conditional rendering and routing logic based on authentication and subscription status.

## Calibration Notes

-   Learned to scrutinize "passed" tests, especially those with "confirmed vulnerability" annotations, to ensure the evidence directly supports the vulnerability and not a positive outcome. The `V13` test was a good example where a "pass" with "no state loss" actually confirmed a *fix* for the measured metric, rather than an active vulnerability.
-   Prioritized critical blockers like app loading failures and core functionality breakage (GPS acquisition) over preference resets, even if the latter are widespread.
-   Continued to be wary of Playwright timeouts as definitive proof of a specific UX issue, instead treating them as indicators of test flakiness or general interaction problems unless direct evidence (e.g., screenshots, explicit annotation values) confirms the specific UX state. This avoids re-introducing PHANTOM errors.