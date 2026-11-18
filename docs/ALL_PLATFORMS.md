# Every change lands on every platform — the checklist for developers and AI agents

Naazhi ships on **three surfaces**, and a feature or a bug fix is not done until it is on all of them (or the PR says plainly why not). This file is the rule and the checklist. Read it before you start a feature or a fix, and again before you open the PR.

| Surface | Where the code is | How a change reaches it |
| --- | --- | --- |
| **Web** | `apps/web` | You build it here first. The website and the dashboard (`dashboard.naazhi.app`) are the same Next.js app. |
| **Phone app** (Android, iPhone later) | `apps/mobile` (Expo / React Native) | **Separate code.** Nothing on the web reaches it by itself: the screens, hooks and styles are written again in `apps/mobile/src/features/<area>`. |
| **Desktop** (Mac, Windows) | `apps/desktop` (Electron shell) | **It shows the hosted web app**, so a web change appears there by itself. Only the shell (window, menus, tray, `naazhi://` links, notifications, sign-in) needs separate work. |

> The three have drifted before: the Google and Notion work first shipped web-only, and the app lacked the `@` picker, calendar import, "Save to journal", note sharing and the Notion popup until a follow-up. Don't repeat that. Do the app part in the same PR.

## 1. The rule

1. **Decide the platforms first.** Before coding, write in the PR description (or the GitHub issue) one line each for Web, App and Desktop: *built*, *not needed (why)* or *follow-up #n*. "Forgot" is not an answer.
2. **Put what can be shared in the shared packages**, so the three can't drift: types in `packages/types`, pure rules in `packages/logic`, Zod schemas in `packages/validation`, API calls in `packages/api-client`. The web and the app then differ only in how they draw things.
3. **The server is one.** An API route, service or migration serves every surface. Never build a feature that only the web's cookie session can call: the phone sends its own session, and the phone's in-app browser **does not carry it to other websites** (see "Sign-in flows" below).
4. **Fix a bug where it lives, then look for its twin.** Search the other surface for the same code path (`git grep` the component name, the API route, the copy) before you call a bug fixed.
5. **Both platforms get the same words** (labels, empty states, errors) and the same behaviour. Use each platform's own tokens and components (`docs/DESIGN_LANGUAGE.md` for the web; `apps/mobile/AGENTS.md` and `constants/theme.ts` for the app). No hard-coded colours or sizes on either.

## 2. Where the equivalents live

| Web | App | Notes |
| --- | --- | --- |
| `apps/web/src/features/<area>`, `components/app/*` | `apps/mobile/src/features/<area>` | Same area names (`notes`, `calendar`, `chat`, `settings`, `onboarding`, `journal`, `tasks`, `integrations`…). |
| Settings pages `features/settings/pages/*` | `apps/mobile/src/features/settings/pages/*` and `settings/types.ts` (the list of sections) | A new section must be added to **both** lists. |
| Onboarding `features/onboarding/screens/*` | `apps/mobile/src/features/onboarding/setup/steps.tsx` | The step numbers are shared and stored (`lib/onboarding.ts` / `setup/state.ts`): never renumber. The app's welcome slides run **before** sign-up, so anything that needs an account goes in the setup steps. |
| Chat `@` picker `lib/connectors.ts` + `Composer.tsx` | `features/chat/connectors.ts` + `Composer.tsx` | A new connected app must be listed in both, plus `ChatTokenizedText` (bold mentions). |
| Chat cards `components/app/chat/shown/*` | `features/chat/shown/*` | Add the card kind in both, and the draft cards in `ChatToolCalls.tsx`. |
| Calendar `features/calendar/*` | `features/calendar/*` | |
| Notes `components/app/NotesView.tsx`, `NoteEditor.tsx` | `features/notes/NotesScreen.tsx`, `NoteEditorScreen.tsx` | Card actions, the ··· menu, sharing, import. |
| API calls `packages/api-client` | same package | Add the call once, use it from both. |
| Query keys `apps/web/src/lib/query/keys.ts` | `apps/mobile/src/lib/queryKeys.ts` | |
| Changelog `features/changelog/releases.ts` | (same entry) | Tag each line `web`, `app` or `desktop`. |

## 3. Checklist — copy it into the PR

```
Platforms
- [ ] Web: built / n/a because … / follow-up #
- [ ] App (apps/mobile): built / n/a because … / follow-up #
- [ ] Desktop: works through the web app / needs shell work (menus, tray, naazhi:// link, notification, sign-in) / n/a
Server and shared code
- [ ] Logic, types, validation and API calls are in packages/* where both can use them
- [ ] The API works without a browser cookie (phone sends its own session)
- [ ] Migration added (append-only), applied to production BEFORE the deploy, DATA_MODEL.md updated
Same on both
- [ ] Same labels, empty states and errors; each side uses its own tokens
- [ ] Works at 375 px on the web and on a small phone in the app
- [ ] Twin bug searched for on the other surface
- [ ] New screen or action people can use: `track("snake_case_name")` on web and app (feeds Firebase and Clarity, docs/ANALYTICS.md); no content in events; any new tool that sees users is named in the Privacy and Cookies pages
Release
- [ ] releases.ts entry with web / app / desktop lines; versions bumped (docs/RELEASE_FOR_AGENTS.md)
- [ ] CURRENT_STATE.md and the folder AGENTS.md files updated
```

## 4. Desktop specifics

The desktop app is a window around the web app, so most work is free. Check these when a change touches them:

- **Anything that opens another site** (an OAuth or sign-in page): the shell sends every link outside the app's own address to the **system browser**, so the person signs in there and comes back through a callback. Make the callback land on a page that makes sense in a browser, and (if it should return to the app) support `naazhi://`. See `docs/DESKTOP.md`.
- **Notifications and reminders:** page → shell goes through `window.naazhiDesktop` (`DesktopBridge.tsx`); a new kind of notification needs the bridge and `apps/desktop/src/main/reminders.ts`.
- **A new page or menu item:** add it to `DESKTOP_SECTIONS` (`packages/types/src/desktop.ts`) so `naazhi://<section>` and the menu reach it.
- **New permission** (camera, clipboard…): the shell has an allow-list in `apps/desktop/src/main/index.ts`.
- Change both sides of `packages/types/src/desktop.ts` together, and read `apps/desktop/AGENTS.md`.

## 4a. Payments and money (country-based billing)
- Anything that shows or takes money reads `MyBilling.currency` / `provider` (set by the server from the person's country, `billingRegion()` in packages/logic/src/countries.ts); never hard-code ₹, "rupees" or "Razorpay" in UI, and format with `formatMoney(cents, currency)`.
- Paying: every country opens Razorpay (web window, app native sheet, `apps/mobile/src/features/billing/checkout.ts`); the server sets the currency (rupees in India, US dollars elsewhere) and the window shows it. Desktop is the web app, so the same Razorpay window opens inside the shell; its card-check and net-banking popups open as a child window there (`isPaymentPopup` in `apps/desktop/src/main/window.ts`).
- Country is asked on the About screen of onboarding (web and app) and editable in Settings → Plan and billing (`POST /api/v1/billing/country`).

## 5. Sign-in flows (Google, Notion, Zoho and any new one)

- The phone opens a provider's sign-in in its **web sheet**, which sends the app's login only on the **first** page. When the provider sends the person back, the request has **no session**. So a callback must not depend on the cookie alone: Google uses its single-use `state` (`takeOAuthStateAny`), Notion a signed short-lived token (`signNotionReturn`). Copy that pattern, and never trust anything else in the address.
- After the callback, redirect to a Settings page the app's sheet recognises (`/settings/google`, `/settings/imports`) so it closes by itself; on the web the same redirect lands on the page. Onboarding uses the `connect_return` cookie to come back to its own step (`lib/connectReturn.ts`).
- A phone sheet can't show over another native modal: close a sheet before opening a sign-in.

## 6. When you really can't do a platform now

Say so in the PR and the changelog, and file the follow-up the same day:

- The changelog line is tagged only with the platforms that have it. Never write "works in the app" for something that doesn't.
- The Settings or onboarding text on the missing platform must not promise it (no dead buttons: use the "Soon" label or leave the control out).
- Link the follow-up task in `docs/CURRENT_STATE.md` under the feature's row.

## 6a. Analytics and recordings

Firebase and Microsoft Clarity are wired into the shared `track()` / `identify()` of both platforms; the desktop app gets them through the web app. A feature does not need Clarity code: call `track()` on the one action that matters and keep UI that shows people's content inside `app/dashboard` (masked). Details and rules: `docs/ANALYTICS.md`.

## 7. Before you say it is done

1. `corepack pnpm typecheck` · `corepack pnpm test` · `corepack pnpm check:design` · `corepack pnpm --filter mobile lint` · `corepack pnpm build:web`
2. Open the feature on the web at desktop and 375 px, and (for the app) run it in Expo or a development build.
3. Read the changelog entry you wrote: every line is true on the platform it names.
