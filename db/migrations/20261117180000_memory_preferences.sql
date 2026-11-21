-- User memory preferences: opt-in AI long-term semantic memory
-- Memory is strictly disabled by default (enabled = false).

create table if not exists user_memory_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  paused boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_memory_preferences enable row level security;

-- Owner can read and update their own preferences
create policy "user_memory_preferences_owner_all" on user_memory_preferences
  for all using (user_id = auth.uid());

create index if not exists idx_user_memory_preferences_user_id
  on user_memory_preferences (user_id);
