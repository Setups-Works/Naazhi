# Naazhi — brand and logo guide

Read this before you make anything that carries the product's name or logo: a screen, an email, a store listing, a social post, a slide. The UI itself is covered by [DESIGN_LANGUAGE.md](DESIGN_LANGUAGE.md); this file is about who we are on the surface.

## 1. The name

|                |                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**       | **Naazhi**                                                                                                                                                                       |
| **Tamil**      | நாழி — an old Tamil measure of grain and of time. A small, honest unit you use every day. The product keeps the days, work and thoughts of one person in one place.             |
| **Say it**     | NAA-zhee (long "aa", then the Tamil ழ, between "l", "r" and "zh").                                                                                                               |
| **Write it**   | Always **Naazhi**: capital N, rest lower case. Never `NAAZHI`, `naazhi` or `Nazhi` in running text. The lower-case form is only for addresses, handles and file names (`naazhi.app`). |
| **Never**      | The old working title ("untitled project") appears nowhere users can see it. Repository, package and database names keep their technical names (see §8).                          |
| **Tagline**    | **One workspace, any AI.** Use it under the logo or as a page title suffix. Not both in the same place.                                                                          |
| **One-liner**  | Notes, to-dos, journal, chat, calendar and your Reader in one workspace, with an AI you can swap, bring your own, or switch off.                                                 |
| **Made by**    | "Backed by Setups Works." in email footers and the About screen. Not in the header.                                                                                              |

### Voice

Calm, plain and a little warm. Short sentences. Say what happened and what to do next. No exclamation marks, no emoji in product text, no hype words ("revolutionary", "supercharge"). Sentence case everywhere except proper names. Curly apostrophes (’). Numbers as digits. Dates the way the person reads them (the app formats them in the browser or on the phone).

| Instead of                            | Write                                       |
| ------------------------------------- | ------------------------------------------- |
| "Oops! Something went wrong!"         | "Couldn’t save that. Try again."            |
| "Unlock the power of your workspace"  | "Everything you keep, in one place."        |
| "Welcome to the future of productivity" | "Welcome to Naazhi."                       |

## 2. The mark

The mark is a hand-drawn, single-weight monogram built from rounded Tamil-script curves. Read from the top: a small curl, a loop, a long tail that closes into a speech bubble. Three details carry the product:

- **The bubble with three lines** (bottom) — notes, journal and chat: the things you write.
- **The star** (upper right) — the AI layer: present, small, optional.
- **The single weight, round ends** — calm and personal, not corporate.

### Colours (logo files only)

| Part             | Colour                          | Note                                                                          |
| ---------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Ink (the strokes) | **Naazhi green** `#235340`     | Sampled from the master artwork. Next to the UI's `--green-fg` `#1f5d49`.      |
| Details (star, lines) | Same green at about 40 %    | Comes from the file's own transparency; never recolour them separately.       |
| Ground           | **White** `#ffffff`             | The app icon and splash ground, with the mark in the theme black `#242424`. The UI canvas stays `--page`. |
| Reverse          | Cream strokes on green or ink   | Use `naazhi-mark-light.png` on dark backgrounds (`--fill-dark`, photos).      |

The UI never uses these two hex values: it uses its tokens (`text-green-fg`, `bg-page`). They exist for the logo files, store assets and print.

### Files

Everything is generated from one master picture by `node scripts/brand/build-assets.mjs` (source: `brand/source/naazhi-logo.jpg`). Don't edit the PNGs by hand: change the source and run the script.

| File                                               | Use                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| `apps/web/public/brand/naazhi-mark.png`            | The mark on light backgrounds (web header, emails). Transparent.     |
| `apps/web/public/brand/naazhi-mark-light.png`      | Cream mark for dark backgrounds. Transparent.                        |
| `apps/web/src/app/icon.png`, `apple-icon.png`      | Browser tab icon and iOS home-screen icon of the website.            |
| `apps/mobile/assets/images/icon.png`               | The app icon (iOS, and the base for stores). Black mark on white, 1024.    |
| `…/android-icon-foreground.png`, `-background.png`, `-monochrome.png` | Android adaptive icon: foreground inside the 66 % safe zone, plain white background, one-colour themed-icon version. |
| `…/splash-icon.png`                                | Launch screen mark.                                                  |
| `brand/exports/*-3000.png`                         | Print and design-tool sizes: ink, cream, and black on white.           |
| `brand/exports/naazhi-app-icon-1024.png`           | Store listings, social avatars, slides.                              |

In code use the `BrandMark` component (`apps/web/src/components/BrandMark.tsx`), never an `<img>` with a path of your own.

## 3. The wordmark and the lockup

The wordmark is the word **Naazhi** set in **Instrument Serif**, weight 400, tracking `-0.02em`, in the ink colour (`text-fg`; `text-on-dark` on dark). It is text, not an image, so it stays sharp, translates, and can be selected.

**Lockup** = mark + wordmark, side by side, vertically centred:

- Mark height = **1.3 × the wordmark's font size** (a 22 px wordmark gets a ~28 px mark).
- Gap between them = **0.35 × the wordmark's font size**.
- Mark on the left, always. Never stack them in the product UI.

Mark sizes used today (set the wordmark from the ratio above):

| Place                         | Mark size                               |
| ----------------------------- | --------------------------------------- |
| Website top bar, app top bar  | 28 px                                   |
| Hero, shared pages            | 26 px                                   |
| Footer, "why" section         | 34 px                                   |
| Chat welcome                  | 40 px                                   |
| Email header                  | 28 px                                   |
| Mobile launch screen          | 160 px, with the name (32 px) below it  |

### The launch animation (app)

The mark is drawn the way it is written, in about two seconds (`apps/mobile/src/components/AnimatedSplash.tsx`):

1. **0 – 1.1 s** the body of the monogram wipes in from the top, curl first, down into the bubble.
2. **0.8 – 1.2 s** the three lines of the bubble write in, left to right.
3. **1.1 s** the star lands with a small spin, then twinkles slowly.
4. **0.9 s on** the mark rises a little and **Naazhi** appears under it, letter by letter.
5. When the app is ready the screen fades out. Nothing else moves, nothing bounces.

The native launch screen before it shows only the white ground (`splash-blank.png`), so the first thing anyone sees drawn is the mark itself. With "Reduce motion" on, the finished mark and name are shown still. The pieces (`splash-mark-body|lines|star.png`) and the star's position (`splashMark.ts`) are generated by `scripts/brand/build-assets.mjs`; never edit them by hand. The launch screen also ripples rings out from the mark, beats a red heart and shows the credit line “from ♥ Setups Works” with the Setups Works logo (`apps/mobile/assets/images/setups-works.png`, a copy of the web’s).

## 4. Clear space and minimum size

- **Clear space:** keep a margin of at least **½ of the mark's width** free on every side (the loop at the top is the unit). Nothing — text, edges, other logos — enters it.
- **Minimum size:** the mark alone **16 px** on screen (the favicon) and **8 mm** in print. Below about 24 px the star and the three lines blur, which is fine for a tab icon but means you should not rely on them. In a lockup the mark is at least **24 px** high.
- **App icon:** the mark fills about 66 % of the square, centred. iOS rounds the corners itself; supply the full square.

## 5. Do and don't

**Do**

- Use the files above, scaled proportionally.
- Put the mark on `--page` cream, white cards, or `--fill-dark` (cream version).
- Keep one logo per screen region. The top bar has it; a hero doesn't repeat it.

**Don't**

- Recolour it (no blue, no gradients, no "glass" treatment), outline it, add a shadow or glow.
- Stretch, rotate, crop or draw it again from memory.
- Put it on a busy photo or on a background with less than 4.5:1 contrast with the strokes.
- Animate the strokes apart or bounce the mark. The only motion allowed is the launch animation below.
- Write the name in all caps, or in lower case at the start of a sentence.
- Use the mascot or the old ghost artwork anywhere. It is retired.

## 6. Where the brand shows up

| Surface                   | What carries it                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| Website                   | Top bar lockup, footer lockup, tab icon, share pages, `Naazhi` suffix in every page title (`X — Naazhi`) |
| App                       | Launcher icon, launch animation, onboarding label, Home greeting, Settings → About                      |
| Email                     | Header lockup, footer line "You received this because someone used this address on Naazhi.", sender name `Naazhi <…>` |
| Notifications             | App name is Naazhi; titles are plain sentences, no brand prefix                                         |
| Chat assistant            | Introduces itself as the assistant inside Naazhi (see the chat prompt)                                  |
| Social, stores            | `naazhi-app-icon-1024.png` as the avatar; green on cream; serif headlines                               |

## 7. Writing about the product

- Name features by what they do: "Plan", "Journal", "Chat", "Workspace" (Notes, Calendar, Health, Reader). They are not branded sub-names.
- "AI" is a layer you can swap or switch off; say so rather than selling it as the product.
- Privacy claims must match [SECURITY.md](SECURITY.md). Don't promise more.

## 8. What keeps the old technical names

These are identifiers, not branding, and are left as they are so nothing breaks: the workspace packages (`@untitled/*`), the app's deep-link scheme (`untitled://`, used by sign-in callbacks, widgets and notifications), the Expo slug, and the Azure resources. The Android package and iOS bundle id are `com.setupsworks.naazhi`.

## 9. Adding something new that carries the brand

1. Use `BrandMark` and the wordmark rules in §3.
2. Take colours from the UI tokens, not from §2.
3. Check it at 375 px width and on `--fill-dark`.
4. If you need a new logo asset size, add it to `scripts/brand/build-assets.mjs` and rerun the script.

## 10. The brand guidelines book

A 90-page brand book (PDF and HTML) with logo rules, colours, typography, voice, applications and governance lives in `marketing/naazhi-brand-guide/` (see its README). Rebuild it with `node marketing/naazhi-brand-guide/build.mjs` after changing this file or the tokens.
