-- Signing in to the desktop app with Google: the app shows a six-character code, the person approves that code in their browser, and the app
-- collects a single-use sign-in token. Rows live for ten minutes and are removed as soon as the token is handed over. Only the server touches
-- this table (owner role); nobody signed in can read or change it, so there are no policies. The app proves it started the request with a
-- secret that is stored only as a hash.

create table if not exists public.desktop_sign_ins (
  code text primary key check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  secret_hash text not null,
  user_id uuid references auth.users(id) on delete cascade,
  token text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists desktop_sign_ins_expires_idx on public.desktop_sign_ins (expires_at);

alter table public.desktop_sign_ins enable row level security;
revoke all on public.desktop_sign_ins from authenticated;
