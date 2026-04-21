-- General Purpose Reviews Schema
-- Run this in Supabase SQL Editor

-- Reviews table
create table if not exists general_reviews (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  user_name     text not null,
  user_avatar   text default '',
  content       text not null check (char_length(content) between 10 and 2000),
  rating        int  not null check (rating between 1 and 5),
  created_at    timestamptz not null default now(),
  is_deleted    boolean not null default false,
  deleted_at    timestamptz,
  deleted_by    text,
  deletion_reason text default ''
);

-- Reactions table (one reaction type per user per review)
create table if not exists general_review_reactions (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references general_reviews(id) on delete cascade,
  user_id       text not null,
  reaction_type text not null check (reaction_type in ('like', 'helpful', 'love')),
  created_at    timestamptz not null default now(),
  unique (review_id, user_id, reaction_type)
);

-- Replies table
create table if not exists general_review_replies (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references general_reviews(id) on delete cascade,
  user_id       text not null,
  user_name     text not null,
  user_avatar   text default '',
  content       text not null check (char_length(content) between 1 and 1000),
  created_at    timestamptz not null default now(),
  is_deleted    boolean not null default false,
  deleted_at    timestamptz,
  deleted_by    text
);

-- Indexes
create index if not exists idx_general_reviews_created_at  on general_reviews(created_at desc);
create index if not exists idx_general_reviews_user_id     on general_reviews(user_id);
create index if not exists idx_review_reactions_review_id  on general_review_reactions(review_id);
create index if not exists idx_review_replies_review_id    on general_review_replies(review_id);

-- RLS: enable row level security
alter table general_reviews          enable row level security;
alter table general_review_reactions enable row level security;
alter table general_review_replies   enable row level security;

-- Public read: visible reviews only (not deleted)
create policy "public can read visible reviews"
  on general_reviews for select
  using (is_deleted = false);

create policy "public can read reactions"
  on general_review_reactions for select
  using (true);

create policy "public can read visible replies"
  on general_review_replies for select
  using (is_deleted = false);

-- Authenticated insert (server-side API handles auth via service role key)
-- All writes go through server API routes using supabaseAdmin, so no anon insert policies needed.
