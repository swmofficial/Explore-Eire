# UX Agent Report — 2026-04-28

## Run Context
- Commits analysed: `2ab9669`, `3667c43`, `ade22a6`, `d341ff9`, `b6a2534`, `c38ee38`, `c6746e8`, `b23986e`, `d0e79e7`, `637482e`, `9e3e537`, `ccb3226`, `bbbe88c`, `76056ce`, `5ea51e9`, `e2ebef5`, `d0c1560`, `4d6c2e1`, `7911f7b`, `8b8dfc8`
- Screenshots available: YES (12, breakdown: guest 5, free 4, pro 3)
- Test pass rate: guest 4/6, free 6/7, pro 0/0 (results truncated)
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Theme Preference Resets to Default on Page Reload (V7)
- Summary: The user's selected theme (e.g., light mode) is not persisted and reverts to the default 'dark' theme upon every page reload.
- Tier(s) affected: All (guest, free)
- Confidence: HIGH
- Evidence: `free V7` test annotation: `{"flipped":true,"tFlipped":"light","tReloaded":"dark"}`. `guest V7` test annotations: `{"theme-initial":"dark","theme-after-flip":"light","theme-after-reload":"dark"}`. Both explicitly show the theme reverting to 'dark' after a reload.
- Cannot confirm: Behaviour for PRO tier (pro.spec.js results missing).
- Root cause: `userStore.theme` is an in-memory Zustand state and is explicitly noted as "NOT persisted to localStorage" in `STATE_MAP.md`.
- User impact: Annoyance and minor frustration as users must manually re-select their preferred theme after every app restart or accidental page refresh.
- Business impact: Minor negative impact on user experience and perceived app polish. Could contribute to a feeling of unreliability.
- Fix direction: Implement `localStorage` persistence for the `theme` state in `userStore`.

### 2. Learn Tab Content State Loss on Tab Switch (V13)
- Summary: Navigating away from the Learn tab and returning causes the internal state of the Learn module (e.g., current chapter page, scroll position) to reset, forcing users to restart their reading.
- Tier(s) affected: All (guest, free)
- Confidence: MEDIUM
- Evidence: `App.jsx` conditionally renders non-map tabs, causing them to unmount on tab switch (UX Knowledge Context). `free V13` and `guest V13` tests passed, indicating the journey completed, but the `state-loss-evidence` annotation only confirms header stats (courses, completePct) remain unchanged, not deeper component state. The architectural design (conditional rendering) is the primary evidence.
- Cannot confirm: The exact page/scroll position loss from the provided annotations, nor behaviour for PRO tier.
- Root cause: Non-map tabs (Dashboard, Settings, Learn, Profile) are conditionally rendered in `App.jsx`, meaning they unmount and lose all internal component state when the user switches to another tab (as per UX Knowledge Context - Mobile Navigation State).
- User impact: Significant frustration for users engaged in learning, as they lose their place in chapters and have to navigate back manually, disrupting their learning flow.
- Business impact: Decreased engagement with the Learn module, reduced course completion rates, and a perception of a buggy or unreliable learning experience.
- Fix direction: Modify `App.jsx` to keep non-map tabs mounted and toggle their visibility via CSS, or implement state persistence for `LearnView` components.

### 3. Active Module Resets to 'Prospecting' on Page Reload (V15)
- Summary: The user's last active module preference is not remembered and defaults to 'prospecting' after a page reload.
- Tier(s) affected: All (guest)
- Confidence: HIGH
- Evidence: `guest V15` test passed. `STATE_MAP.md` explicitly states `moduleStore.activeModule` "always resets to 'prospecting'" and is "NOT in localStorage".
- Cannot confirm: Behaviour for free/PRO tiers (pro.spec.js results missing, free.spec.js didn't test this).
- Root cause: `moduleStore.activeModule` is an in-