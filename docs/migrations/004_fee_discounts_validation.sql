-- =====================================================================
-- Validation for migration 004. Read-only — safe to run at any time.
-- =====================================================================

-- 1. Both tables exist with RLS enabled.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('fee_discounts', 'fee_discount_allotments')
order by c.relname;

-- 2. Policy count per table (expect 3 on fee_discounts, 3 on allotments).
select tablename, count(*) as policies
from pg_policies
where schemaname = 'public'
  and tablename in ('fee_discounts', 'fee_discount_allotments')
group by tablename
order by tablename;

-- 3. Seed rows landed.
select count(*) as discounts, count(*) filter (where is_active) as active_discounts
from public.fee_discounts;

-- 4. Orphan sweep — must both return 0.
select count(*) as orphan_discounts
from public.fee_discount_allotments a
left join public.fee_discounts d on d.id = a.discount_id
where d.id is null;

select count(*) as orphan_students
from public.fee_discount_allotments a
left join public.students s on s.id = a.student_id
where s.id is null;

-- 5. Foreign keys attached to the new tables.
select conrelid::regclass::text as table_name, conname, confrelid::regclass::text as references
from pg_constraint
where conrelid in ('public.fee_discounts'::regclass, 'public.fee_discount_allotments'::regclass)
  and contype = 'f'
order by 1, 2;