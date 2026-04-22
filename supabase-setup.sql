create table orders (
  id              bigint generated always as identity primary key,
  order_ref       text not null unique,
  customer_name   text not null,
  customer_email  text,
  customer_phone  text not null,
  customer_address text not null,
  customer_note   text,
  delivery_type   text,
  items           jsonb not null,
  subtotal        numeric not null,
  delivery        numeric not null,
  processing_fee  numeric not null default 0,
  total           numeric not null,
  payment_method  text not null,
  payment_proof   text,
  payment_status  text not null default 'pending',
  order_status    text not null default 'payment_pending_admin_review',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

alter table orders enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Service requests tracking (for booking setup, installation, tune-ups)
-- ─────────────────────────────────────────────────────────────────────────────
create table service_requests (
  id              bigint generated always as identity primary key,
  ticket_ref      text not null unique,
  package_id      text not null,
  package_name    text not null,
  customer_name   text not null,
  customer_phone  text not null,
  issue           text not null,
  preferred_time  text,
  payment_ref     text,
  payment_proof   text,
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

alter table service_requests enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Order messages (admin-to-customer communications)
-- ─────────────────────────────────────────────────────────────────────────────
create table order_messages (
  id              bigint generated always as identity primary key,
  order_ref       text not null,
  message         text not null,
  message_type    text not null default 'custom',
  is_highlighted  boolean not null default false,
  created_at      timestamptz not null default now(),
  
  constraint fk_order_messages_order
    foreign key (order_ref) references orders(order_ref) on delete cascade
);

alter table order_messages enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- Site content (editable via admin panel)
-- ─────────────────────────────────────────────────────────────────────────────
create table site_content (
  id              text primary key default 'default',
  data            jsonb not null,
  updated_at      timestamptz not null default now()
);

alter table site_content enable row level security;

-- Only admins can read/write (via RLS and API auth)
create policy "authenticated_admins_can_read" on site_content
  for select to authenticated using (true);

create policy "authenticated_admins_can_update" on site_content
  for update to authenticated using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: add delivery_type and processing_fee to existing orders tables
-- Run these if you already have an orders table (skip for fresh setups)
-- ─────────────────────────────────────────────────────────────────────────────
alter table orders add column if not exists delivery_type   text;
alter table orders add column if not exists processing_fee  numeric not null default 0;

-- Migration: remove downpayment column (store is full-payment only, manual transfer)
-- Run this if you already have an orders table with the downpayment column
alter table orders drop column if exists downpayment;
