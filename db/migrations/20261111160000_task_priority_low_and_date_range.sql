-- To-do: a real "Low" priority next to "None", and date ranges.
--
-- Priority was 1 (urgent) to 4, and 4 was both the default and what the app showed as "none". It is now 1 urgent, 2 high, 3 medium,
-- 4 low and 5 none (the default). Every existing 4 was a task nobody had ranked, so it becomes 5.
--
-- Date range: start_date is the first day of a task that spans several days; due_date stays the last day (so "overdue", Today and
-- Upcoming keep working on the end date). A range needs an end date, cannot start after it, and cannot repeat.

do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.tasks'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%priority%'
  loop
    execute format('alter table public.tasks drop constraint %I', c.conname);
  end loop;
end $$;

update public.tasks set priority = 5 where priority = 4;
alter table public.tasks alter column priority set default 5;
alter table public.tasks add constraint tasks_priority_check check (priority between 1 and 5);

alter table public.tasks add column if not exists start_date date;
alter table public.tasks drop constraint if exists tasks_date_range_check;
alter table public.tasks add constraint tasks_date_range_check
  check (start_date is null or (due_date is not null and start_date <= due_date and recurrence is null));
