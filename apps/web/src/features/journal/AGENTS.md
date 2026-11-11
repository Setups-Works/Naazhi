# features/journal

**Does:** many timestamped entries per day, day navigation + month calendar (dots on days with entries), composer with attachments and voice, edit/delete entries. **Track B. Phase 2.**

**Today (legacy):** `components/app/{JournalView,JournalCalendar}.tsx`, `useRecorder.ts`.

**Backed by:** `journal_entries`, bucket `note-files` (`<uid>/journal/<entry>/…`). **Private to the author** — must stay so even inside shared workspaces. Writing together happens in **shared journals** (`features/collaboration`, separate tables); never mix the two.

**Sharing one entry:** `components/ShareEntryDialog.tsx` (link on/off, copy, picture preview, share/download), `hooks/useEntryShare.ts`, `lib/entryCard.ts` (canvas picture). Service `server/services/journal`, route `POST /api/v1/journal/[id]/share`, public page `/share/journal/[token]`. The picture's layout and text rules are shared with the app in `packages/logic/src/entryCard.ts`.

**Sharing a whole day:** `components/ShareDayDialog.tsx` (opened from the share button in the Day view header) turns a secret link on or off for every entry written that day, including ones added later. Table `journal_day_shares` (owner-only RLS, one row per user and day), service functions `getDayShare` / `setDayShared` / `getPublicDay`, route `GET|POST /api/v1/journal/day/share`, public page `/share/journal/day/[token]`. All share dialogs (note, journal entry, journal day, chat) use `components/app/ShareLinkDialog.tsx`.

**Rules**

- `entry_date` is the user's local calendar day (`date`), `created_at` the real timestamp; show times with `fmtTime()` (respects 12/24 h).
- Week start comes from user preferences (`weekdayIndex`).
- `?d=YYYY-MM-DD` deep-links a day (used by universal search).

**Jira:** UNT-62 (migrate), UNT-66 (templates, prompts, mood, weekly review), UNT-69/93 (insights).
