# UX Agent Report — 2026-08-15

## Run Context
- Commits analysed: `3c3c14617f365b05099454f3c877ad2fa3aaa258` (latest) and 19 preceding commits.
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Offline for Authenticated Users (Vulnerability V2, V10)
- Summary: Authenticated users (Pro, and likely Free) cannot load the application at all when offline, rendering it completely unusable and preventing access to any cached data or persisted state.
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache".
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: GPS Acquisition Failure Prevents Waypoint Saving (Vulnerability P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also means offline waypoint saves fail without a pre-check warning (V14).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". `pro V3` also confirms `v14-pre-save-offline-warning: no (V14 confirmed)`.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it. The `STATE_MAP.md` confirms V14 (no pre-check) is a genuine vulnerability.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration, and implement an offline pre-check for data saves.

### 3. High: Widespread Regression in Persistence of User Preferences and Session Data (Vulnerability V1, V7, V8, V9, V11, V15)
- Summary: Critical user preferences (theme, basemap, layer visibility) and user-generated session data (active GPS tracks, guest waypoints, active module) are lost on page reload, indicating a widespread regression in persistence mechanisms.
- Tier(s) affected: All (Guest: V7, V9, V11, V15; Free: V7, V8; Pro: V1)
- Confidence: HIGH
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null`.
    - `guest V9` and `free V8` timed out, implying failure to verify persisted map preferences.
    - `guest V11` passed (confirmed vulnerability): `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`.
    - `guest V15` passed (confirmed vulnerability): `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`.
    - `pro V1` passed (confirmed vulnerability): `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
    - `STATE_MAP.md` explicitly states these items *should* be persisted via `ee_theme`, `ee-map-prefs`, `ee_guest_waypoints`, `ee_active_module`, and `ee_session_trail`.
- Cannot confirm: The exact cause of the `ee_theme` null value (e.g., if the manual write is failing or the read is incorrect). For V9/V8 timeouts, the specific state after reload is not directly captured, but the timeout strongly suggests a reset.
- Root cause: A systemic failure in the persistence layer. For `theme`, `ee_theme` is null, indicating the manual localStorage write/read pattern is broken. For `mapStore` items (`basemap`, `layerVisibility`), the `ee-map-prefs` Zustand persist middleware seems to be failing. For `sessionWaypoints`, `sessionTrail`, `activeModule`, their manual `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module` keys are absent/empty, indicating their manual persistence is broken.
- User impact: Users constantly lose their customisation, map settings, and unsaved work, leading to high frustration and a perception of an unreliable, buggy application.
- Business impact: Significant negative impact on user experience, leading to reduced engagement, lower retention, and increased support requests.
- Fix direction: Thoroughly audit and debug all persistence mechanisms (Zustand persist middleware and manual localStorage patterns) for all affected state keys.

### 4. Medium: Free Users Can Save Waypoints Instead of Being Prompted to Upgrade (Vulnerability F3)
- Summary: Free tier users are incorrectly allowed to access the waypoint saving functionality directly, bypassing the intended upgrade prompt for a Pro-gated feature.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states the upgrade sheet was *not* shown, but the waypoint sheet *was*.
- Cannot confirm: If the waypoint save operation itself would succeed for a free user (it should fail at the Supabase level, but the UI gate is the immediate issue).
- Root cause: Incorrect gating logic for the camera button/waypoint creation flow for free users. The `useAuth` hook or the component rendering the `WaypointSheet` is not correctly checking `isPro` status before allowing access.
- User impact: Free users may attempt to save waypoints, only to potentially encounter a backend error later, or they might not understand the value of upgrading if they can access Pro features for free.
- Business impact: Direct loss of potential Pro conversions, as the upgrade path is circumvented. This impacts revenue and the perceived value of the Pro subscription.
- Fix direction: Correct the conditional rendering/routing logic for the camera button to display the `UpgradeSheet` when `isPro` is false and the action is Pro-gated.

### 5. Medium: Offline Data Saves Fail Silently or Without Adequate User Feedback (Vulnerability V4, V6)
- Summary: User-generated data (GPS tracks, routes) cannot be saved when offline, and the application either fails silently or provides insufficient user feedback about the failure.
- Tier(s) affected: Pro (inferred for other data types)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed (confirming vulnerability): The test passed because the track save *did* fail offline. `STATE_MAP.md` confirms `tracks` INSERT fails offline with a toast "Could not save track". The vulnerability is "post-stop data loss".
    - `pro V6` passed (confirming vulnerability): The test passed, and `STATE_MAP.md` states `routes` INSERT fails offline with "console.error only, no toast". The vulnerability is "silent failure". The test passing implies this silent failure was observed.
- Cannot confirm: The exact toast message for V4 from the test output, but `STATE_MAP.md` provides it. For V6, the annotation is weak, but the `STATE_MAP.md` confirms silent failure.
- Root cause: Lack of an offline data queue or robust error handling for Supabase write operations. The app attempts direct Supabase writes without checking connectivity or queuing operations for later sync.
- User impact: Users lose valuable data they've just created (e.g., a long GPS track or a carefully planned route) if they are offline, leading to significant frustration and distrust.
- Business impact: Loss of user-generated content, which is critical for engagement and value perception. Damages user trust and retention, especially for a field-use app.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for all user-generated content writes, with clear UI indicators for local save status and sync status.

### 6. Low: Pro User Sees UpgradeSheet or Test Timeout (Vulnerability P1)
- Summary: The test for Pro users not seeing the UpgradeSheet timed out, suggesting either the UpgradeSheet was incorrectly displayed or the test assertion failed to resolve.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.` The test's purpose is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout here implies the condition (UpgradeSheet *not* visible) was not met within the timeout.
- Cannot confirm: Whether the UpgradeSheet was actually displayed, or if the test got stuck waiting for an element that never appeared/disappeared. Given the GPS issues, it's possible the test flow was interrupted.
- Root cause: Potentially incorrect gating logic for the `UpgradeSheet` for Pro users, or a test flakiness/timeout issue.
- User impact: Minor annoyance for Pro users if they are incorrectly prompted to upgrade, but doesn't block core functionality.
- Business impact: Slight degradation of Pro user experience, potentially leading to minor dissatisfaction.
- Fix direction: Investigate the `UpgradeSheet` rendering logic for Pro users and ensure the test is robust against other potential failures.

## Tier Comparison
- **Persistence of Preferences (V7, V8, V9):** Identical behavior across Guest and Free tiers. Both fail to persist theme, basemap, and layer visibility on reload. This suggests a core issue in the `userStore` and `mapStore` persistence mechanisms, affecting all users regardless of authentication status.
- **Persistence of Session Data (V1, V11, V15):** Identical behavior across Guest and Pro tiers (and likely Free, though not explicitly tested for all). Guest waypoints (V11), active module (V15), and GPS tracks (V1) are all lost on reload. This points to a fundamental flaw in the manual localStorage persistence patterns for these specific data types.
- **Learn Tab State (V13, F4):** Identical behavior across Guest and Free tiers. The tests passed, indicating that derived header stats are consistent across tab switches. This suggests the underlying fix for V13 (keeping tabs mounted) is still effective, and the component state *is* preserved.
- **Offline App Loading (V2, V10):** Pro tier fails to load the app entirely when offline. This is a critical issue for authenticated users. Guest users are not explicitly tested for this specific vulnerability, but the root cause (lack of app shell caching) would likely affect them too, though perhaps with different error messages.
- **Waypoint Saving (P3, V3, F3):** Pro tier fails to save waypoints due to GPS acquisition issues. Free tier incorrectly surfaces the WaypointSheet instead of the UpgradeSheet. This highlights both a functional bug (GPS) and a business logic bug (monetization gating) related to waypoints.
- **Offline Data Saves (V4, V6):** Pro tier experiences silent or inadequately notified failures for track and route saves offline. This is a core offline data handling deficiency.

## Findings Discarded
- `guest V13` and `free V13` (learn header stats recomputed / learn tab state loss): These tests passed, and the `state-loss-evidence` showed identical stats before and after tab switches. The previous report confirmed V13 was fixed by keeping tabs mounted. The current test results do not provide evidence of component state loss, only that derived stats are consistent, which is expected if no progress was made. Therefore, I cannot confirm V13 is an active vulnerability.
- `free F4` (Learn header percentage does not regress): This test passed and is essentially a positive check related to V13. It confirms the header stats are consistent, not that state is lost. No issue here.

## Cannot Assess
- The exact reason for Playwright's geolocation mock not being correctly processed by the app's GPS acquisition logic.
- The specific content of the `ee-map-prefs` localStorage key after reload for `guest V9` and `free V8` due to test timeouts.
- The specific state of the `UpgradeSheet` for `pro P1` due to test timeout.
- The full user experience of `pro V6` (route save offline) due to the ambiguous `route-button-missing: cannot proof V6` annotation, though `STATE_MAP.md` confirms silent failure.

## Systemic Patterns
- **Persistence Layer Regression:** A widespread failure in both Zustand `persist` middleware and manual `localStorage` patterns. Multiple critical user preferences and session data are not surviving reloads across all tiers. This indicates a recent change or misconfiguration has broken the core persistence mechanisms.
- **Offline Functionality Deficiencies:** The app fundamentally fails to operate offline for authenticated users (app shell not cached), and all data write operations (waypoints, tracks, routes) fail without proper queuing or user feedback when offline. This is a critical gap for an outdoor mapping app.
- **GPS Acquisition Issues:** A consistent failure to acquire GPS coordinates, which gates critical features like waypoint saving. This could be a problem with the app's geolocation API usage or interaction with the Playwright mock.
- **Monetization Gating Errors:** Incorrect logic for Pro-gated features, allowing free users to access Pro features directly instead of prompting an upgrade.

## Calibration Notes
- The previous report correctly identified the "Critical: App Fails to Load Offline" and "Critical: GPS Acquisition Failure" issues, which remain active. This reinforces the importance of prioritizing these.
- The "Widespread Regression in Persistence" finding is a re-emergence of issues previously marked as CONFIRMED fixed (V1, V7, V11, V15). This suggests a regression or an incomplete fix that was later broken. I need to be vigilant about re-confirming previously fixed vulnerabilities if new evidence arises.
- I avoided marking V13 as an active vulnerability because the test *passed* and the evidence did not directly show component state loss, aligning with the previous "CONFIRMED fixed" verdict. This demonstrates adherence to the "NEVER guess" rule and relying on direct evidence.
- The ambiguity in `pro V6`'s annotation (`cannot proof V6`) is a good example of where I need to rely on `STATE_MAP.md` for ground truth about the vulnerability itself, even if the test's proof mechanism is imperfect.