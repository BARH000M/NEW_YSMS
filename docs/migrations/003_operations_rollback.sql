-- 003 — rollback. Drops only the four tables created by 003.
-- Nothing created by migration 001 or 002 is touched.

drop table if exists public.online_courses;
drop table if exists public.assignments;
drop table if exists public.expenses;
drop table if exists public.call_logs;