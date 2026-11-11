-- Prepaid AI credit for the Pay as you go plan. A person tops up in rupees (a Razorpay payment); every AI reply then takes its token cost
-- off the balance, and AI pauses at zero. Amounts are in paise (the smallest unit), like everywhere in billing.
-- People read their own rows; every change goes through the billing service (the owner role), which has verified it first.

create table if not exists public.user_ai_credit (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_cents bigint not null default 0,
  updated_at timestamptz not null default now()
);

-- One row per movement of the balance: a top-up (+), tokens used (−) or an admin correction. `ref` is the Razorpay payment id for a
-- top-up, which is unique so the browser's "payment done" call and the webhook can both arrive and the money is added once.
create table if not exists public.ai_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('topup', 'usage', 'adjust')),
  amount_cents bigint not null,
  tokens bigint,
  ref text unique,
  created_at timestamptz not null default now()
);
create index if not exists ai_credit_ledger_user_idx on public.ai_credit_ledger (user_id, created_at desc);

alter table public.user_ai_credit enable row level security;
alter table public.ai_credit_ledger enable row level security;
create policy user_ai_credit_read on public.user_ai_credit for select to authenticated using (user_id = auth.uid());
create policy ai_credit_ledger_read on public.ai_credit_ledger for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.user_ai_credit from authenticated;
revoke insert, update, delete on public.ai_credit_ledger from authenticated;

-- The rate the product states: 100 tokens cost ₹0.02, i.e. ₹200 (20000 paise) per million tokens. Only moves the old placeholder; an
-- admin's own price (Admin → Plans) is left alone.
update public.billing_plans set token_price_cents_per_million = 20000 where id = 'payg' and token_price_cents_per_million = 15000;
update public.billing_plans set tagline = 'No monthly fee. Top up credit and pay only for the AI you use.',
  features = array['No monthly fee', 'Top up from ₹50; tokens come off your balance', 'AI pauses at zero until you top up', 'Cancel or switch any time']
  where id = 'payg' and tagline = 'No monthly fee. Pay only for the AI you use.';
