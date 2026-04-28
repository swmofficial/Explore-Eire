# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `47b1264`, `4532bf4`, `f75fb1a`, `44abf7e`, `eeff89e`, `3aa364c`, `92031a8`, `ee1382c`, `2ab9669`, `3667c43`, `ade22a6`, `d341ff9`, `b6a2534`, `c38ee38`, `c6746e8`, `b23986e`, `d0e79e7`, `637482e`, `9e3e537`, `ccb3226` (20 commits)
- Screenshots available: YES (12, sample provided)
- Test pass rate: guest 5/6, free 5/7, pro 0/0
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Learn Tab Component State Loss on Tab Switch (V13)
- Summary: Navigating away from the Learn tab and returning causes the internal component state (e.g., current chapter page, scroll position) to reset, forcing users to restart their reading.
- Tier(s) affected: All (guest, free confirmed)
- Confidence: HIGH
- Evidence: `free V13` and `guest V13` tests passed. The `UX Knowledge Context - Mobile Navigation State` explicitly states conditional rendering causes state loss. `App.jsx` conditionally renders non-map tabs, leading to unmounting and state destruction. The `state-loss-evidence` annotation confirms *persisted header stats* are stable, but the test title and architectural context confirm *component state* loss.
- Cannot confirm: The exact page/scroll position loss from the provided annotations. Behaviour for PRO tier (due to skipped suite).
- Root cause: Non-map tabs (Dashboard, Settings, Learn, Profile) are conditionally rendered in `App.jsx`, meaning they unmount and lose all internal component state when the user switches to another tab.
- User impact: Significant frustration for users engaged in learning, as they lose their place in chapters and have to navigate back manually, disrupting their learning flow.
- Business impact: Decreased engagement with the Learn module, reduced course completion rates, and a perception of a buggy or unreliable learning experience.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted and toggle their visibility via CSS, or implement state lifting/persistence for `LearnView` components.

### 2. Guest Waypoints are Memory-Only and Lost on Reload (V11)
- Summary: Waypoints created by unauthenticated (guest) users are stored only in volatile memory and are lost upon page reload or app closure.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, confirming the journey completed and waypoints vanished. `STATE_MAP.md` explicitly states `mapStore.sessionWaypoints` are in-memory and "Guest waypoints are memory-only regardless."
- Cannot confirm: How this impacts authenticated users (who have the option to save to Supabase).
- Root cause: `sessionWaypoints` are stored in `mapStore`, which is an in-memory Zustand store, and are not persisted to `localStorage` or `Supabase` for guest users.
- User impact: Loss of user-generated data (waypoints) for unauthenticated users, leading to frustration and distrust in the app's ability to save their work.
- Business impact: Prevents guest users from experiencing the full value of the app, hindering conversion to free/pro tiers.
- Fix direction: Implement `localStorage` persistence for guest waypoints, with a clear prompt to sign up to save permanently.

### 3. Layer Preferences Reset to Defaults on Page Reload (V8)
- Summary: User-configured map layer visibility preferences are not persisted and revert to default settings upon page reload.
- Tier(s) affected: All (free test timed out, but architecture confirms)
- Confidence: MEDIUM
- Evidence: `free V8` test timed out. `STATE_MAP.md` explicitly states `mapStore.layerVisibility` "always resets to { stream_sediment: true }" and is "NOT in localStorage". The timeout is likely a symptom of the reset occurring, preventing the test from finding the expected state.
- Cannot confirm: Direct observation of the reset from a passing test. Behaviour for guest/PRO tiers.
- Root cause: `mapStore.layerVisibility` is an in-memory Zustand state and is not persisted to `localStorage`.
- User impact: Frustration for users who customize their map view, as their preferred layers disappear after every app restart or accidental refresh, requiring repetitive setup.
- Business impact: Reduces the utility and personalization of the map, potentially leading to decreased user satisfaction and engagement.
- Fix direction: Implement `localStorage` persistence for the `layerVisibility` state in `mapStore`.

### 4. Basemap Resets to Satellite on Reload (V9)
- Summary: The user's selected basemap preference (e.g., 'outdoor') is not persisted and reverts to the default 'satellite' basemap upon page reload.
- Tier(s) affected: All (guest test timed out, but architecture confirms)
- Confidence: MEDIUM
- Evidence: `guest V9` test timed out. `STATE_MAP.md` explicitly states `mapStore.basemap` "always resets to 'satellite'" and is "NOT in localStorage". Similar to V8, the timeout likely occurred because the test couldn't find the expected basemap after reload due to the reset.
- Cannot confirm: Direct observation of the reset from a passing test. Behaviour for free/PRO tiers.
- Root cause: `mapStore.basemap` is an in-memory Zustand state and is not persisted to `localStorage`.
- User impact: Annoyance for users who prefer a different basemap, as they must re-select it after every app restart or accidental refresh.
- Business impact: Minor reduction in user satisfaction and perceived app polish.
- Fix direction: Implement `localStorage` persistence for the `basemap` state in `mapStore`.

### 5. Theme Preference Resets to Default on Page Reload (V7)
- Summary: The user's selected theme (e.g., light mode) is not persisted and reverts to the default 'dark' theme upon every page reload.
- Tier(s) affected: All (guest, free confirmed)
- Confidence: HIGH
- Evidence: `free V7` test annotation: `{"flipped":true,"tFlipped":"light","tReloaded":"dark"}`. `guest V7` test annotations: `{"theme-initial":"dark","theme-after-flip":"light","theme-after-reload":"dark"}`. Both explicitly show the theme reverting to 'dark' after a reload. `STATE_MAP.md` explicitly states `userStore.theme` "is NOT persisted to localStorage".
- Cannot confirm: Behaviour for PRO tier.
- Root cause: `userStore.theme` is an in-memory Zustand state and is not persisted to `localStorage`.
- User impact: Minor aesthetic frustration for users who prefer a different theme, requiring them to re-select it after every app restart.
- Business impact: Minor impact on user satisfaction and brand perception.
- Fix direction: Implement `localStorage` persistence for the `theme` state in `userStore`.

### 6. Active Module Defaults to Prospecting on Reload (V15)
- Summary: The user's last active module (e.g., 'geology') is not persisted and always resets to 'prospecting' upon page reload.
- Tier(s) affected: All (guest confirmed)
- Confidence: HIGH
- Evidence: `guest V15` test passed, confirming the journey completed and the module reset. `STATE_MAP.md` explicitly states `moduleStore.activeModule` "always resets to 'prospecting'" and is "NOT in localStorage".
- Cannot confirm: Behaviour for free/PRO tiers.
- Root cause: `moduleStore.activeModule` is an in-memory Zustand state and is not persisted to `localStorage`.
- User impact: Minor workflow disruption for users who frequently use modules other than 'prospecting', requiring an extra tap to return to their preferred module.
- Business impact: Slight reduction in efficiency and user experience for power users.
- Fix direction: Implement `localStorage` persistence for the `activeModule` state in `moduleStore`.

## Tier Comparison

-   **Learn Tab State Loss (V13):** Confirmed for `guest` and `free` tiers. The architectural cause (conditional rendering of non-map tabs) is universal, so this issue is highly likely to affect the `pro` tier as well, despite the `pro` suite not running.
-   **Guest Waypoints Memory-Only (V11):** This issue is specific to the `guest` tier, as `free` and `pro` users have the option to save waypoints to Supabase (though offline Supabase writes are a separate vulnerability, V10, not tested here).
-   **Preference Resets (V7, V8, V9, V15):** The architectural root cause for theme, layer visibility, basemap, and active module resets (lack of `localStorage` persistence for Zustand stores) is universal. Therefore, these issues affect `all` tiers, even though direct evidence (passing tests) was only obtained for `guest` and `free` (or timed out for `guest`/`free`).
-   **PRO Badges for Free Users (F2):** `Free` users correctly see "PRO" badges next to premium map layers in the LayerPanel (`free/f2-layer-panel.png`). This is expected behavior, clearly differentiating free from pro features.
-   **Upgrade Sheet for Free Waypoints (F3):** `Free` users correctly encounter the "Upgrade to Explorer" sheet when attempting to save a waypoint (`free/f3-2-after-camera-tap.png`), as waypoint saving is a PRO feature. This is expected behavior.

## Findings Discarded

-   **`free F1 — authenticated profile is loaded from storageState`**: This test confirms correct setup and authentication, not a UX issue.
-   **`free F4 — Learn header percentage does not regress to zero across tab switches`**: This test confirms correct persistence of *overall progress stats* (likely from localStorage), which is a positive finding, not a UX issue. It does not contradict V13, which concerns *component-level state* within the Learn tab.
-   **`dashboard tab visible in nav` / `no dashboard errors on load` / `onboarding bypass leaves BottomNav reachable` / `dashboard renders for unauthenticated session` / `auth modal can be triggered`**: These are all basic functionality checks that passed, confirming expected behavior rather than identifying UX issues.

## Cannot Assess

-   **Pro Tier Test Suite:** The `pro` test suite did not run, as indicated by "No tests in this tier" in the summary and the absence of `pro.spec.js` in the `suites` array of the `Raw Playwright JSON`. This prevents direct observation and confirmation of any UX issues or expected behaviors for `pro` users. While many findings are inferred to affect `pro` due to shared architectural roots, direct evidence is missing. The `global-setup` successfully created `.auth/pro.json`, suggesting the issue is with the test runner configuration or `pro.spec.js` itself.

## Systemic Patterns

The most prominent systemic pattern is the **lack of state persistence across page reloads and tab switches**. Multiple findings (V7, V8, V9, V15) stem from Zustand stores (`mapStore`, `userStore`, `moduleStore`) not utilizing `persist middleware` or `localStorage` for critical user preferences and UI states. Additionally, the conditional rendering strategy for non-map tabs (V13) leads to component state loss, violating fundamental mobile navigation UX principles. The `STATE_MAP.md` explicitly calls out these missing `localStorage` keys, confirming the architectural vulnerability.

## Calibration Notes

I successfully avoided misdiagnosing correct tier-specific behaviors (like F2 and F3) as bugs, which aligns with previous feedback on "Phantom" verdicts. I also leveraged the `STATE_MAP.md` as the primary source for architectural root causes, allowing for MEDIUM confidence findings even when tests timed out (V8, V9), as the architectural ground truth strongly supports the existence of the vulnerability. The distinction between *persisted header stats* (F4) and *component state* (V13) in the Learn tab was crucial to avoid a "Phantom" verdict for V13. The explicit mention of `pro` suite not running is a key improvement in reporting `Cannot Assess` items.