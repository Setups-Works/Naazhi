-- Email campaigns sent from Admin → Campaigns: a newsletter to everyone who has not unsubscribed, or a direct email to the people picked.
-- All four tables are server-only (RLS on, no policies): the admin code writes them as the owner after assertAdmin().

create table if not exists public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  subject text not null check (char_length(subject) between 1 and 200),
  preheader text not null default '' check (char_length(preheader) <= 200),
  -- The editor's HTML, sanitised again when it is sent. Placeholders: {{name}}.
  html text not null default '' check (char_length(html) <= 200000),
  -- newsletter: skips people who unsubscribed and carries an unsubscribe link. direct: a one-to-one or support email, always delivered.
  kind text not null check (kind in ('newsletter', 'direct')),
  audience text not null check (audience in ('all', 'picked')),
  picked uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

-- One row per address the campaign goes to, written when it is sent; the sender works through the queued ones in batches.
create table if not exists public.email_campaign_recipients (
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete set null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  -- A provider error code only, never the message (it can quote the address).
  error text,
  sent_at timestamptz,
  primary key (campaign_id, email)
);
create index if not exists email_campaign_recipients_queue on public.email_campaign_recipients (campaign_id, status);

create table if not exists public.email_campaign_attachments (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  content_type text not null default 'application/octet-stream',
  size_bytes integer not null check (size_bytes >= 0),
  -- A key in the note-files bucket under the admin's id, like any owner-scoped file.
  storage_key text not null,
  created_at timestamptz not null default now()
);
create index if not exists email_campaign_attachments_campaign on public.email_campaign_attachments (campaign_id);

-- Addresses that asked not to get newsletters (lower case). Kept even if the account is deleted, so they are never mailed again.
create table if not exists public.email_unsubscribes (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

alter table public.email_campaigns enable row level security;
alter table public.email_campaign_recipients enable row level security;
alter table public.email_campaign_attachments enable row level security;
alter table public.email_unsubscribes enable row level security;
