-- ============================================================
-- 101 Hub — Tiered Referral & Points System Schema
-- ============================================================

-- 1. Referral codes table — each user gets a unique code
CREATE TABLE IF NOT EXISTS referral_codes (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT        NOT NULL UNIQUE,          -- Clerk user ID
  code        TEXT        NOT NULL UNIQUE,          -- e.g. "HUB-A3X9K2"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast code lookups during signup
CREATE INDEX idx_referral_codes_code ON referral_codes (code);

-- 2. Referral tracking — who referred whom
CREATE TABLE IF NOT EXISTS referrals (
  id              BIGSERIAL PRIMARY KEY,
  referrer_id     TEXT        NOT NULL,             -- Clerk user ID of the person who shared
  referred_id     TEXT        NOT NULL UNIQUE,      -- Clerk user ID of the new signup (one referrer per user)
  status          TEXT        NOT NULL DEFAULT 'pending',  -- 'pending' | 'signup' | 'purchased'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at    TIMESTAMPTZ                       -- when the referred user made first purchase
);

CREATE INDEX idx_referrals_referrer ON referrals (referrer_id);

-- 3. Points ledger — every point-earning event is an immutable row
CREATE TABLE IF NOT EXISTS referral_points (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT        NOT NULL,
  points      INT         NOT NULL,
  reason      TEXT        NOT NULL,                 -- 'referral_signup' | 'referral_purchase' | 'bonus' | 'redeemed'
  referral_id BIGINT      REFERENCES referrals(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_points_user ON referral_points (user_id);

-- 4. Tier definitions — admin-configurable levels
CREATE TABLE IF NOT EXISTS referral_tiers (
  id                SERIAL PRIMARY KEY,
  name              TEXT    NOT NULL,                -- 'Bronze', 'Silver', 'Gold', 'Platinum'
  min_points        INT     NOT NULL,                -- threshold to enter this tier
  discount_percent  NUMERIC NOT NULL DEFAULT 0,      -- e.g. 5, 10, 15
  free_shipping     BOOLEAN NOT NULL DEFAULT false,
  badge_color       TEXT    NOT NULL DEFAULT '#a0a0a0' -- hex for UI badge
);

-- Seed default tiers
INSERT INTO referral_tiers (name, min_points, discount_percent, free_shipping, badge_color)
VALUES
  ('Bronze',   0,    0,  false, '#cd7f32'),
  ('Silver',   500,  5,  false, '#c0c0c0'),
  ('Gold',     1000, 10, false, '#ffd700'),
  ('Platinum', 2000, 15, true,  '#e5e4e2')
ON CONFLICT DO NOTHING;

-- 5. View: current point balance per user (sum of ledger)
CREATE OR REPLACE VIEW referral_balances AS
SELECT
  user_id,
  COALESCE(SUM(points), 0)::INT AS total_points
FROM referral_points
GROUP BY user_id;
