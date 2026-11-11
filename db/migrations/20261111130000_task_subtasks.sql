-- To-do: sub-tasks. A sub-task is an ordinary task row that points at its parent task; deleting the parent deletes its sub-tasks.

alter table public.tasks
  add column if not exists parent_id uuid references public.tasks(id) on delete cascade;
create index if not exists tasks_parent on public.tasks (parent_id) where parent_id is not null;

-- A task may only point at a list and a parent task the person owns (and never at itself).
drop policy if exists "owner all" on public.tasks;
create policy "owner all" on public.tasks for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (list_id is null or exists (select 1 from public.task_lists l where l.id = list_id and l.user_id = auth.uid()))
    and (parent_id is null or (parent_id <> id and exists (select 1 from public.tasks p where p.id = parent_id and p.user_id = auth.uid())))
  );
