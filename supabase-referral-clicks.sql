-- ============================================================
-- 101 Hub — Referral Click Tracking Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Click tracking table — records every referral link click
CREATE TABLE IF NOT EXISTS referral_clicks (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code     TEXT        NOT NULL,          -- the referral code that was clicked (e.g. HUB-A3X9K2)
  referrer_user_id  TEXT        NOT NULL,          -- Clerk user ID of the link owner
  converted_user_id TEXT        DEFAULT NULL,      -- NULL = Guest click, filled on signup
  converted_name    TEXT        DEFAULT NULL,      -- display name after conversion
  clicked_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup: all clicks for a given referrer
CREATE INDEX IF NOT EXISTS idx_referral_clicks_referrer
  ON referral_clicks (referrer_user_id, clicked_at DESC);

-- Fast lookup: find a click by ID (for conversion update)
CREATE INDEX IF NOT EXISTS idx_referral_clicks_id
  ON referral_clicks (id);

-- Allow anonymous inserts (click tracking from guests) but restrict updates
ALTER TABLE referral_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: allow inserts from service role (via API route)
-- The API route uses supabaseAdmin (service role) so RLS is bypassed.
-- No direct client-side access is needed.
