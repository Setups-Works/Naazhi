-- Anonymous visits to the public site, counted by where the visitor came from, so the admin panel can show visits next to sign-ups.
-- One row per browser session. Only the cleaned source tags and the page path are kept: no address, no device, no identifier, no cookie
-- id. Nobody but the service (owner role) can read or write this table.

create table if not exists public.site_visits (
  id bigint generated always as identity primary key,
  source text not null default 'direct' check (char_length(source) between 1 and 60),
  medium text not null default '' check (char_length(medium) <= 60),
  campaign text not null default '' check (char_length(campaign) <= 80),
  landing_path text not null default '/' check (char_length(landing_path) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists site_visits_created_idx on public.site_visits (created_at desc);
create index if not exists site_visits_source_idx on public.site_visits (source, created_at desc);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from authenticated;
