-- Country-based billing. A person's country decides how they pay: India in rupees through Razorpay, every other country in US dollars
-- through Stripe. The rule itself lives in code (packages/logic/src/countries.ts); this migration only stores what it needs.

-- 1. The person's country, an ISO 3166-1 alpha-2 code asked for during setup. Null = never chosen (every account made before this
--    existed), which is billed as India, the way those accounts always were. They read and edit their own row like the other profile
--    fields; the billing service refuses a change that would strand a paid plan or credit in another currency.
alter table public.profiles add column if not exists country text
  check (country is null or country ~ '^[A-Z]{2}$');
grant update (country) on public.profiles to authenticated;

-- 2. Dollar prices next to the rupee ones, both edited in Admin → Plans. 0 on a paid plan means "not offered in dollars yet".
--    The seed values are placeholders (about the rupee price at ₹83 to the dollar), not announced prices: review them in Admin → Plans.
alter table public.billing_plans add column if not exists price_cents_usd integer not null default 0 check (price_cents_usd >= 0);
alter table public.billing_plans add column if not exists token_price_cents_per_million_usd integer not null default 0 check (token_price_cents_per_million_usd >= 0);
update public.billing_plans set price_cents_usd = 900 where id = 'subscription' and price_cents > 0 and price_cents_usd = 0;
update public.billing_plans set token_price_cents_per_million_usd = 240 where id = 'payg' and token_price_cents_per_million > 0 and token_price_cents_per_million_usd = 0;

-- 3. Top-up limits in dollars (cents), beside the rupee ones.
alter table public.billing_settings add column if not exists topup_min_cents_usd integer not null default 500
  check (topup_min_cents_usd >= 100 and topup_min_cents_usd % 100 = 0);
alter table public.billing_settings add column if not exists topup_max_cents_usd integer not null default 50000
  check (topup_max_cents_usd >= topup_min_cents_usd and topup_max_cents_usd % 100 = 0);
alter table public.billing_settings add column if not exists topup_options_cents_usd integer[] not null default '{1000,2500,5000,10000}';

-- 4. Who takes a person's payments. The subscription id column holds Razorpay's id or Stripe's, so the provider says which.
alter table public.user_billing add column if not exists provider text not null default 'razorpay' check (provider in ('razorpay', 'stripe'));
alter table public.billing_invoices add column if not exists provider text not null default 'razorpay' check (provider in ('razorpay', 'stripe'));

-- 5. The unit of the AI balance. The balance is in the person's currency (paise or cents); the currency is recorded so the two can never be
--    added together. The service only changes it when the balance is zero.
alter table public.user_ai_credit add column if not exists currency text not null default 'inr' check (currency in ('inr', 'usd'));
-- Dollar replies cost a fraction of a cent, so the part-cent is carried here (millionths of a cent) and charged once it adds up,
-- instead of rounding every reply up to a whole cent. Rupee credit keeps its round-up-to-a-paisa rule and never uses this.
alter table public.user_ai_credit add column if not exists pending_micro bigint not null default 0 check (pending_micro >= 0);
