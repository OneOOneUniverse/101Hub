-- =====================================================================
-- vendor_products: add columns that the API expects but may be absent
-- from tables created before these fields were introduced.
-- Safe to re-run: every statement uses ADD COLUMN IF NOT EXISTS.
-- =====================================================================

alter table vendor_products
  add column if not exists images        text[]    default '{}',
  add column if not exists videos        text[]    default null,
  add column if not exists variants      jsonb     default null,
  add column if not exists sizes         text[]    default null,
  add column if not exists colors        text[]    default null,
  add column if not exists discount      numeric   default null,
  add column if not exists delivery_fee  numeric   default null,
  add column if not exists no_delivery_fee boolean default null,
  add column if not exists badge         text      default null,
  add column if not exists rating        numeric   default null,
  add column if not exists admin_notes   text      default null,
  add column if not exists updated_at    timestamptz default now();

-- Reload PostgREST schema cache so the new columns are visible immediately.
notify pgrst, 'reload schema';
