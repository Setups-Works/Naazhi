# Onboarding — your first day

For every new developer (and the AI agent you'll work with). About 30 minutes.

## 1. Get access

| Tool    | What you need                                                                                    | Ask       |
| ------- | ------------------------------------------------------------------------------------------------ | --------- |
| GitHub  | Member of the **Setups-Works** org with write access to `Naazhi`                               | tech lead |
| Docker  | Install Docker Desktop; `corepack pnpm docker:up` gives you Postgres, Redis, storage and mail locally  | you       |
| Vercel  | Read access to deployments / preview logs                                                        | tech lead |
| Secrets | A `.env.local` for **dev** (shared securely, e.g. a password manager — never chat/email/git)     | tech lead |

## 2. Run it locally

```bash
git clone https://github.com/Setups-Works/Naazhi.git
cd Naazhi
corepack pnpm install
cp .env.example apps/web/.env.local  # fill in the dev values you were given
corepack pnpm dev:web                         # http://localhost:3000
```

Sign up with your own email on the local site. To get the admin panel, ask the tech lead to add your email to `ADMIN_EMAILS` in _your_ `.env.local` (or to promote you from `/admin/users`).

Useful checks before every push:

```bash
corepack pnpm typecheck && corepack pnpm build        # don't build while the web dev server is running
```

## 3. Read (in this order, ~20 min)

1. `AGENTS.md` — the rules (humans and AI agents).
2. `docs/ARCHITECTURE.md` — layers and boundaries.
3. `docs/PHASES.md` — tracks, phases, who owns what.
4. `docs/CURRENT_STATE.md` — what exists and where.
5. The `AGENTS.md` in the folders you'll work in.

## 4. Pick your first task

1. Open the GitHub issues and filter by your track label: `track-platform`, `track-workspace` or `track-ai` (`gh issue list --label track-ai`).
2. Choose one that isn't blocked by another open issue. Small ones (`size-s`) are good first tasks.
3. Assign yourself and read the whole description.

## 5. Ship it

```bash
git checkout main && git pull
git checkout -b feature/short-name
# … work, commit in small steps …
git push -u origin feature/short-name
```

Open a PR on GitHub with a short imperative title, fill in the template (including the platforms checklist) and link the issue (`Closes #123`). When approved, **squash-merge**; the issue closes. Update `docs/CURRENT_STATE.md`.

## 6. Working with an AI agent

Start the session with: _"Read AGENTS.md and the AGENTS.md of the folders involved, then implement issue #123 (`gh issue view 123`). Plan first."_ You are responsible for the result — read the diff, run the app, test the acceptance criteria. Don't give agents production secrets or let them run destructive commands unattended. See `docs/TEAM_AND_WORKFLOW.md` §8.

## 7. When you're stuck

Comment on the issue (answers stay with the task) · tag the track owner in the PR · architecture questions → propose a change to the decisions log in `docs/ARCHITECTURE.md`.
