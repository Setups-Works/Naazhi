# Plans and billing

**Read this when** you touch plans, prices, AI access, the Plan and billing tab, the admin Plans page or the pricing page. Everything below is built; payments run through Razorpay autopay (see [Payments](#payments-razorpay-autopay-rupees-only)).

## The three plans

| Plan (`id`)                | Who pays for AI                | Fee                                                       | Metering                                                 |
| -------------------------- | ------------------------------ | --------------------------------------------------------- | -------------------------------------------------------- |
| Subscription (`subscription`) | us, up to a monthly allowance | `price_cents` per `interval` (month or year)              | Tokens counted; blocked once `included_tokens` is used up |
| Pay as you go (`payg`)     | us, billed after use           | none                                                      | Tokens counted and priced at `token_price_cents_per_million` |
| Bring your own key (`byo`) | the person, directly to their provider | none                                              | Never counted; the person's key is used                  |

A person with **no plan row** keeps AI exactly as before (our key, rate limited) and their use is only counted. Nothing in the app forces a choice.

**Nothing here is hard-coded.** Prices, allowances, the token rate, names, taglines, feature lines, order and availability all live in `billing_plans` and are edited in **Admin → Plans**. The pricing page, Settings and the phone app read the same rows. The seed values in the migration are placeholders in rupees (₹749 a month, ₹150 per 1M tokens), not announced prices. Amounts are stored in paise (the smallest unit); ``formatMoney`` formats them (`en-IN` for INR). The only things in code are the three plan ids (also a check constraint) and the list of own-key providers.

## Rules (all in `services/billing/billing.service.ts`)

- **Choose or switch:** takes effect at once. A subscription gets a period (`period_start` → `period_end`, one month or one year per `interval`); the other plans have no period.
- **Cancel:** a subscription sets `cancel_at_period_end` and runs to the end of its period; `pay as you go` and `byo` stop immediately (`status = 'canceled'`). **Resume** clears `cancel_at_period_end`.
- **Rollover:** a period that has ended is settled the next time anything reads the person's billing (`settled()`): a cancelled subscription lapses, anything else renews for the next period. There is no cron job; keep it that way unless a payment provider needs one.
- **AI access** (`aiAccessFor(userId)`) runs before every AI request and either returns how to answer it or throws a friendly `ForbiddenError`:
  - `byo` without a saved key → "Add your API key…"; with a key → the key is opened for that one request.
  - `subscription` at or over its allowance → "You’ve used this period’s AI allowance…".
  - anything else → our provider, with a `record()` that counts the tokens.
- **Usage** is recorded after the answer (even a stopped one). If the provider reports no usage, `estimateTokens` (≈ 4 characters per token) is used. Only token counts are stored, never text.

## Where things are

```
db/migrations/20261026120000_billing_plans.sql   billing_plans, user_billing, ai_usage, user_ai_keys (+ RLS, grants)
packages/types/src/index.ts                      PlanId, BillingPlan, MyBilling
packages/logic/src/billing.ts                    BYO_PROVIDERS, formatMoney, formatTokens, priceLine, tokenCostCents, addMonths, estimateTokens (+ test)
packages/api-client/src/billing.ts               createBillingApi — shared by web and phone
apps/web/src/server/repositories/billing.repository.ts   SQL only
apps/web/src/server/services/billing/            billing.service.ts (rules), billing.schema.ts (Zod), keyVault.ts (encryption)
apps/web/src/server/providers/ai/custom/         the own-key provider (OpenAI-compatible, hidden from the picker)
apps/web/src/server/services/ai/{chat,noteAssist}.ts   call aiAccessFor() and record() — the only two AI entry points
apps/web/src/app/api/v1/billing/                 GET /, POST plan | cancel | resume | ai-key, DELETE ai-key
apps/web/src/features/billing/                   queries.ts + BillingPanel.tsx (Settings → Plan and billing)
apps/web/src/app/admin/plans/ + components/admin/{PlansEditor,SubscribersTable}.tsx   Admin → Plans
apps/web/src/app/pricing/page.tsx                the public pricing page, read from the database on every request
apps/mobile/src/features/billing/                the phone app: Settings → Plan and billing, and the pricing screen (route /pricing, from Home and Settings)
```

Data flow, as everywhere: `component → queries.ts → api-client → /api/v1/billing → service → repository → PostgreSQL`.

## Data and security

- `billing_plans` — readable by signed-in users where `active`; **no** write policy, and insert/update/delete are revoked from `authenticated`.
- `user_billing` — a person reads their own row; **all writes go through the billing service**, which runs as the owner (`withOwner`) after validating the request. A person cannot write their own plan (a DB test proves it).
- `ai_usage` — a person reads their own rows; only the service inserts.
- `user_ai_keys` — **no access at all** for `authenticated`. Keys are sealed with AES-256-GCM (`keyVault.ts`): the key is derived from `BETTER_AUTH_SECRET` with HKDF and the user id is bound in as associated data, so a copied row can't be opened as someone else's. The browser only ever receives the last four characters. Rotating `BETTER_AUTH_SECRET` makes saved keys unreadable; people are asked to enter theirs again (`aiAccessFor` says so).
- **The own-key provider can only reach a fixed list of hosts** (`BYO_PROVIDERS` in `packages/logic/src/billing.ts`). The address is never taken from user input, so it cannot be used to make the server call an internal address. Adding a provider means adding a line to that list (it must speak the OpenAI chat-completions format), nothing else.
- Provider error bodies are never passed on (they can echo the request or the key). Never log keys, prompts or answers.
- Admin changes call `assertAdmin()` first and write `admin_audit` (`plan.update`, `plan.assign`, `plan.clear`). Admins see counts and token totals only.

## Admin → Plans

`/admin/plans`: one form per plan (name, tagline, price, currency, billing interval, tokens included, price per 1M tokens, feature lines, visible, order), counts of people per plan, tokens in the last 30 days, and a subscriber table where an admin can move a person to another plan or off all plans (support, or people who pay outside the app). Prices are typed in major units and converted to cents in `PlansEditor.tsx`, the only place that converts. Saving also revalidates `/pricing`.

## Payments: Razorpay autopay (rupees only)

A **Subscription** is a Razorpay Subscription, i.e. **autopay**: the person approves a mandate once (UPI AutoPay, card or e-mandate) and each period is charged on its own. Amounts are INR only (`billing_plans.currency` accepts only `inr`). Pay as you go is **not** charged through Razorpay yet (usage is metered and priced, but there is no invoicing job); Bring your own key never charges.

**Switching it on:** set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (server only, `.env.example`) and `FEATURES.payments` (true). Payments are live only when all three secrets exist (`paymentsLive()`); otherwise plan changes are free and recorded, as before. In the Razorpay dashboard add a webhook to `https://<site>/api/webhooks/razorpay` with the same secret and the events listed in `.env.example`.

**Flow**
1. `POST /api/v1/billing/checkout {planId}` → `startCheckout`: creates (or reuses) a Razorpay plan for the current price (`razorpay_plan_key` = `amount:inr:interval`, so an admin price change makes a new one), creates the subscription with `notes.user_id`, returns what the checkout window needs.
2. The browser opens Razorpay Checkout (`features/billing/razorpay.ts`). On success it calls `POST /api/v1/billing/confirm` → `confirmCheckout`: verifies the HMAC signature (`payment_id|subscription_id` with the key secret), fetches the subscription from Razorpay, checks `notes.user_id` is the caller, then activates. A forged call can't grant a plan.
3. **The webhook does the rest**, and is the source of truth for renewals and endings. `/api/webhooks/razorpay` checks `X-Razorpay-Signature` over the raw body before parsing, refuses events older than 2 days, and `handleWebhook` claims `X-Razorpay-Event-Id` in `billing_events` (retries and concurrent deliveries run once; a failure releases the claim so Razorpay's retry runs). Handlers set absolute state and never move a period backwards. `subscription.activated|charged` start or renew, `pending`/`payment.failed` only note the status (Razorpay retries the charge), `halted|cancelled|completed|expired` end the plan.
4. **Cancel** → Razorpay `cancel_at_cycle_end`, the plan runs to the end of the paid period. Razorpay can't undo it, so **Resume** is refused for a paid plan (subscribe again afterwards). Moving to another plan cancels the subscription at once. `settled()` never renews a Razorpay-managed plan from our own clock.
5. **The phone app** uses Razorpay's native SDK (`react-native-razorpay`, `apps/mobile/src/features/billing/checkout.ts`) against the same `checkout` and `confirm` endpoints, so the rules are identical. It is a native module: the app needs a new native build (not Expo Go); in Expo Go the button explains this instead of crashing. `needsCheckout` lives in `packages/logic/src/billing.ts` and is shared.

Code: `server/providers/payments/razorpay.ts` (REST + signatures, no SDK), `billing.service.ts` (`startCheckout`, `confirmCheckout`, `handleWebhook`), `app/api/webhooks/razorpay/route.ts`, migration `20261111180000_razorpay_payments.sql`. Test with `rzp_test_` keys and Razorpay's test UPI/cards; tests in `tests/unit/razorpay.test.ts`.

## Changing things

| I want to…                         | Do this                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Change a price, allowance or text  | Admin → Plans. No deploy.                                                                                  |
| Add a plan                         | New migration (extend the `id` check and seed it), `PlanId` in `packages/types`, the schema enum, then the rules in `billing.service.ts`. |
| Add an own-key provider            | One line in `BYO_PROVIDERS`.                                                                               |
| Add another AI entry point         | Call `aiAccessFor(userId)` first and `access.record(...)` after, as `chat.ts` and `noteAssist.ts` do. Never call a provider without it. |
| Change a rule                      | `billing.service.ts`, then `tests/db/billing.test.ts`.                                                     |

## Tests

`apps/web/tests/unit/billing.test.ts` (schemas, key vault), `packages/logic/src/billing.test.ts` (money, tokens, dates), and `apps/web/tests/db/billing.test.ts` (plans, rollover, metering, allowance, own key, row-level security) — run the last with `corepack pnpm test:db`.

## Deploying

The migration must be applied to the production database **before** the new web code is live (see `docs/RELEASE_FOR_AGENTS.md` §5). It only adds tables, so the previous app version keeps working.
