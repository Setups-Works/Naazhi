-- A postal address for each person (Settings -> Profile), used to fill in invoices and payment windows.
-- The country is not here: it already lives in profiles.country and is changed through the billing service, which decides currency.
alter table public.profiles
  add column if not exists address_line1 text check (address_line1 is null or char_length(address_line1) <= 120),
  add column if not exists address_line2 text check (address_line2 is null or char_length(address_line2) <= 120),
  add column if not exists city text check (city is null or char_length(city) <= 80),
  add column if not exists region text check (region is null or char_length(region) <= 80),
  add column if not exists postal_code text check (postal_code is null or char_length(postal_code) <= 20);
grant update (address_line1, address_line2, city, region, postal_code) on public.profiles to authenticated;
