# Gemini / Antigravity instructions

This repository's rules for **every** AI agent live in [`AGENTS.md`](AGENTS.md) — read it first, then `docs/DESIGN_LANGUAGE.md` before you touch any UI, and the `AGENTS.md` of every folder you change.

Non-negotiable (checked by `corepack pnpm check:design`, the pre-commit hook and CI):

- No hard-coded colours, fonts, radii, shadows, URLs, keys or env reads. Use the design tokens, `at-<tint> tint`, `glass`, `apps/web/src/config`, `qk`. Missing a token? Add it once in `:root` (`apps/web/src/app/globals.css`) and `@theme` (`apps/web/src/styles/tailwind.css`).
- Match the existing screens (`/dashboard/todo` is the reference): paper and ink — white, cream or charcoal paper, Geist 600 titles (`font-serif font-semibold`), Geist UI text, flat cards with 1 px hairlines and no shadow, one accent the person picks. The serif (`font-brand`) is only for the Naazhi wordmark.
- No Tailwind default palette (`bg-gray-100`, `text-blue-500`), no native `alert/confirm/prompt`, no `<input type="date|time">`.
- Run `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm check:design` before you finish. Never use `--no-verify`.
