-- ============================================================
-- 101 Hub — Referral Reward Claims & Roadmap Cycle Schema
-- ============================================================

-- 1. Reward claims — tracks which tier reward a user has claimed per roadmap cycle
CREATE TABLE IF NOT EXISTS referral_reward_claims (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT        NOT NULL,              -- Clerk user ID
  tier_id     INT         NOT NULL REFERENCES referral_tiers(id),
  cycle       INT         NOT NULL DEFAULT 1,    -- roadmap cycle number (restarts when all tiers claimed)
  discount_percent NUMERIC NOT NULL,             -- snapshot of the discount at claim time
  free_shipping    BOOLEAN NOT NULL DEFAULT false,
  redeemed    BOOLEAN     NOT NULL DEFAULT false, -- true once applied to an order
  order_ref   TEXT,                               -- order reference where it was redeemed
  claimed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at TIMESTAMPTZ
);

-- Each user can only claim each tier once per cycle
CREATE UNIQUE INDEX idx_reward_claims_unique
  ON referral_reward_claims (user_id, tier_id, cycle);

-- Fast lookup for user's active (unredeemed) rewards
CREATE INDEX idx_reward_claims_active
  ON referral_reward_claims (user_id, redeemed)
  WHERE redeemed = false;

-- 2. View: current roadmap cycle per user
CREATE OR REPLACE VIEW referral_user_cycles AS
SELECT
  user_id,
  COALESCE(MAX(cycle), 1) AS current_cycle
FROM referral_reward_claims
GROUP BY user_id;
