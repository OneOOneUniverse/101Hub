-- ============================================================
-- 101 Hub — Deals Hub: Points, Spins, Scratch Cards, Trivia
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- 1. User points balance
CREATE TABLE IF NOT EXISTS user_points (
  user_id     TEXT PRIMARY KEY,         -- Clerk user ID
  balance     INT  NOT NULL DEFAULT 0,
  total_earned INT NOT NULL DEFAULT 0,
  total_spent  INT NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own points" ON user_points FOR SELECT USING (true);
CREATE POLICY "Service inserts points" ON user_points FOR INSERT WITH CHECK (true);
CREATE POLICY "Service updates points" ON user_points FOR UPDATE USING (true);

-- 2. Points transaction log
CREATE TABLE IF NOT EXISTS point_transactions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  amount      INT  NOT NULL,             -- positive = earned, negative = spent
  type        TEXT NOT NULL,             -- 'spin', 'scratch', 'trivia', 'redeem', 'admin'
  description TEXT NOT NULL DEFAULT '',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_point_tx_user ON point_transactions (user_id, created_at DESC);
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own transactions" ON point_transactions FOR SELECT USING (true);
CREATE POLICY "Service inserts transactions" ON point_transactions FOR INSERT WITH CHECK (true);

-- 3. Game play log (cooldown tracking)
CREATE TABLE IF NOT EXISTS game_plays (
  id          BIGSERIAL PRIMARY KEY,
  user_id     TEXT NOT NULL,
  game_type   TEXT NOT NULL,             -- 'spin', 'scratch', 'trivia'
  result      JSONB DEFAULT '{}',        -- prize details
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_plays_cooldown ON game_plays (user_id, game_type, created_at DESC);
ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own plays" ON game_plays FOR SELECT USING (true);
CREATE POLICY "Service inserts plays" ON game_plays FOR INSERT WITH CHECK (true);

-- 4. Active prizes/coupons won from games
CREATE TABLE IF NOT EXISTS game_prizes (
  id            BIGSERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL,
  prize_type    TEXT NOT NULL,           -- 'discount_percent', 'discount_fixed', 'free_shipping'
  prize_value   NUMERIC NOT NULL DEFAULT 0,
  prize_label   TEXT NOT NULL DEFAULT '',
  redeemed      BOOLEAN NOT NULL DEFAULT false,
  order_ref     TEXT,
  won_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_at   TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);

CREATE INDEX idx_game_prizes_active ON game_prizes (user_id, redeemed) WHERE redeemed = false;
ALTER TABLE game_prizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own prizes" ON game_prizes FOR SELECT USING (true);
CREATE POLICY "Service inserts prizes" ON game_prizes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service updates prizes" ON game_prizes FOR UPDATE USING (true);

-- 5. RPC function for atomic points update (upsert + increment)
CREATE OR REPLACE FUNCTION add_user_points(p_user_id TEXT, p_amount INT)
RETURNS void AS $$
BEGIN
  INSERT INTO user_points (user_id, balance, total_earned, total_spent)
  VALUES (p_user_id, GREATEST(0, p_amount), GREATEST(0, p_amount), GREATEST(0, -p_amount))
  ON CONFLICT (user_id) DO UPDATE SET
    balance = GREATEST(0, user_points.balance + p_amount),
    total_earned = CASE WHEN p_amount > 0 THEN user_points.total_earned + p_amount ELSE user_points.total_earned END,
    total_spent = CASE WHEN p_amount < 0 THEN user_points.total_spent + ABS(p_amount) ELSE user_points.total_spent END,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
