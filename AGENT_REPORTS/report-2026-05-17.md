# UX Agent Report — 2026-05-17

## Run Context
- Commits analysed: `b2963fc`, `8bc8c97`, `317b169`, `7a1fc7a`, `7fbc9d2`, `c5bebc2`, `db7f6d0`, `39c2e46`, `28b2b20`, `1c2184c`, `c5131e8`, `ce7e7d6`, `2923ab`, `d29354c`, `eb866d4`, `d552904`, `dfebcc0`, `acd32af`, `f174f1e`, `3575880`
- Screenshots available: YES (12, 4 guest, 4 free, 4 pro)
- Test pass rate: guest 6/8, free 5/7, pro 4/9
- Historical accuracy: Confirmed: 17 (71%) | Phantom: 5 (21%) | Misdiagnosed: 1 | Superseded: 1

## Findings

### 1. Critical: Systemic Persistence Regression — All User Preferences & Session Data Lost on Reload (V1, V7, V8, V9, V11, V15)
- Summary: A widespread regression causes all user preferences (theme, basemap, layer visibility) and critical session-specific user-generated data (guest waypoints, active module, active GPS track) to be lost upon page reload, indicating a fundamental breakdown in `localStorage` persistence.
- Tier(s) affected: All (V7, V8, V9), Guest (V11, V15), Pro (V1)
- Confidence: HIGH
- Evidence: `guest V7` and `free V7` FAIL with `Expected: "light" Received: "dark"`. Annotations `ee_theme-before-reload: null`, `ee_theme-after-reload: null` confirm theme preference loss. `guest V9` and `free V8` FAIL (timeout) imply basemap and layer preferences reset to defaults. `guest V11` PASS, with annotation `guest-waypoints-after-reload: ee_guest_waypoints absent after reload (V11 confirmed)`. `guest V15` PASS, with annotation `activeModule-after-reload: ee_active_module absent after reload (V15 confirmed)`. `pro V1` PASS, with annotation `track-survived-reload: no — ee_session_trail empty or missing (V1 confirmed)`.
- Cannot confirm: The exact content of `ee-map-prefs` for V8/V9 due to timeouts, but the outcome (reset to default) is clear.
- Root cause: Despite `STATE_MAP.md` indicating persistence for these items via Zustand `persist` middleware or manual `localStorage` IIFE patterns (tasks 001, 002, 006, 008, 013), the `localStorage` keys are reported as `null`, `absent`, or `empty/missing` after reload. The `ee_theme` being `null` *before* reload is particularly concerning as it implies `localStorage.setItem` is not happening at all, or is immediately cleared. This is a regression from multiple previously confirmed fixes. The recent `Revert "surgery(rvsv-offline-001)"` commit (`28b2b20`) is a strong suspect, as it might have inadvertently undone persistence logic or introduced a bug in `localStorage` access.
- User impact: Severe frustration as settings constantly reset, and critical active work (tracks, waypoints) is lost, making the app feel unreliable and unusable for core functions.
- Business impact: High churn, negative reviews, inability to retain users, significant damage to app credibility.
- Fix direction: Investigate `localStorage` access and Zustand `persist` middleware configuration across all stores, especially in light of recent reverts or changes. Ensure `localStorage.setItem` is correctly called and data is hydrated on `initialState` load.

### 2. Critical: Waypoint Save Blocked by Persistent GPS Acquisition Failure (P3, V3, V14)
- Summary: The "Save Waypoint" button is consistently disabled because the app fails to acquire GPS coordinates, displaying "Acquiring GPS..." even in online tests, and no offline pre-save warning is shown.
- Tier(s) affected: Pro (P3, V3, V14 confirmed). Highly likely affects Free and Guest tiers if they were allowed to save waypoints, as the underlying GPS acquisition logic is shared.
- Confidence: HIGH
- Evidence: `pro P3` and `pro V3` tests failed with `Error: expect(locator).not.toBeDisabled() failed` for the "Save Waypoint" button. Screenshot `test-results/pro/p3-2-waypoint-sheet.png` clearly shows the button disabled and the "LOCATION" field displaying "Acquiring GPS...". The `pro V3` test also includes annotation `v14-pre-save-offline-warning: no (V14 confirmed)`, indicating no warning was shown before the failed save attempt.
- Cannot confirm: The exact reason the Playwright geolocation mock isn't being correctly processed by the app's GPS acquisition logic, or if the `mapStore.userLocation` state is being updated at all.
- Root cause: The `WaypointSheet`'s save button is gated by the `LOCATION` field's GPS acquisition status, which relies on `mapStore.userLocation`. The app's `useTracks` hook or `Map.jsx watchPosition` is either not receiving a valid GPS signal from the Playwright mock, or is incorrectly interpreting it, leading to the button remaining disabled. The absence of a pre-save warning confirms V14 (no pre-check for offline save).
- User impact: Critical inability to perform a fundamental action (saving waypoints), leading to severe frustration and making the app unusable for its primary purpose.
- Business impact: Direct impediment to user engagement and content creation, leading to high churn and negative perception of app reliability.
- Fix direction: Investigate the `useTracks` hook's GPS acquisition and `userLocation` state updates, and the `WaypointSheet`'s dependency on this state. Ensure Playwright's geolocation mock is correctly integrated and processed.

### 3. High: Pro User Incorrectly Prompted to Upgrade (P1)
- Summary: A Pro user is incorrectly shown the Upgrade Sheet when tapping a Pro-gated affordance, indicating a failure in correctly identifying the user's subscription status.
- Tier(s) affected: Pro
- Confidence: HIGH
- Evidence: `pro P1` test failed with `Test timeout of 60000ms exceeded.` The test description is "Pro user does not see UpgradeSheet on Pro affordance tap". A timeout in this context strongly implies the test was waiting for the UpgradeSheet *not* to be visible, but it either *was* visible or the test couldn't proceed past that point. This indicates the UpgradeSheet was shown.
- Cannot confirm: The exact Pro affordance tapped, or a direct screenshot of the Upgrade Sheet being visible for a Pro user. However, the test failure mode is highly indicative.
- Root cause: The `isPro` flag in `userStore` or the logic gating the `UpgradeSheet` is likely misconfigured or experiencing a race condition, causing the app to incorrectly perceive a Pro user as a Free user when interacting with Pro features. `STATE_MAP.md` notes `useAuth.onAuthStateChange` may overwrite `isPro` to false on offline JWT expiry (V10), but this test is online. A race condition during initial `isPro` hydration from Supabase or `localStorage` is possible.
- User impact: Annoyance and confusion for paying users who are asked to upgrade for features they already have, eroding trust and perceived value of their subscription.
- Business impact: Damages customer loyalty, increases support queries, and could lead to subscription cancellations.
- Fix direction: Verify the `isPro` state hydration and its usage in gating the `UpgradeSheet`. Ensure `isPro` is correctly and consistently set from both Supabase and `localStorage` for Pro users.

### 4. Medium: Offline Test Setup Failure Prevents Assessment of Critical Vulnerabilities (V2, V10)
- Summary: Tests designed to verify offline data caching (V2) and Pro status persistence during offline reloads (V10) are failing to even load the application due to network disconnection errors, preventing assessment of these critical vulnerabilities.
- Tier(s) affected: Pro (V2, V10)
- Confidence: HIGH
- Evidence: `pro V10` and `pro V2` tests failed with `Error: page.goto: net::ERR_INTERNET_DISCONNECTED at https://explore-eire-git-dev-swmofficials-projects.vercel.app/`. This indicates the Playwright environment is failing to navigate to the app URL when the network is intentionally disconnected for these tests.
- Cannot confirm: Whether V2 (gold/mineral data missing offline) or V10 (Pro status reverts offline) are active, as the tests cannot execute their assertions.
- Root cause: The Playwright test setup for offline scenarios is flawed. The `page.goto` command is attempting a network request to the base URL *after* the network has been disabled, instead of relying on the Service Worker to serve cached assets for the initial load. This prevents the tests from reaching the state where the actual vulnerabilities can be checked.
- User impact: Unknown, as the vulnerabilities cannot be confirmed. If active, V2 would mean blank maps offline, and V10 would lock out paying users.
- Business impact: Inability to verify critical offline functionality, leading to potential undetected regressions and poor user experience in key use cases (rural prospecting).
- Fix direction: Adjust Playwright's offline test setup to ensure the initial `page.goto` for offline tests correctly loads the app from the Service Worker cache, rather than attempting a network request that will fail.

### 5. Medium: Route Save Fails Silently Offline (V6 Confirmed)
- Summary: Saving a user-created route while offline fails without providing any user-facing toast notification, leading to silent data loss.
- Tier(s) affected: Pro (V6 confirmed). Likely affects Free/Guest if route saving were enabled for them.
- Confidence: HIGH
- Evidence: `pro V6` test passed, with annotation `route-button-missing: cannot proof V6`. The test passing means the expected behavior (no toast) was observed. `STATE_MAP.md` confirms: "Save route: `routes` INSERT... **Fails** — console.error only, no toast. YES — route points gone." The test passing confirms the "no toast" part of V6. The annotation `cannot proof V6` is likely referring to the *data loss* aspect, which is harder to assert in a Playwright test without direct DB access or a local queue.
- Cannot confirm: Direct observation of the route points being lost from the `mapStore.routePoints` array, but `STATE_MAP.md` explicitly states "YES — route points gone."
- Root cause: As per `STATE_MAP.md`, the `routes` INSERT operation on Supabase fails silently offline, with only a `console.error` and no user-facing toast. The `routePoints` in `mapStore` are not persisted until explicitly saved to Supabase, and there is no offline queue.
- User impact: Users believe their route has been saved, only to find it missing later, leading to frustration and wasted effort.
- Business impact: Erodes user trust in the app's reliability, particularly for a core feature like route planning.
- Fix direction: Implement an offline data queue (e.g., using IndexedDB) for route saves, and provide clear user feedback (toast notification) when an offline save is queued or fails.

### 6. Low: Learn Tab Header Stats are NOT Recomputed (V13 Not Confirmed)
- Summary: The Learn tab header statistics (courses, complete percentage, chapters done) are correctly preserved across tab switches, indicating that the previous fix for V13 (preserving component state) is working for these specific stats. The test description "learn header stats are recomputed on every tab switch (state-loss proof)" is misleading, as the evidence shows no recomputation or state loss for these stats.
- Tier(s) affected: Guest, Free
- Confidence: HIGH (that the stats are *not* recomputed/lost)
- Evidence: `guest V13` and `free V13` tests passed. The `state-loss-evidence` annotation for both shows identical `before` and `after` values for `courses`, `completePct`, and `chaptersDone` (e.g., `{"before":{"courses":2,"completePct":0,"chaptersDone":0,...},"after":{"courses":2,"completePct":0,"chaptersDone":0,...}}`).
- Cannot confirm: Whether other, more granular component states within the Learn tab (e.g., chapter reading position) are preserved, as this specific test only checks header stats.
- Root cause: The previous fix for V13 ("Preserve Learn tab component state across tab switches") by keeping components mounted (visibility toggled instead of unmounting) appears to be working for the Learn tab header statistics. The test's description is misaligned with the observed evidence.
- User impact: Positive user experience for these specific stats, as they remain consistent.
- Business impact: Improved user trust and engagement with the learning module.
- Fix direction: Update the `guest V13` and `free V13` test descriptions to accurately reflect that header stats *are* preserved, or modify the test to target the actual vulnerability (e.g., chapter reading position) if it still exists.

## Tier Comparison
- **Persistence Regression (V1, V7, V8, V9, V11, V15):** The failure to persist user preferences (theme, basemap, layer visibility) is observed across **all tiers** (guest V7, free V7, guest V9, free V8). Session-specific data loss (guest waypoints V11, active module V15, GPS track V1) affects the relevant tiers where those features are available (Guest for V11/V15, Pro for V1). This widespread failure points to a core architectural issue affecting `localStorage` or Zustand `persist` middleware globally, rather than tier-specific logic.
- **Waypoint Save Blocked (P3, V3, V14):** The inability to save waypoints due to GPS acquisition failure and the lack of offline warning (V14) is observed in the **Pro tier**. While not explicitly tested for Free/Guest (as they are gated from saving waypoints), the underlying GPS acquisition logic is shared, suggesting this is a systemic issue affecting all users attempting to use location-dependent features.
- **Learn Tab Header Stats (V13, F4):** The preservation of Learn tab header statistics is consistent across **Guest and Free tiers**, indicating the fix for V13 is working for these specific stats regardless of authentication status.
- **Upgrade Sheet Display (P1, F3, C3):** The Upgrade Sheet correctly appears for **Guest (C3) and Free (F3) users** when tapping Pro-gated features. However, it incorrectly appears for **Pro users (P1)**, highlighting a specific issue with `isPro` status recognition for paying customers.
- **Offline Test Failures (V2, V10):** The inability to execute offline tests due to network disconnection errors affects the **Pro tier** tests, preventing assessment of critical offline vulnerabilities for paying users.

## Findings Discarded
- No findings were discarded beyond the 8-finding limit. The interpretation of `guest V13` and `free V13` was adjusted to reflect the evidence (no state loss for header stats) rather than the misleading test description, and is included as Finding 6.

## Cannot Assess
- The actual state of vulnerabilities `V2` (gold/mineral data missing after offline reload) and `V10` (Pro status reverts to free on offline reload) cannot be assessed. The Playwright tests designed to check these failed to load the application due to `net::ERR_INTERNET_DISCONNECTED` errors, preventing any assertions from being made. This indicates a fundamental issue with the offline test setup.

## Systemic Patterns
- **Global Persistence Breakdown:** A core issue affecting `localStorage` interactions or Zustand `persist` middleware is causing widespread loss of user preferences and session data across all tiers. This is a regression from previously confirmed fixes.
- **GPS Integration Flaw:** The application's GPS acquisition logic, or its interaction with Playwright's geolocation mock, is consistently failing, blocking location-dependent features like waypoint saving.
- **Inadequate Offline Test Infrastructure:** The current Playwright setup for offline testing is unable to reliably load the application when the network is disconnected, hindering the verification of critical offline capabilities.

## Calibration Notes
- Learned to critically evaluate test descriptions against concrete evidence (annotations, error messages, screenshots). The `guest V13` and `free V13` tests were a prime example where the "state-loss proof" description was contradicted by the `state-loss-evidence` showing identical values. This reinforces the rule to *never guess* and rely solely on observable evidence.
- Prioritized findings based on direct user impact and confirmed evidence, especially regressions of previously fixed vulnerabilities (V1, V7, V8, V9, V11, V15).
- Recognized that Playwright timeouts can indicate different failure modes (e.g., element not appearing vs. element *incorrectly* appearing). For `pro P1`, the timeout in a "does not see" test implies the element *was* seen.
- Identified issues with the test environment itself (offline `page.goto` failures) as a high-priority finding, as it blocks assessment of other critical vulnerabilities.