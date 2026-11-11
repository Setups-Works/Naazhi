-- Public sharing for one whole journal day (every entry written on that day). A day is private unless a row exists here; the token is the
-- secret in the public link. The public page looks the day up on the server by exact token, so nothing is enumerable. Entries added to a
-- shared day later show up on the link; deleting the row (Stop sharing) ends it. Same model as 20261021120000_journal_entry_share.sql.

create table if not exists public.journal_day_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  share_token text not null check (share_token ~ '^[a-f0-9]{32}$'),
  shared_at timestamptz not null default now(),
  unique (user_id, entry_date),
  unique (share_token)
);

alter table public.journal_day_shares enable row level security;
drop policy if exists "owner all" on public.journal_day_shares;
create policy "owner all" on public.journal_day_shares for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
