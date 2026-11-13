-- Where each person came from: the link they followed (utm_source, utm_medium, utm_campaign, ?ref=), the site that sent them, or the
-- Google Play install referrer in the phone app. One row per person, written once, the first time the app learns it. Only four short,
-- cleaned values are kept (no addresses, no queries); a person with no source is stored as "direct".
-- People can read and add their own row; nobody can change it afterwards. The admin panel reads every row with the owner role.

create table if not exists public.user_acquisition (
  user_id uuid primary key references auth.users(id) on delete cascade,
  source text not null default 'direct' check (char_length(source) between 1 and 60),
  medium text not null default '' check (char_length(medium) <= 60),
  campaign text not null default '' check (char_length(campaign) <= 80),
  referrer_host text not null default '' check (char_length(referrer_host) <= 120),
  platform text not null default 'web' check (platform in ('web', 'android', 'ios')),
  created_at timestamptz not null default now()
);
create index if not exists user_acquisition_source_idx on public.user_acquisition (source, created_at desc);
create index if not exists user_acquisition_created_idx on public.user_acquisition (created_at desc);

alter table public.user_acquisition enable row level security;
create policy user_acquisition_read on public.user_acquisition for select to authenticated using (user_id = auth.uid());
create policy user_acquisition_insert on public.user_acquisition for insert to authenticated with check (user_id = auth.uid());
revoke update, delete on public.user_acquisition from authenticated;
