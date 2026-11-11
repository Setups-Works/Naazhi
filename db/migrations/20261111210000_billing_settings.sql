-- Billing settings an admin can change without a deploy: the limits and quick amounts of an AI credit top-up (Pay as you go). One row.
-- Amounts are in paise. Only the billing service (the owner role) reads and writes it; the browser gets the values through the billing API.

create table if not exists public.billing_settings (
  id boolean primary key default true check (id),
  topup_min_cents integer not null default 5000 check (topup_min_cents >= 100 and topup_min_cents % 100 = 0),
  topup_max_cents integer not null default 1000000 check (topup_max_cents >= topup_min_cents and topup_max_cents % 100 = 0),
  topup_options_cents integer[] not null default '{10000,25000,50000,100000}',
  updated_at timestamptz not null default now()
);
insert into public.billing_settings (id) values (true) on conflict (id) do nothing;
alter table public.billing_settings enable row level security;
revoke all on public.billing_settings from authenticated;
