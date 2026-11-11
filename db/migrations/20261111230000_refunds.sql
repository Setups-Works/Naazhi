-- Refunds. An invoice can be refunded in full or in part: `refunded_cents` is the total returned so far and `status` follows it
-- (paid → partially_refunded → refunded). Each Razorpay refund is recorded once in `billing_refunds` (its id is the key), so an admin's
-- refund and Razorpay's webhook about the same refund can both arrive and the money is applied once. Owner role only; people see the
-- result on their invoice.

alter table public.billing_invoices add column if not exists refunded_cents bigint not null default 0 check (refunded_cents >= 0);
alter table public.billing_invoices drop constraint if exists billing_invoices_status_check;
alter table public.billing_invoices add constraint billing_invoices_status_check check (status in ('paid', 'partially_refunded', 'refunded'));

create table if not exists public.billing_refunds (
  id text primary key,
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  created_at timestamptz not null default now()
);
create index if not exists billing_refunds_invoice_idx on public.billing_refunds (invoice_id);
alter table public.billing_refunds enable row level security;
revoke all on public.billing_refunds from authenticated;
