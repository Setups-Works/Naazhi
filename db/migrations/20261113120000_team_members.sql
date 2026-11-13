-- Team members shown on the public /team page. Managed only from the admin panel (server code, owner connection); the public page reads the
-- published rows on the server. RLS is on with no policies, so no browser or signed-in user can read or write this table directly.

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  role text not null check (char_length(btrim(role)) between 1 and 80),
  bio text not null default '' check (char_length(bio) <= 1000),
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  profile_links jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists team_members_public on public.team_members (published, sort_order, created_at);

alter table public.team_members enable row level security;
