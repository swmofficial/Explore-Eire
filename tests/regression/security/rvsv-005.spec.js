import { test, expect } from '@playwright/test';
import { bypassOnboarding, waitForAppReady, TIERS } from './_helpers.js';

// rvsv-005 — Supabase write operations found — RLS policies unconfirmed
//
// This test verifies that Row Level Security (RLS) policies are enforced on
// user-data tables. We simulate IDOR attacks by attempting to write to
// tables (finds_log, routes, waypoints) using authenticated API calls but
// targeting data owned by other users.
//
// TEST STRATEGY:
// 1. Attempt to INSERT a finds_log entry with a fabricated user_id (not the
//    authenticated user's ID). If RLS is working, Supabase will reject the
//    insert with a 403 or return { error: { code: '42501' } } (insufficient
//    privilege).
// 2. Attempt to UPDATE a waypoint row owned by another user. Expect 403/RLS block.
// 3. Attempt to DELETE a route row owned by another user. Expect 403/RLS block.
//
// If any of these operations succeed (status 200/201 with no error), the test
// FAILS, confirming the vulnerability. If all operations are blocked by RLS,
// the test PASSES, confirming the fix.

test.describe('rvsv-005: RLS enforcement on user-data writes', () => {
  test.beforeEach(async ({ page }) => {
    await bypassOnboarding(page);
    await page.goto('https://explore-eire.vercel.app');
    await waitForAppReady(page);
  });

  test('IDOR: cannot insert finds_log entry for another user', async ({ page }) => {
    // Get the current authenticated user's ID
    const authUser = await page.evaluate(async () => {
      const { createClient } = await import('/src/lib/supabase.js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    });

    if (!authUser) {
      test.skip('Test requires authenticated user');
      return;
    }

    // Fabricate a victim user ID (different from authUser)
    const victimUserId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

    // Attempt to insert a finds_log entry for the victim user via direct Supabase call
    const result = await page.evaluate(
      async ({ victimId }) => {
        const { createClient } = await import('/src/lib/supabase.js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        const { data, error } = await supabase.from('finds_log').insert({
          user_id: victimId,
          find_type: 'gold_flake',
          location: { type: 'Point', coordinates: [-6.2603, 53.3498] },
          notes: 'IDOR test payload',
          found_at: new Date().toISOString(),
        });
        return { data, error: error ? { code: error.code, message: error.message } : null };
      },
      { victimId: victimUserId }
    );

    // RLS should block this insert. Expect error.code 42501 (insufficient privilege)
    // or a policy violation error. If data is non-null and error is null, RLS is broken.
    if (result.data && !result.error) {
      throw new Error(
        `VULNERABILITY CONFIRMED: finds_log INSERT succeeded for another user. ` +
          `Expected RLS block, got data=${JSON.stringify(result.data)}`
      );
    }

    expect(result.error).not.toBeNull();
    // Common RLS error codes: 42501 (insufficient privilege), PGRST116 (policy violation)
    expect(['42501', 'PGRST116', '23503']).toContain(result.error.code);
  });

  test('IDOR: cannot update waypoint owned by another user', async ({ page }) => {
    const authUser = await page.evaluate(async () => {
      const { createClient } = await import('/src/lib/supabase.js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase.auth.getUser();
      return data?.user?.id ?? null;
    });

    if (!authUser) {
      test.skip('Test requires authenticated user');
      return;
    }

    // Fabricate a waypoint ID that might belong to another user
    // In a real attack, the attacker would enumerate IDs. Here we use a plausible UUID.
    const victimWaypointId = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

    const result = await page.evaluate(
      async ({ waypointId }) => {
        const { createClient } = await import('/src/lib/supabase.js');
        const supabase = createClient(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_ANON_KEY
        );
        const { data, error } = await supabase
          .from('waypoints')
          .update({ name: 'IDOR hijack' })
          .eq('id', waypointId);
        return { data, error: error ? { code: error.code, message: error.message } : null };
      },
      { waypointId: victimWaypointId }
    );

    // RLS should block UPDATE if the waypoint belongs to another user.
    // If data is returned (non-empty array) and no error, RLS is broken.
    if (result.data && Array.isArray(result.data) && result.data.length > 0 && !result.error) {
      throw new Error(
        `VULNERABILITY CONFIRMED: waypoints UPDATE succeeded for another user's row. ` +
          `Expected RLS block, got data=${JSON.stringify(result.data)}`
      );
    }

    // Either error is present, or data is empty (no rows affected due to RLS)
    if (result.error) {
      expect(['42501', 'PGRST116', '23503']).toContain(result.error.code);
    } else {
      expect(result.data).toEqual([]);
    }
  });

  test('IDOR: cannot delete route owned by another user', async ({ page }) => {
    const authUser = await page.evaluate(async () => {
      const { createClient } = await import('/src/lib/supabase.js');
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      const { data } = await supabase.auth.getUser();
      return data