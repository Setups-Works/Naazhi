# Contributing

1. Every change starts from a **GitHub issue** (or a task agreed with the tech lead). Read it fully before you start.
2. Branch from `main`: `feature/short-name` (or `fix/…`, `chore/…`).
3. Follow the rules in [`AGENTS.md`](AGENTS.md) and the `AGENTS.md` of every folder you touch. A feature or fix lands on web, the phone app and desktop: fill the checklist in [`docs/ALL_PLATFORMS.md`](docs/ALL_PLATFORMS.md).
4. Before you push: `corepack pnpm typecheck && corepack pnpm check:design && corepack pnpm build`.
5. Open a PR with a short imperative title using the template, and link the issue (`Closes #123`). CI (design check, typecheck, tests, build) must pass; one approving review is required.
6. Squash-merge and update the docs you changed.

New here? Read [`docs/ONBOARDING.md`](docs/ONBOARDING.md). Team process: [`docs/TEAM_AND_WORKFLOW.md`](docs/TEAM_AND_WORKFLOW.md).

**Never commit secrets** (`.env*` other than the example files, keys, tokens). If one leaks, tell the tech lead and rotate it immediately.
