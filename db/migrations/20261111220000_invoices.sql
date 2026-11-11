-- Invoices for every payment taken (subscription charges and AI credit top-ups) and the seller details printed on them.
-- One invoice per Razorpay payment (`provider_payment_id` is unique, so a webhook retry or the browser's "payment done" call can't make a
-- second one). People read their own invoices; only the billing service (the owner role) writes them. Deleting an account deletes its
-- invoices with it. No tax is computed here: the amount is what was paid, and the seller's tax id (if any) is whatever an admin sets.

create sequence if not exists public.billing_invoice_seq;

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('subscription', 'topup')),
  description text not null,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'inr',
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  provider text not null default 'razorpay',
  provider_payment_id text not null unique,
  -- The Razorpay subscription or order the payment belongs to.
  provider_ref text,
  period_start timestamptz,
  period_end timestamptz,
  bill_to_name text not null default '',
  bill_to_email text not null default '',
  issued_at timestamptz not null default now()
);
create index if not exists billing_invoices_user_idx on public.billing_invoices (user_id, issued_at desc);
alter table public.billing_invoices enable row level security;
create policy billing_invoices_read on public.billing_invoices for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.billing_invoices from authenticated;

alter table public.billing_settings add column if not exists seller_name text not null default '';
alter table public.billing_settings add column if not exists seller_address text not null default '';
alter table public.billing_settings add column if not exists seller_tax_id text not null default '';
alter table public.billing_settings add column if not exists invoice_footer text not null default '';
