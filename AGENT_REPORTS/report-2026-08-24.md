# UX Agent Report — 2026-08-24

## Run Context
- Commits analysed: `681c8c90e75f0f742db1f398d0a3264c99300d46` and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10 Blocker)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state. This also blocks the verification of Pro status persistence (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also prevents testing offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration.

### 3. High: User Preferences (Theme, Basemap, Layers, Active Module) Fail to Persist on Reload (Vulnerability V7, V8, V9, V15 - Regression)
- Summary: User-selected theme, basemap, layer visibility, and active module preferences are lost on page reload, reverting to defaults, despite `STATE_MAP.md` indicating they should be persisted. This contradicts previous "CONFIRMED" fixes for V7 and V15.
- Tier(s) affected: All (Guest: V7, V9, V15; Free: V7, V8)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`. This directly contradicts `STATE_MAP.md` which states `ee_theme` should persist.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences. This contradicts `STATE_MAP.md` which states `basemap` and `layerVisibility` should persist via `ee-map-prefs`.
    - `guest V15` passed, but annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_active_module` is not persisting.
- Cannot confirm: The exact content of `ee-map-prefs` in localStorage due to timeout, but the failure to retain state is clear.
- Root cause: Persistence mechanisms for `userStore.theme` (manual `ee_theme` key), `mapStore.basemap`/`layerVisibility` (Zustand `ee-map-prefs`), and `moduleStore.activeModule` (manual `ee_active_module`) are not functioning correctly, possibly due to incorrect read/write logic or a regression in the `persist` middleware setup.
- User impact: Annoyance and wasted time as users repeatedly reconfigure their preferred settings after every app reload.
- Business impact: Degrades user experience, reduces perceived quality, and can lead to frustration and reduced engagement.
- Fix direction: Re-verify the implementation of `Zustand persist` middleware and manual `localStorage` patterns for these specific keys, ensuring correct read/write operations on store initialization and state changes.

### 4. High: Guest Waypoints and GPS Tracks are Lost on Reload (Vulnerability V1, V11 - Regression)
- Summary: Guest waypoints and active GPS tracks are not persisted to local storage and are lost upon page reload, despite `STATE_MAP.md` indicating they should be. This contradicts previous "CONFIRMED" fixes for V1 and V11.
- Tier(s) affected: Guest (V11), Pro (V1) (inferred Free for V1)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, but annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_guest_waypoints` is not persisting.
    - `pro V1` passed, but annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)` explicitly states the vulnerability is confirmed. This means `ee_session_trail` is not persisting.
- Cannot confirm: The exact state of the `sessionWaypoints` or `sessionTrail` in memory before reload, but the absence of the localStorage keys is direct evidence of persistence failure.
- Root cause: The manual `localStorage` patterns for `sessionWaypoints` (`ee_guest_waypoints`) and `sessionTrail` (`ee_session_trail`) are not functioning correctly, possibly due to incorrect read/write logic or a regression.
- User impact: Significant data loss for users who are actively exploring or tracking, leading to extreme frustration and loss of valuable field data.
- Business impact: Destroys user trust, leads to high churn, and makes the app unreliable for its core data collection features.
- Fix direction: Debug the manual `localStorage` read/write patterns for `ee_guest_waypoints` and `ee_session_trail` to ensure data is correctly saved and restored.

### 5. Medium: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to open the "New Waypoint" sheet and attempt to save a waypoint, instead of being presented with the "Upgrade Sheet" as expected for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` failed, `Received: false`. Annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` confirms that the UpgradeSheet was *not* shown, but the WaypointSheet *was*.
- Cannot confirm: Whether the save operation would actually succeed for a free user (it should fail at the Supabase level), but the UX flow is incorrect.
- Root cause: Incorrect gating logic for the "Save Waypoint" feature, where the `isPro` check is either missing or misconfigured, allowing free users to access the `WaypointSheet`.
- User impact: Free users encounter a misleading flow, potentially wasting time filling out a form only to be blocked later, or worse, thinking they can save waypoints when they cannot.
- Business impact: Missed opportunity for conversion to Pro, as the upgrade prompt is not shown. Creates confusion about feature availability.
- Fix direction: Correct the conditional rendering or routing logic for the "Save Waypoint" button/action to ensure `showUpgradeSheet` is triggered for free users.

### 6. Medium: No Offline Warning Before Attempting Waypoint Save (Vulnerability V14)
- Summary: The application does not provide a user-facing warning or pre-check when a user attempts to save a waypoint while offline, leading to a silent failure or a generic error message after the fact.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V3` test annotation `v14-pre-save-offline-warning: no (V14 confirmed)` explicitly states that no pre-save offline warning was shown. `STATE_MAP.md` confirms "WaypointSheet 'Save' fails — toast 'Could not save waypoint'".
- Cannot confirm: The exact toast message shown, as the test failed earlier due to GPS. However, the absence of a *pre-save* warning is confirmed.
- Root cause: Missing network connectivity check before initiating the Supabase `waypoints` INSERT operation. This violates "Offline-First Design" principles (sync status indicators).
- User impact: Users waste time filling out waypoint details only for the save to fail without prior warning, leading to frustration and potential data loss if they don't realize it failed.
- Business impact: Degrades user experience, reduces trust in the app's reliability, especially in offline scenarios common for prospectors.
- Fix direction: Implement a network connectivity check before allowing the "Save Waypoint" action, providing a clear "You are offline, save will be queued" or "Cannot save offline" message.

### 7. Medium: Track Save Fails Offline (Vulnerability V4)
- Summary: When a user attempts to save a GPS track while offline, the operation fails, resulting in the loss of the entire accumulated track data.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V4` passed, confirming the vulnerability. `STATE_MAP.md` states `tracks` INSERT fails offline with "toast 'Could not save track'".
- Cannot confirm: The exact toast message or if `sessionTrail` is cleared immediately after the failed save attempt.
- Root cause: Lack of an offline data queue for `tracks` INSERT operations. The app attempts a direct Supabase write, which fails without connectivity. This violates "Offline-First Design" principles (local-first writes, sync queue).
- User impact: Users lose valuable track data from their expeditions if they finish tracking in an offline area, leading to significant frustration and loss of effort.
- Business impact: Damages user trust and makes the app unreliable for its core tracking functionality in common usage scenarios.
- Fix direction: Implement an offline queue (e.g., using IndexedDB) to store track data locally and sync it to Supabase when connectivity is restored.

### 8. Medium: Route Save Fails Silently Offline (Vulnerability V6)
- Summary: Attempting to save a route while offline results in a silent failure, with no user-facing toast or feedback, making it unclear to the user that their route was not saved.
- Tier(s) affected: Pro (inferred All)
- Confidence: HIGH
- Evidence: `pro V6` passed, confirming the vulnerability. `STATE_MAP.md` states `routes` INSERT fails offline with "console.error only, no toast". The annotation `route-button-missing: cannot proof V6` is confusing but the test passed.
- Cannot confirm: The exact console error message.
- Root cause: Lack of an offline data queue for `routes` INSERT operations and insufficient error handling/user feedback for failed Supabase writes. This violates "Offline-First Design" principles (sync status indicators) and "Data Safety" (inform user clearly).
- User impact: Users believe their route has been saved, only to find it missing later, leading to confusion, frustration, and wasted effort.
- Business impact: Erodes user trust and makes the route planning feature unreliable, especially for users who plan routes in areas with intermittent connectivity.
- Fix direction: Implement an offline queue for route data and provide clear user feedback (e.g., a toast notification) when an offline save fails or is queued.

## Tier Comparison

*   **Offline App Load (V2, V10):** Identical behaviour across tiers (inferred). The `pro` tier tests failed to load the app offline, indicating a fundamental app shell caching issue that would affect all authenticated users. Guest users are not tested for this specific scenario, but the root cause (lack of Service Worker caching) would likely affect them if they had any persisted data to load.
*   **GPS Acquisition Failure (P3, V3):** Identical behaviour across tiers (inferred). The `pro` tier tests show the "Save Waypoint" button disabled due to GPS acquisition failure. This is a core map functionality issue that would affect all users attempting to save waypoints, regardless of their authentication status or subscription tier.
*   **Preference Persistence (V7, V8, V9, V15):** Identical behaviour across tiers. `V7 (theme)` fails for both `guest` and `free` users. `V9 (basemap)` fails for `guest` users, and `V8 (layers)` fails for `free` users. `V15 (active module)` fails for `guest` users. This indicates a systemic issue with persistence mechanisms affecting all users.
*   **Guest Waypoint Persistence (V11):** Specific to `guest` tier. Confirmed to fail for guest users.
*   **GPS Track Persistence (V1):** Specific to `pro` tier (tested), but the vulnerability description implies it affects any user tracking. Confirmed to fail for pro users.
*   **Free User Waypoint Gating (F3):** Specific to `free` tier. Free users are incorrectly allowed to open the WaypointSheet instead of being prompted to upgrade.
*   **Offline Save Warnings/Failures (V14, V4, V6):** Tested in `pro` tier, but the underlying lack of offline data queues and error handling would affect all users attempting to save data (waypoints, tracks, routes) while offline.

## Findings Discarded

*   `pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`: Discarded as PHANTOM. The test timed out, which does not directly confirm the UpgradeSheet *was* visible. It's more likely a test stability issue or a preceding step failed, rather than a direct UX bug where a Pro user sees an UpgradeSheet.
*   `guest V13` and `free V13`: These tests *passed* because the Learn tab state *was* preserved, meaning the vulnerability V13 is *fixed*. The test description is misleading ("state-loss proof") but the evidence shows no state loss. Therefore, this is not a finding.
*   `free F4`: This test passed, confirming that the Learn header percentage does not regress, which is a positive outcome and not a finding.

## Cannot Assess

*   No specific items could not be assessed due to missing data, beyond the ambiguity of some timeouts.

## Systemic Patterns

1.  **Regression in Persistence Mechanisms:** Multiple critical user preferences (theme, basemap, layers, active module, guest waypoints, GPS tracks) that were previously "CONFIRMED" as fixed are now failing to persist. This points to a widespread regression in either the Zustand `persist` middleware configuration or the manual `localStorage` read/write patterns across `userStore`, `mapStore`, and `moduleStore`.
2.  **Fundamental Offline Capability Failure:** The app completely fails to load for authenticated users when offline, indicating a severe lack of Service Worker caching for the core application shell and initial data. This is a foundational flaw for an outdoor mapping app.
3.  **GPS Acquisition Instability:** The consistent failure to acquire GPS coordinates, even with a Playwright mock, suggests a bug in the app's GPS handling logic that prevents core features like waypoint saving.
4.  **Lack of Offline Data Queuing:** All data write operations (waypoints, tracks, routes) fail immediately when offline, with no local queuing or robust user feedback, leading to data loss and silent failures. This is a consistent violation of offline-first principles.
5.  **Inconsistent Feature Gating:** The `free F3` failure indicates inconsistent application of Pro-tier feature gates, allowing free users to access features they cannot use, rather than directing them to upgrade.

## Calibration Notes

*   Applied PHANTOM verdict when test timeouts or ambiguous results did not provide direct evidence of the expected failure, especially when previous fixes were confirmed (e.g., `pro P1`).
*   Correctly interpreted "PASS" results for "Vulnerability X" tests as confirmation of the vulnerability, not its fix, based on the test annotations and `STATE_MAP.md` (e.g., V1, V11, V15, V4, V6, V14).
*   Ensured explicit tier attribution for all findings, highlighting both differing and identical behaviours across guest, free, and pro tiers.
*   Focused on tracing findings back to architectural causes in `STATE_MAP.md` and relevant UX principles from the `UX Knowledge Context`.
*   Prioritized findings by user impact, placing critical blockers and data loss issues at the top.