-- Visits by search-engine, AI and social crawlers to the public site, for Admin → Crawlers. One row per page request that a known crawler
-- made (found by its user-agent, so a bot can pretend to be another; the numbers show what visitors claim to be). Only the bot's name, its
-- kind, the page path (no query string), the host and the time are kept: no address and no user-agent text. Rows older than 90 days
-- are removed by the recorder. RLS on with no policies: only the server reads or writes this table.

create table if not exists public.crawler_hits (
  id bigint generated always as identity primary key,
  bot text not null check (char_length(bot) between 1 and 60),
  kind text not null check (kind in ('search', 'ai', 'social', 'seo', 'other')),
  path text not null default '/' check (char_length(path) <= 200),
  host text not null default '' check (char_length(host) <= 120),
  created_at timestamptz not null default now()
);
create index if not exists crawler_hits_created_idx on public.crawler_hits (created_at desc);
create index if not exists crawler_hits_bot_idx on public.crawler_hits (bot, created_at desc);

alter table public.crawler_hits enable row level security;
revoke all on public.crawler_hits from authenticated;
