-- ============================================================
--  Auction System — Supabase SQL Schema
-- ============================================================

-- ── Auctions ────────────────────────────────────────────────
create table if not exists public.auctions (
  id              bigint generated always as identity primary key,
  title           text        not null,
  description     text        not null default '',
  image_url       text        not null default '',
  starting_price  numeric(12,2) not null default 0,
  reserve_price   numeric(12,2),                  -- optional minimum to sell
  current_bid     numeric(12,2) not null default 0,
  bid_count       integer     not null default 0,
  min_increment   numeric(12,2) not null default 1,
  winner_name     text,
  winner_email    text,
  ends_at         timestamptz not null,
  status          text        not null default 'active'
                    check (status in ('active','ended','cancelled')),
  created_at      timestamptz not null default now()
);

-- ── Bids ────────────────────────────────────────────────────
create table if not exists public.auction_bids (
  id              bigint generated always as identity primary key,
  auction_id      bigint      not null references public.auctions(id) on delete cascade,
  bidder_name     text        not null,
  bidder_email    text        not null,
  amount          numeric(12,2) not null,
  created_at      timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists auction_bids_auction_id_idx on public.auction_bids(auction_id);
create index if not exists auctions_status_ends_at_idx on public.auctions(status, ends_at);

-- ── Row Level Security ───────────────────────────────────────
alter table public.auctions      enable row level security;
alter table public.auction_bids  enable row level security;

-- Public: anyone can read active auctions and bids
create policy "auctions_public_read"
  on public.auctions for select
  using (true);

create policy "bids_public_read"
  on public.auction_bids for select
  using (true);

-- Public: anyone can insert a bid (API validates inputs)
create policy "bids_public_insert"
  on public.auction_bids for insert
  with check (true);

-- Only service-role (server) can insert / update auctions
create policy "auctions_service_write"
  on public.auctions for all
  using (auth.role() = 'service_role');

-- ── Auto-end auctions via a scheduled or trigger approach ────
-- You can call the function below from a cron job or Supabase Edge Function.
create or replace function public.end_expired_auctions()
returns void
language plpgsql
security definer
as $$
begin
  update public.auctions
  set    status = 'ended'
  where  status = 'active'
    and  ends_at <= now();
end;
$$;

-- ── Seed a sample auction (optional — remove before production) ─
-- insert into public.auctions (title, description, image_url, starting_price, min_increment, ends_at)
-- values (
--   'Samsung Galaxy S24 Ultra',
--   'Brand new sealed unit. 256 GB Titanium Black. Comes with original accessories.',
--   '',
--   1200.00,
--   10.00,
--   now() + interval '3 days'
-- );
