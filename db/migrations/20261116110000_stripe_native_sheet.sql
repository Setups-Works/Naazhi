-- Stripe in the phone app uses Stripe's native payment sheet, which needs a Stripe customer for the person and a Stripe product for
-- each plan (a subscription's price must point at a product; Checkout pages could send the product inline, the sheet's subscription can't).

-- One Stripe customer per person. Only the billing service reads or writes it (owner connection); people have no access.
create table if not exists public.stripe_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  customer_id text not null unique,
  created_at timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
revoke all on public.stripe_customers from authenticated;

-- The Stripe product that carries a plan's dollar prices; created on first use.
alter table public.billing_plans add column if not exists stripe_product_id text;
