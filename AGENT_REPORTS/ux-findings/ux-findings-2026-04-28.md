# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `7e0bddd`, `9f184cb`, `2c70af7`, `8182f75`, `efb4d8c`, `3c915be`, `ca1ad91`, `032d09e`, `48395fe`, `68b57ff`, `a44d60f`, `35ad5d6`, `86a220a`, `be55413`, `ca5445a`, `d84b479`, `86a599f`, `10ca499`, `fe53e9b`, `3292a07` (20 commits)
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 7/8, free 6/7, pro 4/9
- Historical accuracy: Confirmed: 11 (61%) | Phantom: 5 (28%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Pro Subscription Status Lost on Offline Reload (V10)
- Summary: Paying Pro users lose their subscription status and access to Pro features if the app is reloaded while offline, despite a previous fix attempt.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro V10` test failed with `error: Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This directly confirms the scenario where an offline reload occurs and the app fails to load, implying the Pro status cannot be re-established. STATE_MAP.md notes `useAuth.onAuthStateChange` may overwrite `isPro` to false on offline JWT expiry, and `task-005` was intended to address this. The test failure indicates the fix is not fully effective.
- Cannot confirm: The exact UI state after the offline reload, as the test timed out during the reload itself.
- Root cause: The mechanism for persisting `userStore.isPro` and `userStore.subscriptionStatus` (via `persist` middleware, `task-001`) or the guard in `useAuth.onAuthStateChange` (via `task-005`) is not robust enough to maintain Pro status during an offline reload, leading to a reliance on Supabase reads that fail without connectivity.
- User impact: Critical loss of functionality for paying users, who are locked out of features they've paid for, leading to extreme frustration and inability to use the app in common offline scenarios.
- Business impact: Severe damage to user trust, high churn risk for Pro subscribers, and potential for refund requests.
- Fix direction: Re-evaluate the interaction between `zustand-persist` for `userStore` and `useAuth.onAuthStateChange` to ensure `isPro` and `subscriptionStatus` are reliably hydrated from local storage even when offline.

### 2. Core Map Data Missing After Offline Reload (V2)
- Summary: Critical map data layers like gold samples and mineral localities fail to load after an offline reload, rendering the map largely useless for prospecting.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `pro V2` test failed with `error: Error: page.goto: net::ERR_INTERNET_DISCONNECTED`. This confirms the scenario of an offline reload. STATE_MAP.md explicitly states `gold_samples` and `mineral_localities` queries "No data loads" offline.
- Cannot confirm: Visual evidence of the empty map, as the test timed out during the reload itself.
- Root cause: `useGoldSamples` and `useMineralLocalities` fetch data directly from Supabase on app mount without any local caching mechanism (e.g., `IndexedDB` or `localStorage`).
- User impact: Prevents users from performing core prospecting activities when offline, which is a frequent scenario in rural Ireland, making the app unreliable.
- Business impact: Reduces the app's core value proposition, leading to low engagement and negative reviews.
- Fix direction: Implement a local caching strategy (e.g., `IndexedDB`) for critical read-only map data, allowing it to be available offline.

### 3. Offline Data Loss for User-Generated Content (V3, V4, V14)
- Summary: User-generated content (waypoints, tracks) is lost if the user attempts to save it while offline, with no prior warning or retry mechanism.
- Tier(s) affected: free, pro (guest waypoints are memory-only regardless, covered by V11)
- Confidence: HIGH
- Evidence: `pro V3` test failed with a disabled save button, and the annotation `v14-pre-save-offline-warning: no (V14 confirmed)` directly confirms the lack of an offline warning before attempting to save. `pro V4` passed, confirming "track save fails offline (post-stop data loss)". STATE_MAP.md explicitly states `waypoints` INSERT and `tracks` INSERT "Fails" offline, resulting in "YES — waypoint data gone" and "YES — entire GPS trail... gone".
- Cannot confirm: The exact toast message for V3, as the test timed out before the save attempt.
- Root cause: Supabase write operations for `waypoints` and `tracks` are performed directly without an offline queue or local-first persistence. V14 is confirmed because there's no pre-save connectivity check.
- User impact: Critical data loss for users who spend significant time creating content, leading to severe frustration and distrust. This is particularly problematic for prospectors who operate in areas with intermittent connectivity.
- Business impact: High churn risk, negative reviews, and a perception of an unreliable and data-unsafe application.
- Fix direction: Implement an offline sync queue (e.g., using `IndexedDB`) for all user-generated content, allowing local-first saves and automatic syncing when connectivity is restored. Add a clear offline warning (V14) before attempting a save.

### 4. GPS Track Lost on Reload (V1)
- Summary: Accumulated GPS track data is lost if the application is reloaded or crashes during an active tracking session, as it is not auto-saved.
- Tier(s) affected: pro (likely all tiers with tracking capability)
- Confidence: HIGH
- Evidence: `pro V1` test passed, with the annotation `track-survived-reload: no (V1 confirmed)`. This directly confirms the vulnerability. STATE_MAP.md notes `sessionTrail` accumulates in memory and is "NOT persisted anywhere until the user explicitly saves." `task-006` was intended to fix this, but the test result indicates it is still active.
- Cannot confirm: The exact duration or complexity of the lost track, but the principle of loss is confirmed.
- Root cause: `sessionTrail` is stored in volatile `mapStore` memory and is not automatically persisted to `localStorage` during active tracking, making it vulnerable to browser tab closure or app crashes.
- User impact: Significant loss of valuable user-generated data (e.g., a multi-hour hike track), leading to extreme frustration and potential abandonment of the tracking feature.
- Business impact: Reduces the perceived reliability and value of a core feature, potentially impacting user engagement and retention.
- Fix direction: Debug `task-006` to ensure `sessionTrail` is correctly persisted to `localStorage` (e.g., `ee_session_trail`) incrementally during active tracking.

### 5. Pro Users Still See PRO Badges / Upgrade Prompts (P1 Regression)
- Summary: Authenticated Pro users are still shown "PRO" badges on features in the LayerPanel and may be routed to the UpgradeSheet, despite having an active subscription.
- Tier(s) affected: pro
- Confidence: HIGH
- Evidence: `pro P1` test failed (timed out), but the annotation `pro-badge-count: 8 (expected: 0 for Pro tier)` provides direct evidence that 8 PRO badges were visible to a Pro user. This contradicts the expected behavior for Pro users. `task-004` was intended to fix this.
- Cannot confirm: Whether the UpgradeSheet was explicitly shown, as the test timed out. However, the presence of badges is sufficient evidence of a UX issue.
- Root cause: The conditional logic to hide PRO badges (`!isPro` guard in LayerRow, as per `task-004` fix) is either not correctly implemented, or the `isPro` state is not being correctly read or propagated for Pro users in this specific component.
- User impact: Annoyance and confusion for paying subscribers who are constantly reminded to upgrade to a tier they already possess, undermining the value of their subscription.
- Business impact: Erodes trust and satisfaction among the most valuable user segment, potentially leading to churn.
- Fix direction: Debug the `isPro` state propagation and the conditional rendering logic for PRO badges within the LayerPanel to ensure they are correctly hidden for Pro users.

### 6. Theme Resets to Default on Reload (V7)
- Summary: The user's selected theme preference (e.g., 'light' mode) is not persisted across page reloads and reverts to the default 'dark' theme.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` tests passed. `guest V7` annotations show `theme-initial: dark`, `theme-after-flip: light`, `theme-after-reload: dark`. `free V7` annotations show `tFlipped: light`, `tReloaded: dark`. This directly confirms the theme preference is lost. This contradicts STATE_MAP.md which states `userStore.theme` is persisted via `ee-user-prefs` (`task-001`).
- Cannot confirm: The exact cause of the `persist` middleware failure for this specific field.
- Root cause: Despite `userStore.theme` being listed in STATE_MAP.md as persisted via `zustand-persist` (`task-001`), the test evidence indicates the persistence mechanism is not functioning correctly for the `theme` field.
- User impact: Minor annoyance as users have to re-select their preferred theme after every reload.
- Business impact: Small negative impact on user experience and attention to detail, but not critical.
- Fix direction: Investigate why `userStore.theme` is not being correctly persisted and rehydrated by the `zustand-persist` middleware, despite its configuration.

### 7. Active Module Resets to Default on Reload (V15)
- Summary: The user's last active module preference (e.g., 'prospecting') is not persisted across page reloads and reverts to the default.
- Tier(s) affected: all
- Confidence: HIGH
- Evidence: `guest V15` test passed, confirming "activeModule defaults to prospecting on reload". This directly confirms the vulnerability. This contradicts STATE_MAP.md which states `moduleStore.activeModule` is persisted via `ee-module-prefs` (`task-001`).
- Cannot confirm: The exact cause of the `persist` middleware failure for this specific field.
- Root cause: Despite `moduleStore.activeModule` being listed in STATE_MAP.md as persisted via `zustand-persist` (`task-001`), the test evidence indicates the persistence mechanism is not functioning correctly for the `activeModule` field.
- User impact: Minor annoyance as users have to re-select their preferred module after every reload.
- Business impact: Small negative impact on user experience and workflow, but not critical.
- Fix direction: Investigate why `moduleStore.activeModule` is not being correctly persisted and rehydrated by the `zustand-persist` middleware, despite its configuration.

### 8. Guest Waypoints Lost on Reload (V11)
- Summary: Waypoints created by guest users are not persisted locally and are lost upon page reload.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, confirming "session waypoints are memory-only (vanish on reload)". This directly confirms the vulnerability. This contradicts STATE_MAP.md which states `mapStore.sessionWaypoints` persists via a dedicated key `ee_guest_waypoints` (manual IIFE + write pattern, `task-002`).
- Cannot confirm: The exact cause of the manual persistence pattern failure.
- Root cause: Despite `task-002` intending to persist guest waypoints using a manual `localStorage` pattern, the test evidence indicates this mechanism is not functioning correctly, and `sessionWaypoints` remains volatile.
- User impact: Loss of valuable temporary data for unauthenticated users, discouraging engagement and potential conversion to a free or paid account.
- Business impact: Hinders guest user experience and reduces the likelihood of conversion.
- Fix direction: Debug the manual persistence pattern for `sessionWaypoints` (`ee_guest_waypoints`) to ensure waypoints are correctly written to and read from `localStorage` for guest users.

## Tier Comparison

-   **V7 (Theme Resets):** Behaviour is identical across **guest** and **free** tiers, confirming the theme preference is lost on reload for all authenticated and unauthenticated users. This suggests a core issue with the `zustand-persist` setup for `userStore.theme`, independent of authentication status.
-   **V13 (Learn Header Stats):** Behaviour is identical across **guest** and **free** tiers. Both tests passed, and the `state-loss-evidence` annotation showed `completePct:0` before and after tab switching. This indicates that the *header statistics themselves* did not regress, implying the fix for V13 (preserving component state across tab switches) is holding for these specific stats. The test title "state-loss proof" is misleading in this context, as the evidence shows no loss for the header stats.
-   **V11 (Guest Waypoints):** Confirmed for the **guest** tier. This vulnerability specifically targets unauthenticated users.
-   **V15 (Active Module Resets):** Confirmed for the **guest** tier. This suggests a core issue with the `zustand-persist` setup for `moduleStore.activeModule`, independent of authentication status.
-   **F2 (PRO Badges for Free User):** The `free F2` test passed with `pro-badge-count: 10`, which is the *expected* behaviour for free users (seeing PRO badges to encourage upgrade). This contrasts with the `pro P1` finding where Pro users *also* see PRO badges, which is *not* expected.

## Findings Discarded

-   **`guest V9` (basemap resets to satellite on reload):** Discarded. The test timed out (`Test timeout of 60000ms exceeded`). While STATE_MAP.md indicates `basemap` *should* be persisted, the timeout prevents confirmation of the actual state after reload.
-   **`free V8` (layer preferences reset to defaults on reload):** Discarded. The test timed out (`Test timeout of 60000ms exceeded`). While STATE_MAP.md indicates `layerVisibility` *should* be persisted, the timeout prevents confirmation of the actual state after reload.
-   **`pro V6` (route save offline produces no user-facing toast):** Discarded. The test passed, but the annotation `route-button-missing: cannot proof V6` explicitly states the test could not provide evidence for the silent failure aspect of V6. The evidence is too weak to confirm the vulnerability.

## Cannot Assess

-   No specific components or suites were skipped. All available tests ran.

## Systemic Patterns

-   **Persistence Middleware Inconsistencies:** There is a significant pattern of fields (`theme`, `activeModule`, `sessionWaypoints`) that STATE_MAP.md explicitly states are persisted (either via `zustand-persist` or manual `localStorage` patterns) but are consistently shown by test results to *not* be persisted. This indicates a systemic issue with the implementation or configuration of persistence mechanisms across multiple stores, leading to a divergence between architectural ground truth and observed behaviour.
-   **Fundamental Offline-First Gaps:** Critical offline functionality remains broken or unimplemented across multiple core features (Pro status, core map data loading, user-generated content saving). This suggests that the application's design does not adequately account for offline scenarios, which is a critical requirement for its target user base. Many of these were previously "fixed" but are re-confirmed as active vulnerabilities.

## Calibration Notes

-   **Trusting Direct Test Evidence over STATE_MAP.md when Contradictory:** This run highlighted several direct contradictions between the `STATE_MAP.md` (architectural ground truth) and the explicit evidence from test annotations (e.g., `theme-after-reload: dark`, `track-survived-reload: no`, `pro-badge-count: 8`). In these cases, the direct, observable test evidence was prioritised, indicating that the `STATE_MAP.md` itself may need updating or that the implementation of the described persistence mechanisms is flawed.
-   **Interpreting "Passed" Vulnerability Tests:** A "PASS" for a vulnerability test (e.g., `guest V11`, `pro V1`) correctly indicates that the test journey *completed and successfully demonstrated the vulnerability*, not that the vulnerability was fixed. This interpretation was crucial for identifying active issues.
-   **Scrutinizing Weak Annotations:** The `pro V6` test with `cannot proof V6` annotation served as a reminder to discard findings where the test itself admits it cannot provide sufficient evidence, preventing phantom errors.
-   **Timeout Interpretation:** Timeouts, especially in offline scenarios (`net::ERR_INTERNET_DISCONNECTED`), were treated as strong evidence of failure to achieve the desired state (e.g., loading Pro status or map data offline), rather than simply an inconclusive test.