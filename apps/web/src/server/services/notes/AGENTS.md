# services/notes — the reference implementation

**Owner:** track A builds the pattern, track B migrates the feature. **Phase 1–2.** **Jira:** UNT-57 (pattern), UNT-60 (migration), UNT-64 (v2), UNT-67 (attachments).

**Responsibilities:** list/search/create/update/delete notes, pin and categorise, reorder (`sort_order`), manage attachments, expose history (`note_versions`), enforce workspace permissions, later tags/backlinks/trash.

**This folder defines the pattern every other domain copies** — keep it exemplary:

1. `notes.schema.ts` — Zod input/output types.
2. `notes.service.ts` — functions taking `ctx` + input; permission check → rules → repository.
3. `apps/web/src/server/repositories/notes.repository.ts` — queries only.
4. `apps/web/src/app/api/v1/notes/route.ts` — built with the shared `handler()`; calls the service.
5. `apps/web/src/features/notes` — hooks call the API; components never touch the database.
6. Tests for rules (ownership, validation, ordering).

**Rules:** the note body is markdown (store as given, sanitise on render); never trust `user_id`/`workspace_id` from the client — take them from `ctx`.

## Trash and sharing (`20261111150000_notes_trash_share.sql`)

- **Trash:** deleting a note sets `deleted_at`; it is hidden from every list, search, export, Library and Home card, and from `/api/v1/notes` (the REST `DELETE` also moves to the Trash). The Trash view (Notes → Trash) restores, deletes for good (files first, then the row) or empties; notes older than 30 days are cleared the next time the Trash loads. Anything that reads notes must filter `deleted_at is null`.
- **Sharing:** `notes.service.ts` `setNoteShared` makes or clears a random token (`POST /api/v1/notes/[id]/share`); `/share/note/[token]` looks the note up by exact token with the owner connection (no enumeration, title/text/files only, no owner identity). A trashed note has no working link. Same model as shared chats and journal entries.
- **Atlas** (Notes → Atlas) is a client-side map of the person's own notes: links `[[Title]]`, shared labels and same folder. No data of its own.
