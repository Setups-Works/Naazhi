-- A person's connection to an app reached through Composio (Gmail, Google Calendar). Composio keeps the OAuth tokens; this table keeps
-- only the id of the connection at Composio, its state and the account's name, so no secret is stored here. One connection per person
-- per app. Only the server role can touch it: the browser never reads or writes it (the integrations API answers for it).
-- `app` is checked for shape only; the list of apps lives in the code (apps/web/src/lib/composio/apps.ts), so a new app needs no migration.
create table if not exists public.integration_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null check (app ~ '^[a-z0-9_]{1,40}$'),
  -- The connected account's id at Composio. It is also how an incoming webhook finds the person it belongs to.
  connection_id text not null,
  status text not null check (status in ('connected', 'pending', 'expired', 'error')),
  -- Who the account is (an email address), shown in Settings.
  label text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, app)
);
create unique index if not exists integration_connections_connection_idx on public.integration_connections (connection_id);
alter table public.integration_connections enable row level security;
revoke all on public.integration_connections from authenticated;

-- Events Composio sent to the webhook (a new email, a changed event). Only ids are kept, never the content of the email or event.
-- The primary key makes a repeated delivery harmless: the same event is recorded once.
create table if not exists public.integration_events (
  event_id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  app text not null check (app ~ '^[a-z0-9_]{1,40}$'),
  trigger text not null,
  received_at timestamptz not null default now()
);
create index if not exists integration_events_user_idx on public.integration_events (user_id, received_at desc);
alter table public.integration_events enable row level security;
revoke all on public.integration_events from authenticated;
