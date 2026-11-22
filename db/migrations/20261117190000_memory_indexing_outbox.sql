-- Outbox for asynchronous, retryable indexing of completed conversation turns into ChromaDB
-- RLS enabled with no client policies: accessed only by server services.

create table if not exists memory_indexing_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid not null,
  user_message_id uuid,
  assistant_message_id uuid,
  user_text text not null,
  assistant_text text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table memory_indexing_outbox enable row level security;

create index if not exists idx_memory_indexing_outbox_pending
  on memory_indexing_outbox (created_at)
  where status = 'pending';

create index if not exists idx_memory_indexing_outbox_user_chat
  on memory_indexing_outbox (user_id, chat_id);
