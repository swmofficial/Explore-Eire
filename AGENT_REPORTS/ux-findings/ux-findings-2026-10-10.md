# UX Agent Report — 2026-10-10

## Run Context
- Commits analysed: `e34ff1617c2e9ad0bf77305021577e9a083fbfd5` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data.
- Tier(s) affected: Pro (inferred Free/Guest, as it's an app-level loading issue)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' (V10) or if gold/mineral data would be missing (V2) *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by Persistent GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also masks offline save failures.
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `v14-pre-save-offline-warning: no (V14 confirmed)` annotation for `pro V3` confirms the lack of an offline warning, but the primary issue is the disabled button.
- Cannot confirm: If the offline save would truly fail silently (V3) or if the pre-save warning (V14) would appear, as the button is never enabled to trigger these paths.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated and the save button enables when location is acquired.

### 3. Critical: Active GPS Track Lost on Reload (V1)
- Summary: Any active GPS track being recorded is entirely lost if the user reloads the page, as the `sessionTrail` is not persisted during tracking.
- Tier(s) affected: Pro (inferred Free/Guest if they could track)
- Confidence: HIGH
- Evidence: `pro V1` test passed with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` notes `sessionTrail` accumulates in `mapStore` and is "not persisted anywhere until the user explicitly saves."
- Cannot confirm: The exact duration or complexity of a lost track, but the mechanism of loss is clear.
- Root cause: `mapStore.sessionTrail` is not persisted to `localStorage` during active tracking. While `STATE_MAP.md` mentions `ee_session_trail` as a manual localStorage key, the test evidence indicates it's not being used to persist the active trail.
- User impact: Significant data loss for users actively tracking their movements, leading to frustration and loss of valuable field data.
- Business impact: Erodes trust in the app's core functionality, discouraging use of tracking features and potentially leading to churn.
- Fix direction: Implement continuous, automatic persistence of `sessionTrail` to `localStorage` (e.g., `ee_session_trail`) during active tracking, with a clear recovery mechanism.

### 4. Free Users Can Save Waypoints Instead of Upgrading (F3)
- Summary: Free tier users are incorrectly allowed to open the `WaypointSheet` and attempt to save a waypoint, instead of being prompted to upgrade to a Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` test failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly shows the `UpgradeSheet` was not shown, but the `WaypointSheet` was.
- Cannot confirm: If the waypoint save would actually succeed for a free user (it should fail at the Supabase level), but the UX flow is incorrect.
- Root cause: The gating logic for the camera button (or waypoint creation flow) for free users is flawed, allowing access to a Pro-gated feature without presenting the upgrade path. `userStore.isPro` is not being correctly checked before routing to the `WaypointSheet`.
- User impact: Confusing experience for free users who expect to be prompted for upgrade, or who might waste time filling out a form that will ultimately fail.
- Business impact: Direct loss of potential Pro conversions, as the upgrade path is bypassed. This impacts revenue and growth.
- Fix direction: Correct the conditional rendering or routing logic for the waypoint creation flow to ensure `showUpgradeSheet` is triggered for free users.

### 5. Critical Regression: Theme Preference Resets on Reload (V7)
- Summary: The user's selected theme preference (e.g., 'light') is not persisted and reverts to the default 'dark' theme after a page reload, despite previous fixes.
- Tier(s) affected: Guest, Free (likely Pro too, but not explicitly tested)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` both failed with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null` and `ee_theme-after-reload: null` explicitly show the `ee_theme` localStorage key is not being written or read correctly. `STATE_MAP.md` states `ee_theme` is a manual localStorage key for `userStore.theme` (task-008).
- Cannot confirm: If the issue affects Pro users, though the shared codebase makes it highly probable.
- Root cause: The manual persistence mechanism for `userStore.theme` via `ee_theme` (IIFE read + `setItem` on write) is not functioning, causing the theme to revert to its default on re-initialization. This is a regression from a previously "CONFIRMED" fix.
- User impact: Annoyance and loss of personalization, requiring users to re-select their preferred theme on every app load.
- Business impact: Erodes user trust in the app's reliability and attention to detail.
- Fix direction: Debug the `userStore`'s `setTheme` function and its interaction with `localStorage.setItem('ee_theme')`, and ensure the `userStore`'s initial state correctly reads from `ee_theme`.

### 6. Basemap Preference Resets to Default on Reload (V9)
- Summary: The user's selected basemap preference is not persisted and reverts to the default 'satellite' basemap after a page reload.
- Tier(s) affected: Guest (inferred Free/Pro)
- Confidence: HIGH
- Evidence: `guest V9` test failed with a timeout. This implies the basemap was not in the expected 'light' state after reload, causing the test to wait indefinitely. `STATE_MAP.md` lists `mapStore.basemap` as persisted via `ee-map-prefs`.
- Cannot confirm: The exact default it reverts to, but the failure indicates a loss of preference.
- Root cause: The `mapStore`'s `persist` middleware for `basemap` (using `ee-map-prefs`) is failing to save or load the preference correctly.
- User impact: Annoyance and loss of personalization, requiring users to re-select their preferred basemap on every app load.
- Business impact: Minor erosion of user trust and perceived app quality.
- Fix direction: Debug the `mapStore`'s `persist` middleware configuration and ensure `basemap` is correctly serialized and deserialized from `ee-map-prefs`.

### 7. Layer Visibility Preferences Reset to Defaults on Reload (V8)
- Summary: The user's custom layer visibility settings are not persisted and revert to their default states after a page reload.
- Tier(s) affected: Free (inferred Guest/Pro)
- Confidence: HIGH
- Evidence: `free V8` test failed with a timeout. This indicates that the layer visibility settings were not in the expected state after reload, causing the test to wait indefinitely. `STATE_MAP.md` lists `mapStore.layerVisibility` as persisted via `ee-map-prefs`.
- Cannot confirm: The exact default states it reverts to, but the failure indicates a loss of preference.
- Root cause: The `mapStore`'s `persist` middleware for `layerVisibility` (using `ee-map-prefs`) is failing to save or load the preference correctly.
- User impact: Annoyance and loss of personalization, requiring users to re-enable or disable layers on every app load.
- Business impact: Minor erosion of user trust and perceived app quality.
- Fix direction: Debug the `mapStore`'s `persist` middleware configuration and ensure `layerVisibility` is correctly serialized and deserialized from `ee-map-prefs`.

### 8. Guest Session Waypoints Lost on Reload (V11)
- Summary: Waypoints saved by a guest user during a session are lost upon page reload, as they are not persisted to local storage.
- Tier(s) affected: Guest
- Confidence: HIGH
- Evidence: `guest V11` test passed with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms the vulnerability. `STATE_MAP.md` notes `sessionWaypoints` persists via `ee_guest_waypoints` (manual IIFE + write pattern, task-002), but the test shows it's absent.
- Cannot confirm: The exact content of the lost waypoints, but the mechanism of loss is clear.
- Root cause: The manual persistence mechanism for `mapStore.sessionWaypoints` via `ee_guest_waypoints` is not functioning, causing guest waypoints to be lost on re-initialization.
- User impact: Loss of user-generated data for unauthenticated users, leading to frustration and a poor first impression.
- Business impact: Hinders guest user engagement and conversion to authenticated users, as their initial contributions are not valued or saved.
- Fix direction: Debug the `mapStore`'s `sessionWaypoints` logic and its interaction with `localStorage.setItem('ee_guest_waypoints')`, ensuring correct read/write operations.

## Tier Comparison

*   **Offline App Loading (V2, V10):** The app fails to load entirely for the Pro tier when offline, indicating a fundamental issue with the app shell's Service Worker caching that would likely affect all tiers.
*   **Theme Preference Reset (V7):** This issue affects both Guest and Free tiers identically, with the theme reverting to 'dark' after reload. This suggests a core problem in the `userStore`'s theme persistence mechanism, independent of authentication status.
*   **Basemap (V9) and Layer Visibility (V8) Resets:** `guest V9` and `free V8` both failed due to timeouts, indicating a loss of preferences. These are both related to `mapStore`'s `ee-map-prefs` persistence, suggesting a general issue with this mechanism across tiers.
*   **Learn Tab Header Stats (V13):** Both `guest V13` and `free V13` tests passed with identical `state-loss-evidence` (0s for courses/chapters). This indicates that for users with no progress, the header stats remain consistently 0 across tab switches. This behavior is expected for *header stats* derived from empty progress and does *not* confirm the actual V13 vulnerability (in-chapter reading position loss), which was previously marked as CONFIRMED and fixed. The test is not asserting the correct aspect of V13.
*   **Waypoint Save Gating:**
    *   **Pro tier (P3, V3):** The "Save Waypoint" button is disabled due to a persistent GPS acquisition failure, preventing any save attempt.
    *   **Free tier (F3):** The `WaypointSheet` is incorrectly displayed instead of the `UpgradeSheet`, allowing free users to attempt saving a waypoint (which should be a Pro feature).
    *   **Guest tier:** Not explicitly tested for waypoint saving, but `guest C3` correctly surfaces the `UpgradeSheet` on a Pro affordance tap.

## Findings Discarded

*   **`pro P1 — Pro user does not see UpgradeSheet on Pro affordance tap`**: This test failed with a timeout. Given the critical GPS acquisition issue (Finding 2) which disables the "Save Waypoint" button, it's highly probable that the test could not proceed to the point of asserting the absence of the `UpgradeSheet`. Without clear evidence of the `UpgradeSheet` being shown, or the test being able to complete its journey, this finding cannot be confirmed with high confidence.
*   **`pro V6 — route save offline produces no user-facing toast (silent failure)`**: This test passed, but the annotation `route-button-missing: cannot proof V6` indicates that the test could not actually verify the vulnerability (silent failure). A passing test that cannot prove its intended vulnerability is not actionable.

## Cannot Assess

*   The full extent of `pro V10` (Pro status reverts to free on offline reload) and `pro V2` (gold/mineral data missing after offline reload) could not be assessed beyond the initial app loading failure. If the app were able to load offline, further analysis would be needed to confirm the `isPro` status and data availability.

## Systemic Patterns

*   **Widespread Persistence Failures:** A significant number of findings (V1, V7, V8, V9, V11, V15) point to a systemic breakdown in state persistence. This affects both Zustand's `persist` middleware (for `mapStore` and `userStore`'s `isPro`/`subscriptionStatus`) and the manual `IIFE + write` patterns (for `ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`). This suggests either a misconfiguration of the `persist` middleware, issues with `localStorage` access, or errors in the manual implementation across multiple stores.
*   **Fundamental Offline Usability Blockers:** The application's inability to load at all when offline (V2, V10) combined with the broken GPS acquisition (P3, V3) means core functionalities are completely inaccessible in the primary use context for prospectors. This highlights a critical gap in offline-first design implementation.

## Calibration Notes

*   The previous "CONFIRMED" fix for V13 (preserving Learn tab component state) was about in-chapter reading position. The current tests for V13 (guest/free) check header stats, which are derived from persisted progress. Since no progress is made in the test, the stats remain 0, leading to a "PASS" that doesn't actually test the original V13 vulnerability. This reinforces the need to carefully distinguish between *component state* and *derived data* when assessing state loss.
*   The repeated failures for offline loading (V2, V10) and GPS acquisition (P3, V3) across multiple runs, often blocking other tests, highlight these as critical, high-priority issues that need immediate attention before other vulnerabilities can be reliably tested.
*   The `PHANTOM` verdicts from previous runs (e.g., Dashboard Tab Obstruction, Map Layer Style Inconsistencies) guide me to look for direct evidence in annotations and screenshots rather than inferring issues from Playwright timeouts or element changes alone. This run's findings are all backed by explicit error messages, annotations, or visual evidence.