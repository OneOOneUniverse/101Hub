-- ============================================================
-- 101 Hub — Service Booking Schema Upgrade
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Add requested_date column for calendar-based booking
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS requested_date DATE DEFAULT NULL;

-- Add payment_ref column to store Flutterwave transaction reference
ALTER TABLE service_requests
  ADD COLUMN IF NOT EXISTS payment_ref TEXT DEFAULT NULL;

-- Update status constraint: pending → approved/declined → completed
-- (Drop any existing constraint first, then add new one)
-- Note: If no constraint exists, this is safe — DO NOTHING on error
DO $$
BEGIN
  -- Remove old check if it exists
  ALTER TABLE service_requests DROP CONSTRAINT IF EXISTS service_requests_status_check;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add new status check
ALTER TABLE service_requests
  ADD CONSTRAINT service_requests_status_check
  CHECK (status IN ('pending', 'approved', 'declined', 'completed', 'assigned', 'cancelled'));

-- Index for fast admin queries by status
CREATE INDEX IF NOT EXISTS idx_service_requests_status
  ON service_requests (status, created_at DESC);
