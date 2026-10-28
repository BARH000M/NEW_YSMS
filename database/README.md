# Database bundle — SAI College Academic OS

This folder is a **complete, standalone copy of the database**. Download the folder, run the
four SQL files in order in your own Supabase project, and you have the same tables, the same
security rules and the same starter data as the app you are using now.

Nothing in here touches the live system. It is a copy.

---

## What is in the folder

| File | What it does |
|---|---|
| `01_tables.sql` | Creates all 66 tables (students, invoices, exams, library, transport, hostel…) |
| `02_keys_and_indexes.sql` | Adds primary keys, unique rules, foreign keys and the search indexes |
| `03_security.sql` | Turns on row-level security and writes all 66 tables' access rules |
| `04_seed.sql` | Adds the starter data: school, academic year, terms, subjects, classes, fee heads, grading scale |
| `MIGRATION-CHECKLIST.md` | The one-page runbook: database, buckets, functions, env values, first login, verification |
| `DATA-MIGRATION.md` | How to copy your real students, invoices and marks across — separate from the structure |
| `06_verify_import.sql` | Read-only checks to run after copying real rows (counts, money, orphans, duplicates) |

The order matters. Run 01 → 02 → 03 → 04. Each file is commented at the top.

The change history (migrations 001–008, with their rollback and validation scripts) is kept
separately in `docs/migrations/` and `docs/database-architecture.md`. You do **not** need those
to rebuild — this bundle already contains their end result.

---

## How to run it on your own Supabase

1. Go to [supabase.com](https://supabase.com), create a project, and wait for it to finish
   provisioning (about two minutes).
2. In the left sidebar open **SQL Editor** → **New query**.
3. Open `01_tables.sql`, copy everything, paste it, press **Run**. It should say *Success*.
4. Repeat with `02_keys_and_indexes.sql`, then `03_security.sql`, then `04_seed.sql`.
5. Open **Table Editor**. You should see `students`, `invoices`, `exams`, `library_books`,
   `transport_routes` and the rest, and `institutions` should already hold one row.

That is the database rebuilt.

> `02` is written for a first install. Running it a second time will print
> "constraint already exists" notices — that is expected, and nothing is lost.

---

## Things SQL cannot create for you

These live outside the database and have to be set up once in the new project:

**1. Your login accounts.** Go to **Authentication → Users → Add user**, set an email and a
password, tick *auto confirm*. Then open the last block of `04_seed.sql`, put that user's UUID
in place of the zeros, and run it — that makes the account the platform owner
(`super_admin`). Without this step you can sign in but you will see nothing.

**2. Storage buckets.** Create five buckets in **Storage**:

| Bucket | Public? | Used for |
|---|---|---|
| `documents` | no | student and staff documents |
| `certificates` | no | generated certificates |
| `receipts` | no | payment receipt images |
| `avatars` | yes | profile photos |
| `cms-media` | yes | website images |

The three private buckets are read through short-lived signed links, never public URLs.

**3. Edge Functions.** The app calls three server-side functions. Their source is in the
project at `supabase/functions/`, and they must be deployed to the new project:
`portal-self`, `account-links`, `student-documents`, `manage-roles`, `bootstrap-admin`.

**4. Environment values.** The new project's **Project URL** and **anon public key** go into
the frontend's `.env` as `VITE_PUBLIC_SUPABASE_URL` and `VITE_PUBLIC_SUPABASE_ANON_KEY`.

---

## Two things worth knowing

**Security covers every table.** Thirteen tables (`transport_*`, `hostels`, `hostel_*`,
`income_heads`, `other_incomes`, `admission_details`, `student_siblings`,
`student_profile_extras`) originally shipped with row-level security switched off — the pages
worked because everything was openly readable. `03_security.sql` closes that: those tables have
explicit "staff write / signed-in read" rules, a student only ever sees their own transport and
hostel row, and income is limited to admin and accountant. `student_profile_extras` had the
opposite problem — security on with no rule at all, so nobody could read it. It has a rule now.

If you are rebuilding, the rules arrive with `03`. If you are closing the gap on an existing
install instead, `docs/migrations/008_rls_campus_tables.sql` is the same change as a patch.

**The anonymous key can read nothing.** Every table is granted to signed-in users and revoked
from `anon`. If you later add the shop module, the product and order tables will need `anon`
`select` re-granted — they are not part of this bundle.

---

## Not included

- `pg_stat_statements` — a monitoring extension, not part of your data.
- The shop tables (`product_*`, `order_*`) — only present when Shopify/orders are in use.
- Your actual records (students, invoices, marks). This bundle creates the structure and the
  starter data; copy real rows across separately — `DATA-MIGRATION.md` walks through it.