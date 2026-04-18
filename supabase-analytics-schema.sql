-- ============================================================
-- Analytics Events — tracks page visits, signups, orders, etc.
-- Run this in your Supabase SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_type  TEXT NOT NULL,        -- 'page_view', 'signup', 'order'
  page        TEXT,                  -- e.g. '/products', '/checkout'
  user_id     TEXT,                  -- Clerk user ID (nullable for anonymous)
  metadata    JSONB DEFAULT '{}',    -- extra data (order_ref, etc.)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast date-range + event_type queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_type_date
  ON analytics_events (event_type, created_at DESC);

-- Index for user-level analytics
CREATE INDEX IF NOT EXISTS idx_analytics_events_user
  ON analytics_events (user_id, created_at DESC);

-- RLS: allow inserts from anon/authenticated, reads only for service role
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (tracking pixels need this)
CREATE POLICY "Allow public inserts" ON analytics_events
  FOR INSERT WITH CHECK (true);

-- Only service role can read (admin API uses supabaseAdmin)
CREATE POLICY "Service role reads" ON analytics_events
  FOR SELECT USING (auth.role() = 'service_role');
