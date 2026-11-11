# Design language — read this before you build any UI

The app has one look: **paper and ink.** A restrained, near-monochrome surface — white (or warm cream, or charcoal) paper, charcoal ink, 1 px hairline borders, almost no shadow, Geist everywhere with tight, heavy headings, and colour kept for status, labels and the one accent the person picks. Every screen must look like it came from the same hand. Decoration (gradients, glows, glass blur, big shadows, pastel washes behind whole cards) is **wrong here**, even if it looks nice.

**The product is called Naazhi.** Its name, logo, wordmark, voice and the rules for using them are in [BRAND.md](BRAND.md); this file is the UI side. The wordmark keeps its serif (`font-brand`); everything else in the UI is Geist.

If you are an AI agent: do not invent styling. Copy from the reference screens below, reuse the tokens and classes in this file, and compare your result side by side with the To-do page (`/dashboard/todo`) before opening a PR.

> Source of truth for values: `:root` in `apps/web/src/app/globals.css` (top of file) and `apps/web/src/styles/tailwind.css`. This file explains how to use them.

## 1. Reference screens (copy these, don't reinterpret)

The look follows the paper-and-ink reference design (Home, Journal, Notes, To-do, Chat, Settings). In the code:

| Need                                     | Look at                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| App shell (icon rail, sidebar, breadcrumb) | `apps/web/src/components/app/AppNav.tsx` (`sb`, `ap-top`)                                                    |
| Page header: big title, muted subtitle, underlined tabs with tools on the right | `apps/web/src/components/app/todo/TodoApp.tsx` (`tdo-title`, `tdo-bar`, `tdo-tabs`) |
| Collection page: icon tile, title, count, filter pills, sort, primary button, card grid | `apps/web/src/components/app/NotesView.tsx` (`nt-tile`, `nt-h1`, `nt-tools`) |
| Sections as header rows over hairline rows (no cards) | `Section` in `apps/web/src/components/app/todo/Views.tsx` (`tv-sec-h`, `ti`)                 |
| Dashboard cards                          | `Panel` in `apps/web/src/components/app/HomeView.tsx`                                                         |
| Centred writing column + flat composer   | `apps/web/src/components/app/JournalView.tsx` (`jr-title`, `jr-compose`)                                      |
| Chat greeting + grey composer            | `cx-hello` in `apps/web/src/components/app/chat/ChatApp.tsx`                                                  |
| Settings home (tile grid) and section pages | `apps/web/src/components/app/SettingsModal.tsx` (`sm-tiles`, `sm-crumbs`)                                  |
| Empty state with a thin ink line drawing | `Empty` in `apps/web/src/components/app/todo/Views.tsx`, `jr-empty` in `JournalView.tsx`                      |
| Date picking                             | `apps/web/src/components/app/JournalCalendar.tsx` (never `<input type="date">`)                               |
| Confirm / prompt                         | `useConfirm()` / `usePrompt()` in `apps/web/src/components/ui/Confirm.tsx`                                    |

Secondary panels inside a page (the To-do views list, the chats list, the journal day list) start **closed** so each page reads as one column; a button in the page's toolbar opens them.

## 2. Typography

Fonts are loaded in `apps/web/src/app/layout.tsx` and exposed as `--sans`, `--mono`, `--serif` (Tailwind: `font-sans`, `font-mono`, `font-serif`) and `--brand-serif` (`font-brand`).

| Use                                     | Font                                         | Notes                                                                                 |
| --------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| Page titles, dialog titles, big numbers | **Geist 600** (`font-serif font-semibold`)   | `font-serif` is the *display role* and now maps to Geist. Tracking `-0.022em`–`-0.03em`. |
| Everything else (UI, body, buttons)     | **Geist** (`font-sans`, the default)         | Body 14–16 px. Small labels 12–13.5 px. Never go below 11 px.                         |
| Counters, code, keyboard hints          | **Geist Mono** (`font-mono`)                 |                                                                                       |
| The Naazhi wordmark only                | **Instrument Serif** (`font-brand`)          | Site header, footer, share header, app sidebar. Nowhere else.                         |
| Tamil text                              | Noto Sans Tamil                              | Loaded automatically; don't set it by hand.                                           |

- Page title: `font-serif text-[clamp(28px,3vw,32px)] leading-[1.1] font-semibold tracking-[-0.022em]` (Home), larger pages up to 42 px. Subtitle under it: 14–16 px `text-fg-subtle`.
- Card titles 15–16 px / 600. Meta and timestamps 12–13 px `text-fg-faint`.
- The `quiet` class is no longer italic green: it is the faint second half of a two-tone marketing heading.
- **Form controls do not inherit the font.** Always `font: inherit` (or use the `tf-*` classes). A bare `<textarea>` renders monospace.

## 3. Colour tokens

Defined once in `:root` of `globals.css`; Tailwind names in brackets. **Never write a hex colour that already has a token.**

**The palette** (raw, scheme-dependent):

| Token | Light | Cream | Dark | Tailwind | Role |
| --- | --- | --- | --- | --- | --- |
| `--paper` | `#fff` | `#f5f4eb` | `#191919` | `bg-paper` | Canvas |
| `--side` | `#f7f7f7` | `#efeee5` | `#202020` | `bg-side` | Sidebar, composer fill |
| `--raised` | `#fff` | `#fbfaf5` | `#232323` | `bg-raised` | Cards, popovers |
| `--ink` … `--ink-4` | `#242424` → `#8f8f8f` | | `#ebebeb` → `#737373` | `text-ink`…`text-ink-4` | Text, strongest to faintest |
| `--line`, `--line-2`, `--line-3` | `#ebebeb`, `#dedede`, `#8f8f8f` | | white 8 / 13 / 34 % | `border-line`, `…line-2` | Hairlines, stronger borders, emphasis |
| `--hover`, `--press` | ink 5 % / 8 % | | white 5 % / 9 % | `bg-hover`, `bg-press` | Hover and pressed fills |
| `--coral`, `--critical`, `--success`, `--overdue`, `--data` | | | | `text-coral` … | Warm accent, errors, success, overdue dates, links/focus/chart-1 |
| `--f-blue/green/amber/red/violet/pink/slate` | muted earthy label colours | | | | Tags, folders, categories, charts |
| `--accent-color`, `--accent-wash`, `--accent-line` | ink by default | | | `bg-accent`, `bg-accent-wash` | The person's accent (Settings → Appearance) |

**Semantic names** used across the app are mapped onto the palette, so older screens follow the scheme: `--page`→paper, `--surface`→raised, `--surface-muted`→side, `--fg`/`--fg-muted`/`--fg-subtle`/`--fg-faint`→ink…ink-4, `--fill-dark`/`--on-dark`→ink/paper, `--line-strong`→line-2. `--green-fg`/`--green-bg` are **the accent** now (ink by default), not green. `--blue/amber/clay/violet/sand-{bg,fg}` are mixed from the `--f-*` palette.

**Schemes and accents.** The scheme is a class on `<html>` (`cream`, `dark`; light is the default) and the accent is `data-accent` on `<html>` (`ocean grove iris rose teal slate`). `PrefsSync` sets both from the person's preferences (`scheme`, `accent` in `profiles.preferences`), and the dashboard layout paints them before hydration with `lookScript()` (`apps/web/src/lib/look.ts`). To draw one element in another scheme (previews), use `scheme-light scheme-<x>` on it. **Every new colour must work in all three schemes** — use tokens, never `#fff`/`bg-white` (use `bg-raised`/`bg-surface`).

Other global switches on `<html>`: `data-density="compact"` and `data-motion="reduce"` — respect them.

### Tints (`at-<tint>`)

Eight tints: `violet blue green amber clay mint gold sand`. `.at-<tint>` **only defines three variables** — it paints nothing by itself:

- `--ab` pastel background · `--abl` hairline colour · `--abf` strong foreground.

To paint, add the `tint` utility (`background: var(--ab); color: var(--abf); box-shadow: inset 0 0 0 1px var(--abl)`), or use the variables yourself (`bg-(--abf)` for a solid dot). **Forgetting this paints nothing** — the original calendar PR rendered every colour swatch grey for exactly this reason.

```tsx
<span className={`at-${tone} tint rounded-[7px] px-2 py-[3px] text-[12px]`}>Standup</span>
<button className={`at-${tone} size-7 rounded-full bg-(--abf)`} />   // solid colour dot
```

Don't pass user data into `at-${…}` without a whitelist (the calendar uses `toneOf()` to fall back to blue).

## 4. Surfaces: flat paper with hairlines

Cards are **flat raised paper with a 1 px `--line` border** (drawn as an inset ring), 12 px corners, no shadow. Only floating layers (menus, popovers, dialogs, the expanded sidebar over content) get `shadow-pop`.

- The old material utilities still exist and now draw the flat look: `glass` = raised + hairline ring, `glass-hover` = slightly darker + stronger ring. `ap-card` is the same. The marketing `liquid-*` utilities keep their glass on the public site but are flattened inside the app (`html:has(.ap)`).
- Radii: `rounded-xs` 4 (badges) · `rounded-tab` 6 (tabs, icon buttons) · `rounded-ctl` 8 (buttons, chips, inputs) · `r1` 8 · `r2` 10 (tiles) · `r3` 12 (cards) · `r4` 16 (dialogs) · `rounded-pill` (filter pills only).
- Shadows: `shadow-e1`/`e2` = a 1 px hairline drop; `shadow-e3`/`e4`/`shadow-pop` = floating layers. Never `shadow-md`/`shadow-lg`.
- Grid lines inside a card: a 1 px gap over `bg-line`, not `border` on every cell.

**Avoid:** gradients, blur, glows, pastel washes behind whole cards, `bg-white`, `bg-gray-*`, `rounded-md`, pure `#000`.

## 5. Buttons and controls

| Control                | Use                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Primary action         | `btn btn-primary btn-sm` — ink block, 32 px (40 px on touch), 8 px corners, 13 px/500. One per view.                 |
| Secondary action       | `btn btn-secondary btn-sm` — raised fill with a `--line-2` outline.                                                  |
| Chip / quick action    | `chip` — 5 % ink fill (`bg-hover`), no border, icon + label.                                                         |
| Outline action         | `rounded-ctl bg-raised shadow-[inset_0_0_0_1px_var(--line-2)] hover:bg-hover` (Home quick actions).                  |
| Icon-only button       | `ap-icon` (30 px, 6 px corners) or `ne-btn`; add `aria-label`.                                                       |
| Filter pill            | `tab` — 28 px, transparent; selected = ink pill (`aria-selected="true"`).                                            |
| Segmented control      | Grey track (`bg-hover p-[3px] rounded-ctl`) with a raised active segment (`bg-raised shadow-e1`) — see `PillSwitch`.  |
| View tabs              | 13 px/500 icon + label, active tab gets a 2 px ink underline.                                                        |
| Form pill              | `tf-pill` (+ `tf-date` for a date pill wrapping `JournalCalendar`). Title input `tf-title`, notes `tf-desc`.         |
| Menus, popovers        | `Menu` (Radix). Don't hand-roll.                                                                                     |
| Delete / destructive   | `useConfirm().ask({ danger: true })` first — never delete on one click.                                              |

Hover is a `--hover` fill, pressed `--press`; transitions are 140 ms with `--ease`. Focus rings come from the global `:focus-visible` (`--focus-ring`, 2 px `--data` at 55 %) — never `outline-none` without a replacement.

Do not mix a legacy class and a utility that set the same property (e.g. `btn` + `h-[38px]`). Pick one.

## 6. Layout and spacing

- The app shell (`AppNav`): a fixed left sidebar — a 48 px icon rail that expands to a 280 px labelled panel (it pushes the page at ≥ 1200 px and floats over it below), a 48 px top bar with the breadcrumb, and on phones (< 768 px) a menu button that slides the panel in as a drawer. Dashboard pages are inside `.ap-body` (padding `28px clamp(16px,4vw,56px)`). Your page root is just `mx-auto w-full max-w-[1120px]` (todo uses 940 px for list-like pages).
- Header: display (Geist 600) title on the left, primary action on the right, tools row beneath (nav, view tabs, filters), `mb-[18px]` below.
- Card padding 16–22 px; gaps 8 / 12 / 18. Hit targets ≥ 38–40 px.
- **Mobile first, 375 px.** No horizontal page scroll. Wide grids sit in an `overflow-x-auto` wrapper with a `min-w-*` inner. Breakpoint the app uses most: `max-[900px]` (compact grids) and `sm` = 640 px. Phones default to list-style views.

## 7. Motion

- Easings: `--ease` `cubic-bezier(0.2,0.7,0.2,1)` (controls), `--ease-out` `cubic-bezier(0.22,1,0.36,1)` (panels, drawers); `--spring` is now a soft settle with no overshoot. Controls take 140 ms (`--control`), panels 200–240 ms. No bounce, no lift-on-hover.
- Always honour `prefers-reduced-motion` and `html[data-motion="reduce"]` (`motion-reduce:` plus `[html[data-motion=reduce]_&]:`).

## 8. Content and tone

- Sentence case everywhere ("New event", "Delete event"). No Title Case Buttons.
- Friendly, short, no exclamation marks. Errors: "Couldn’t save that change." — never the raw error. Use the curly apostrophe ’.
- Empty states are one quiet line (`ap-none` class) with the next step, not a big illustration.
- Icons: thin line icons (lucide), drawn by `<FA icon={faX} />` from `@/components/ui/Icon` — it maps the Font Awesome name to its line twin; add new names to the map in `Icon.tsx`. No emoji in UI, no other icon sets.
- Errors in forms: `<p className="form-err" role="alert">`.

## 9. How a screen is built (the whole stack, so the look and the behaviour match)

1. **Route** in `apps/web/src/app/dashboard/<name>/page.tsx` — thin; wrap in `ClientOnly` + `Suspense` when it prints dates.
2. **Data** with TanStack Query: keys in `apps/web/src/lib/query/keys.ts` (`qk`), hooks in `apps/web/src/features/<name>/queries.ts` (copy `features/tasks/queries.ts`: optimistic update → rollback → invalidate). **No `useEffect` fetching, no `useState` copies of server data.**
3. **Realtime**: `useRealtimeInvalidate("<table>", [qk.…])`; the table needs the notify trigger (a new migration — see `20261010130000_calendar_events_realtime.sql`).
4. **Overlays** use the Radix wrappers in `apps/web/src/components/ui` (`Modal`, `Menu`, `Tabs`, `useConfirm`). Dialog components are mounted only while open, so initial form values are plain `useState` defaults (no effect to re-sync them).
5. **Pure logic** (grouping, layout, date maths) lives in a `utils.ts` next to the feature and gets table-driven Vitest tests (`apps/web/tests/unit/`).
6. Styling is **Tailwind utilities + tokens**. If you convert a legacy screen, delete its rules from `globals.css` in the same PR and keep it pixel-identical.

## 10. Checklist before you open the PR

- [ ] Put your screen next to `/dashboard` (Home) at desktop width and at 375 px. Same fonts, same hairline cards, same radii, same buttons?
- [ ] Every colour is a token or an `at-<tint>` + `tint`; no raw hex that has a token; no `gray-*`/`slate-*`.
- [ ] Title is Geist 600 (`font-serif font-semibold`); body is Geist; textareas/inputs inherit the font.
- [ ] Looks right in Light, Cream and Dark (Settings → Appearance) and with a coloured accent.
- [ ] No `<input type="date|time">` styled by the browser where `JournalCalendar` / a `tf-pill` select fits.
- [ ] No native `alert/confirm/prompt`; destructive actions confirm.
- [ ] Keyboard: everything reachable, visible focus, labels on icon buttons, `aria-pressed`/`aria-selected` on toggles, colour never the only signal.
- [ ] Reduced motion and compact density respected.
- [ ] No hydration mismatches (dates/times only inside `ClientOnly`).
- [ ] `corepack pnpm typecheck`, `corepack pnpm test`, `corepack pnpm build:web` pass.

## 11. Mistakes this guide exists to prevent (all seen in real PRs)

| Mistake                                                          | Why it's wrong / what to do instead                                          |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `at-blue` on a chip with no `tint`                               | `at-*` sets variables only. Add `tint` (or `bg-(--ab)`).                     |
| `bg-white`, literal hex, light-only colours                      | Tokens only (`bg-raised`, `text-fg`…) so Cream and Dark work.                |
| Tiny `text-xs` everywhere, thin page title                       | Titles are Geist 600, ~28–42 px; UI text 13.5–15 px.                         |
| `<input type="date">` / `type="time"`                            | Native pickers look foreign. Use `JournalCalendar` + a `tf-pill` `<select>`. |
| A bare `<textarea>`                                              | Renders monospace. Use `tf-desc` or `font: inherit`.                         |
| Reusing a legacy popup rule blindly (`tf-date` opens _upward_)   | Check where your control sits; override the placement.                       |
| Hand-rolled load/reload `useEffect` + `useState` for server data | Use TanStack Query + `qk` + realtime (§9).                                   |
| Re-implementing task data fetching in another feature            | Import `useTasks()` so every screen shows the same cache.                    |
| Delete on a single click                                         | `useConfirm({ danger: true })`.                                              |
| 24 × 7 `role="button"` divs as tab stops in a grid               | One click target per column; provide a keyboard shortcut / button instead.   |
| Dark rectangle buttons (`bg-fg rounded-md text-xs`)              | `btn btn-primary btn-sm` (pill, 44 px).                                      |

## 12. How this is enforced (so it doesn't depend on anyone remembering)

| Layer                   | What it does                                                                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `corepack pnpm check:design`  | Scans the lines **you added** (vs the merge-base with `main`) with the rules in `scripts/design/rules.mjs`. Old code never blocks you. `corepack pnpm check:design:all` audits the whole tree. |
| Git pre-commit hook     | `.githooks/pre-commit` runs it on staged changes. `corepack pnpm install` turns it on (`prepare` sets `core.hooksPath`).                                                                           |
| Claude Code hook        | `.claude/settings.json` runs it after every Edit/Write and feeds the problems straight back to the agent so it fixes them itself.                                                        |
| CI                      | `ci.yml` runs it on every PR; a violation fails the _Typecheck and build_ check, which branch protection requires.                                                                       |
| Agent instruction files | `AGENTS.md` (the source), `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`, `.cursor/rules/` all point here.                                                                  |
| Code owners             | Changes to the rules, tokens and this guide need the tech lead (`.github/CODEOWNERS`).                                                                                                   |

What it checks: hex / `rgb()` colours, Tailwind's default palette and `black`, default shadows and radii, text under 11 px, hand-set fonts, literal colours in inline styles, native `alert/confirm/prompt`, native date/time inputs, `process.env` outside `apps/web/src/config`, `NEXT_PUBLIC_*` secrets, secret-looking strings, hard-coded localhost URLs, and `any`.

**Need something the tokens don't offer?** Don't inline it. Add the token once — a custom property in `:root` (`apps/web/src/app/globals.css`) and a mapping in `@theme inline` (`apps/web/src/styles/tailwind.css`) — and use it from there; that is how `--orange-fg` (medium-priority tasks) was added. **A real, justified exception?** Put `design-ok: <reason>` in a comment on that line or the one above; reviewers read these.

Adding or changing a rule: edit `scripts/design/rules.mjs`, add a case to `apps/web/tests/unit/check-design.test.ts`, and make the message say _what to use instead_ — agents read it.

### Colours in places CSS can't reach

- **Canvas / charts:** a canvas can't read `var(--x)`. Pass tokens as strings (`"var(--green-fg)"`) and resolve them at draw time with `tokenColor()` from `apps/web/src/lib/cssVar.ts` (`ctx.fillStyle = tokenColor(barColor)`). SVG attributes accept `var(--x)` directly (`stroke="var(--green-fg)"`).
- **Third-party brand marks** (Google, HubSpot) keep their mandated colours: put them in their own small file marked `// design-ok-file: <reason>` (see `apps/web/src/components/auth/GoogleMark.tsx`) or tag the line with `design-ok:`.
- **Art-directed materials** (the gift card's iridescent foil) are literal by design and marked `design-ok-file:` with the reason. That is the only kind of file allowed to be wholly literal.
- `apps/web/src/app/globals.css` and `apps/web/src/styles/tailwind.css` are the token files: literal values live there and nowhere else.

## 13. The marketing site: liquid glass and motion

The public site (`/`, `/how-it-works`, `/pricing`, …) is the most expressive part of the product, and it has its own kit in
`apps/web/src/components/landing/` (read `landing/AGENTS.md` before touching it). The in-app screens above stay calm; the marketing site adds:

- **Liquid glass.** Thick translucent panels with a specular rim, a sheen and a pointer-following glare (`liquid`, `liquid-flat`,
  `liquid-dark`, `liquid-tint`, `liquid-pill` in `apps/web/src/styles/tailwind.css`; tokens `--liquid-*`). Glass needs colour behind it, so every
  marketing page gets the drifting colour orbs of `Ambient`. Inner cards use `liquid-flat` (no second blur).
- **GSAP for all motion.** Entrances, split-text headings, scroll-scrubbed scenes, parallax, magnetic buttons, the sticky one-by-one
  panel stack, and an interactive cursor. Everything goes through `useMotion`, which cleans up after itself and switches to a calm mode
  for visitors who ask for less motion (OS setting or the app's "Reduce motion"). Animate transforms and opacity only.
- **Tooltips** (`Tip`) on anything that deserves a one-line explanation: status chips, shortcuts, integrations, security cards. They open on
  hover and keyboard focus, are announced via `aria-describedby`, and never get clipped.
- **Honest content.** Anything that states what the product does carries a status (`live`, `building`, `soon`) that must match
  `docs/CURRENT_STATE.md`. No invented testimonials, numbers or security claims.
- **The header bar stays transparent** (no scroll-triggered frost; a past commit removed it on purpose). The glass lives in the nav pill and menus.

New dependency: `gsap` (3.15, includes `ScrollTrigger` and `SplitText`, free to use). It is used only under `apps/web/src/components/landing/`.

## 14. Naazhi in the UI (the brand, applied)

The logo, colours of the logo files and the voice are in [BRAND.md](BRAND.md). This is how they land on screens, on web and in the app.

**The top bar.** Web: `BrandMark size={28}` then the word **Naazhi** in `font-brand` (Instrument Serif) at about 22 px, `tracking-[-0.02em]`, `text-fg`. App: the expanded sidebar shows the mark and wordmark (cream mark on the dark scheme); the Home header shows the greeting, the plan badge and the date.

**One accent.** The accent is the person's choice in Settings → Appearance and defaults to ink (`text-green-fg` / `bg-accent` follow it). It marks links, focus, progress and the active state. Use the muted `--f-*` labels (§3) for categories only; coral is the warm attention colour (dots, the selected journal day).

**Paper first.** Pages are `--page` paper; cards are raised paper with a hairline. The mark is drawn on paper or on `--fill-dark` (cream version), never on a tint or a photo.

**Empty and loading states.** A short bold line, one sentence of help in `text-fg-subtle`, one button. The mark may appear once on a welcome screen (the chat welcome uses it at 40 px) and on the launch screen; it is not a decoration for empty lists.

**Icons.** Thin line icons (lucide) through the `Icon` component for everything in the UI; the Naazhi mark is only the brand, never an icon in a list or a button.

**App icon and widgets.** The launcher icon is the mark on cream (`apps/mobile/assets/images`, built by `scripts/brand/build-assets.mjs`). Home-screen widgets use the tints of the feature they show, with the same serif title style; their picker previews are generated from the theme tokens (`scripts/widget-previews.mjs`).

**Email.** Cream page, white rounded card, serif headline, the lockup on top, dark pill button, and the footer line from BRAND.md §6. Written in the product's voice (BRAND.md §1).

**Checklist for anything carrying the brand:** the name is written **Naazhi**; the mark comes from `BrandMark` (or the generated files); the colours are tokens; it works at 375 px; it has no shadow, gradient or recolouring on the mark; it reads on `--fill-dark` with the cream mark.
