-- ============================================
-- 101Hub — Persistent Notifications System
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add clerk_user_id to orders table (for linking notifications)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,                          -- Clerk user ID or 'admin' for broadcast
  target_role TEXT NOT NULL DEFAULT 'user',        -- 'user' | 'admin'
  type TEXT NOT NULL DEFAULT 'order',              -- order | message | service | payment | status_update | promo | system
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',                         -- Extra payload (order_ref, link, etc.)
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON notifications(target_role);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: users can read their own notifications
CREATE POLICY "Users read own notifications"
  ON notifications FOR SELECT
  USING (true);

-- Policy: service role can do everything  
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================
-- 3. Push Subscriptions (Web Push API)
-- ============================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,                          -- Clerk user ID
  endpoint TEXT NOT NULL UNIQUE,                   -- Push subscription endpoint
  subscription JSONB NOT NULL,                     -- Full PushSubscription object
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Push subs service role access"
  ON push_subscriptions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- Done! Now your app can create, read, and
-- subscribe to real-time notification updates.
-- ============================================
