-- Skills: saved prompts a person calls from chat by typing "/" and the skill's name.
-- Private to the person who wrote them.

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- The word typed after "/": lowercase letters, digits and dashes.
  name text not null check (name ~ '^[a-z0-9][a-z0-9-]{0,29}$'),
  description text not null default '' check (char_length(description) <= 120),
  prompt text not null check (char_length(prompt) between 1 and 4000),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);
create index if not exists skills_user on public.skills (user_id, created_at);

alter table public.skills enable row level security;
drop policy if exists "owner all" on public.skills;
create policy "owner all" on public.skills for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
