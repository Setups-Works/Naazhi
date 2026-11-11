-- A task's date range stays valid by itself: when the end date is cleared or moved before the start, or the task starts repeating,
-- the start date is dropped (the task becomes a single-day task) instead of the change being refused.

create or replace function public.tasks_normalise_range() returns trigger language plpgsql as $$
begin
  if new.start_date is not null and (new.due_date is null or new.start_date > new.due_date or new.recurrence is not null) then
    new.start_date := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_normalise_range on public.tasks;
create trigger tasks_normalise_range before insert or update on public.tasks
  for each row execute function public.tasks_normalise_range();
