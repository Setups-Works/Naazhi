# Data model

PostgreSQL 16 (Docker). **All tables have Row-Level Security enabled.** Migrations live in `db/migrations/` and are append-only. Update this file in the same PR as any schema change.

## Current tables

| Table             | Purpose                          | Key columns                                                                                                                                                                                  | Access                                                                                                                                                 |
| ----------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `profiles`        | Per-user settings row            | `user_id` PK, `plan` ('free'/'pro', **not used by billing**: see `user_billing`), `personality` (unused)                                                                                                                                  | Owner can read/insert (plan must be 'free')/update; `update(plan)` revoked for `authenticated` — plan changes are service-role only                    |
| `tasks`           | To-do items                      | `user_id`, `title`, `description`, `priority` 1–4, `list_id`→`task_lists`, `parent_id`→`tasks` cascade (sub-tasks; the policy checks the parent with `owns_task()`, a `security definer` helper, because a policy on `tasks` cannot query `tasks` itself), `due_date` (date), `done`/`done_at`, `cancelled`, `archived`, `recurrence` (daily/weekdays/weekly/monthly/yearly, or `nth:N:day` such as `nth:2:wed` = every 2nd Wednesday) | Owner only; `list_id` must be a list the user owns                                                                                                     |
| `task_lists`      | Named lists                      | `user_id`, `name`, `color` (tint name)                                                                                                                                                       | Owner only                                                                                                                                             |
| `journal_entries` | Many timestamped entries per day | `user_id`, `entry_date` (date), `body`, `kind` (text/voice), `attachments` jsonb, `share_token` (32 hex, unique, null = private), `shared_at`, `created_at`                                                                                               | Owner only                                                                                                                                             |
| `health_daily` | Daily health aggregates synced from the phone | `user_id`, `day` (date, unique per user), `steps`, `distance_m`, `active_kcal`, `resting_hr`, `hr_min`, `hr_max`, `sleep_minutes`, `source` (healthkit/health_connect), `synced_at` | Owner only |
| `shared_journals` | Journals several people write in | `owner_id`, `name` (≤80) | Members read; owner updates/deletes |
| `shared_journal_members` | People in a shared journal | `journal_id`, `user_id`, `role` (editor/viewer); the owner is `shared_journals.owner_id`, not a row here | Members read; owner changes role/removes; anyone may leave; **no insert policy** (added only when an invite is accepted, by server code) |
| `shared_journal_invites` | Invitations by username or email | `journal_id`, `inviter_id`, `invitee_id` (empty while an email invitation waits for a sign-up), `invitee_email`, `role`, `status` (pending/accepted/declined), one pending per person (or per address) per journal | Invitee and owner read; owner withdraws; created, claimed and answered by server code only. A waiting row is claimed by the person whose **confirmed** email matches (when they list their invitations) |
| `shared_journal_entries` | Entries in a shared journal | `journal_id`, `user_id` (author), `entry_date`, `body`, `kind`, `attachments` jsonb | Members read; owner/editor insert as themselves; author edits own; author or owner deletes |
| `notes`           | Notes                            | `user_id`, `title`, `body` (markdown), `category`, `pinned`, `kind`, `sort_order`, `color`, `attachments` jsonb, `folder_id`, `labels` text[] (≤20; the person's label list is the distinct labels across their notes), `deleted_at` (set = in the Trash; hidden everywhere else, removed for good after 30 days), `share_token` + `shared_at` (public read-only link; null = private)                                                                              | Owner only                                                                                                                                             |
| `note_folders`    | Folders a note can be filed in   | `user_id`, `name` (1–60 chars); `notes.folder_id`→`note_folders` set null on delete                                                                                                           | Owner only; a note can only be filed in a folder the owner has (checked in the `notes` policy)                                                          |
| `skills`          | Saved prompts for chat ("/name") | `user_id`, `name` (lowercase, digits, dashes, ≤30, unique per person), `description` (≤120), `prompt` (≤4000)                                                                                    | Owner only                                                                                                                                             |
| `note_versions`   | History snapshots                | `note_id`→`notes` cascade, `title`, `body`, `created_at`                                                                                                                                     | Owner only; written by trigger `snapshot_note` (≤1 per 2 min, newest 30 kept)                                                                          |
| `chats`           | Conversations                    | `user_id`, `title`, `pinned`, `folder_id`→`chat_folders`, `last_read_at`, `share_token` (32 hex, unique, null = private), `shared_at`, `updated_at`                                          | Owner only; `folder_id` must be the user's. Public sharing is served by the server (service role) looking up the exact token — never by an anon policy |
| `chat_folders`    | Chat folders                     | `user_id`, `name`                                                                                                                                                                            | Owner only                                                                                                                                             |
| `chat_messages`   | Messages                         | `chat_id`→`chats` cascade, `user_id`, `role` (user/assistant), `body`, `attachments` jsonb                                                                                                   | Owner only; chat must be the user's                                                                                                                    |
| `calendar_events` | Calendar entries / synced cache  | `user_id`, `title`, `description`, `location`, `start_at`, `end_at`, `all_day`, `color`, `calendar_id`, `external_id`                                                                       | Owner only (`user_id = auth.uid()`)                                                                                                                    |
| `billing_plans`   | The three plans on offer, edited in Admin → Plans | `id` (subscription/payg/byo), `name`, `tagline`, `price_cents` (smallest unit: paise for INR), `currency` (default `inr`), `interval` (month/year/none), `included_tokens`, `token_price_cents_per_million`, `features` text[], `active`, `sort`, `trial_days` (free-trial length, 0 = none; Subscription only) | Authenticated can **select where active**; writes service-role only (insert/update/delete revoked) |
| `user_billing`    | The plan a person chose          | `user_id` PK, `plan_id`→`billing_plans`, `status` (active/canceled), `period_start`, `period_end`, `cancel_at_period_end`, `started_at`, `canceled_at`, `trial_ends_at` (set while on a free trial). No row = no plan chosen | Owner reads; **no client writes**, the billing service changes it |
| `ai_usage`        | Metered AI use, tokens only      | `user_id`, `plan_id`, `provider`, `input_tokens`, `output_tokens`, `created_at` | Owner reads; only the billing service inserts |
| `user_ai_keys`    | A person's own AI key (own-key plan) | `user_id` PK, `provider`, `model`, `key_cipher` (AES-256-GCM, bound to the user), `key_hint` (last 4) | **No access for `authenticated`**; server only |
| `admin_audit`     | Admin action log                 | `admin_id`, `admin_email`, `action`, `target`, `meta` jsonb                                                                                                                                  | RLS on with **no policies** → service role only                                                                                                        |
| `announcements`   | Banners from admins              | `message`, `tone`, `active`                                                                                                                                                                  | Authenticated can **select where active**; writes service-role only                                                                                    |
| `auth.users`      | Better Auth accounts             | `email`, nullable unique `username`, nullable `"displayUsername"` (username plugin display value; backfilled from `display_username`), role, ban state/reason/expiry                   | Auth schema, server only; username availability endpoint disabled                                                                                      |
| `auth.sessions`   | Better Auth sessions             | `user_id`, token, expiry, optional `impersonated_by`                                                                                                                                        | Auth schema, server only                                                                                                                               |
| `auth.passkeys`   | Better Auth WebAuthn credentials | `user_id`, `credential_id`, `public_key`, counter and authenticator metadata                                                                                                                 | Auth schema, RLS enabled with no client policies; Better Auth server only                                                                              |

`attachments` is `[{ path, name, type, size }]` where `path` is a key in a Storage bucket.

## Storage

| Bucket       | Public            | Limit | Path convention                                                               | Policy                                                                                   |
| ------------ | ----------------- | ----- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `note-files` | no                | 10 MB | `<user_id>/<area>/<id>/<uuid>-<filename>` (areas: note id, `journal`, `chat`; shared journals use `<author id>/shared-journal/<journal id>/…`, readable by every member of that journal) | Owner folder only (`storage.foldername(name)[1] = auth.uid()`); read through signed URLs |
| `avatars`    | yes (images only) | 2 MB  | `<user_id>/avatar-<timestamp>.<ext>`                                          | Owner folder only for writes                                                             |

## Auth metadata (not tables)

- `user_metadata`: `full_name`, `avatar_url`, `preferences` { `timeFormat`, `defaultCategory`, `weekStart`, `density`, `reduceMotion`, `todoView` }. Users can edit their own.
- `app_metadata.role = 'admin'`: set only with the service role. `ADMIN_EMAILS` env var bootstraps first admins (also protects them from demotion in the panel).

## Migrations so far (apply in order)

1. `…000000_workspace.sql` — profiles, tasks, journal, notes, chats, chat_messages + RLS
2. `…010000_notes_v2.sql` — categories, pin, voice, ordering, attachments, `note_versions` + trigger, `note-files` bucket
3. `…020000_note_color.sql` — note colour
4. `…030000_journal_entries.sql` — many entries/day, attachments, kind
5. `…040000_todo_v2.sql` — `task_lists`, priorities, cancel/archive, recurrence
6. `…050000_admin_and_avatars.sql` — `admin_audit`, `announcements`, `avatars` bucket
7. `…060000_chat_v2.sql` — folders, pin, unread, message attachments
8. `…070000_chat_share.sql` — `share_token`, `shared_at`
9. `…08100000_auth_passkeys.sql` — private Better Auth WebAuthn credentials in `auth.passkeys`
10. `…08110000_auth_username.sql` — username fields and normalized uniqueness for Better Auth users
11. `…08120000_auth_username_plugin_column.sql` — add Better Auth username plugin's `"displayUsername"` column and backfill existing display values
12. `…08130000_auth_admin_plugin.sql` — add Better Auth admin ban metadata and impersonation session field
13. `…10120000_calendar_events.sql` — `calendar_events` table + RLS policies and indexes
14. `20261020120000_shared_journals.sql` — shared journals: journals, members, invites, entries, `shared_journal_role()` helper, RLS, and a realtime trigger that notifies every person in a journal
15. `20261021120000_journal_entry_share.sql` — `share_token` / `shared_at` on `journal_entries`: a secret, revocable public link to one entry (same model as shared chats)

## Planned (by phase)

| Phase | Tables / changes                                                                                                                                                                                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `workspaces`, `workspace_members(role)`, `workspace_invites`; `workspace_id` on notes/tasks/task_lists/chats/folders (journal stays author-private); SQL helpers `is_workspace_member()`, `workspace_role()`; `jobs` |
| 2     | `tags` + join tables, note backlinks, soft-delete columns, `subtasks` (parent_id), labels, reminders, mood on journal entries, tsvector + GIN indexes                                                                |
| 3     | `integration_connections`, `calendar_events` (cache), email thread metadata cache                                                                                                                                    |
| 4     | `user_ai_settings`, `ai_usage`, embeddings (pgvector)                                                                                                                                                                |
| 5     | `meetings`, `meeting_transcripts`, `automations`, `automation_runs`, `notifications`, `notification_preferences`                                                                                                     |
| 6     | Billing columns/tables (Stripe ids), aggregated usage views                                                                                                                                                          |

## Rules of thumb

- `timestamptz` for moments, `date` for calendar days; store UTC.
- UUID primary keys (`gen_random_uuid()`), `user_id uuid default auth.uid()` on user-owned rows so clients can't spoof ownership.
- Index every column you filter or sort by in lists (e.g. `(user_id, due_date)`).
- A policy of `auth.uid() is not null` is **not** access control.
- Tokens/OAuth credentials are never stored — Composio holds them; we keep connection ids.

## RSS reader

- `rss_feeds` — a person's subscriptions: `url` (unique per user), `site_url`, `title`, `description`, `image_url`, `last_fetched_at`, `last_error`. RLS: owner only.
- `rss_items` — articles as plain text: `guid` (unique per feed), `title`, `link`, `summary`, `content`, `image_url`, `author`, `published_at`, `is_read`, `is_starred`. RLS: owner only, and the feed must belong to the same user. Trimmed to the newest `RSS.itemsPerFeed` per feed (starred ones are kept).
16. `20261025120000_rss_reader.sql` — Reader: `rss_feeds`, `rss_items` + RLS
17. `20261026120000_billing_plans.sql` — plans and billing: `billing_plans` (seeded with placeholder prices), `user_billing`, `ai_usage`, `user_ai_keys`; RLS, and writes revoked from `authenticated` (see `docs/BILLING.md`)
18. `20261110120000_notifications.sql` — notifications: `push_devices` (a phone's push token per person, unique token) and `notifications` (the inbox: `kind` admin/invite/reader, `title`, `body`, in-app `url`, `read_at`). RLS: people read, mark read and delete only their own; there is no insert policy, only the server (as owner) creates them. See `apps/mobile/src/features/notifications/AGENTS.md`.

## journal_day_shares

Public link for one whole journal day. One row per `(user_id, entry_date)`; `share_token` (32 hex characters, unique) is the secret in `/share/journal/day/<token>`. Deleting the row ends the link. Owner-only RLS (`owner all`); the public page reads it on the server by exact token. Migration `20261111170000_journal_day_share.sql`.

## team_members

The people shown on the public `/team` page, managed in the admin panel (`/admin/team`). One row per person: `slug` (unique, url-safe, the page anchor and the person's `@id` fragment), `name`, `role`, `bio` (≤1000), `photo_url` (https only, optional), `profile_links` jsonb (`[{label, url}]`, https only, up to 8; also the person's `sameAs` in structured data), `sort_order`, `published`. RLS is on with **no policies**: nobody in the browser can read or write it. Admin code writes through `adminDb()` after `assertAdmin()`; the public page reads only published rows, fixed columns, on the server (`server/services/team`). Migration `20261113120000_team_members.sql`.

## Razorpay (migration 20261111180000)
`billing_plans.razorpay_plan_id/_key` (the matching Razorpay plan), `user_billing.provider_subscription_id/provider_status`, and `billing_events` (webhook ids handled; RLS on, no policies, owner only).

Migration `20261113140000_profile_phone.sql`: `profiles.phone` (international form like `+919876543210`, checked by a regex; the owner may update it). Asked for on the About screen of setup (required, web and phone app) and sent to Razorpay as the payment window's `prefill.contact` (`getContact` in the billing repository).

Migration `20261113130000_subscription_trial.sql`: `billing_plans.trial_days`, `user_billing.trial_ends_at`, and `billing_trials` (one row per person who has used their one free trial; owner can read, only the billing service writes).

## AI credit
`user_ai_credit` (balance in paise) and `ai_credit_ledger` (top-up / usage / adjust lines, unique Razorpay payment id). RLS on: people read their own rows, only the billing service writes. See docs/BILLING.md. Also `user_ai_connections` and `ai_device_logins` (model picker connections; owner only, see docs/AI_CONNECTIONS.md). Also `user_integrations` (a person's Zoho connection: sealed tokens, account label, picked services, data center in `meta`) and `integration_oauth_states` (a sign-in in progress: hashed single-use `state`, 10 minutes). Both owner only, no browser access; see docs/ZOHO.md.

## Invoices and billing settings
`billing_invoices` (one row per Razorpay payment: number `NZ-YYYY-NNNNNN`, kind subscription/topup, amount in paise, period, who it was billed to; people read their own, only the service writes) and `billing_settings` (one row: top-up limits and the seller details printed on invoices). See docs/BILLING.md.
