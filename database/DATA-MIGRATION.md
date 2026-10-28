# Copying your real records into the new project

`01`–`04` build the **structure** and the starter data (school, year, terms, subjects,
classes, fee heads, grading scale). They deliberately contain **zero students, invoices or
marks**. This guide moves those real rows across.

Do this only **after** the four SQL files have run and the checklist in
`MIGRATION-CHECKLIST.md` is complete.

---

## 1. Know what you are copying

Three kinds of rows live in the database. Treat them differently.

| Kind | Tables | Action |
|---|---|---|
| **Configuration** | `institutions`, `academic_years`, `terms`, `subjects`, `classes`, `sections`, `grade_bands`, `fee_heads`, `module_flags`, `settings`, `role_permissions` | **Do not copy.** `04_seed.sql` already made them. Copy only if you renamed classes or added fee heads. |
| **Records** | `students`, `guardians`, `student_guardians`, `student_siblings`, `student_profile_extras`, `enrollments`, `invoices`, `invoice_items`, `payments`, `fee_installments`, `fee_discounts`, `fee_discount_allotments`, `fee_approvals`, `exams`, `exam_subjects`, `exam_results`, `attendance`, `class_subjects`, `timetable_slots`, `library_*`, `transport_*`, `hostel_*`, `admissions`, `admission_details`, `student_documents` | **Copy these.** This is the school. |
| **Account plumbing** | `profiles`, `user_roles`, `audit_log`, `notifications`, `messages`, `message_reads` | **Do not copy.** See §4 — these point at logins that only exist in the old project. |

Good news on ids: every school table uses a **UUID** primary key, not an auto-number. So ids
survive the copy unchanged, foreign keys stay intact, and there is **no sequence to reset**
afterwards (only the shop `product_*` / `order_*` tables use sequences, and they are not part
of the school data).

---

## 2. Copy order matters

Foreign keys mean parents must land before children. This order works:

```
classes, sections                (only if you changed them)
subjects                         (only if you added them)
students
guardians
student_guardians, student_siblings, student_profile_extras
enrollments
fee_heads                        (only if you added them)
invoices → invoice_items
payments
fee_installments, fee_discounts, fee_discount_allotments, fee_approvals
exams → exam_subjects → exam_results
attendance
class_subjects, timetable_slots
library_books → library_members → library_issues
transport_vehicles → transport_routes → transport_route_stops → transport_allocations
hostels → hostel_room_types → hostel_rooms → hostel_allocations
```

Import the arrows left-to-right, top-to-bottom. Skipping ahead gives
*"violates foreign key constraint"*.

---

## 3. Three ways to move the rows

### Method A — dump just the data (best for a real school)

Run this against the **old** database with the Supabase CLI or `pg_dump` (v12+):

```bash
pg_dump "$OLD_DATABASE_URL" \
  --data-only \
  --column-inserts \
  --on-conflict-do-nothing \
  --no-owner --no-privileges \
  -t public.students \
  -t public.guardians \
  -t public.student_guardians \
  -t public.student_siblings \
  -t public.student_profile_extras \
  -t public.enrollments \
  -t public.invoices \
  -t public.invoice_items \
  -t public.payments \
  -t public.fee_installments \
  -t public.fee_discounts \
  -t public.fee_discount_allotments \
  -t public.fee_approvals \
  -t public.exams \
  -t public.exam_subjects \
  -t public.exam_results \
  -t public.attendance \
  -t public.library_books \
  -t public.library_members \
  -t public.library_issues \
  -t public.transport_vehicles \
  -t public.transport_routes \
  -t public.transport_route_stops \
  -t public.transport_allocations \
  -t public.hostels \
  -t public.hostel_room_types \
  -t public.hostel_rooms \
  -t public.hostel_allocations \
  > school-data.sql
```

- `--column-inserts` writes column names, so a column added or reordered between the two
  installs can never shift values into the wrong field.
- `--on-conflict-do-nothing` makes the file safe to run twice — no duplicate-key crash.
- `pg_dump` orders the selected tables by their foreign keys automatically, so the output
  already respects §2 even though you listed them in a different order.
- If you don't have the CLI, `supabase db dump --db-url "$OLD_DATABASE_URL" --data-only -f school-data.sql`
  does the same thing for the whole database; delete the `COPY public.profiles`,
  `public.user_roles`, `public.audit_log`, `public.notifications` and `public.messages`
  blocks before importing.

Then paste `school-data.sql` into the **new** project's SQL Editor and run it. The editor
executes with owner rights, so row-level security does not block the inserts.

### Method B — CSV, for a handful of tables

**Table Editor → table → ⋯ → Export as CSV** on the old project, then
**Import data from CSV** on the new one. Parent tables first. Keep the `id` column in the
file — that's what keeps the links intact.

Use this for small sets (a few hundred students, one year of invoices). Above a few thousand
rows the browser gets slow and Method A wins.

### Method C — direct cross-database copy

`postgres_fdw` / `dblink` would let you `insert into ... select from` across both projects, but
the extension needs superuser rights that hosted Supabase does not grant. Don't plan around it.

---

## 4. The one thing that will bite you: logins

`students.profile_id`, `staff.profile_id`, `guardians.profile_id` and `user_roles.user_id`
hold **`auth.users` UUIDs** — and auth users belong to one project only. There is deliberately
**no foreign key** on those columns, so a copied value that points at a user who doesn't exist
raises **no error at all**. It just quietly means "this student has no login", and the portal
shows nothing.

So after importing students, do this in the new project:

```sql
-- 1. Clear links that point at auth users from the old project.
update public.students s
   set profile_id = null
 where s.profile_id is not null
   and not exists (select 1 from auth.users u where u.id = s.profile_id);

update public.guardians g
   set profile_id = null
 where g.profile_id is not null
   and not exists (select 1 from auth.users u where u.id = g.profile_id);

update public.staff st
   set profile_id = null
 where st.profile_id is not null
   and not exists (select 1 from auth.users u where u.id = st.profile_id);

-- 2. Rebuild roles from scratch (roles are per-project).
--    Start with yourself:
insert into public.user_roles (user_id, institution_id, role, is_active)
select '00000000-0000-0000-0000-000000000000',
       (select id from public.institutions limit 1),
       'super_admin', true
on conflict (user_id) do update set role = 'super_admin', is_active = true;
```

Then create the logins (**Authentication → Users → Add user**) and re-link them by a key you
control — `student_no` is the reliable one, since `students` has no email column:

```sql
-- Example: student_no is the local part of the school email address.
-- Adjust the pattern to whatever you actually use.
with mapping as (
  select s.id as student_id, u.id as profile_id
  from public.students s
  join auth.users u
    on lower(u.email) = lower(s.student_no || '@sai-college.com')
)
update public.students s
   set profile_id = m.profile_id
  from mapping m
 where s.id = m.student_id
   and s.profile_id is null;
```

Parents work the same way through `guardians` + `student_guardians`. Staff through `staff`
+ `user_roles` (create the role row **after** the auth user exists — the Roles page does both).

Nobody needs to be linked to sign in as a staff member; only students and parents strictly
need `profile_id` for the portal.

---

## 5. Verify the copy

Run these after the import. Compare old vs new — the numbers must match exactly.

```sql
select 'students'            as what, count(*) from public.students
union all select 'enrollments',        count(*) from public.enrollments
union all select 'invoices',           count(*) from public.invoices
union all select 'invoice_items',      count(*) from public.invoice_items
union all select 'payments',           count(*) from public.payments
union all select 'exam_results',       count(*) from public.exam_results
union all select 'attendance',         count(*) from public.attendance
union all select 'transport_alloc',    count(*) from public.transport_allocations
union all select 'hostel_alloc',       count(*) from public.hostel_allocations
order by what;
```

Money must balance, not just counts:

```sql
select (select coalesce(sum(total), 0) from public.invoices)  as invoiced,
       (select coalesce(sum(amount), 0) from public.payments) as collected,
       (select coalesce(sum(total), 0) from public.invoices)
     - (select coalesce(sum(amount), 0) from public.payments) as outstanding;
```

Orphans should all be zero:

```sql
select count(*) as invoices_without_student
  from public.invoices i
 where not exists (select 1 from public.students s where s.id = i.student_id);

select count(*) as marks_without_exam
  from public.exam_results r
 where not exists (select 1 from public.exams e where e.id = r.exam_id);

select count(*) as payments_without_invoice
  from public.payments p
 where not exists (select 1 from public.invoices i where i.id = p.invoice_id);
```

`06_verify_import.sql` in this folder has these plus a few more.

---

## 6. Cutover

- [ ] Counts and money totals match.
- [ ] You can sign in as owner.
- [ ] One student account sees their own fees and marks; a second student sees a different
      set — never each other's.
- [ ] `.env` points at the new project and the site is republished.
- [ ] Keep the old project read-only for a week before deleting it. This is the only undo.