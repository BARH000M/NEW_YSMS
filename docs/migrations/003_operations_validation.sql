-- 003 — validation. Read-only checks; run after the forward migration.

-- 1. Tables exist with RLS enabled
select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('call_logs', 'expenses', 'assignments', 'online_courses')
order by c.relname;

-- 2. Policy coverage per new table
select tablename, count(*) as policies, string_agg(cmd, ', ' order by cmd) as commands
from pg_policies
where schemaname = 'public'
  and tablename in ('call_logs', 'expenses', 'assignments', 'online_courses')
group by tablename
order by tablename;

-- 3. Outgoing foreign keys are valid (no orphans)
select conname, confrelid::regclass as references_table, convalidated
from pg_constraint
where conrelid in ('public.call_logs'::regclass, 'public.expenses'::regclass,
                   'public.assignments'::regclass, 'public.online_courses'::regclass)
  and contype = 'f'
order by conname;

-- 4. Seed counts
select 'call_logs' as table_name, count(*) from public.call_logs
union all select 'expenses', count(*) from public.expenses
union all select 'assignments', count(*) from public.assignments
union all select 'online_courses', count(*) from public.online_courses;