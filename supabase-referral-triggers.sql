-- ============================================================
-- 101 Hub — Referral Point Triggers & Schema Additions
-- Run this AFTER supabase-referral-schema.sql
-- ============================================================

-- ── Add referred_name column for dashboard display ──
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_name TEXT DEFAULT '';

-- ── Partial unique indexes to prevent double point awards ──
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_signup_points
  ON referral_points (referral_id) WHERE reason = 'referral_signup';
CREATE UNIQUE INDEX IF NOT EXISTS uq_referral_purchase_points
  ON referral_points (referral_id) WHERE reason = 'referral_purchase';

-- ============================================================
-- TRIGGER 1: Auto-award 100 points on referral signup
-- Fires AFTER INSERT on referrals when status = 'signup'
-- ============================================================
CREATE OR REPLACE FUNCTION fn_award_referral_signup_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award for signups (not 'pending')
  IF NEW.status = 'signup' THEN
    -- Idempotent insert — partial unique index prevents duplicates
    INSERT INTO referral_points (user_id, points, reason, referral_id)
    VALUES (NEW.referrer_id, 100, 'referral_signup', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_referral_signup ON referrals;
CREATE TRIGGER trg_award_referral_signup
AFTER INSERT ON referrals
FOR EACH ROW
EXECUTE FUNCTION fn_award_referral_signup_points();

-- ============================================================
-- TRIGGER 2: Auto-award 250 points on first purchase conversion
-- Fires AFTER UPDATE on referrals when status changes to 'purchased'
-- ============================================================
CREATE OR REPLACE FUNCTION fn_award_referral_purchase_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Only award when transitioning TO 'purchased' for the first time
  IF NEW.status = 'purchased' AND OLD.status IS DISTINCT FROM 'purchased' THEN
    INSERT INTO referral_points (user_id, points, reason, referral_id)
    VALUES (NEW.referrer_id, 250, 'referral_purchase', NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_referral_purchase ON referrals;
CREATE TRIGGER trg_award_referral_purchase
AFTER UPDATE ON referrals
FOR EACH ROW
EXECUTE FUNCTION fn_award_referral_purchase_points();

-- ============================================================
-- Verify setup
-- ============================================================
-- SELECT tgname, tgrelid::regclass FROM pg_trigger
-- WHERE tgname IN ('trg_award_referral_signup', 'trg_award_referral_purchase');
