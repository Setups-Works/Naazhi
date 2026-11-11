-- A person's connection to an outside service (today: Zoho). The refresh token and the current access token are sealed by the app
-- (AES-256-GCM, bound to the user id) before they reach this table, and only the server role can touch it: the browser never reads or
-- writes it. `meta` holds non-secret facts: the data center, when the access token expires, and cached organisation ids.
create table if not exists public.user_integrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('zoho')),
  secret_cipher text not null,
  -- Who the account is (name and email shown in Settings).
  label text not null default '',
  -- The services the person picked (mail, crm, desk…) and the scopes Zoho granted for them.
  services text[] not null default '{}',
  scopes text not null default '',
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.user_integrations enable row level security;
revoke all on public.user_integrations from authenticated;

-- A sign-in in progress. Only a hash of the random `state` is kept; it is single use and expires after ten minutes, and it ties the
-- browser that comes back from Zoho to the person who started the sign-in.
create table if not exists public.integration_oauth_states (
  state_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('zoho')),
  services text[] not null default '{}',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists integration_oauth_states_expiry_idx on public.integration_oauth_states (expires_at);
alter table public.integration_oauth_states enable row level security;
revoke all on public.integration_oauth_states from authenticated;
