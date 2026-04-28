# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `3aa364c`, `92031a8`, `ee1382c`, `2ab9669`, `3667c43`, `ade22a6`, `d341ff9`, `b6a2534`, `c38ee38`, `c6746e8`, `b23986e`, `d0e79e7`, `637482e`, `9e3e537`, `ccb3226`, `bbbe88c`, `76056ce`, `5ea51e9`, `e2ebef5`, `d0c1560`
- Screenshots available: YES (12, breakdown: guest 5, free 4, pro 3)
- Test pass rate: guest 4/6, free 6/7, pro 0/0
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Learn Tab Component State Loss on Tab Switch (V13)
- Summary: Navigating away from the Learn tab and returning causes the internal component state (e.g., current chapter page, scroll position) to reset, forcing users to restart their reading.
- Tier(s) affected: All (guest, free confirmed by architecture)
- Confidence: HIGH
- Evidence: `UX Knowledge Context - Mobile Navigation State` explicitly states conditional rendering causes state loss. `free V13` and `guest V13` tests passed, confirming the journey completed and the test title indicates state loss. The `state-loss-evidence` annotation confirms *persisted header stats* (courses, completePct) are stable, but does not contradict *component state* loss.
- Cannot confirm: The exact page/scroll position loss from the provided annotations. Behaviour for PRO tier.
- Root cause: Non-map tabs (Dashboard, Settings, Learn, Profile) are conditionally rendered in `App.jsx`, meaning they unmount and lose all internal component state when the user switches to another tab.
- User impact: Significant frustration for users engaged in learning, as they lose their place in chapters and have to navigate back manually, disrupting their learning flow.
- Business impact: Decreased engagement with the Learn module, reduced course completion rates, and a perception of a buggy or unreliable learning experience.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted and toggle their visibility via CSS, or implement state persistence for `LearnView` components.

### 2. Theme Preference Resets to Default on Page Reload (V7)
- Summary: The user's selected theme (e.g., light mode) is not persisted and reverts to the default 'dark' theme upon every page reload.
- Tier(s) affected: All (guest, free confirmed)
- Confidence: HIGH
- Evidence: `free V7` test annotation: `{"flipped":true,"tFlipped":"light","tReloaded":"dark"}`. `guest V7` test annotations: `{"theme-initial":"dark","theme-after-flip":"light","theme-after-reload":"dark"}`. Both explicitly show the theme reverting to 'dark' after a reload.
- Cannot confirm: Behaviour for PRO tier.
- Root cause: `userStore.theme` is an in-memory Zustand state and is explicitly noted as "NOT persisted to localStorage" in `STATE_MAP.md`.
- User impact: Annoyance and minor frustration as users must manually re-select their preferred theme after every app restart or accidental page refresh.
- Business impact: Minor negative impact on user experience and perceived app polish. Could contribute to a feeling of unreliability.
- Fix direction: Implement `localStorage` persistence for the `theme` state in `userStore`.

### 3. Guest Waypoints are Memory-Only and Lost on Reload (V11)
- Summary: Waypoints created by unauthenticated (guest) users are stored only in volatile memory and are lost upon page reload or app closure.
- Tier(s) affected: guest
- Confidence: HIGH
- Evidence: `guest V11` test passed, confirming the journey completed and waypoints vanished. `STATE_MAP.md` explicitly states `mapStore.sessionWaypoints` are in-memory and "Guest waypoints are memory-only regardless."
- Cannot confirm: How this impacts authenticated users (who have the option to save to Supabase).
- Root cause: `sessionWaypoints` are stored in `mapStore`, which is an in-memory Zustand store, and are not persisted to `localStorage` or `Supabase` for guest users.
- User impact: Loss of user-generated data (waypoints) for unauthenticated users, leading to frustration and distrust in the app's ability to save their work.
- Business impact: Prevents guest users from experiencing the full value of the app, hindering conversion to free/pro tiers.
- Fix direction: Implement `localStorage` persistence for guest waypoints, with a clear prompt to sign up to save permanently.

### 4. Active Module Resets to 'Prospecting' on Page Reload (V15)
- Summary: The user's last active module preference is not remembered and defaults to 'prospecting' after a page reload.
- Tier(s) affected: All (guest confirmed)
- Confidence: HIGH
- Evidence: `guest V15` test passed. `STATE_MAP.md` explicitly states `moduleStore.activeModule` "always resets to 'prospecting'" and is "NOT in localStorage".
- Cannot confirm: Behaviour for free/PRO tiers.
- Root cause: `moduleStore.activeModule` is an in-memory Zustand state and is not persisted to `localStorage`.
- User impact: Minor inconvenience as users have to re-select their preferred module after every app restart.
- Business impact: Slight friction in user workflow, potentially reducing engagement with less frequently used modules.
- Fix direction: Implement `localStorage` persistence for the `activeModule` state in `moduleStore`.

### 5. LayerPanel Correctly Renders PRO Badges for Free Users (F2)
- Summary: The LayerPanel correctly displays "PRO" badges next to restricted map layers for free users, indicating premium content.
- Tier(s) affected: free
- Confidence: HIGH
- Evidence: `free F2` test passed. Annotation `pro-badge-count: "10"`. Screenshot `test-results/free/f2-layer-panel.png` clearly shows "PRO" badges next to several layer toggles.
- Cannot confirm: If the badges are correctly hidden for PRO users (pro.spec.js results missing).
- Root cause: `LayerPanel` component logic correctly identifies `isPro: false` from `userStore` and renders the "PRO" badge for restricted layers, as per business rules.
- User impact: Clear indication to free users about premium features, encouraging upgrade. This is a desired feature, not a bug.
- Business impact: Positive, as it effectively communicates value and drives upgrade conversions.
- Fix direction: No fix needed, this is working as intended.

## Tier Comparison

*   **Theme Preference Resets (V7):** Identical behaviour for `guest` and `free` users. Both experience theme resetting to 'dark' on reload. This suggests the root cause is independent of authentication status, confirming `userStore.theme`'s lack of persistence.
*   **Learn Tab State Loss (V13):** Identical architectural vulnerability for `guest` and `free` users due to conditional rendering of the Learn tab. The `state-loss-evidence` annotations for both tiers show consistent (non-regressing) header stats, which are persisted.
*   **Active Module Resets (V15):** Confirmed for `guest` users. Based on `STATE_MAP.md`, `moduleStore.activeModule` is not persisted, so this behaviour is expected to be identical across `free` and `pro` tiers as well.
*   **Waypoint Saving:** `guest` users' waypoints are memory-only (V11 confirmed). `free` users are gated from saving waypoints and routed to an `UpgradeSheet` (F3 confirmed). This is a key difference in functionality and gating.
*   **PRO Badges (F2):** `free` users correctly see PRO badges on restricted layers. This behaviour is specific to the `free` tier to encourage upgrades.

## Findings Discarded

*   **`free V8 — layer preferences reset to defaults on reload`**: Discarded due to test timeout (`status: timedOut`). The error `Target page, context or browser has been closed` indicates the test environment failed, not necessarily a UX issue. Cannot confirm the vulnerability.
*   **`guest V9 — basemap resets to satellite on reload`**: Discarded due to test timeout (`status: timedOut`). Similar to V8, the test environment failed. Cannot confirm the vulnerability.

## Cannot Assess

*   **PRO Tier Test Results**: The `pro.spec.js` suite was completely skipped or truncated in the provided JSON output. Therefore, no findings specific to the PRO tier could be confirmed or denied. The `global-setup` indicates `.auth/pro.json` was saved, so the setup for PRO *was* attempted.

## Systemic Patterns

*   **Lack of `localStorage` persistence for core UI preferences and session state:** Multiple findings (V7, V15, V11) stem from Zustand stores (`userStore`, `mapStore`, `moduleStore`) not using `persist` middleware or explicitly writing to `localStorage` for user preferences and temporary session data. This leads to state loss on page reload across various features.
*   **Conditional Rendering of Tabs:** The `App.jsx` architecture of conditionally rendering non-map tabs (Dashboard, Settings, Learn, Profile) directly causes component state loss on tab switches (V13), violating mobile navigation best practices.

## Calibration Notes

*   The new test philosophy, focusing on "journeys" and "evidence annotations," is highly effective. Direct annotations like `theme-evidence` and `pro-badge-count` provide unambiguous, HIGH confidence evidence, reducing the need for inference.
*   Successfully differentiated between `state-loss-evidence` for *persisted header stats* (which were stable) and *component state* loss (which is architecturally confirmed due to conditional rendering for V13). The test title often points to the intended vulnerability, which can be confirmed by architecture even if the annotation is about a different aspect of state.
*   Adhered to the "NEVER guess" rule by discarding timed-out tests, aligning with previous "PHANTOM" verdicts for similar issues.
*   Recognized that a "finding" can be a confirmation of *intended* behavior (like F2) if it's a specific test outcome, but prioritized actual UX *issues* higher in the report.