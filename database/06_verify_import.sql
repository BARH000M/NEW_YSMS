-- ============================================================================
--  SAI College — Academic OS
--  06 / 06 — VERIFY AN IMPORT
-- ----------------------------------------------------------------------------
--  Run this AFTER copying real rows into the new project (see DATA-MIGRATION.md).
--  Read-only: every statement below is a SELECT except the optional cleanup at
--  the end, which is commented out on purpose.
--
--  Run the same file against the OLD project first, note the numbers, then run
--  it against the NEW one. Every figure must match.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Row counts, side by side
-- ---------------------------------------------------------------------------
select 'students'              as what, count(*) as rows from public.students
union all select 'enrollments',            count(*) from public.enrollments
union all select 'guardians',              count(*) from public.guardians
union all select 'student_guardians',      count(*) from public.student_guardians
union all select 'student_siblings',       count(*) from public.student_siblings
union all select 'student_profile_extras', count(*) from public.student_profile_extras
union all select 'invoices',               count(*) from public.invoices
union all select 'invoice_items',          count(*) from public.invoice_items
union all select 'payments',               count(*) from public.payments
union all select 'fee_installments',       count(*) from public.fee_installments
union all select 'fee_discount_allotments',count(*) from public.fee_discount_allotments
union all select 'exams',                  count(*) from public.exams
union all select 'exam_subjects',          count(*) from public.exam_subjects
union all select 'exam_results',           count(*) from public.exam_results
union all select 'attendance',             count(*) from public.attendance
union all select 'library_issues',         count(*) from public.library_issues
union all select 'transport_allocations',  count(*) from public.transport_allocations
union all select 'hostel_allocations',     count(*) from public.hostel_allocations
order by what;


-- ---------------------------------------------------------------------------
-- 2. Money must balance, not just counts
-- ---------------------------------------------------------------------------
select (select coalesce(sum(total),  0) from public.invoices)  as invoiced,
       (select coalesce(sum(discount), 0) from public.invoices) as discounts,
       (select coalesce(sum(amount), 0) from public.payments)  as collected,
       (select coalesce(sum(total),  0) from public.invoices)
     - (select coalesce(sum(amount), 0) from public.payments)   as outstanding;


-- ---------------------------------------------------------------------------
-- 3. Money split by status — catches a half-finished import
-- ---------------------------------------------------------------------------
select status,
       count(*)                   as invoices,
       coalesce(sum(total), 0)     as total
  from public.invoices
 group by status
 order by status;


-- ---------------------------------------------------------------------------
-- 4. Orphans. Every one of these must be 0.
--    A non-zero count means a parent table was skipped in the copy order.
-- ---------------------------------------------------------------------------
select 'invoices without student'      as problem, count(*) as rows
  from public.invoices i
 where not exists (select 1 from public.students s where s.id = i.student_id)
union all
select 'invoice items without invoice', count(*)
  from public.invoice_items ii
 where not exists (select 1 from public.invoices i where i.id = ii.invoice_id)
union all
select 'payments without invoice',      count(*)
  from public.payments p
 where not exists (select 1 from public.invoices i where i.id = p.invoice_id)
union all
select 'payments without student',      count(*)
  from public.payments p
 where not exists (select 1 from public.students s where s.id = p.student_id)
union all
select 'marks without exam',            count(*)
  from public.exam_results r
 where not exists (select 1 from public.exams e where e.id = r.exam_id)
union all
select 'marks without exam subject',    count(*)
  from public.exam_results r
 where not exists (select 1 from public.exam_subjects es where es.id = r.exam_subject_id)
union all
select 'marks without student',         count(*)
  from public.exam_results r
 where not exists (select 1 from public.students s where s.id = r.student_id)
union all
select 'attendance without student',    count(*)
  from public.attendance a
 where not exists (select 1 from public.students s where s.id = a.student_id)
union all
select 'boarding without student',      count(*)
  from public.transport_allocations t
 where not exists (select 1 from public.students s where s.id = t.student_id)
union all
select 'boarding without route',        count(*)
  from public.transport_allocations t
 where not exists (select 1 from public.transport_routes r where r.id = t.route_id)
union all
select 'hostel bed without room',       count(*)
  from public.hostel_allocations h
 where not exists (select 1 from public.hostel_rooms r where r.id = h.room_id)
order by problem;


-- ---------------------------------------------------------------------------
-- 5. Duplicates the copy could have introduced
--    Import twice without --on-conflict-do-nothing and these grow.
-- ---------------------------------------------------------------------------
select student_no, count(*) as copies
  from public.students
 where student_no is not null
 group by student_no
having count(*) > 1
 order by copies desc;

select invoice_no, count(*) as copies
  from public.invoices
 where invoice_no is not null
 group by invoice_no
having count(*) > 1
 order by copies desc;

select receipt_no, count(*) as copies
  from public.payments
 where receipt_no is not null
 group by receipt_no
having count(*) > 1
 order by copies desc;


-- ---------------------------------------------------------------------------
-- 6. Login links (see DATA-MIGRATION.md §4)
--    `dangling` must be 0. `no_login` is expected until you create accounts.
-- ---------------------------------------------------------------------------
select 'students' as table_name,
       count(*) filter (where s.profile_id is not null)                       as linked,
       count(*) filter (where s.profile_id is null)                           as no_login,
       count(*) filter (where s.profile_id is not null
                          and not exists (select 1 from auth.users u
                                           where u.id = s.profile_id))        as dangling
  from public.students s
union all
select 'guardians',
       count(*) filter (where g.profile_id is not null),
       count(*) filter (where g.profile_id is null),
       count(*) filter (where g.profile_id is not null
                          and not exists (select 1 from auth.users u
                                           where u.id = g.profile_id))
  from public.guardians g
union all
select 'staff',
       count(*) filter (where st.profile_id is not null),
       count(*) filter (where st.profile_id is null),
       count(*) filter (where st.profile_id is not null
                          and not exists (select 1 from auth.users u
                                           where u.id = st.profile_id))
  from public.staff st;


-- ---------------------------------------------------------------------------
-- 7. Roles only exist in the project that created them.
--    You should see at least one super_admin after the checklist step 6.
-- ---------------------------------------------------------------------------
select role, count(*) as accounts, count(*) filter (where not is_active) as inactive
  from public.user_roles
 group by role
 order by accounts desc;


-- ---------------------------------------------------------------------------
-- 8. Security sanity — 13 rows, rls_on true, rules >= 2 on each
-- ---------------------------------------------------------------------------
select c.relname as table_name,
       c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as rules
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r'
   and c.relname in ('transport_vehicles','transport_routes','transport_route_stops',
                     'transport_allocations','hostels','hostel_room_types',
                     'hostel_rooms','hostel_allocations','income_heads','other_incomes',
                     'admission_details','student_siblings','student_profile_extras')
 order by c.relname;


-- ---------------------------------------------------------------------------
-- 9. Optional cleanup — clear links left over from the old project
-- ---------------------------------------------------------------------------
--  Uncomment and run once, then create the new logins.
--
-- update public.students s
--    set profile_id = null
--  where s.profile_id is not null
--    and not exists (select 1 from auth.users u where u.id = s.profile_id);
--
-- update public.guardians g
--    set profile_id = null
--  where g.profile_id is not null
--    and not exists (select 1 from auth.users u where u.id = g.profile_id);
--
-- update public.staff st
--    set profile_id = null
--  where st.profile_id is not null
--    and not exists (select 1 from auth.users u where u.id = st.profile_id);