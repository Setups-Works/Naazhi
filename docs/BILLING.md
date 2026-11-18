# Plans and billing

**Read this when** you touch plans, prices, AI access, the Plan and billing tab, the admin Plans page or the pricing page. Everything below is built. **Razorpay takes every payment.** The person’s country decides the currency: India pays in rupees, every other country in US dollars ([Country-based billing](#country-based-billing-rupees-or-dollars-both-through-razorpay)). Stripe was removed in migration `20261118100000_razorpay_international.sql`.

## Country-based billing (rupees or dollars, both through Razorpay)

**The rule, in one place:** `billingRegion(country)` in `packages/logic/src/countries.ts`. India (`IN`) → **INR**; any other country → **USD**; the provider is always **Razorpay**. No country saved (every account from before this existed) or an unknown code → treated as India. Web, the phone app and the server all call it; nothing else compares a country to "IN".

**Where the country lives:** `profiles.country` (migration `20261116100000_country_billing.sql`). It is asked on the **About** screen of onboarding (web and app; required) and can be changed in Settings → Plan and billing (`POST /api/v1/billing/country`, `setCountry`).

**Controlled changes.** Moving between rupees and dollars is refused while the person has an active paid subscription (it bills in one currency, `user_billing.currency`) or AI credit held in the other currency (`user_ai_credit.currency`). Changing to a country in the same currency is always allowed. Independent of that, `regionFor()` in `billing.service.ts` makes an existing subscriber keep their subscription’s currency, and a balance keep its currency, even if `profiles.country` is edited directly. Support can clear a stuck case with **Adjust** (zero the credit) and by cancelling the subscription.

**Prices.** Each plan has a rupee price and a dollar price (`price_cents`, `price_cents_usd`, `token_price_cents_per_million`, `…_usd`), both edited in Admin → Plans. `plansFor(plans, currency)` / `localizePlan` (packages/logic) give each person plans already in their currency, so the pricing page, Settings and the app print `price_cents` + `currency` as before. A paid plan with a dollar price of 0 is **not offered in dollars** (never shown as free). The migration seeds placeholders ($9 a month, $2.40 per 1M tokens): review them in Admin → Plans. Top-up limits have their own dollar columns (default $5 to $500, quick amounts $10/25/50/100).

**Dollar payments through Razorpay** (same code as rupees, see [Payments](#payments-razorpay-autopay)):
1. Switch on **international payments** in the Razorpay dashboard (Account & Settings → International payments). Razorpay settles dollar payments to your account in rupees.
2. A subscription uses a Razorpay plan in USD. Rupee and dollar prices each have their own cached Razorpay plan (`billing_plans.razorpay_plan_id/_key` and `razorpay_plan_id_usd/_key_usd`; the key is `amount:currency:interval`, so a price change makes a new plan). The subscription’s `notes.currency` records the currency so webhooks set `user_billing.currency` without another call.
3. A top-up is a Razorpay order in USD (amount in cents). Captured payments are accepted only in `INR` or `USD`, credited in that currency, and invoiced in it; a payment in a different currency from a non-zero balance is refused by `applyCredit` and not credited.
4. Refunds go through Razorpay in the payment’s own currency.
5. **Usage in dollars** is charged with a carried fraction (`chargeUsageCarry`), not rounded up per reply, because a reply costs far less than a cent.
6. **Tax.** No tax is added; prices are described as tax-exclusive on the invoice and pricing page. The seller block on invoices (Admin → Plans → Invoice details) should carry the tax id.

**Old Stripe data.** Columns `user_billing.provider` / `billing_invoices.provider` still accept `stripe`, and `stripe_customers` / `billing_plans.stripe_product_id` stay, so history is kept. A subscription started through Stripe can’t be changed from the app (cancel, switch or subscribe again say "contact support"), and a Stripe invoice can’t be refunded from Admin → Invoices: do both in the Stripe dashboard, then clear the person’s plan in Admin → Plans.

**Tests:** `packages/logic/src/countries.test.ts` (country → currency, provider always Razorpay), `packages/logic/src/billing.test.ts` (price selection, dollar top-up limits), `apps/web/tests/unit/razorpay.test.ts`. Test dollar payments with `rzp_test_` keys and Razorpay’s international test cards.

**Desktop:** the shell loads the web app, so it pays exactly like web. Razorpay’s card-check (3-D Secure) and net-banking popups open as a sandboxed child window instead of the system browser, so the payment can report back (`isPaymentPopup`, `apps/desktop/src/main/window.ts`).

**Not built:** other currencies, Apple/Google in-app purchase rules for the phone app (check the store policies before shipping paid digital plans in the app).

## The three plans

| Plan (`id`)                | Who pays for AI                | Fee                                                       | Metering                                                 |
| -------------------------- | ------------------------------ | --------------------------------------------------------- | -------------------------------------------------------- |
| Subscription (`subscription`) | us, up to a monthly allowance | `price_cents` per `interval` (month or year)              | Tokens counted; blocked once `included_tokens` is used up |
| Pay as you go (`payg`)     | us, billed after use           | none                                                      | Tokens counted and priced at `token_price_cents_per_million` |
| Bring your own key (`byo`) | the person, directly to their provider | none                                              | Never counted; the person's key is used                  |

A person with **no plan** (never chosen, or ended) gets **no AI on our key**: `aiAccessFor` refuses with `NO_PLAN` ("Choose a plan to use Naazhi’s AI…"). The rest of the workspace works without a plan. Models the person connected themselves in the model picker (their own API key, their ChatGPT sign-in) and Puter.js (their own Puter account, in the browser) are paid by them and keep working without a plan.

**Nothing here is hard-coded.** Prices, allowances, the token rate, names, taglines, feature lines, order and availability all live in `billing_plans` and are edited in **Admin → Plans**. The pricing page, Settings and the phone app read the same rows. The seed values in the migration are placeholders in rupees (₹749 a month, ₹150 per 1M tokens), not announced prices. Amounts are stored in paise (the smallest unit); ``formatMoney`` formats them (`en-IN` for INR). The only things in code are the three plan ids (also a check constraint) and the list of own-key providers.

## Rules (all in `services/billing/billing.service.ts`)

- **Choose or switch:** takes effect at once. A subscription gets a period (`period_start` → `period_end`, one month or one year per `interval`); the other plans have no period.
- **Cancel:** a subscription sets `cancel_at_period_end` and runs to the end of its period; `pay as you go` and `byo` stop immediately (`status = 'canceled'`). **Resume** clears `cancel_at_period_end`.
- **Rollover:** a period that has ended is settled the next time anything reads the person's billing (`settled()`): a cancelled subscription lapses, anything else renews for the next period. There is no cron job; keep it that way unless a payment provider needs one.
- **AI access** (`aiAccessFor(userId)`) runs before every AI request and either returns how to answer it or throws a friendly `ForbiddenError`:
  - no active plan → "Choose a plan to use Naazhi’s AI…".
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

## Admin → Plans (what an admin can change)

- **Each plan:** name, tagline, price (₹), billing interval, tokens included, **token price per 1M tokens** (the form shows it as "= ₹X per 100 tokens"), features, visible, order. A new subscription price applies to people who subscribe from then on (a Razorpay plan is created for the new amount); current subscribers keep their price until they subscribe again. A new token price applies to AI used from then on.
- **AI credit top-ups** (Pay as you go): the smallest and largest top-up and up to six quick amounts, in whole rupees (`billing_settings`, migration `20261111210000_billing_settings.sql`; the Top up dialog, the pricing page and the server all read them; `TOPUP` in `packages/logic/src/billing.ts` is only the default). A payment already made is credited whatever the limits are now.
- **Per person:** the subscriber table shows each person's AI credit and an **Adjust** button (add or remove rupees, written to their ledger as an `adjust` line and to the admin audit as `credit.adjust`).
- **Payments strip:** whether Razorpay is live, which keys are set, and test vs live mode (from the key id's prefix). Never the secrets.
- Every change is audited (`plan.update`, `billing.settings`, `credit.adjust`, `plan.assign`).

## Admin → Plans (details)

`/admin/plans`: one form per plan (name, tagline, price, currency, billing interval, tokens included, price per 1M tokens, feature lines, visible, order), counts of people per plan, tokens in the last 30 days, and a subscriber table where an admin can move a person to another plan or off all plans (support, or people who pay outside the app). Prices are typed in major units and converted to cents in `PlansEditor.tsx`, the only place that converts. Saving also revalidates `/pricing`.

## Free trial (Subscription)

- **Admin → Plans → Subscription → Free trial (days)** (`billing_plans.trial_days`, 0 to 90; 0 = no trial). Seeded to 7. A change applies to people who subscribe from then on; the pricing page, Settings, the setup plan step and the phone app all read it, so they say "7 days free, then ₹749 / month" and "Start 7-day free trial" (`trialLine`, `trialButtonLabel` in `packages/logic/src/billing.ts`).
- **How it is charged:** `startCheckout` creates the Razorpay subscription with `start_at` = now + trial days, so the first charge is pushed back. Razorpay still takes a small refundable check (about ₹5) when the person approves autopay; that is not a charge and gets no invoice. The real first payment, and its invoice, arrive through the `subscription.charged` webhook when the trial ends.
- **One per person, ever:** `billing_trials` records who has had it. It is written when the trial **starts** (`confirmCheckout`), not when checkout opens, so closing the window does not use it up. `MyBilling.trial_available` tells the screens whether to offer it.
- **State during a trial:** `user_billing.trial_ends_at` is the day the first payment is taken; `period_end` is the same day, so AI works with the full allowance until then. `getMyBilling` returns `trial_ends_at` only while it is in the future.
- **Cancel during a trial:** Razorpay can only cancel a subscription that has not started charging immediately, so `cancelPlan` cancels it at once and sets `cancel_at_period_end`; the person keeps the plan until the trial ends and is never charged. The `subscription.cancelled` webhook does not cut that short (`applySubscription`).
- **Prefilled payment window:** setup asks for a mobile number (`normalizePhone` in `packages/logic/src/billing.ts` turns `98765 43210` into `+919876543210`); it is saved in `profiles.phone` and `startCheckout` / `startTopup` send it, with the name and email, as Razorpay's `prefill`. Razorpay decides whether to show it filled in.
- Test with `rzp_test_` keys; check the checkout opens for the small check amount, not the full price.

## Payments: Razorpay autopay

A **Subscription** is a Razorpay Subscription, i.e. **autopay**: the person approves a mandate once (UPI AutoPay, card or e-mandate in India; card for US dollars) and each period is charged on its own, in rupees or US dollars per the person’s country. Pay as you go is **not** charged through Razorpay yet (usage is metered and priced, but there is no invoicing job); Bring your own key never charges.

**Switching it on:** set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (server only, `.env.example`) and `FEATURES.payments` (true). Payments are live only when all three secrets exist (`paymentsLive()`); otherwise plan changes are free and recorded, as before. In the Razorpay dashboard add a webhook to `https://<site>/api/webhooks/razorpay` with the same secret and the events listed in `.env.example`.

**Flow**
1. `POST /api/v1/billing/checkout {planId}` → `startCheckout`: creates (or reuses) a Razorpay plan for the current price in the person’s currency (`razorpay_plan_key` = `amount:currency:interval`, so an admin price change makes a new one), creates the subscription with `notes.user_id` and `notes.currency`, returns what the checkout window needs.
2. The browser opens Razorpay Checkout (`features/billing/razorpay.ts`). On success it calls `POST /api/v1/billing/confirm` → `confirmCheckout`: verifies the HMAC signature (`payment_id|subscription_id` with the key secret), fetches the subscription from Razorpay, checks `notes.user_id` is the caller, then activates. A forged call can't grant a plan.
3. **The webhook does the rest**, and is the source of truth for renewals and endings. `/api/webhooks/razorpay` checks `X-Razorpay-Signature` over the raw body before parsing, refuses events older than 2 days, and `handleWebhook` claims `X-Razorpay-Event-Id` in `billing_events` (retries and concurrent deliveries run once; a failure releases the claim so Razorpay's retry runs). Handlers set absolute state and never move a period backwards. `subscription.activated|charged` start or renew, `pending`/`payment.failed` only note the status (Razorpay retries the charge), `halted|cancelled|completed|expired` end the plan.
4. **Cancel** → Razorpay `cancel_at_cycle_end`, the plan runs to the end of the paid period. Razorpay can't undo it, so **Resume** is refused for a paid plan (subscribe again afterwards). Moving to another plan cancels the subscription at once. `settled()` never renews a Razorpay-managed plan from our own clock.
5. **The phone app** uses Razorpay's native SDK (`react-native-razorpay`, `apps/mobile/src/features/billing/checkout.ts`) against the same `checkout` and `confirm` endpoints, so the rules are identical. It is a native module: the app needs a new native build (not Expo Go); in Expo Go the button explains this instead of crashing. `needsCheckout` lives in `packages/logic/src/billing.ts` and is shared.

Code: `server/providers/payments/razorpay.ts` (REST + signatures, no SDK), `billing.service.ts` (`startCheckout`, `confirmCheckout`, `handleWebhook`), `app/api/webhooks/razorpay/route.ts`, migration `20261111180000_razorpay_payments.sql`. Test with `rzp_test_` keys and Razorpay's test UPI/cards; tests in `tests/unit/razorpay.test.ts`.

## Pay as you go: prepaid AI credit (rupees)

Pay as you go is always **prepaid** (live payments or not): the person tops up their **AI balance** in rupees and every reply takes its token cost off it. The stated rate is **100 tokens = ₹0.02** (₹200 per million, `billing_plans.token_price_cents_per_million = 20000`, editable in Admin → Plans). Cost is `ceil(tokens × rate / 1M)` paise per reply (`tokenCostCents`), so a tiny reply is never free.

- **Top up** (`POST /api/v1/billing/topup`, then `/topup/confirm`): ₹50 minimum, ₹10,000 maximum, whole rupees (`TOPUP` and `validTopup` in `packages/logic/src/billing.ts`, used by the dialog and the server). The server creates a Razorpay **order** with `notes {user_id, kind: "topup"}`; the browser or app opens Razorpay; on success the server verifies the signature (`order_id|payment_id`), asks Razorpay for the payment (captured, INR, `kind = topup`, same person) and adds it to the balance. The `payment.captured` webhook does the same, so a closed tab still gets credited. The ledger's unique Razorpay payment id means it is added **once**, whichever path arrives first.
- **Using it:** `aiAccessFor` refuses Pay as you go AI at a zero balance ("You’re out of AI credit…"); `record()` writes the usage row and a negative ledger line. A long reply can take the balance a little below zero; the next request is refused until the person tops up. Plans other than Pay as you go ignore the balance. This holds before payments are live too: with no balance AI is refused, and an admin adds credit with **Adjust** until top-ups open.
- **Where:** `user_ai_credit` (balance) and `ai_credit_ledger` (top-up, usage, adjust lines) from migration `20261111200000_ai_credit.sql`; people may read their own rows, only the service writes. UI: the **AI balance** card and **Top up** dialog in Settings → Plan and billing (`features/billing/TopUpDialog.tsx`), the Plan step of onboarding, and the phone app's Plan and billing section (native Razorpay).
- Webhook events to enable in Razorpay for this: `payment.captured` (plus the subscription ones).
- Not built: refunds and balance expiry (an admin correction is an `adjust` ledger line), and a ledger list in the UI.

## Invoices, billing history and emails

- **An invoice is made for every payment taken**, once per Razorpay payment (`billing_invoices.provider_payment_id` is unique): the moment checkout finishes for a subscription’s first charge (`confirmCheckout`, so a missing or late webhook can’t leave a payment without an invoice), the `subscription.charged` webhook for every renewal (and the first charge, if it got there first), and the moment a top-up is verified and credited. Numbers are `NZ-<year>-<6 digits>` from a sequence. People read only their own invoices (row-level security); the service writes them (migration `20261111220000_invoices.sql`). Deleting an account deletes its invoices.
- **Billing history** is the list in Settings → Plans & billing (`features/billing/BillingHistory.tsx`, `GET /api/v1/billing/invoices`). Each row opens the printable invoice at `/invoice/<id>` (signed in, owner only, "Print or save as PDF").
- **No tax is calculated.** An invoice shows the amount paid. The From block (business name, address, tax or GST id) and footer come from **Admin → Plans → Invoice details**; have an accountant check the layout before relying on it for tax purposes.
- **Emails:** one layout (`server/email/render.ts`) and one catalogue of templates (`server/email/templates.ts`) cover every email: confirm email, password reset link and code, email change, shared journal invitation, the **receipt** (sent with each invoice), **payment failed**, **subscription ended** and **AI credit finished** (sent once, when a reply uses the last of the balance). A mail problem never fails a payment, and `sendEmail` logs `[mail] send failed` (error codes only, never the address or content) or `[mail] SMTP_URL is not set` so an operator can see why nothing arrives; production needs `SMTP_URL` (and `MAIL_FROM`) in the Azure app settings. Admin → Emails previews every template with example data.
- **Refunds** (Admin → Invoices, migration `20261111230000_refunds.sql`): an admin refunds an invoice in full or in part through Razorpay (`refundInvoice`). The invoice then shows what was returned (`partially_refunded` → `refunded`), the person is emailed, and **a refunded credit top-up comes off their AI balance**. A top-up can only be refunded up to what is still unspent, so the balance never goes negative. Each Razorpay refund id is recorded once (`billing_refunds`), so the admin's refund and Razorpay's `refund.processed` webhook (also for a refund made in Razorpay's own dashboard) apply exactly once. Add `refund.processed` to the webhook events. Refunding a subscription charge returns the money but does **not** cancel the subscription: cancel it separately.
- **Phone app:** Settings → Plan and billing lists the billing history; "Invoice" asks for a ten-minute signed link (`POST /api/v1/billing/invoices/<id>/link`) and opens the invoice in the browser, because the phone has no web sign-in to carry over. The link opens only that invoice, for that person.
- Not built: credit notes, and a refund button for the person themselves (refunds follow the refund policy and go through an admin).

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
