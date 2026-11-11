-- AI connections from the model picker: a person's own API key for a provider (OpenAI, Anthropic, Google, OpenRouter) or their ChatGPT
-- sign-in (OAuth tokens). Secrets are sealed by the app (AES-256-GCM, bound to the user id) before they reach this table, and only the
-- server role can touch it: the browser never reads or writes it, and only ever gets a four-character hint.

create table if not exists public.user_ai_connections (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai', 'anthropic', 'google', 'openrouter', 'chatgpt')),
  kind text not null check (kind in ('key', 'oauth')),
  secret_cipher text not null,
  key_hint text not null default '',
  -- Non-secret facts: for ChatGPT the account id and when the access token expires.
  meta jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.user_ai_connections enable row level security;
revoke all on public.user_ai_connections from authenticated;

-- A ChatGPT sign-in in progress (the code shown to the person, waiting for them to approve it). One per person; short lived.
create table if not exists public.ai_device_logins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  device_auth_id text not null,
  user_code text not null,
  interval_s integer not null default 5,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
alter table public.ai_device_logins enable row level security;
revoke all on public.ai_device_logins from authenticated;
