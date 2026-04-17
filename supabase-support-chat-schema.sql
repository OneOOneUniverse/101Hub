-- ============================================================
-- 101 Hub — Live Support Chat Schema
-- ============================================================

-- 1. Chat sessions — one per customer visit/conversation
CREATE TABLE IF NOT EXISTS support_chats (
  id           BIGSERIAL PRIMARY KEY,
  user_id      TEXT,                               -- Clerk user ID (null for anonymous)
  session_id   TEXT        NOT NULL UNIQUE,         -- Browser session UUID
  status       TEXT        NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  page_url     TEXT,                                -- Where the user currently is
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_chats_session ON support_chats (session_id);
CREATE INDEX idx_support_chats_status  ON support_chats (status);

-- 2. Messages within a chat
CREATE TABLE IF NOT EXISTS support_messages (
  id           BIGSERIAL PRIMARY KEY,
  chat_id      BIGINT      NOT NULL REFERENCES support_chats(id) ON DELETE CASCADE,
  sender_role  TEXT        NOT NULL,                -- 'customer' | 'admin'
  content      TEXT,                                -- text content
  image_url    TEXT,                                -- optional uploaded image URL
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_messages_chat ON support_messages (chat_id, created_at);

-- Enable Realtime on the messages table
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- 3. Supabase Storage bucket for chat images (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);
