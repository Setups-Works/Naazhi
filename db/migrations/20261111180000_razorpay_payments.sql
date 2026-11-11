-- Razorpay payments. A subscription is a Razorpay Subscription: we remember its id on the person's billing row, and a signed webhook
-- (never the browser) is what renews and ends it. Nothing here is writable by signed-in users; the billing service runs as the owner.

-- The Razorpay plan that matches this plan's price. `razorpay_plan_key` is "amount:currency:interval" at the time it was created,
-- so changing the price in Admin → Plans makes the service create a fresh Razorpay plan instead of charging the old amount.
alter table public.billing_plans add column if not exists razorpay_plan_id text;
alter table public.billing_plans add column if not exists razorpay_plan_key text;

alter table public.user_billing add column if not exists provider_subscription_id text;
alter table public.user_billing add column if not exists provider_status text;
create unique index if not exists user_billing_provider_subscription_idx
  on public.user_billing (provider_subscription_id) where provider_subscription_id is not null;

-- Webhook events already handled (Razorpay retries), keyed by Razorpay's event id. Only the owner role touches it.
create table if not exists public.billing_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from authenticated;

