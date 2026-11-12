-- Invite someone to a shared journal by email address, even when no account uses that address yet.
--
-- Until now an invitation needed an existing account (`invitee_id`). Now it can name an email address instead: the row waits with
-- `invitee_id` empty, and the first signed-in person whose VERIFIED email matches claims it (the server does this when they list their
-- invitations; see collaboration.service listMyInvites). After that it is an ordinary invitation. Append-only: nothing existing changes.

alter table public.shared_journal_invites alter column invitee_id drop not null;
alter table public.shared_journal_invites add column if not exists invitee_email text;

alter table public.shared_journal_invites drop constraint if exists shared_journal_invites_target;
alter table public.shared_journal_invites
  add constraint shared_journal_invites_target check (invitee_id is not null or invitee_email is not null);

-- One open email invitation per address per journal (an account-based one is already covered by shared_journal_invites_one_pending).
create unique index if not exists shared_journal_invites_one_pending_email
  on public.shared_journal_invites (journal_id, lower(invitee_email))
  where status = 'pending' and invitee_id is null;

-- Finding the open invitations that wait for an address (the claim step).
create index if not exists shared_journal_invites_waiting_email
  on public.shared_journal_invites (lower(invitee_email))
  where status = 'pending' and invitee_id is null;

-- Row-level security is unchanged: the owner of the journal reads these rows (and may withdraw them); creating and claiming one is
-- server code. A waiting row has no invitee yet, so nobody but the owner can see it until it is claimed.
