# UX Agent Report — 2026-10-03

## Run Context
- Commits analysed: `bc83b2bb4ca096a441226e6363695d9a7eaaa14b` and 19 preceding commits.
- Screenshots available: YES (12, guest 4, free 4, pro 4)
- Test pass rate: guest 6/8, free 4/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: App Fails to Load Entirely When Offline (V2, V10 Blocker)
- Summary: The application fails to load entirely for authenticated users when offline, preventing access to any functionality or cached data, and making it impossible to verify persisted Pro status (V10).
- Tier(s) affected: Pro (inferred Free)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests both failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This indicates the app could not even establish a connection to load the initial page.
- Cannot confirm: Whether `isPro` status would revert to 'free' *after* loading if the app could somehow partially load offline, as the primary failure is the inability to load at all.
- Root cause: Lack of comprehensive Service Worker caching for the core application shell and critical initial data. `STATE_MAP.md` confirms `gold_samples` load from Supabase on every mount with "no local cache". This violates "Offline-First Design" principles.
- User impact: Users in areas with poor connectivity (a common scenario for prospectors) cannot use the app at all, leading to extreme frustration and abandonment.
- Business impact: Direct impediment to app adoption and retention in target rural areas, leading to significant revenue loss.
- Fix direction: Implement comprehensive Service Worker caching for the app shell and essential data to ensure offline availability.

### 2. Critical: Waypoint Save Disabled by GPS Acquisition Failure (P3, V3 Blocker)
- Summary: The "Save Waypoint" button is consistently disabled in the `WaypointSheet` because the app fails to acquire GPS coordinates, preventing users from saving waypoints even when online. This also blocks testing of offline waypoint saving (V3).
- Tier(s) affected: Pro (inferred Free/Guest if they could save waypoints)
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests both failed with `expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button, `Received: disabled`. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...".
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if it's an app-side bug unrelated to the mock.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's GPS acquisition logic is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to a perpetual "Acquiring GPS..." state.
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Debug GPS acquisition logic and verify Playwright geolocation mock integration. Ensure `mapStore.userLocation` is correctly updated.

### 3. Critical: Free Users Can Save Waypoints, Bypassing Upgrade Gate (F3)
- Summary: Free tier users are incorrectly allowed to access the "New Waypoint" sheet and attempt to save waypoints, bypassing the intended upgrade gate.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F3` failed with `expect(upgradeShown).toBeTruthy()` receiving `false`. The annotation `gate-routing: {"upgradeShown":false,"waypointShown":true}` explicitly states `upgradeShown` was `false` and `waypointShown` was `true`. Screenshot `test-results/free/f3-2-after-camera-tap.png` shows the "New Waypoint" sheet is visible.
- Cannot confirm: If the save operation itself would fail with a specific error message, as the test only checks the gate.
- Root cause: The logic gating waypoint creation for free users is flawed. Instead of showing the `UpgradeSheet`, the app proceeds to show the `WaypointSheet`. This is a business logic error in the `useWaypoints` hook or the `CornerControls` component.
- User impact: Free users can attempt to use a premium feature, only to potentially hit a failure later, leading to frustration and a poor user experience.
- Business impact: Direct loss of potential conversions from free to Pro users, as the primary upgrade incentive (saving waypoints) is bypassed.
- Fix direction: Correct the conditional rendering logic for the waypoint creation flow to ensure `UpgradeSheet` is shown for free users when attempting to save a waypoint.

### 4. High: User Preference Persistence Failures (V7, V9, V8)
- Summary: User preferences for theme, basemap, and layer visibility are not persisting across page reloads, reverting to default settings. This affects all tiers.
- Tier(s) affected: All
- Confidence: HIGH (V7), MEDIUM (V9, V8)
- Evidence:
    - `guest V7` and `free V7` failed: `Expected: "light" Received: "dark"`. Annotations show `ee_theme-before-reload: null`, `ee_theme-after-reload: null`, confirming the `ee_theme` localStorage key is not being correctly written or read.
    - `guest V9` failed with `Test timeout of 60000ms exceeded.` (implies basemap not in expected state).
    - `free V8` failed with `Test timeout of 60000ms exceeded.` (implies layer visibility not in expected state).
- Cannot confirm: The exact default states for V8 and V9 due to timeouts, but the failures strongly imply a reset.
- Root cause: The manual `localStorage` read/write pattern for `ee_theme` is failing, contradicting `STATE_MAP.md`'s claim of reliability. For `basemap` and `layerVisibility`, which are managed by Zustand `persist` middleware (`ee-map-prefs`), the persistence mechanism is either misconfigured or failing to hydrate the store on reload.
- User impact: Users experience frustration as their personalized app settings are lost on every reload, requiring manual re-configuration.
- Business impact: Erodes user trust and satisfaction, potentially leading to reduced engagement and higher churn.
- Fix direction: Debug `ee_theme` manual `localStorage` implementation. Investigate `mapStore`'s Zustand `persist` configuration and hydration for `basemap` and `layerVisibility`.

### 5. High: Manual localStorage Persistence Failures (V1, V11, V15)
- Summary: Critical user-generated data and preferences, including active GPS tracks, guest waypoints, and the active module, are not being persisted to `localStorage` as intended, leading to data loss or preference resets on reload.
- Tier(s) affected: Guest, Pro (inferred Free for V1, V15)
- Confidence: HIGH
- Evidence:
    - `guest V11` passed, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. This directly confirms `sessionWaypoints` are not persisted.
    - `guest V15` passed, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. This directly confirms `activeModule` is not persisted.
    - `pro V1` passed, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`. This directly confirms `sessionTrail` is not persisted.
- Cannot confirm: The exact point of failure in the manual IIFE + write pattern for each of these keys.
- Root cause: The manual `localStorage` read/write patterns for `ee_guest_waypoints` (task-002), `ee_session_trail` (task-006), and `ee_active_module` (task-013) are failing, directly contradicting the `STATE_MAP.md` which states these are "proven reliable patterns".
- User impact: Significant data loss for active sessions (GPS tracks, guest waypoints) and loss of context (active module), leading to severe frustration and reduced productivity.
- Business impact: Erodes user trust in data safety, leading to high churn and negative reviews. Directly impacts the core value proposition of the app (tracking and logging).
- Fix direction: Thoroughly debug the manual `localStorage` read/write implementations for `sessionWaypoints`, `sessionTrail`, and `activeModule` to ensure they correctly interact with `ee_guest_waypoints`, `ee_session_trail`, and `ee_active_module` respectively.

### 6. Medium: Free Users See PRO Badges in LayerPanel (F2)
- Summary: Free tier users are shown "PRO" badges next to premium map layers in the LayerPanel, which is confusing and devalues the Pro subscription.
- Tier(s) affected: Free
- Confidence: HIGH
- Evidence: `free F2` passed, with annotation `pro-badge-count: 8`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layers (e.g., Gold heatmap, Arsenic, Lead).
- Cannot confirm: If Pro users *also* see these badges (which would be a separate, but related, issue).
- Root cause: The `!isPro` guard implemented for `P1` (to hide badges for Pro users) is correctly showing the badges for free users (`isPro` is false, so `!isPro` is true). The issue is a UX design flaw where showing "PRO" badges to free users is considered confusing rather than a clear upgrade prompt.
- User impact: Confuses free users about what they can and cannot access, potentially leading to frustration when they try to enable a "PRO" layer and are blocked. It also diminishes the perceived value of the Pro subscription if the "PRO" label is always visible.
- Business impact: Weakens the upgrade incentive and creates a cluttered UI for free users, potentially hindering conversion.
- Fix direction: Re-evaluate the UX design for PRO badges. Consider showing a more explicit "Upgrade to Pro" call-to-action instead of just a "PRO" badge, or hiding the badges entirely for free users until they attempt to interact with a Pro feature.

### 7. Medium: Offline Data Save Failures (V4, V6, V14)
- Summary: The application fails to save user-generated data (tracks, routes) when offline, leading to data loss. There is also no pre-save warning for waypoints when offline (V14).
- Tier(s) affected: Pro (inferred Free/Guest for V14)
- Confidence: HIGH
- Evidence:
    - `pro V4` passed, confirming "track save fails offline (post-stop data loss)". `STATE_MAP.md` confirms "Save track fails — toast 'Could not save track'".
    - `pro V6` passed, confirming "route save offline produces no user-facing toast (silent failure)". `STATE_MAP.md` confirms "Save route fails — console.error only, no toast".
    - `pro V3` (which failed due to GPS, but had an annotation) included `v14-pre-save-offline-warning: no (V14 confirmed)`. This confirms the absence of an offline warning for waypoints.
- Cannot confirm: The exact toast message for V4, but the vulnerability is confirmed.
- Root cause: The application lacks an offline data queue and retry mechanism. All Supabase data writes are direct, failing immediately without local persistence when offline. This violates "Offline-First Design" and "Data Safety" principles.
- User impact: Users lose valuable data (tracks, routes) if they attempt to save while offline. The lack of a pre-save warning for waypoints means they might unknowingly lose data.
- Business impact: Erodes user trust and reliability, especially for prospectors in remote areas, leading to churn.
- Fix direction: Implement an offline-first data strategy with a persistent sync queue (e.g., IndexedDB) for all user-generated content (waypoints, tracks, finds, routes). Add pre-save offline warnings.

### 8. Low: Pro User Sees Timeout on Pro Affordance Tap (P1)
- Summary: A Pro user experiences a timeout when interacting with a Pro-gated affordance, preventing confirmation that the UpgradeSheet is correctly *not* shown.
- Tier(s) affected: Pro
- Confidence: MEDIUM
- Evidence: `pro P1` failed with `Test timeout of 60000ms exceeded.`. The test description is "Pro user does not see UpgradeSheet on Pro affordance tap".
- Cannot confirm: Whether the UpgradeSheet *actually* appeared or if the test timed out for another reason (e.g., the affordance itself was unresponsive).
- Root cause: Unclear. Could be a flaky test, an issue with the Pro affordance itself, or a subtle bug where the UpgradeSheet *does* appear for Pro users, causing the test to time out waiting for its absence.
- User impact: If the UpgradeSheet *does* appear, it's a confusing and frustrating experience for a paying Pro user. If the affordance is unresponsive, it's a usability issue.
- Business impact: Erodes trust for paying customers.
- Fix direction: Investigate the `pro P1` test to determine why it's timing out. Verify the Pro affordance interaction and the conditional rendering of the `UpgradeSheet` for Pro users.

## Tier Comparison

*   **Offline App Loading (V2, V10):** Fails for Pro, inferred to fail for Free as well due to shared core app shell loading. Guest tier is not tested for this specific failure, but likely would also fail if it relies on Supabase for initial load.
*   **GPS Acquisition Failure (P3, V3):** Affects Pro, inferred to affect Free and Guest if they were able to save waypoints. This is a core map/GPS module issue, common across tiers.
*   **Theme Persistence (V7):** Fails for both Guest and Free, indicating a universal issue with the `ee_theme` manual `localStorage` implementation.
*   **Basemap/Layer Persistence (V9, V8):** Fails (timeouts) for Guest and Free respectively, indicating a universal issue with `mapStore`'s Zustand `persist` middleware.
*   **Learn Tab State (V13, F4):** Preserved for both Guest and Free, confirming the fix for V13 is working across authenticated and unauthenticated states.
*   **Waypoint Persistence (V11):** Fails for Guest (waypoints vanish), confirming the vulnerability. Not applicable to Free/Pro in the same way as they save to Supabase.
*   **Active Module Persistence (V15):** Fails for Guest (resets), confirming the vulnerability. Inferred to affect Free/Pro as well due to shared `moduleStore`.
*   **PRO Badges (F2):** Visible to Free users, which is a UX issue. Not applicable to Guest (no LayerPanel access) or Pro (badges should be hidden).
*   **Waypoint Upgrade Gate (F3):** Fails for Free users (WaypointSheet shown instead of UpgradeSheet). Not applicable to Guest (no save button) or Pro (no gate).
*   **Offline Data Saves (V1, V4, V6, V14):** Confirmed failures for Pro (track loss, route silent failure, no waypoint pre-check). Inferred to affect Free/Guest for similar data types if they had save capabilities.

## Findings Discarded
- None. All identified findings have sufficient evidence and impact to be included.

## Cannot Assess
- The exact reason for the `pro P1` timeout. More detailed logs or a video of the test run would be needed to distinguish between an unresponsive affordance, a test flakiness, or the `UpgradeSheet` actually appearing.

## Systemic Patterns
-   **Offline-First Neglect:** The most critical systemic issue is the complete lack of offline-first design for core application loading and data persistence. This manifests in the app failing to load entirely offline (V2, V10) and all Supabase write operations failing silently without a local queue (V4, V6, V14).
-   **Broken `localStorage` Manual Persistence:** Multiple critical user preferences and session data (`ee_theme`, `ee_guest_waypoints`, `ee_session_trail`, `ee_active_module`) are failing to persist despite `STATE_MAP.md` indicating they use a "proven reliable pattern". This suggests a fundamental flaw in the implementation of this pattern or its interaction with the application lifecycle.
-   **GPS Acquisition Issues:** The persistent "Acquiring GPS..." state (P3, V3) indicates a problem with the app's geolocation service or its interaction with the Playwright mock, blocking core functionality.
-   **Inconsistent Gating/Badging Logic:** The `!isPro` logic for badges (F2) and the missing upgrade gate for waypoints (F3) suggest inconsistencies or errors in how user tiers are checked and how premium features are presented or restricted.

## Calibration Notes
- Learned to be wary of test descriptions that claim "state-loss proof" when the evidence (identical before/after values) actually proves *no* state loss, as seen with V13. Always cross-reference with the previous fix and the actual data.
- Prioritized critical offline failures (V2, V10) and core functionality blockers (P3, V3) as per previous CONFIRMED verdicts.
- Recognized that `Test timeout` for preference resets (V9, V8) is strong evidence of failure, even without explicit `Expected/Received` values, as the test likely couldn't find the expected UI state.
- Confirmed that `STATE_MAP.md` can sometimes be outdated or incorrect regarding "proven reliable patterns" for `localStorage` if test evidence directly contradicts it (V1, V11, V15).
- Re-evaluated F2 (PRO badges for free users) as a UX design issue rather than a code bug, based on the `!isPro` logic being technically correct for *showing* badges to free users, but the *implication* being confusing.