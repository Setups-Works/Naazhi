-- Sub-tasks: the policy added in 20261111130000 looked the parent up in `tasks` from inside a policy on `tasks`, which Postgres rejects
-- ("infinite recursion detected in policy"). The ownership check moves into a function that runs without row-level security; it can only
-- answer "is this task mine?" for the signed-in person, so it leaks nothing.

create or replace function public.owns_task(tid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tasks where id = tid and user_id = auth.uid())
$$;
revoke all on function public.owns_task(uuid) from public;
grant execute on function public.owns_task(uuid) to authenticated;

drop policy if exists "owner all" on public.tasks;
create policy "owner all" on public.tasks for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and (list_id is null or exists (select 1 from public.task_lists l where l.id = list_id and l.user_id = auth.uid()))
    and (parent_id is null or (parent_id <> id and public.owns_task(parent_id)))
  );
