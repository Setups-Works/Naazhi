-- Free trial for the Subscription plan. `trial_days` is edited in Admin → Plans (0 = no trial). A person gets one trial, ever:
-- `billing_trials` remembers who has used it, so cancelling and subscribing again does not give another. While someone is on a
-- trial, `user_billing.trial_ends_at` says when the first payment is taken.
alter table public.billing_plans add column if not exists trial_days integer not null default 0 check (trial_days between 0 and 90);
update public.billing_plans set trial_days = 7 where id = 'subscription' and trial_days = 0;

alter table public.user_billing add column if not exists trial_ends_at timestamptz;

create table if not exists public.billing_trials (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null,
  provider_subscription_id text,
  used_at timestamptz not null default now()
);
alter table public.billing_trials enable row level security;
drop policy if exists "owner read" on public.billing_trials;
create policy "owner read" on public.billing_trials for select to authenticated using (user_id = auth.uid());
-- Only the billing service (as the owner) records a trial; a person can't clear their own.
revoke insert, update, delete on public.billing_trials from authenticated;
