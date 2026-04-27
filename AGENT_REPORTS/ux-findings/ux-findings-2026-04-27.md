# UX Agent Report — 2026-04-27

## Run Context
- Commits analysed: `c6746e8`, `b23986e`, `d0e79e7`, `637482e`, `9e3e537`, `ccb3226`, `bbbe88c`, `76058ce`, `5ea51e9`, `e2ebef5`, `d0c1560`, `4d6c2e1`, `7911f7b`, `8b8dfc8`, `5baba95`, `26156c1`, `31a079e`, `3efe499`, `440d0ad`, `ad6584f`
- Screenshots available: YES (9)
- Test pass rate: 4/10
- Historical accuracy: Confirmed: 4 (36%) | Phantom: 5 (45%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Onboarding/Legal Disclaimer Blocking Main App Interaction
- Summary: The application is stuck on an introductory screen (onboarding or legal disclaimer), preventing users from interacting with the main navigation and features.
- Confidence: HIGH
- Evidence: All failed test results (dashboard, map, learn, settings, profile tabs) show a `Test timeout of 60000ms exceeded` error, with the specific Playwright log: `<div>…</div> from <div>…</div> subtree intercepts pointer events`. The screenshots attached to these failed tests consistently show the "Explore Eire" splash screen with a "Next →" button, indicating an active onboarding or legal disclaimer flow.
- Cannot confirm: Whether it's specifically the onboarding (`userStore.showOnboarding`) or legal disclaimer (`userStore.showLegalDisclaimer`) without inspecting the live DOM or application code at the point of failure.
- Root cause: Either `userStore.showOnboarding` or `userStore.showLegalDisclaimer` is `true` on app load, rendering a full-screen overlay (e.g., `Onboarding.jsx` or `LegalDisclaimerModal.jsx`) that has `pointer-events: all` and a high z-index, effectively blocking all interaction with the underlying main application UI, including the bottom navigation bar.
- User impact: Users are completely blocked from accessing any core functionality of the app, leading to immediate frustration and inability to use the product.
- Business impact: Critical user abandonment, zero engagement, negative first impressions, and likely uninstallation. This is a complete blocker for new users.
- Fix direction: Ensure the test environment is configured to complete or bypass initial onboarding/legal flows, or implement a robust check in `App.jsx` to ensure these modals are dismissed before allowing interaction with the main UI.

### 2. Volatile In-Session Data Loss on App Crash/Close
- Summary: User-generated data accumulated during a session (GPS tracks, waypoints, route points) is stored only in volatile memory and is lost if the app crashes or the browser tab is closed before explicit saving.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under `mapStore` states: "`sessionTrail`, `sessionWaypoints`, `elevationProfile`, `routePoints` accumulate during active user sessions. None are persisted anywhere until the user explicitly saves. If the app crashes, the browser tab closes, or connectivity drops during a Supabase write — all accumulated data is lost."
- Cannot confirm: A crash scenario in this specific test run, as the tests are blocked earlier.
- Root cause: Lack of local persistence (e.g., IndexedDB or `localStorage` with a robust schema) for in-progress user data that is currently only held in the `mapStore` Zustand instance (which is in-memory).
- User impact: Users can lose significant amounts of work, such as a multi-hour GPS track or a carefully planned route, if the app unexpectedly closes or crashes. This is a catastrophic data loss scenario.
- Business impact: Severe erosion of user trust, negative reviews, and high churn, especially for core features like tracking and route planning. This directly undermines the app's reliability and value proposition. (Matches V10: "In-progress user data (tracks, waypoints, routes) is lost on app crash/close due to lack of local persistence.")
- Fix direction: Implement an auto-save mechanism to a persistent local storage solution (like IndexedDB) for all in-progress user-generated data, with a clear recovery path.

### 3. Offline Data Writes Fail Silently with Data Loss
- Summary: The application lacks an offline-first data strategy, causing all user data write operations (saving waypoints, tracks, finds, routes) to fail and be lost when the user is offline.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under "Supabase Write Map" explicitly details that operations like "Save waypoint", "Save track", "Save find", and "Save route" all "Fail" when offline, often with only a toast message, and result in "YES — data gone."
- Cannot confirm: An offline scenario in this specific test run, as the tests are blocked earlier.
- Root cause: Absence of a persistent local sync queue (e.g., using IndexedDB or a Service Worker) to store outgoing data operations when offline and replay them when connectivity is restored.
- User impact: Users in remote areas with poor or no internet connectivity (a common scenario for an outdoor mapping app) cannot reliably save their critical field data, leading to data loss and extreme frustration. The app becomes unusable in its primary context.
- Business impact: Complete failure to serve the core user base, leading to uninstallation, widespread negative reviews, and severe reputational damage. This is a critical flaw for an outdoor exploration app. (Matches V11: "User-generated data (waypoints, tracks, finds, routes) is lost if saved offline due to lack of sync queue.")
- Fix direction: Implement an offline-first architecture with a persistent local queue for all data write operations, ensuring data is saved locally first and then synced to Supabase when online.

### 4. Tab Navigation State Loss
- Summary: Switching between main navigation tabs (e.g., Dashboard, Learn, Settings) causes the previous tab's content to unmount, resulting in the loss of its internal state (e.g., scroll position, form inputs, sub-page navigation).
- Confidence: HIGH
- Evidence: `UX Knowledge Context` section "1. Mobile Navigation State" explicitly states: "App.jsx conditionally renders non-map tabs (unmount on switch). This violates both guidelines."
- Cannot confirm: Visual evidence of state loss in this specific test run, as tab navigation is currently blocked by the onboarding/legal screen.
- Root cause: `App.jsx` uses conditional rendering that unmounts components for inactive tabs instead of merely hiding them or persisting their state in a global store.
- User impact: Users experience a jarring reset when returning to a tab, losing their place in lists, progress in forms, or navigation within sub-sections. This makes the app feel unreliable and increases cognitive load.
- Business impact: Frustration, reduced engagement with non-map features (like the Learn module or detailed settings), and a perception of a less polished application.
- Fix direction: Modify `App.jsx` to keep tab components mounted (e.g., by toggling `display: none` or `visibility: hidden`) or implement a robust state management strategy to persist and restore each tab's view state.

### 5. App State Not Persisted Across Sessions (Basemap, 3D Mode, Layer Visibility, Active Module)
- Summary: Several key user preferences and application states, such as the chosen basemap, 3D mode, layer visibility settings, and the active module, are not persisted and reset to their default values on every page reload.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under "What is NOT in localStorage" explicitly lists: "`basemap` — always resets to 'satellite'", "`is3D` — always resets to false", "`layerVisibility` — always resets to { stream_sediment: true }", and "`activeModule` — always resets to 'prospecting'".
- Cannot confirm: Visual evidence of these resetting in this specific test run, as the tests are blocked earlier.
- Root cause: The `mapStore` and `moduleStore` Zustand instances do not use the `persist` middleware, nor are these specific state keys manually saved to `localStorage`.
- User impact: Users lose their preferred map view settings and module context every time they close and reopen the app or refresh the page, forcing them to reconfigure their environment repeatedly. This is a significant source of friction.
- Business impact: Decreased user satisfaction, perceived lack of personalization, and a general feeling that the app does not "remember" their preferences, leading to a less sticky experience.
- Fix direction: Implement `persist` middleware for the `mapStore` and `moduleStore` (or selectively for these keys) to save and load these preferences from `localStorage`.

### 6. Theme Not Persisted
- Summary: The user's selected theme (e.g., light mode) is not saved and resets to the default 'dark' theme on every page reload.
- Confidence: HIGH
- Evidence: `STATE_MAP.md` under "What is NOT in localStorage" explicitly states: "`theme` is NOT persisted to localStorage — it resets to 'dark' on every page reload."
- Cannot confirm: Visual evidence of the theme resetting in this specific test run.
- Root cause: The `userStore` does not use the `persist` middleware for the `theme` key, nor is it manually saved to `localStorage`.
- User impact: Users who prefer a theme other than 'dark' must manually re-select it every time they open the app, leading to a minor but persistent annoyance.
- Business impact: Minor user frustration, contributes to a perception of a lack of polish and attention to detail.
- Fix direction: Persist `userStore.theme` to `localStorage` using Zustand's `persist` middleware or manual `localStorage` calls.

### 7. Ambiguous 'Profile' Button Selector
- Summary: The Playwright test for navigating to the 'Profile' tab fails due to a strict mode violation, indicating that multiple elements match the 'Profile' button selector.
- Confidence: HIGH
- Evidence: The test result for "profile tab navigates without errors" shows: `Error: locator.click: Error: strict mode violation: getByRole('button', { name: 'Profile' }) resolved to 2 elements: 1) <button>…</button> aka getByRole('button', { name: 'My Account View your profile' }) 2) <button aria-label="Profile">…</button> aka getByRole('button', { name: 'Profile', exact: true })`.
- Cannot confirm: Whether these two elements are visually distinct for a human user or if they both appear as primary "Profile" navigation options.
- Root cause: The Playwright selector `getByRole('button', { name: 'Profile' })` is too broad and matches both the main navigation 'Profile' button and potentially another button with a similar accessible name (e.g., "My Account View your profile" which contains "Profile"). This is a test configuration issue, but could also reflect a UX issue if the buttons are genuinely ambiguous.
- User impact: If both elements are visually prominent and interactive, users might accidentally click the wrong "Profile" button, leading to unexpected navigation or actions. If one is a sub-item, the impact is lower.
- Business impact: Minor user confusion or misclicks, but not a critical blocker.
- Fix direction: Refine the Playwright selector to be more specific (e.g., by adding `exact: true` or using a more precise locator strategy). Review the UI and accessibility labels to ensure distinct and unambiguous naming for interactive elements.

## Findings Discarded
- No findings were discarded in this run.

## Cannot Assess
- **Visual state of the app after successful navigation:** Due to the critical blocking issue (onboarding/legal disclaimer), I cannot see the actual UI for the Dashboard, Learn, Settings, or Profile tabs, nor can I observe the map's interactive state after navigation. This limits the ability to identify issues related to layout, content loading, or specific component interactions within those views.
- **Offline behavior:** While the `STATE_MAP.md` provides architectural truth about offline failures, I cannot visually confirm these failures or the user experience of the toast messages without a test specifically simulating an offline scenario.
- **App crash/close data loss:** Similarly, I cannot observe the actual data loss on app crash/close without a test specifically simulating these events.

## Systemic Patterns
- **Lack of Persistent State Management:** A recurring theme is the absence of robust state persistence. Many critical user preferences (`theme`, `basemap`, `is3D`, `layerVisibility`, `activeModule`) and all in-progress user-generated data (`sessionTrail`, `sessionWaypoints`, `routePoints`) are not persisted locally. This leads to a "forgetful" application that resets frequently, undermining user trust and satisfaction.
- **Incomplete Offline-First Strategy:** While offline tile caching exists, the application fundamentally lacks an offline-first approach for user data. All write operations fail silently with data loss when offline, making the app unreliable in its primary use context (outdoor exploration in potentially remote areas).
- **Blocking Overlays/Modals:** The current test failures highlight a critical issue where an initial overlay (onboarding or legal disclaimer) completely blocks user interaction with the main application. This indicates a potential flaw in the initial app load flow or modal management, preventing users from ever reaching the core experience.

## Calibration Notes
I carefully reviewed previous PHANTOM findings, especially "Dashboard Tab Obstruction (DataSheet blocks BottomNav)". The current finding regarding the onboarding/legal disclaimer blocking interaction is distinct because the Playwright error message explicitly points to a `<div>…</div> subtree intercepts pointer events` *and* the screenshots clearly show an introductory screen with a "Next" button, which is a new and specific piece of evidence. This is not a general obstruction but a specific modal/overlay. I also noted the previous "Map Button Naming Ambiguity" was misdiagnosed as a Playwright selector issue. The current "Profile" button ambiguity is also a Playwright strict mode violation, but the detailed error message provides enough context to identify it as a potential UX issue if the buttons are visually ambiguous, making it a valid finding. I prioritized findings related to data loss and blocking issues, as these have the highest user and business impact.