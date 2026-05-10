-- Migration: Server-side subscription verification support
-- Addresses: rvsv-str-011, rvsv-str-002, rvsv-str-003

-- 1. Create processed_webhook_events table for idempotency
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id SERIAL PRIMARY KEY,
  event_id TEXT UNIQUE NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_id 
  ON processed_webhook_events(event_id);

-- Auto-cleanup old events (keep 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhook_events 
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 2. Add current_period_end to subscriptions if not exists
ALTER TABLE subscriptions 
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- 3. Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription
CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhooks)
CREATE POLICY "Service role manages subscriptions" ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- 4. RLS policy template for premium content tables
-- Apply this pattern to each premium_* table:
/*
ALTER TABLE premium_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Premium content access" ON premium_content
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = auth.uid() 
      AND status = 'active'
      AND (current_period_end IS NULL OR current_period_end > NOW())
    )
  );

CREATE POLICY "Premium content owner access" ON premium_content
  FOR ALL USING (auth.uid() = user_id);
*/

-- 5. Create helper function for subscription checks (can be used in RLS)
CREATE OR REPLACE FUNCTION has_active_subscription()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE user_id = auth.uid() 
    AND status = 'active'
    AND (current_period_end IS NULL OR current_period_end > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;