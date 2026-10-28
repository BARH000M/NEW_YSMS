# Migration checklist — one page

Everything you must do, in order, to stand up this college system on a fresh Supabase
project. Tick each box. Total time: about 20 minutes, most of it waiting.

If something goes wrong, stop at that box — every step below is independent and safe to
repeat. The database files are idempotent; nothing here deletes data.

---

## 1. Create the project

- [ ] Create the project at [supabase.com](https://supabase.com) and wait for
      **Project ready** (roughly two minutes).
- [ ] Note down two values from **Settings → API**:
      **Project URL** and the **anon / publishable key**.

---

## 2. Build the database (5 min)

Run in **SQL Editor → New query**, one file at a time, in this exact order. Wait for
*Success* before opening the next one.

- [ ] `01_tables.sql` — 66 tables
- [ ] `02_keys_and_indexes.sql` — keys, foreign keys, indexes
      (re-running prints "already exists" notices — expected, harmless)
- [ ] `03_security.sql` — row-level security and all access rules
- [ ] `04_seed.sql` — school, year, terms, subjects, classes, fee heads, grading scale

**Check:** Table Editor should show `students`, `invoices`, `exam_results`,
`transport_routes`, `hostel_rooms`, and `institutions` should hold exactly one row.

---

## 3. Storage buckets (2 min)

**Storage → New bucket**, five buckets. The public flag and the name must match exactly,
because the frontend code refers to these names.

| # | Bucket | Public? | Written by | If missing |
|---|---|---|---|---|
| 1 | `documents` | no | staff uploads student/staff files | document upload and viewing fails |
| 2 | `certificates` | no | admin generates certificates | certificate download fails |
| 3 | `receipts` | no | finance saves payment receipt images | receipt image view fails |
| 4 | `avatars` | yes | each user uploads their own photo | profile photos fall back to initials |
| 5 | `cms-media` | yes | admin uploads website images | website images cannot be changed |

- [ ] All five created.

Two rules that bite if forgotten:

- The three **private** buckets are read through **short-lived signed links**, never public
  URLs. Do not flip them to public to "fix" a broken image.
- Uploads require a signed-in user. If a staff member sees "permission denied", the bucket
  exists but their account has no `authenticated` upload permission.

---

## 4. Edge Functions (3 min)

Five functions, all with **JWT verification ON** (the default). Source lives in this project
under `supabase/functions/<slug>/index.ts` — deploy each one from there.

| # | Slug | Purpose |
|---|---|---|
| 1 | `bootstrap-admin` | promotes the very first account to platform owner |
| 2 | `manage-roles` | create / change / deactivate staff roles |
| 3 | `account-links` | bind a parent or student login to their record |
| 4 | `student-documents` | upload and sign private student files |
| 5 | `portal-self` | self-service portal (a student sees only their own rows) |

- [ ] All five deployed and showing **ACTIVE**.
- [ ] No extra secrets needed — they use the built-in service role only.

**Check:** open each function's **Logs**, invoke the matching page once (Staff → Roles,
Students → Documents, Portal), and confirm a 200 with no "function not found".

---

## 5. Environment values (1 min)

In the frontend environment, set exactly these two. Nothing else is required to boot.

```
VITE_PUBLIC_SUPABASE_URL=https://<new-project-ref>.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=<new anon / publishable key>
```

- [ ] Both values replaced with the new project's.
- [ ] The URL ends without `/rest/v1` — just the project URL.
- [ ] Redeploy / republish the site after changing them, then hard-refresh the browser.

The anon key is public by design and safe in the bundle. The **service role key must never**
appear in `.env` or in frontend code — it lives only in the Edge Function secrets.

---

## 6. The first login (2 min)

- [ ] **Authentication → Users → Add user**, set email + password, tick **Auto confirm**.
- [ ] Copy that user's UUID.
- [ ] Open the **last block of `04_seed.sql`**, paste the UUID over the zeros, uncomment, run
      it. This writes `profiles` and `user_roles` with `super_admin`.
- [ ] Sign in. You should land on the dashboard with every module visible.

Without this step you can sign in but the console looks empty — role lives only in
`user_roles`, never in auth metadata, so it can't be forged from a profile edit.

---

## 7. Final verification (1 min)

Run this in the SQL Editor. Every row must read `t` and `2` (or more).

```sql
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
```

- [ ] 13 rows, `rls_on = true`, `rules >= 2`.
- [ ] Sign in as a **student** account and confirm they see their transport and hostel row,
      their own marks and fees — and **no** income, expenses or staff screens.

If `rules = 0` on a table, security is on with no rule, which means nobody can read it.
Re-run `03_security.sql`.

---

## What is not covered here

- **Real rows** (students, invoices, marks). Copy them separately —
  see `DATA-MIGRATION.md` in this folder. The bundle only creates structure + starter data.
- **Shop tables** (`product_*`, `order_*`) — only exist when the shop module is used.
- **`pg_stat_statements`** — a monitoring extension, not your data.

---

## Rollback

Every `create policy` can be dropped (`drop policy <name> on <table>;`) and security can be
switched off (`alter table <table> disable row level security;`). Nothing in this bundle
alters or deletes existing rows, so a wrong run costs you a re-run, not data.