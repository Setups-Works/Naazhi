-- Razorpay now takes every payment: rupees from India, US dollars from every other country (Razorpay international payments).
-- Stripe is no longer used for new payments. Its columns and the stripe_customers table stay as they are, so old invoices and any
-- subscription started through Stripe keep their history; nothing is dropped.

-- 1. A second cached Razorpay plan per plan, for the dollar price. A Razorpay plan has one amount and one currency, so the rupee and the
--    dollar price each need their own. The key is "amount:usd:interval" at the time it was made, like razorpay_plan_key for rupees.
alter table public.billing_plans add column if not exists razorpay_plan_id_usd text;
alter table public.billing_plans add column if not exists razorpay_plan_key_usd text;

-- 2. The currency a person's subscription bills in. The provider no longer tells rupees from dollars (Razorpay does both), and a running
--    subscription must keep its currency even if the person edits their country. Existing Stripe subscriptions were in dollars.
alter table public.user_billing add column if not exists currency text not null default 'inr' check (currency in ('inr', 'usd'));
update public.user_billing set currency = 'usd' where provider = 'stripe' and currency <> 'usd';
