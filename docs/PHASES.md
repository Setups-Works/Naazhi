# Phases and tracks

Seven phases, three parallel **tracks** (one per developer). Individual tasks are GitHub issues, labelled with their track and phase.

## Tracks

| Track                                    | Label             | Owns                                                                                                                                  | Typical folders                                                                                                                |
| ---------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **A — Platform, Admin & Infrastructure** | `track-platform`  | Auth, workspaces, RBAC, API v1, services/repositories pattern, jobs, admin panel, CI, security, observability, billing, desktop shell  | `apps/web/src/app/api/v1`, `apps/web/src/server/{repositories,jobs}`, `apps/web/src/lib/{auth,api}`, `apps/web/src/app/admin`, `apps/desktop`, `.github/` |
| **B — Workspace features**               | `track-workspace` | Notes, Tasks, Journal, Search UI, Calendar UI, Email UI, Meetings UI, Automations UI, Insights, Notifications UI — web and phone app   | `apps/web/src/features/*`, `apps/web/src/components`, `apps/mobile/src/features/*`                                             |
| **C — AI & Integrations**                | `track-ai`        | AI providers, router, orchestrator, tools, prompts, usage/limits, Google / Notion / Zoho, calendar/email services, automation engine  | `apps/web/src/server/{providers,services/{ai,composio,calendar,automation}}`, `apps/web/src/lib/{ai,composio}`, `apps/web/src/features/{ai,integrations}` |

Only one person at a time should own a folder.

## Phase map

| Phase | Goal                                                         | Status (see `docs/CURRENT_STATE.md`)                                       |
| ----- | ------------------------------------------------------------ | -------------------------------------------------------------------------- |
| 0     | Foundation: repo ready for 3 devs + AI agents                 | Done: layout, docs, CI, design check, safe env handling                    |
| 1     | Platform core: workspaces, API v1, service/repo pattern, jobs | Partly: API v1 and services exist; workspaces/teams not started            |
| 2     | Core productivity: notes, tasks, journal, search              | Done on web, app and desktop; server-side search still planned             |
| 3     | Integrations: Google, Notion, Zoho, calendar, daily brief     | Done for Google, Notion import and Zoho (some Zoho services Beta)          |
| 4     | AI: provider router, own keys, tools, limits                  | Done: metered chat, own keys, confirmed actions; Puter.js still a stub     |
| 5     | Meetings, automations, notifications, insights                | Notifications and insights done; meetings and automations not started      |
| 6     | Admin completion, observability, launch                       | Admin, billing, campaigns done; error monitoring and hardening open        |

## Decisions waiting (label `decision-needed`)

Route structure (`(app)` group vs `/dashboard/*`) · embedding provider · transcription provider · transactional email provider. See the decisions log in `docs/ARCHITECTURE.md`.
