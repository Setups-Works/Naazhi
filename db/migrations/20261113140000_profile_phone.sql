-- A mobile number for each person, asked for during setup so payment windows (Razorpay) open already filled in.
-- Stored in international form (+919876543210). The person reads and edits their own; the check keeps junk out.
alter table public.profiles add column if not exists phone text
  check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
grant update (phone) on public.profiles to authenticated;
