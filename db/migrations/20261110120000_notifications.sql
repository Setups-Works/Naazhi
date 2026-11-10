-- Notifications: the phones a person is signed in on (for push) and an inbox of messages for them.
-- Messages come from the server only (an admin writing to users, a shared-journal invitation, new Reader articles): people can read
-- their own, mark them read and delete them, but cannot create them.

create table if not exists public.push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  token text not null check (char_length(token) between 20 and 4096),
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (token)
);
create index if not exists push_devices_user on public.push_devices (user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('admin', 'invite', 'reader')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 1000),
  -- A path inside the app to open when the notification is tapped, for example /journal/collaborate.
  url text check (char_length(url) <= 200),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_unread on public.notifications (user_id) where read_at is null;

alter table public.push_devices enable row level security;
alter table public.notifications enable row level security;

drop policy if exists "owner all" on public.push_devices;
create policy "owner all" on public.push_devices
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No insert policy on purpose: only the server (as the database owner) creates notifications.
drop policy if exists "owner read" on public.notifications;
create policy "owner read" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "owner update" on public.notifications;
create policy "owner update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "owner delete" on public.notifications;
create policy "owner delete" on public.notifications for delete to authenticated using (user_id = auth.uid());
