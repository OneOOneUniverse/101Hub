create table orders (
  id              bigint generated always as identity primary key,
  order_ref       text not null unique,
  customer_name   text not null,
  customer_email  text,
  customer_phone  text not null,
  customer_address text not null,
  customer_note   text,
  items           jsonb not null,
  subtotal        numeric not null,
  delivery        numeric not null,
  total           numeric not null,
  downpayment     numeric not null,
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
  status          text not null default 'pending',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

alter table service_requests enable row level security;
