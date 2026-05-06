-- =====================================================================
-- vendor_invite_tokens
-- Admin-generated unique invite links for the vendor application form.
-- Run this in the Supabase SQL editor (or via supabase db push).
-- =====================================================================

create table if not exists vendor_invite_tokens (
  id           uuid        primary key default gen_random_uuid(),
  token        text        not null unique default encode(gen_random_bytes(32), 'hex'),
  label        text,                             -- optional friendly name
  created_by   text        not null,             -- Clerk user ID of the admin
  uses_limit   integer     default null,         -- null = unlimited uses
  uses_count   integer     not null default 0,
  expires_at   timestamptz default null,         -- null = never expires
  revoked      boolean     not null default false,
  created_at   timestamptz not null default now()
);

-- Ensure only service_role (supabaseAdmin) can touch this table.
-- Authenticated / anon roles are denied; the Next.js server uses
-- SUPABASE_SERVICE_ROLE_KEY which bypasses RLS entirely.
alter table vendor_invite_tokens enable row level security;

create policy "vendor_invite_tokens: deny all non-service access"
  on vendor_invite_tokens
  for all
  using (false);

-- ── vendor_applications: track which invite was used ──────────────
-- Adds a nullable FK so each application can reference its invite token.
alter table vendor_applications
  add column if not exists invite_token_id uuid
    references vendor_invite_tokens (id)
    on delete set null;

-- ── Indexes ────────────────────────────────────────────────────────
create index if not exists idx_vendor_invite_tokens_token on vendor_invite_tokens (token);

-- ── Helper: atomic uses_count increment ────────────────────────────
-- Called via supabaseAdmin.rpc('increment_invite_token_use', { token_id })
create or replace function increment_invite_token_use(token_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update vendor_invite_tokens
  set uses_count = uses_count + 1
  where id = token_id;
end;
$$;
