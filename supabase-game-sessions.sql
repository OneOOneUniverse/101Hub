-- Game Sessions table for server-side game state & anti-cheat
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('memory', 'lucky', 'scramble')),
  -- server-side secret data (word, lucky number, start time)
  secret_data JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '15 minutes'),
  -- is_complete = true means the session is done (claimed, lost, or expired)
  is_complete BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  -- is_won = true means the user won and can claim points (for lucky number)
  is_won BOOLEAN DEFAULT FALSE,
  -- tracking for anti-cheat
  elapsed_seconds INTEGER,
  move_count INTEGER DEFAULT 0,
  guess_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_lookup
  ON game_sessions (user_id, game_type, is_complete, expires_at);

-- Row Level Security: users can only read their own sessions through the API
-- (API uses supabaseAdmin which bypasses RLS, so this is belt-and-suspenders)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;

-- No direct client access — all access goes through the server API with supabaseAdmin
CREATE POLICY "No direct client access to game_sessions"
  ON game_sessions
  FOR ALL
  USING (false);
