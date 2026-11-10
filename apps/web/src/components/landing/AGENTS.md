# apps/web/src/components/landing — the marketing site's liquid-glass kit

**Purpose:** everything the public site (`/`, `/how-it-works`, `/pricing`, …) is built from. Read `docs/DESIGN_LANGUAGE.md` §13 first.

## The material

Liquid glass = a bright translucent fill over a strong blur, a specular rim, a diagonal sheen and a glare that follows the pointer,
over the product's colour tints. It only reads as glass when there is colour behind it, so `Ambient` puts soft drifting orbs behind every
marketing page. The CSS lives in `apps/web/src/styles/tailwind.css` (`liquid`, `liquid-flat`, `liquid-dark`, `liquid-tint`, `liquid-pill`,
`liquid-lift`) with its tokens (`--liquid-*`) in `:root` in `globals.css`. Never write the gradients or shadows inline.

| Use                                          | Component / class                                                                                 |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A big panel                                  | `<Glass>` (`variant="panel"`, `glare`, `tilt`, `lift`, `tone`)                                    |
| A card that sits on a panel (no second blur) | `<Glass variant="flat">`                                                                          |
| Smoked glass for the dark hero/CTA panels    | `<Glass variant="dark">` and the `BTN_LIGHT` / `BTN_GHOST_DARK` buttons                           |
| Small pills and chips                        | `liquid-pill`                                                                                     |
| Anything fixed over scrolling content        | `liquid-bar` (dense; the header's logo, nav and buttons). `liquid-pill` is too see-through there. |
| A section, its heading, label, lead          | `Section`, `SectionHead`, `Eyebrow`, `Title`, `Lead` (`Kit.tsx`)                                  |
| An honest status                             | `StatusChip` (`live` / `building` / `soon`)                                                       |

## Motion (GSAP) — the rules

- All animation goes through `motion.ts`: `useMotion(ref, ({ g, root, calm }) => …)`. It scopes GSAP to the element, cleans up every tween
  and ScrollTrigger, and re-runs when the visitor's reduced-motion setting changes. **In `calm` mode only make sure content is visible.**
- Content that animates in starts hidden (`opacity-0` + `data-reveal`); `layout.tsx` has a `<noscript>` rule that shows it without JS.
- Pieces: `Reveal` / `R` (fade-rise, optional stagger), `Title` (SplitText line reveal), `Parallax`, `Magnetic`, `Marquee`, `Count`,
  `Cursor` (the interactive cursor; fine pointers only, never replaces the real cursor), `Tip` (hover/focus tooltip, portaled), `ScrollProgress`.
- Mark things the cursor should label with `data-cursor="Play"`.
- Don't put a CSS animation and a GSAP tween on the same element's transform: nest an extra element (see `home/Hero.tsx`).
- Animate transforms and opacity only. Respect `prefers-reduced-motion` and `data-motion="reduce"`.

## Content honesty

`content.ts` holds copy that makes factual claims. A capability is `live` only if it ships today (`docs/CURRENT_STATE.md`); otherwise
`building` or `soon`. When something ships, flip its status; don't reword the claim. Don't add claims about security, features or
numbers that the docs and code don't support, and don't invent testimonials.

## Structure

- **The look: product first, in the manner of an Apple or Google product page.** One idea per section, a short serif line, one plain
  sentence, and the real app on an iPhone. No floating chips, no decorative blobs, no icon-and-three-bullets cards where a sentence will
  do. The liquid glass stays, as the material of the header, the tiles, the dark panels and the menus. Links to more are quiet text
  links ("Learn more ›"), not extra buttons.
- `Phone.tsx` — the iPhone mockup (a screenshot from `public/mobile/*.png` inside `iphone-frame.png`; its `children` can be a drawn screen
  or stacked images). `home/PhoneHalf.tsx` tucks a phone into the bottom edge of a tile so only its top half shows; `PhoneRow` in
  `components/PageKit.tsx` is three phones cut off by the edge of a page hero. Use screenshots of the real app only.
- The public site sits on **plain white** (a fixed white layer in `app/layout.tsx`, inside `HideInApp`, so the signed-in app keeps its cream).
- `home/` — the sections of the home page: `Hero` (one line, one sentence, three whole iPhones that fan out on load and open wider as you
  scroll), `Story` (the tour: on a wide screen one phone stays put on the right while the chapters pass on the left, and the screen and the
  panel's tint change with the chapter in view; on a phone, one tile per chapter), `Capabilities` (everything the workspace does with
  its honest status), `Speed`, `AiSection`, `Trust`, `Pro`. Home composes them in `app/page.tsx`.
- `Nav.tsx` is one slim full-width glass bar (name, plain links, "Features" menu, Log in and Get started; a full-screen menu on a phone);
  `components/SiteChrome.tsx` has the footer (name, what it is, four link columns, a thin legal line). Anchor links in `lib/site.ts` must
  point at ids that exist on the home page (`#workspace`, `#tour`, `#integrations`, `#ai`, `#trust`, `#pro`, `#faq`).
- `Blocks.tsx` — step cards, day timeline, access matrix, plan comparison. `Faq.tsx`, `IntegrationsCarousel.tsx`, `Logo.tsx`.

## Gotchas

- A server component must not hand a client component's element to something that clones it. `Tip` wraps children in a span instead.
- `Reveal` delays are in **milliseconds**; GSAP's own `delay` is seconds.
- In a hero or tile, GSAP animates `transform` while Tailwind's `-translate-x-1/2` is the separate CSS `translate` property: they compose, but
  put centring on a wrapper and the animation on the element inside, as `home/Hero.tsx` does.

**Pricing page:** `app/pricing/page.tsx` is dynamic and reads the plans from the database (`listPublicPlans()`), so a price edited in Admin → Plans shows there without a deploy. Never hard-code a price, allowance or plan name on it; the compare table (`CompareTable`, any number of plans) is built from the plan rows. It says when payments are not switched on (`FEATURES.payments`). See `docs/BILLING.md`.
