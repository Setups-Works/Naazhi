# Security

Rules for everyone (and every AI agent). The checklist at the bottom is finished in Phase 6.

## Principles

1. **Authorisation lives in the database (RLS) and the services**, never only in the UI.
2. **Least privilege:** the browser gets only the anon key; the service-role key is used in few, reviewed places and always after an explicit permission check.
3. **Untrusted input everywhere:** user text, uploads, emails, transcripts, tool output, URL params.
4. **No secrets in code, git, chats or logs.** Rotate on any suspicion.

## Secrets inventory (names only)

| Variable                                          | Where used                           | Exposure                                                 |
| ------------------------------------------------- | ------------------------------------ | -------------------------------------------------------- |
| `DATABASE_URL`, `REDIS_URL`                       | server only                          | **server only**                                          |
| `BETTER_AUTH_SECRET`, `S3_SECRET_KEY`, `SMTP_URL` | sessions/tokens, file storage, email | **server only**                                          |
| `S3_ACCESS_KEY`                                     | file storage credentials             | server only                                               |
| `S3_ENDPOINT`, `S3_REGION`, `S3_AUTO_CREATE_BUCKETS` | object storage endpoint and behavior | server-only configuration                                 |
| `ADMIN_EMAILS`                                    | bootstrap admins                     | server only                                              |
| `GROQ_API_KEY`                                   | AI / integrations services           | server only (Phase 3–4)                                  |
| `CRON_SECRET`                                     | protects `/api/v1/jobs/*`            | server only                                              |
| `SENTRY_*`, `NEXT_PUBLIC_POSTHOG_KEY`             | observability                        | DSN/keys are public identifiers; auth tokens server only |
| Stripe keys                                       | billing                              | server only (Phase 6)                                    |

Rotation: change the value in `.env.selfhost` / your secret manager and recreate the containers (rotating `BETTER_AUTH_SECRET` signs everyone out); hosting dashboard → Environment Variables; Vercel → Environment Variables; then redeploy **without build cache** (NEXT_PUBLIC values are baked at build). A pasted value containing characters like “…” or spaces breaks every request — the app now detects this and says which variable is wrong.

## Auth and sessions

- Better Auth with email+password and Google; sessions stored in PostgreSQL (cookie `better-auth.session_token`); `apps/web/src/proxy.ts` only redirects, every page re-verifies the session.
- Google One Tap runs on the login and signup pages through Better Auth. The public client ID is returned by `/api/v1/auth-config`; the secret stays server-side. Add each deployed site origin (including `http://localhost:3000` for local development) to the Google OAuth client's Authorized JavaScript origins. The standard Google button remains available if the prompt is unavailable or dismissed.
- Better Auth's last-login-method plugin keeps only the most recently used method name in a readable, first-party cookie for 30 days, so the login form can show a “Last used” hint. It does not store this preference in the database.
- Better Auth's admin plugin endpoints require the `admin` role. The app's `/admin` pages and server actions continue to enforce `requireAdmin`/`assertAdmin`, protect the acting admin and `ADMIN_EMAILS` accounts, and record admin-panel mutations in `admin_audit`.
- Usernames are optional for existing accounts, required for new email/password signups, normalized to lowercase, and unique. Users can set or change them in Profile settings; the public availability endpoint is disabled to reduce username enumeration.
- Passkeys use Better Auth WebAuthn and are stored in `auth.passkeys`, an RLS-enabled server-only table with no client policies. `BETTER_AUTH_URL` must match the public auth origin; production passkeys require HTTPS. The Expo client uses the device credential manager and needs a native development/release build. Set `PASSKEY_ORIGINS` to the comma-separated Android signing origins (`android:apk-key-hash:<base64-sha256>`) for every build certificate; Android also needs `/.well-known/assetlinks.json`, and iOS needs the `webcredentials:` associated domain plus an Apple App Site Association file. These values must match the app's actual signing and bundle identifiers. The server serves both files itself and builds the Android origin from the fingerprint: set `APPLE_TEAM_ID` and `ANDROID_CERT_SHA256` (the app's iOS associated domain is taken from `EXPO_PUBLIC_API_URL` at build time). Native Google sign-in sends Google's ID token to Better Auth, which checks it against the web client ID in `GOOGLE_CLIENT_ID`; the iOS and Android OAuth clients only have to exist in the same Google Cloud project.
- `BETTER_AUTH_TRUSTED_ORIGINS` is a comma-separated list merged into Better Auth's trusted origins. Set it to `exp://**` when testing OAuth from Expo Go against a deployed backend; server config also normalizes a plain `exp://` value to that wildcard pattern.
- Forgot-password uses Better Auth email OTPs: six digits, five-minute expiry, three attempts, hashed at rest, and limited to three requests per minute. The UI uses a generic response so it does not reveal whether an email has an account. OTPs are sent through the configured SMTP transport and must never be logged.
- The desktop app signs in with Google through the person's browser: `/desktop-signin` (needs a session) makes a Better Auth one-time token (hashed at rest, 3 minutes, single use) and opens `naazhi://auth?token=…`; the app trades it for its own session cookie. Never log the token. The shell itself runs with context isolation and the sandbox, validates every message from the page and opens off-site links in the browser (docs/DESKTOP.md).
- Redirect targets (`?next=`) are validated by `safeNext` (same-site relative paths only; backslashes and control characters are refused, since browsers turn `/\evil` into `//evil`).
- Admin = `app_metadata.role = 'admin'` or an email in `ADMIN_EMAILS`. Every `/admin/*` page and server action re-checks on the server (`requireAdmin` / `assertAdmin`). Admins can't demote/ban/delete themselves or `ADMIN_EMAILS` accounts.
- Account deletion and "reset workspace" remove rows **and** storage files.

## Data protection

- RLS on every table (see `DATA_MODEL.md`). New tables without RLS must not merge.
- Private Storage bucket for user files with owner-folder policies; files are served through short-lived signed URLs.
- Journal entries are private to their author even in shared workspaces. **Shared journals** are a separate, opt-in thing: they live in their own tables, a person sees one only as its owner or after accepting an invitation, and the role (owner / editor / viewer) is enforced by row-level security, not by the UI. Members never see each other's email, only username and name. Inviting is rate limited, a journal holds at most 20 people, and a stranger who guesses a journal id gets "not found". Files attached to shared entries are readable only by members of that journal and uploadable only by their author.
- The admin Usage page reads only ids/counts — never user content. Admin tools must not expose note/journal/chat content.
- Audit log: every admin action recorded in `admin_audit` (service-role only).

## Public sharing

- Chats are private unless `share_token` is set (32 random hex chars). The public page `/share/[token]` queries by exact token on the server; no anon RLS policy exists that would allow listing shared chats.
- The page is `noindex` with `referrer: no-referrer`; it shows no owner identity. "Stop sharing" clears the token immediately.
- A single **journal entry** can be shared the same way (`journal_entries.share_token`, page `/share/journal/[token]`): a random 32-hex token, looked up by exact match on the server, read-only, no name or email, files signed only when they sit in the author's own folder, switched off instantly, and turning it on again makes a new token. Nothing else in the journal is reachable from the link.

## Uploads

- 10 MB limit (bucket) plus type checks in UI; Phase 2 adds server-side MIME validation and rejects executables.
- Never render uploaded HTML/SVG inline; images and audio use `<img>`/`<audio>` via signed URLs; other files open in a new tab with `rel="noopener noreferrer"`.

## Plans, usage and saved API keys

Full design: `docs/BILLING.md`.

- A person cannot write their own plan, usage or prices: `user_billing`, `ai_usage` and `billing_plans` have no client write path (grants revoked, tested in `tests/db/billing.test.ts`); the billing service changes them after checking the caller.
- **A saved AI key is a secret.** It is stored AES-256-GCM sealed with a key derived from `BETTER_AUTH_SECRET` and bound to the user id; `user_ai_keys` is unreadable by `authenticated`; the browser only gets the last four characters. Never log a key or return it. Rotating `BETTER_AUTH_SECRET` makes saved keys unreadable (people re-enter them).
- The own-key provider can only call the fixed hosts in `BYO_PROVIDERS` (`packages/logic/src/billing.ts`). **Never build that address from user input** (SSRF), and never pass a provider's error body on.
- Every AI entry point must call `aiAccessFor()` first (plan check, allowance, own key) and `record()` after. Only token counts are stored, never prompts or answers.
- Admin plan changes require `assertAdmin()` and are written to `admin_audit`.

## AI and tools (Phase 4)

- Tool output and external content are data, not instructions (prompt-injection rules in the prompt library).
- **Any write action by the AI (send mail, create/delete events or tasks) requires explicit user confirmation** with a preview.
- Log tool calls to the audit log; meter usage; cap per-user spend.
- Don't send more context to a provider than the feature needs; document what each provider receives.

## Web hardening (Phase 6)

**In place:** every response carries `X-Frame-Options: SAMEORIGIN`, `frame-ancestors 'self'; base-uri 'self'; object-src 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` and HSTS (two years), and no `X-Powered-By` (`apps/web/next.config.mjs`). Uploaded files keep their own sandbox CSP (the storage route), so the page policy is not sent there.

**Still to do:** a full script CSP (it must allow Firebase, Clarity, Razorpay, Stripe and Puter.js and be tested against each), Cloudflare WAF, secret scanning in CI, bot protection on auth endpoints.

**Client addresses for rate limits.** Per-address limits (sign-in, password reset, desktop sign-in codes, visit counting) use `clientIp()` (`apps/web/src/server/clientIp.ts`): the header named in `CLIENT_IP_HEADER` when set, otherwise the right-most `x-forwarded-for` entry (the one our proxy added; the left-most is whatever the client sent). The auth route hands Better Auth the same address in `x-naazhi-client-ip` (`withAuthIp()`, always overwriting what the visitor sent, port removed). Production on Azure App Service sets `CLIENT_IP_HEADER=x-client-ip`: Azure's front end writes it and overwrites any value the visitor sends.

**Dependencies.** Run `corepack pnpm audit --prod` before a release. Transitive floors for packages we don't depend on directly go in `overrides` in `pnpm-workspace.yaml`.

## Reporting and incidents

Found a vulnerability or leaked secret? Tell the tech lead immediately, rotate first, investigate second, and write down what happened here.

## Phase 6 checklist (to be signed off)

- [ ] Every table has RLS + tests; no unintended anon access
- [ ] Service-role usage reviewed (list below)
- [ ] CSP / headers deployed (security headers done; full script CSP open); cookies `Secure`, `HttpOnly`, `SameSite=Lax`
- [x] `CLIENT_IP_HEADER` set in production (`x-client-ip`, Azure App Service)
- [ ] Rate limits on auth, AI, upload and share endpoints
- [ ] Share links, uploads and admin actions reviewed
- [ ] AI tool confirmation + injection tests in CI
- [ ] Secrets rotated after development; none in git history (gitleaks)
- [ ] Backups and restore drill done
- [ ] Privacy policy matches actual data flows

### Service-role usage (keep this list current)

`apps/web/src/server/session.ts` `adminDb()` / `withOwner()` (admin panel, share page, announcements, audit) · `apps/web/src/server/repositories/billing.repository.ts` (writes to plans, a person's plan, usage and saved keys; reached only from `services/billing` after the caller is checked) · `apps/web/src/app/admin/plans/actions.ts` · `apps/web/src/app/admin/actions.ts` · `apps/web/src/app/dashboard/settings/actions.ts` (delete account) · `apps/web/src/app/share/[token]/page.tsx`.

## Stripe webhook
`/api/webhooks/stripe` is unauthenticated by design: the `Stripe-Signature` header (HMAC-SHA256 of `<t>.<raw body>` with `STRIPE_WEBHOOK_SECRET`, timing-safe, five-minute tolerance against replays) is the only gate, checked before the body is parsed. Event ids (`evt_…`) are claimed once in `billing_events`; a failed handler releases its claim so Stripe retries. Subscription state is re-read from Stripe, never trusted from the event. The return trip from Stripe's page carries only a session id, which `POST /api/v1/billing/stripe/confirm` re-fetches from Stripe and accepts only if `client_reference_id` and `metadata.user_id` are the caller. Card details are entered on Stripe's page and never reach us; the publishable key (public by design) is only handed to the phone app for its native payment sheet; the sheet's return trip sends a subscription or payment-intent id that the server re-fetches and checks against the caller. The provider is stored per subscription, so changing `profiles.country` (writable by the owner) cannot redirect an existing subscription or refund to another provider.

## Razorpay webhook
`/api/webhooks/razorpay` is unauthenticated by design: the HMAC signature over the raw body is the only gate (timing-safe compare), events are claimed once by id and refused if older than two days. Key secret and webhook secret are server-only; the checkout call is verified by signature and by asking Razorpay who the subscription belongs to.

## Invoices and emails
An invoice is created only from a payment the server has verified with Razorpay. `/invoice/<id>` is owner-only (the query runs as the signed-in person) and `noindex`. Emails are drawn from one layout with every value escaped, never log their content, and never block a payment. The admin email preview is sandboxed and sends nothing.

## Audit log

### 2026-11-17 — repository review (web, app, desktop)

Reviewed: every route handler's auth, the `/api/v1/db` query builder (identifiers checked against the schema and quoted, values bound, run as the user under RLS), owner-role database use, admin pages and server actions (`requireAdmin` in the layout, `assertAdmin` in every action), cron and webhook gates (timing-safe), share-token lookups, the storage route, the desktop shell (context isolation, sandbox, exact-origin checks, permission allow-list), tracked files for secrets and key files (none), and production dependencies.

Fixed:

- **Next.js 16.3.8 → 16.4.x**: two critical unauthenticated remote-code-execution advisories (Image Optimization with SVG; `use cache` with typed arrays) and a Server Actions denial of service. zod raised to 4.6.7 (memory exhaustion); node-forge and `@grpc/grpc-js` floored through `overrides`. `pnpm audit --prod`: 2 critical and 11 high → 0 critical, 0 high.
- **Open redirect** in `safeNext` through `/\evil.test` and tab/newline tricks.
- **Rate limits keyed on a spoofable address** (left-most `x-forwarded-for`) on desktop sign-in and visit counting; Better Auth's limits fell into one shared bucket. `clientIp()` and `CLIENT_IP_HEADER`.
- **No security headers**: added (see Web hardening).
- **Zoho sign-in from the phone and desktop** required a browser session the in-app sheet doesn't carry; it now uses the single-use state, like Google.
- `sameOrigin` returned a 500 for a malformed `Origin` (`null`); it now refuses it. The desktop "Open in browser" menu used a prefix match instead of the exact-origin check.

Open (not fixed in this pass):

- Full script CSP.
- Settings shows the `?msg=` text from sign-in returns (Google, Zoho, Notion). It is escaped, but anyone can craft a link that shows their own words on our page; show only known messages by code.
- The admin "Send password reset" builds its link from the request's `x-forwarded-host`; take the address from configuration instead.
- 7 moderate and 1 low dependency advisories remain (dev and phone tooling).
