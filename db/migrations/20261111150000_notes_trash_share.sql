-- Notes: a Trash and public sharing.
--
-- Trash: deleting a note sets deleted_at instead of removing the row, so it can be restored. Notes with deleted_at set are hidden
-- everywhere except the Trash view, and are removed for good (rows and files) 30 days after they were trashed, or when the person
-- deletes them from the Trash. The existing owner-only policy already covers the new column.
--
-- Sharing: a note is private unless share_token is set; the token is the secret in the public link. The public page looks the note up
-- on the server (owner connection) by exact token, so no policy ever exposes shared notes to enumeration. Same model as shared chats
-- and shared journal entries (20261007070000_chat_share.sql, 20261021120000_journal_entry_share.sql).

alter table public.notes
  add column if not exists deleted_at timestamptz,
  add column if not exists share_token text,
  add column if not exists shared_at timestamptz;

create unique index if not exists notes_share_token on public.notes (share_token) where share_token is not null;
alter table public.notes drop constraint if exists notes_share_token_format;
alter table public.notes add constraint notes_share_token_format check (share_token is null or share_token ~ '^[a-f0-9]{32}$');

-- The Trash view and the nightly-style purge both filter by owner and deleted_at.
create index if not exists notes_user_deleted on public.notes (user_id, deleted_at) where deleted_at is not null;
