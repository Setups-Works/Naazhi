-- Long-term AI memory in PostgreSQL with pgvector: one row per remembered chat turn, embedded locally (multilingual E5, 384 dims).
-- Opt-in per person (user_memory_preferences). Rows are private to their author and go away with the chat or the account.
--
-- Needs the pgvector extension. Local Docker builds it into the postgres image (docker/postgres/Dockerfile). On Azure Database for
-- PostgreSQL, allow it first: add VECTOR to the server parameter `azure.extensions` (keep the values already there).
create extension if not exists vector;

create table if not exists public.conversation_memories (
  -- sha256(user id, memory key): re-indexing the same turn replaces the row instead of adding a copy.
  id text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chat_id uuid not null references public.chats(id) on delete cascade,
  source_user_message_id text,
  source_assistant_message_id text,
  content text not null check (char_length(content) between 1 and 4000),
  embedding vector(384) not null,
  model_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversation_memories enable row level security;

create policy conversation_memories_select on public.conversation_memories
  for select using (user_id = auth.uid());
create policy conversation_memories_insert on public.conversation_memories
  for insert with check (user_id = auth.uid());
create policy conversation_memories_update on public.conversation_memories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy conversation_memories_delete on public.conversation_memories
  for delete using (user_id = auth.uid());

-- Searches always filter by the owner first and then rank that person's (small) set exactly, so a per-user btree is enough;
-- an approximate HNSW index over everyone's rows would filter after ranking and could drop a person's best matches.
create index if not exists conversation_memories_user on public.conversation_memories (user_id, created_at desc);
create index if not exists conversation_memories_chat on public.conversation_memories (chat_id);
