# features/collaboration

**Does:** shared journals. Named journals that several people read and write together: create one, invite people **by username or email address** (an address with no account yet gets an email telling them to sign up; the invitation waits and is claimed by the first person whose **confirmed** email matches, in `listMyInvites`), they accept or decline, owners manage roles, everyone writes entries (text and files). The Journal page links to a separate **Collaboration** page that manages all of it. **Track B. Reference for multi-person features.**

**Design:** follows `docs/DESIGN_LANGUAGE.md` (glass `ap-card at-<tint>`, serif titles, `btn`, `tf-pill`, `at-<tint> tint` pills). The feed reuses the Journal's own `jr-*` look so the two read as one product. No literal colours, sizes or limits: tints come from `ROLE_TONE` / `toneFor`, limits from `SHARED_JOURNAL` (both in `@untitled/logic`).

**Roles:** `owner` manages people and can delete the journal or any entry · `editor` writes entries and edits/deletes their own · `viewer` reads only. Enforced by row-level security; the UI only hides what the server would refuse.

**Files:**

- `components/CollaborationApp.tsx`: the page (`/dashboard/journal/collaborate`): invitations, journals you own, journals shared with you.
- `components/SharedJournalApp.tsx`: one journal's feed + composer (`/dashboard/journal/shared/[id]`), `EntryCard`, `EntryComposer`.
- `components/ManageDialog.tsx` (+ `PeopleList`, `InviteForm`): people, roles, invitations, rename, leave/delete in one `Modal`.
- `components/{JournalCard,InviteCard,PersonAvatar,RolePill,RoleSelect}.tsx`: small presentational pieces.
- `hooks/useSharedJournals.ts`: TanStack Query hooks and one `useCollaborationActions`; realtime via `useCollaborationRealtime`. `hooks/useSignedUrls.ts`: links for attached files.
- `index.ts`: the public surface (`CollaborationApp`, `SharedJournalApp`, `useMyInvites`, types). Other code imports only from here.

**Shared with the app:** the API calls live in `packages/api-client/src/sharedJournals.ts`, pure helpers and limits in `packages/logic/src/sharedJournals.ts`, types in `packages/types`. The app (`apps/mobile/src/features/collaboration`) uses the same code.

**Backed by:** `shared_journals`, `shared_journal_members`, `shared_journal_invites`, `shared_journal_entries` (see `docs/DATA_MODEL.md`); service `server/services/collaboration`; routes `/api/v1/shared-journals/**` and `/api/v1/shared-journal-invites/**`; files in `note-files` under `<author>/shared-journal/<journal>/`.

**Rules**

- A shared journal is **separate from the private `journal_entries`** on purpose: personal views, AI context, insights and exports must never contain other people's words. Never merge the two queries.
- Changes are applied after the server answers (no optimistic updates): outcomes depend on permissions.
- Dates print only inside `ClientOnly` (the page files wrap it).
- Gated by `FEATURES.sharedJournals`.

**Views:** `SharedJournalApp` mirrors the personal Journal (`components/app/JournalView.tsx`): Day, Calendar and All entries tabs, the streak, a composer with files and voice (drafts kept per journal and day), and the month and recent days in the sidebar through `SidebarPortal` (`AppNav.hasPageList` lists the shared-journal paths so the slot exists). The Collaboration page puts the list of journals in the sidebar. Data: `GET /api/v1/shared-journals/:id/entries?date=` (one day) and `/days` (counts and first words per day), hooks `useJournalDay` / `useJournalDays`, date maths in `lib/calendar.ts` (tested). The phone app's `SharedJournalScreen` is day-based like its Journal: day switcher with a calendar sheet, per-day drafts, voice, the same writing page.

**Links into the app:** the invitation email links to `<app address>/journal/collaborate` (`appUrl` in the service), which opens the phone app when it is installed (Android intent filters, iOS `applinks`) and the web page otherwise. Which paths the app claims, and the web path → screen map, are in `packages/logic/src/appLinks.ts`; the app applies it in `apps/mobile/src/app/+native-intent.ts`, the website lists the paths in `/.well-known/apple-app-site-association`, and a web test keeps `apps/mobile/app.config.js` equal to the list. Verification needs `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` (see `docs/RELEASING.md`); without them links simply open in the browser.
