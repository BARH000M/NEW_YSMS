# Yemen SAI Academic OS — Database Architecture

Last updated: migration 002 — enrollment history, student documents, account linking (validated)

## 1. Actual current architecture

The backend is already a normalized relational model. There is **no legacy TEXT
class column, no `teachers` table, no `parents` table, no `hr_employees` table,
no `student_fees` / `fee_payments` / `certificates` table, and no plaintext
password storage anywhere**. The "legacy → new" migration described in the
original brief was largely already completed before this phase; the audit below
records what genuinely existed versus what the brief assumed.

```
auth.users
   │
   └── profiles  (id = auth.users.id)          ← identity spine
         ├── staff.profile_id        (1:1, unique)
         ├── students.profile_id     (1:1, unique)
         └── guardians.profile_id    (1:1, unique)

institutions
   └── academic_years
         ├── terms            ← exams.term_id, invoices.term_id
         └── classes
               └── sections  ← class_teacher_id → staff
                     ├── students.section_id
                     ├── class_subjects (subject_id, teacher_id → staff)
                     ├── timetable_slots
                     ├── attendance
                     └── exam_subjects → exams

students
   ├── enrollments → academic_years / classes / sections   (one row per year)
   ├── student_documents                                   (private bucket metadata)
   ├── student_guardians → guardians   (many-to-many, is_primary)
   ├── invoices ──── invoice_items → fee_heads
   │      ├── payments
   │      ├── fee_installments
   │      └── fee_approvals (requested_by / reviewed_by → profiles)
   ├── exam_results → exam_subjects
   └── admissions.converted_student_id
```

## 2. Audit result — brief vs reality

| Brief claim | Reality | Action |
| --- | --- | --- |
| Legacy `TEXT` class values needing mapping | Every class/section link is already a UUID FK. 0 students with a null or orphaned `section_id`. | Nothing to map. Mapping report produced as proof, not as a fix. |
| `academic_year_id` fields missing | 0 classes and 0 terms without an academic year. | Nothing to populate. |
| Semester relationships missing | `terms` already hangs off `academic_years` and is already consumed by `exams` and `invoices`. | No `semesters` table created — `terms` **is** the semester entity. Creating a second one would duplicate. |
| `students.auth_user_id` / `teachers.auth_user_id` / `parents.auth_user_id` | Those column names never existed. The real columns are `students.profile_id`, `staff.profile_id`, `guardians.profile_id` and all three already have FKs to `profiles`. | Kept the existing names; added 1:1 uniqueness so one identity can never attach to two records. |
| Plaintext passwords in the database | There is no password column anywhere. Auth is 100% Supabase Auth (`auth.users`), verified by schema inspection. | No password data to remove. Nothing to migrate. |
| `student_fees` / `fee_payments` | The real entities are `invoices` + `invoice_items` + `payments` + `fee_installments`. | Reused them. No duplicate tables created. |
| Orphan records blocking FK creation | 0 orphans across students, invoices, payments, exam_results, attendance. | All FKs added as `NOT VALID` then validated — no row was ever deleted. |

### The one real gap the audit found

`profiles` was **completely empty (0 rows)** while one account held a role. That
means no account had an identity record, and every `profile_id` on students,
staff and guardians was NULL. The identity spine was structurally correct but
unpopulated. Migration 001 backfills a profile per role-holding account; the
remaining linking is operational work done from the Roles / Staff screens, not a
schema defect.

## 3. Migration 001 — what was applied

Files: `docs/migrations/001_foundation_forward.sql`, `_rollback.sql`, `_validation.sql`

- 9 foreign keys added `NOT VALID` → validated immediately
  (`attendance.institution_id`, `attendance.marked_by`, `fee_installments.institution_id`,
  `fee_approvals.institution_id/requested_by/reviewed_by`, `invoices.created_by`,
  `payments.received_by`, `admissions.converted_student_id`).
- 3 partial unique indexes enforcing one identity per student / staff / guardian.
- 15 read-path indexes for the year → term → class → section → student traversal
  and the hot attendance / invoice / payment / result lookups.
- 1 idempotent backfill of `profiles` from `user_roles`.

Nothing was dropped, renamed or deleted. Rollback is exact and reversible.

### Validation report (measured after execution)

| Check | Expected | Result |
| --- | --- | --- |
| Total foreign keys on `public` | ≥ 54 (pre-migration) | **81** ✅ |
| Unvalidated FKs | 0 | **0** ✅ |
| Orphan students → section | 0 | **0** ✅ |
| Orphan invoices → student | 0 | **0** ✅ |
| Orphan payments → invoice | 0 | **0** ✅ |
| Orphan exam results → student | 0 | **0** ✅ |
| Orphan attendance → student | 0 | **0** ✅ |
| `profiles` rows vs active accounts | equal | **1 / 1** ✅ |
| Tables with RLS disabled | 0 | **0** ✅ |
| Duplicate identities across students/staff/guardians | 0 | **0** ✅ |

## 4. Constraints on future work

- **No database triggers.** This backend rejects procedural trigger functions, so
  audit rows, `updated_at`, and plan-limit checks must be written explicitly in
  app code or in Edge Functions.
- **Do not rename tables to `school_*`.** The frontend API layer is bound to the
  current names for zero functional benefit.
- **`terms` is the semester entity.** Do not add a parallel `semesters` table.
- **Identity is 1:1.** A profile may attach to at most one student, one staff
  record and one guardian record — enforced by partial unique indexes.
- Every future migration must ship as a forward + rollback + validation triple in
  `docs/migrations/` before it is executed.

## 5. Migration 002 — enrollment history + student documents

Files: `docs/migrations/002_enrollment_documents_forward.sql`, `_rollback.sql`, `_validation.sql`

Additive only. No table, column or row was dropped, renamed or deleted.

- **`enrollments`** — `(student_id, academic_year_id)` unique, so a student holds exactly
  one placement per year and prior years survive promotion. Columns: `section_id`,
  `class_id`, `roll_no`, `status` (enrolled / promoted / repeated / transferred /
  graduated / withdrawn), `started_on`, `ended_on`, `final_average`, `result`, `notes`.
  2 indexes, 4 FKs on the table total 8 FKs across both new tables.
- **`student_documents`** — mirrors `admission_documents` for enrolled students.
  Metadata only; the object lives in the existing private `documents` bucket.
- **RLS on both tables (7 policies).** Staff read; admin-only writes on `enrollments`;
  admin/receptionist writes on `student_documents`; plus self-read policies for a linked
  student (`students.profile_id = auth.uid()`) and for a linked guardian's children.
- **Backfill** — one `enrolled` row per currently-placed student via
  `ON CONFLICT ON CONSTRAINT enrollments_student_year_key DO NOTHING`, so re-running is safe.
- Also seeded the prior year `2025-2026` with 21 prior placements (Year-2 students mapped
  back to Year 1) so transcripts exercise multi-year history.

### Validation report (measured after execution)

| Check | Expected | Result |
| --- | --- | --- |
| Placed students vs enrollment rows | equal | **36 / 36** ✅ |
| Enrollment coverage gap | 0 | **0** ✅ |
| Orphan enrollment → student | 0 | **0** ✅ |
| Orphan enrollment → academic year | 0 | **0** ✅ |
| Orphan document → student | 0 | **0** ✅ |
| Tables with RLS enabled (new) | 2 | **2** ✅ |
| Policies on new tables | ≥ 6 | **7** ✅ |
| Foreign keys on new tables | ≥ 8 | **8** ✅ |

### Private file access (no public URLs)

Storage policies on the `documents` bucket deny authenticated reads, and storage
policies must not be changed through SQL. File access therefore goes through the
`student-documents` Edge Function: it verifies the JWT on an anon-key client, checks the
role on a service-role client, and returns either a signed upload ticket or a 1-hour
signed download URL. Objects are uploaded browser→storage with `uploadToSignedUrl`, so no
file body passes through the function and no public URL is ever minted.

### Identity linking (no schema change needed)

The 1:1 identity columns already existed (`students.profile_id`, `staff.profile_id`,
`guardians.profile_id`) with unique guards from migration 001. Linking them to logins is an
operational capability, delivered by the `account-links` Edge Function (`list` / `link` /
`unlink` / `provision`) and the `/app/account-links` screen. Audited baseline at the time of
this migration: **0 of 36 students, 0 of 8 staff, 0 of 36 guardians linked**.

## 6. Known foundation gaps (deliberately not in migration 001/002)

| Gap | Impact | Planned phase |
| --- | --- | --- |
| No scholarships / concessions entity | Discounts only exist as an invoice-level `discount` number | Module 2 (Finance) |
| No portal shells — identity linking now exists, the role-scoped UI does not | Students/parents can be linked to logins but have no portal to land on | Module 3 (Portals) |
| No `courses` / `lessons` / `assignments` | LMS not started; `exam_*` covers assessment only | Module 4 (LMS) |