-- Notes: folders and labels.
-- A folder is a named group a note can be filed in (like chat_folders). Labels are short tags kept on the note itself; the list of
-- labels a person has is simply the distinct labels across their notes, so there is no separate labels table to keep in sync.

create table if not exists public.note_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create index if not exists note_folders_user on public.note_folders (user_id, created_at);

alter table public.note_folders enable row level security;
drop policy if exists "owner all" on public.note_folders;
create policy "owner all" on public.note_folders for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.notes
  add column if not exists folder_id uuid references public.note_folders(id) on delete set null,
  add column if not exists labels text[] not null default '{}' check (cardinality(labels) <= 20);

-- A note may only be filed in a folder the person owns.
drop policy if exists "owner all" on public.notes;
create policy "owner all" on public.notes for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (folder_id is null or exists (select 1 from public.note_folders f where f.id = folder_id and f.user_id = auth.uid()))
  );

-- Realtime: other open tabs learn that folders changed (same trigger the other tables use).
drop trigger if exists note_folders_notify on public.note_folders;
create trigger note_folders_notify after insert or update or delete on public.note_folders
  for each row execute function public.notify_row_change();
