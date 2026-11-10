# apps/web/src/components/site — the public marketing site

**Purpose:** everything the public site (`/`, `/how-it-works`, `/download`, `/pricing`, …) is built from. Read `docs/DESIGN_LANGUAGE.md` first.

## The look

White canvas, ink text, **one** forest-green accent with its pale tint, and an ink panel for the closing calls to action. Surfaces are
separated by **hairline rings, never drop shadows**. "Glass" here means a frosted translucent surface (the header, menus), not a shadowed
one. In the manner of an Apple or Google product page: one idea per section, a short serif line, one plain sentence and the real app on an
iPhone. Use screenshots of the real app only (`public/mobile/*.png`).

The building blocks are in `ui.tsx`: `Section` (`band="plain" | "soft" | "ink"`), `SectionHead`, `Surface` (`card | soft | ink | glass`),
`buttonClass` / `ButtonLink` / `TextLink`, `IconBadge`, `Kbd`, `StatusChip`. Page-level pieces are in `kit.tsx` (`PageHero`, `FeatureCards`,
`CtaPanel`) and `blocks.tsx` (`StepCards`, `DayTimeline`, `AccessMatrix`, `CompareTable`). `Faq.tsx` is native `<details>`.

## Pieces

- `Header.tsx` — one slim frosted bar (the frost is its own layer, because a backdrop filter on the header would make the full-screen
  mobile menu size to the bar), a Features menu, plain links, a full-screen menu on a phone. `Footer.tsx` — name, link columns, store
  badges, the Setups Works credit.
- `Phone.tsx` — the iPhone mockup (`Phone`, `PhoneHalf`, `PhoneRow`). `StoreBadges.tsx` — Google Play (links to the APK) and App Store
  (coming soon), drawn from `public/store/*.png` as a brand-green stencil.
- `home/` — the sections of the home page, composed in `app/page.tsx`: `Hero` (three whole phones that fan out on load and drift), `Story`
  (sticky phone panel whose colour changes per chapter; tiles on a phone), `Capabilities` (swipeable carousel), `Integrations`, `Shortcuts`,
  `Ai`, `Trust`, `Pro`.
- `content.ts` — copy that makes factual claims (see below). `Logo.tsx` — service logos.
- Anchor links in `lib/site.ts` must point at ids that exist on the home page (`#workspace`, `#tour`, `#integrations`, `#ai`, `#trust`,
  `#pro`, `#faq`).

## Motion (GSAP) — the rules

- All animation goes through `motion.ts`: `useMotion(ref, ({ g, root, calm }) => …)`. It scopes GSAP to the element, cleans up every tween
  and ScrollTrigger, and re-runs when the reduced-motion setting changes. **In `calm` mode only make sure content is visible.**
- Content that animates in starts hidden (`opacity-0` + `data-reveal`); `layout.tsx` has a `<noscript>` rule that shows it without JS.
- Pieces: `Reveal` / `R` (fade-rise, optional stagger), `Heading` (SplitText line reveal), `Count`, `Marquee` (CSS only), `Tip` (CSS tooltip),
  `Refresh` (keeps ScrollTrigger measurements right).
- Don't put a CSS animation and a GSAP tween on the same element's transform: nest an extra element. Tailwind's `-translate-x-1/2` is the
  separate CSS `translate` property; keep centring on a wrapper and the animation on the element inside.
- Animate transforms and opacity only. Respect `prefers-reduced-motion` and `data-motion="reduce"`.
- `Reveal` delays are in **milliseconds**; GSAP's own `delay` is seconds. A hidden browser pane pauses animations, so content can look
  invisible while testing there.

## Content honesty

`content.ts` holds copy that makes factual claims. A capability is `live` only if it ships today (`docs/CURRENT_STATE.md`); otherwise
`building` or `soon`. When something ships, flip its status; don't reword the claim. Don't add claims about security, features or numbers
that the docs and code don't support, and don't invent testimonials. The download page names the Android app as a direct APK download and
the iPhone app as coming soon; change that only when a store listing exists.

## SEO and structured data

`lib/seo.ts` holds page metadata (`pageMeta`), the sitemap's page list and the schema.org documents; `JsonLd.tsx` prints them. Every public
page calls `pageMeta` and carries `pageSchemas`. `app/robots.ts` and `app/sitemap.ts` read the same lists. The sitemap and the schema's URLs
need `NEXT_PUBLIC_SITE_URL`. Setups Works is its own Organization there, using the same `@id` its own site publishes.

**Pricing page:** `app/pricing/page.tsx` is dynamic and reads the plans from the database (`listPublicPlans()`), so a price edited in Admin → Plans shows there without a deploy. Never hard-code a price, allowance or plan name on it; the compare table (`CompareTable`, any number of plans) is built from the plan rows. It says when payments are not switched on (`FEATURES.payments`). See `docs/BILLING.md`.
