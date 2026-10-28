# Yemen Sai Educational College (SAI College)

## 1. Project Description
Modern multilingual rebuild of sai-college.com — official website of the Yemen Sai Educational College (كلية ساي التعليمية اليمنية / 也门赛艾教育学院), a Chinese–Yemeni college in Sanaa. Target users: prospective students, parents, and current students.

## 2. Real College Facts (verified from the college website)
- Founded: 2009
- Address: Remax roundabout, Haddad street, Sanaa, Yemen
- Phone / WhatsApp: +967 775 182 228
- Email: info@sai-college.com
- Enrolled students: 680+
- HSK pass rate: 90%
- Official HSK test centre
- Programs: Chinese Language Diploma (2 years), Business Chinese (6 months), HSK Preparation (levels 1–6), Chinese for Kids & Teens / YCT (1 year), China university scholarship support

## 3. Page Structure
- `/` — Home (hero, stats, about, programs, news, services CTA)
- `/admission` — Online Admission (steps, application form, documents, FAQ)
- `/complain` — Complain / feedback (confidential form, handling timeline)
- `/contact` — Contact Us (contact cards, message form, map, socials)
- `/system` — School management system showcase (public)
- `*` — 404

## 4. Core Features
- [x] Home page with news ticker, real programs, real stats, service CTAs
- [x] Online admission page with working application form
- [x] Complaint page with confidential complaint form
- [x] Contact page with message form + embedded map
- [x] Arabic (default) / English / Chinese language switch with full RTL support
- [x] Shared header (sticky on scroll, mobile menu) and footer across all pages

## 5. Data Model Design
Public marketing forms submit through the built-in Form service:
- Online Admission Application — `dbgvcgo03l94aq7vdtm0`
- Student Complaint Form — `dbgvcgo03l94aq7vdtmg`
- Contact Us Inquiry — `dbgvcgo03l94aq7vdtn0`

Management system data lives in Readdy Backend (see section 8).

## 6. Backend / Third-party Integration Plan
- Backend: **Readdy Backend connected** (Postgres + Auth + Storage + Edge Functions)
- Storage buckets created: `avatars` (public), `cms-media` (public), `documents` (private), `certificates` (private)
- Forms: built-in Form (wired)
- Products/shop: none

## 7. Development Phase Plan
### Phase 1: Home page — done
### Phase 2: Admission, Complain, Contact pages — done
### Phase 3: Multi-language EN / AR / ZH with Arabic as default — done
### Phase 4: Public "System" showcase page — done
### Phase 5 (in progress): Management system database + auth + app shell
- Detailed console work through Phase 1.3 is documented in section 8.
- Scope for everything still outstanding follows the client reference plan — see **section 9** for the module-by-module crosswalk and the sequenced roadmap (Phases 6–12).

## 8. School Management System

The client supplied reference material for a full school management system: 20 modules across 8 roles. Full blueprint (data model, security model, edge functions, integrations, mobile strategy) lives in `docs/system-blueprint.md`.

### Decisions confirmed by client (2026-10-28)
- Scope: SAI College first, every table carries `institution_id` so multi-school can be enabled later.
- Phase 1 module: Admissions + student records (enrolment, profiles, classes).
- Fees: cash / bank transfer receipting by the accountant. No online payment gateway for now.
- Public showcase page: approved to build now, independent of the backend. Route `/system`.

### Phase 0 — Database foundation (core done)
27 tables in Readdy Backend (`public` schema), all with **RLS enabled and role-based policies** (52 policies). `anon` is locked out of the school tables; `user_roles` is self-read-only with **no write policy**, so role assignment can only happen server-side.

- Identity/access: `institutions`, `profiles`, `user_roles`, `role_permissions`, `settings`, `module_flags`, `notifications`, `audit_log`
- Academic: `academic_years`, `terms`, `subjects`, `classes`, `sections`, `class_subjects`, `timetable_slots`, `calendar_events`
- People: `staff`, `staff_documents`, `students`, `guardians`, `student_guardians`
- Admissions/front office: `admissions`, `admission_documents`, `enquiries`, `complaints`, `visitors`, `postal_records`

Seeded demo data: 1 institution, academic year 2026–2027 + terms, 7 subjects, 4 classes, 5 sections, 8 staff, 36 students with guardians linked, 10 teaching assignments, 6 applications, 3 complaints, 3 enquiries, 2 visitors, 4 calendar events, 20 module flags.

Design notes:
- Role is stored **only** in `user_roles` (never in `profiles`, never in editable auth metadata).
- RLS helper reads go through `user_roles` (own-row-only policy), which avoids recursive RLS without `SECURITY DEFINER` functions.
- `updated_at` and `audit_log` writes are handled in application code / Edge Functions, because procedural trigger functions are not permitted on this backend.

### Phase 0.1 — Platform owner bootstrap (done)
- Edge Function `bootstrap-admin` deployed (JWT verification on).
- Verifies the caller with an anon-key client, then does privileged work on a service-role client only.
- Two paths: (a) **first-run setup** — creates the owner account itself with a confirmed email, granting `super_admin`; only possible while the project has zero accounts; (b) **claim** — the first signed-in account becomes `super_admin`. Both close permanently once an owner exists.
- Writes a `bootstrap_owner` entry to `audit_log` server-side.
- `/login` has a "First-time setup" panel for path (a); the no-access screen keeps "Activate platform owner" for path (b).
- `manage-roles` also links a newly added teacher account to the matching unlinked `staff` row (exact full-name match only), so class-subject assignments apply to their account.

### Phase 0.2 — Fees & exams schema (done)
New tables: `fee_heads`, `invoices`, `invoice_items`, `payments`, `exams`, `exam_subjects`, `exam_results` (+ 8 indexes).

- [x] Tables, indexes, authenticated grants
- [x] **RLS enabled on all 7 tables with 17 role policies** (2026-10-28). `anon` has no access. Students may read only their own invoices, payments and results; fees/payments are written by admin/super_admin/accountant; exams and results by admin/teacher.
- [x] Seeded: 4 fee heads, 2 exams, 7 exam papers, 14 invoices with line items, 8 payments (reconciled against invoice status), 63 exam results.

### Phase 0.3 — Role management (done)
- Edge Function `manage-roles` deployed (JWT verification on): `list` / `assign` / `revoke`.
- Verifies the caller on an anon-key client, then does privileged work on a service-role client only.
- Only an active `admin` or `super_admin` may call it; only a `super_admin` may grant `super_admin`.
- Nobody can change or revoke their own role (prevents lockout), and every change writes to `audit_log`.
- `/app/roles` screen: account list, role + active state, assign / edit / revoke, with search and tabs.

### Phase 1 — Console screens (in progress)
Built and wired to the database:
- `/login` (Arabic-first RTL, trilingual) + no-access / first-admin screen
- `/app` dashboard with live counts
- `/app/students` — search, class filter, profile modal, **Add student form** (writes `students` + `guardians` + `student_guardians`)
- `/app/admissions` — status tabs, inline status change, **New admission form** (writes `admissions`, auto reference number)
- `/app/front-office` — visitors / enquiries / complaints
- `/app/staff`, `/app/academics`, `/app/calendar`, `/app/settings`
- `/app/fees` — billed / collected / outstanding stats, invoice table with filtering, record-payment modal (writes `payments` + recalculates invoice status), create-invoice modal, fee-head cards, **printable A4 fee receipt** (browser print, no server rendering)
- `/app/exams` — exam cards with paper schedules, create-exam modal, add-paper modal
- `/app/roles` — role assignment without touching the database (server-side function)
- `/app/students` also has a **printable student ID card**
- Every screen has an error state with retry; write actions are role-gated (admin / accountant / teacher as appropriate).

### Phase 1.1 — Marks entry, report cards, outstanding report (done)
- `/app/exams/marks` — pick an exam, then a paper, then record marks per student. Section + name filters, live percentage and letter grade per row, optional remarks. Saves through `saveExamResults` which upserts on the unique `(exam_subject_id, student_id)` key, so re-entering marks never duplicates rows. Writes are limited to admin / super_admin / teacher by RLS.
- `/app/reports` — term report cards. Choose a term, class, section and search, then preview every student's subject grades (papers in the term grouped by subject), total marks, percentage, overall grade and pass/fail. Single or bulk print, one report card per A4 page.
- `/app/fees/outstanding` — unpaid invoices grouped by class, with billed / paid / balance per student and per class. Prints class-level, student-level or all receipts (one A4 page per invoice) reusing the existing `FeeReceipt` component.
- Shared grading scale in `src/utils/grades.ts` (90+ A+ … below 50 F, pass at 50%) and report aggregation in `src/utils/report.ts`.
- All three screens are trilingual (AR / EN / ZH), role-gated in the sidebar, and linked from Exams and Fees.

### Phase 1.2 — Teacher scoping, analytics panels, family statements (done)
- **Marks entry defaults to the teacher's own sections.** `class_subjects` (teacher → section → subject) is joined to the signed-in account through `staff.profile_id`. A teacher opening a paper starts on "My sections" for that subject; the section list is narrowed to their assignments and a banner explains the scope. Admins, accountants and the platform owner keep the full roster.
- **Report cards gained two analytics panels:** a grade-distribution bar chart across the nine letter grades (driven by the filtered cohort) and a top-8 class ranking with rank badges and one-click printing of that student's report card.
- **Outstanding report has a By class / By family toggle.** Family view groups every unpaid invoice by guardian (primary guardian preferred, siblings merged) through `src/utils/family.ts`, and prints a per-household statement listing each child's invoices, billed / paid / balance and a family total.
- All new copy translated into Arabic and Chinese; build verified green.

### Phase 1.3 — Staff linking, family balances on profile, CSV exports (done)
- **Roles screen has an explicit staff picker.** `manage-roles` now returns the `staff` directory with `list`, and `assign` accepts a `staffId`. A chosen staff record is linked to the account (one account = one staff record; a record already linked elsewhere is rejected with a 409), so a teacher no longer depends on an exact full-name match. The exact-name match stays only as a fallback when no staff is picked.
- **Student profile shows the household balance.** `buildStudentFamily` in `src/utils/family.ts` resolves the student's guardian, finds every sibling sharing that guardian, and totals billed / paid / balance per child and for the family. Rendered for admin, super_admin, receptionist and accountant only.
- **CSV exports.** `src/utils/csv.ts` (UTF-8 BOM, RFC-style quoting) powers an export of the current marks sheet (exactly the students in view) and of the class-ranking panel on the reports screen.
- Owner account `info@sai-college.com` confirmed and granted `super_admin`.

### Phase 0.4 — Backend foundation completion (done, validated)

Full audit and architecture map: `docs/database-architecture.md`. Migration triple: `docs/migrations/001_foundation_forward.sql`, `001_foundation_rollback.sql`, `001_foundation_validation.sql`.

**Audit finding — the brief's premise did not match the database.** There is no legacy `TEXT` class column, no `teachers` / `parents` / `hr_employees` table, no `student_fees` / `fee_payments` / `certificates` table, and **no password column of any kind**. Academic data was already normalized (year → term → class → section → student) with 0 null or orphaned links. So Phases A/B/C were executed as *integrity hardening* rather than a legacy cut-over.

- **Phase A (academic data):** 0 classes and 0 terms missing `academic_year_id`; 0 students without a `section_id`; 0 orphans between classes/sections/students. Nothing needed populating, and no legacy TEXT columns exist to map or remove. `terms` **is** the semester entity and is already consumed by `exams` and `invoices` — no parallel `semesters` table was created.
- **Phase B (auth):** the real columns are `students.profile_id`, `staff.profile_id`, `guardians.profile_id` (already FK'd to `profiles`). `profiles` was **empty**, so no account had an identity record. Migration 001 backfills a profile per role-holding account and adds partial unique indexes enforcing one identity per student / staff / guardian.
- **Phase C (relationships):** 9 missing FKs added `NOT VALID` then validated (`attendance.institution_id`, `attendance.marked_by`, `fee_installments.institution_id`, `fee_approvals.institution_id/requested_by/reviewed_by`, `invoices.created_by`, `payments.received_by`, `admissions.converted_student_id`). **No row was deleted** — there were no orphans to clean up. 15 read-path indexes added.
- **Validated after execution:** 81 total FKs, **0 unvalidated**, **0 orphans** on every relationship, profiles = active accounts (1/1), RLS enabled on every table with **0 tables unprotected**.
- Nothing was dropped, renamed or deleted; the rollback script is exact and reversible.

### Phase 1.4 — Enrollment history, student documents, account linking (done, validated)

Migration triple: `docs/migrations/002_enrollment_documents_forward.sql`, `_rollback.sql`, `_validation.sql`. Apply-then-measure, no existing table, column or row touched.

**1. `enrollments` — prior-year placement is no longer destroyed.** `students.section_id` only ever held the *current* placement, so promoting a student erased their previous year. New table keeps one row per `(student_id, academic_year_id)` (unique constraint), with `section_id`, `class_id`, `roll_no`, `status` (enrolled / promoted / repeated / transferred / graduated / withdrawn), start & end dates, `final_average` and `result`.
- Backfilled 1 row per currently-placed student → **36/36 covered, coverage gap 0, 0 orphans**.
- Seeded the prior academic year (2025-2026) with 21 prior placements (Year-2 students mapped back to Year 1), so the transcript demonstrates real multi-year history instead of a single row.
- RLS: staff read (admin/teacher/accountant/receptionist), admin-only writes, plus self-read for a linked student and for a linked guardian's children.
- UI: the student profile is now tabbed — **Overview / History & transcript / Documents**. The history tab is a per-year timeline with translated status badges, average, and an expandable marks table rebuilt by `src/utils/transcript.ts` (results → paper → exam → term → academic year). Placements can be recorded, edited and removed (admin only); a year can only hold one placement.

**2. `student_documents` — same shape as `admission_documents`, now for enrolled students.** Stores metadata only (`type`, `title`, `file_path`, `verified`, `uploaded_by`); the object lives in the existing **private `documents` bucket**.
- New Edge Function `student-documents` (JWT on): verifies the caller on an anon-key client, authorises by role on a service-role client, then mints a **signed upload ticket** or a **1-hour signed download URL**. The file itself is uploaded straight from the browser with `uploadToSignedUrl` — it never passes through the function, and no public URL is ever produced.
- Upload / open / verify / delete all wired in the Documents tab, with an inline confirm on delete and 10 MB client-side limit. Deletes remove the object and the row, and write an audit row.

**3. Record linking so portals are no longer blocked.** New Edge Function `account-links` (`list` / `link` / `unlink` / `provision`) + `/app/account-links` screen.
- The screen lists every staff, student and guardian record against its linked account, with linked/total stats per category and search across name, code and email.
- **Link** attaches an existing login by email. **Create account** provisions a login with a generated one-time temporary password shown once with a copy button, then links it. Both paths upsert the `profiles` identity row, release any previous link on that entity type (identity is 1:1), upsert the role, and write `audit_log`. **Unlink** clears only the link — the login is never deleted.
- Verified baseline before this work: **0 of 36 students, 0 of 8 staff, 0 of 36 guardians** had a linked account. Linking is now a supported, audited operation, which is the prerequisite for every portal.

### Phase 1.5 — Live security close-out + database health page (done)

- **Row-level security is now enforced on the live backend for all 13 campus tables.** Twelve of them (`admission_details`, `student_siblings`, `transport_vehicles`, `transport_routes`, `transport_route_stops`, `transport_allocations`, `hostels`, `hostel_room_types`, `hostel_rooms`, `hostel_allocations`, `income_heads`, `other_incomes`) had the policies from migration 008 defined but the switch still off, so those rules were inert. Verified after execution: all 13 report `relrowsecurity = true` with 2 policies each. Nothing was deleted or restructured; a single `disable row level security` reverses it.
- **`/app/database-health`** — a read-only integrity sweep for admins and the platform owner, also in the Administration menu. It runs 19 checks over 14 tables and flags two failure classes: **orphans** (student→section, guardian links, year placements, invoices, invoice lines, payments, exam marks, attendance, transport and hostel allocations) and **duplicates** (student no., invoice no., receipt no., paper+student marks, student+day attendance, student+year placement). Each finding expands to the affected rows with the student name, and the filtered list prints / exports to CSV through the shared `ExportBar`. The sweep compares id sets in the browser, so it stays one round of parallel reads, respects RLS, and mutates nothing. Live baseline immediately after the RLS change: **19/19 checks clean, 0 orphan rows, 0 duplicate rows**.

---

## 9. Client Reference Plan — Crosswalk

The client supplied a separate planning document (`project plan.txt`) describing a 20-module, 8-role Arabic (RTL) school management system. It is the **functional source of truth for scope**, but it was written against a *different* schema naming convention (`school_*` tables, `schools` tenant table, `school_profiles`) and assumes database triggers for auditing. Our build uses the Readdy Backend schema already in place (`students`, `invoices`, `exams`, `staff`, `classes`, …) and app-side audit writes. Module intent is identical; table names are not.

**Rule going forward:** the reference sets *what* to build. The existing schema, RLS model and `src/api/*` layer decide *how*.

### 9.1 Module status map

| # | Module (reference) | Reference route | Reference data | Status in this build | Where it lives now / what's missing |
|---|---|---|---|---|---|
| 1 | Dashboard | `/` | role-aware landing | ✅ Done | `/app` — live counts, role-gated |
| 2 | Login (real email + password, no demo creds) | `/login` | `school_profiles` | ✅ Done | `/login` + `bootstrap-admin`; no credentials written to code or docs |
| 3 | Password reset from emailed link | `/reset-password` | — | ⛔ Not built | Needs outbound email (Resend) + allowlisted redirect |
| 4 | Students list / profile / bulk file print | `/students` | `students`, `guardians`, `student_guardians` | ✅ Done | `/app/students` (profile modal, ID card, family balances) |
| 5 | Attendance (daily + QR) | `/attendance` | `attendance` | ✅ Done (manual) | `attendance` table live with RLS + seed data. Daily grid per section, whole-class upsert save, quick-mark, 7-day trend, under-80% follow-up list, teacher section scoping. QR check-in still pending |
| 6 | Fees, ledger, installments, maker-checker | `/fees` | `invoices`, `invoice_items`, `payments`, `fee_heads`, `fee_installments`, `fee_approvals` | ✅ Done (core) | Invoicing, payments, receipts, outstanding report, family statements, **installment schedules** (`fee_installments`) and **maker-checker approval queue** (`fee_approvals`, self-review blocked) all done. Full income ledger still separate (module 15) |
| 7 | Exams, marks entry, report cards | `/exams` | `exams`, `exam_subjects`, `exam_results` | ✅ Done (exceeds reference) | `/app/exams`, `/app/exams/marks`, `/app/reports` — teacher section scoping, grade distribution, class ranking, CSV |
| 8 | Staff / HR | `/teachers` | `staff`, `staff_documents` | ✅ Done | `/app/staff` |
| 9 | Classes & timetable / workload | `/classes` | `classes`, `sections`, `class_subjects`, `timetable_slots` | ✅ Done | `/app/academics` |
| 10 | Reports (class averages, attendance rate, fee collection, CSV) | `/reports` | — | ✅ Done | Academic + fee reporting, grade distribution, class ranking CSV, and now **attendance rate by class** (unblocked by module 5) all live |
| 11 | Settings & security (audit log, parent invites, users & permissions, branding) | `/settings` | `audit_log`, `user_roles`, invites | 🟡 Partial | Audit log + role management done. **Missing:** parent-link invitations (`/link-parent?token=`), tenant branding editor, public `/school/:slug` |
| 12 | Platform owner console | `/owner` | `institutions`, owner RPC | ⛔ Not built | `institutions` table exists; no console, no owner RPC |
| 13 | Front office (visitors / enquiries / complaints) | `/front-office` | `visitors`, `enquiries`, `complaints` | ✅ Done | `/app/front-office` |
| 14 | Homework (assignments, submissions, attachments, grades in profile) | `/homework` | `assignments`, `assignment_submissions` + private bucket | ⛔ Not built | No tables, no storage bucket |
| 15 | Finance & accounting (income / expense / approvals / FX / reports) | `/finance` | `finance_entries` | ⛔ Not built | Deliberately separate ledger from student fees |
| 16 | Library catalogue & circulation | `/library` | `library_books`, `library_loans` | ⛔ Not built | Available copies must be derived from open loans, never stored |
| 17 | Comms / announcements | `/comms` | `announcements`, `announcement_reads` | ⛔ Not built | `notifications` table exists but is unused |
| 18 | Transport / Hostel | `/transport`, `/hostel` | — | ⛔ Not built | Reference itself scopes these to a «قريبًا» placeholder |
| 19 | Multi-tenant (`schools` root + `school_id` on every table) + plan entitlements | — | `schools`, `school_plans` | 🟡 Partial | `institutions` exists; no `school_id` fan-out, no plan caps |
| 20 | Parent-child linking via single-use emailed invitation | `/link-parent` | invites table + SECURITY DEFINER RPC | ⛔ Not built | Depends on outbound email |

### 9.2 Reference roadmap, sequenced

Ordering is by dependency and business value, not by the reference's numbering.

- **Phase 6 — Attendance (unblocks reporting). ✅ DONE.** `attendance(id, student_id, section_id, attendance_date, status present/late/absent/excused, remarks, marked_by)` + unique `(student_id, attendance_date)`, RLS mirrored on the invoices pattern. Daily grid per section, quick-mark all, whole-class upsert save, 7-day trend, under-80% follow-up list, teacher section scoping. Attendance rate by class is wired into `/app/reports`. Remaining: QR check-in and the student-profile attendance block.
- **Phase 7 — Installments + maker-checker on fees. ✅ DONE.** `fee_installments` per invoice (split generator, editable rows, mark-paid, total reconciliation) and `fee_approvals` maker-checker queue (request types: adjustment / discount / refund / write-off / other; a different admin must approve; the requester cannot sign off their own request). Remaining for later: automatic chronological payment allocation across installments and reversing-entry corrections instead of edits.
- **Phase 8 — Homework.** `assignments` + `assignment_submissions` (unique per assignment/student), private storage bucket with tenant-scoped path policies, parent upload, teacher grading with feedback, grades surfaced in the student profile.
- **Phase 9 — Finance module.** Income/expense ledger kept separate from student fees, category split, maker-checker threshold, correction requests, CSV + print. Depends on Phase 7's approval pattern, so build it second.
- **Phase 10 — Comms, library, placeholders.** Announcements with audience targeting and read receipts; library catalogue + circulation (available copies derived from open loans); transport/hostel as real «قريبًا» pages so no sidebar link 404s.
- **Phase 11 — Multi-tenant + owner console + branding.** `school_id` on every table with tenant-scoped RLS, plan caps enforced by insert guards, `/owner` with the 4-step onboarding wizard, per-tenant branding (hex → OKLCH token scales), public `/school/:slug`.
- **Phase 12 — Email-dependent flows.** Resend-connected password reset and parent invitations. These are last on purpose: everything above works without outbound email, and these two are worthless until the sending domain is verified.

### 9.3 Constraints to respect when building the above

- **No procedural trigger functions on this backend.** The reference relies on DB triggers for `updated_at`, audit trails and plan-limit enforcement. Here those must live in application code or Edge Functions, so every new write path needs its own explicitly written `audit_log` row.
- **`anon` stays locked out** of all school tables. Every new table ships with RLS enabled and role-based policies in the same migration, not afterwards.
- **Naming:** reference `school_*` table names map to our existing unprefixed names. Do not rename existing tables to match the reference — it would break the whole `src/api/*` layer for zero user benefit.
- **No credentials in this plan or in the client bundle.** The owner account is created through the first-run setup path; passwords are never hardcoded.
- The supplied reference file was truncated after §3 (Core Features) and the beginning of its own §6 (Phases). Only §1–§5 and the phase titles up to Phase 11 were available; modules listed in §2 but not yet described in detail should be re-checked with the client before building.

---

## 10. ERP / LMS Brief — Build State and Queue

The ERP/LMS brief lists four modules. Foundation validation (Phase 0.4) now passes, which was its stated gate. Most of modules 1 and 2 already exist; the honest gap list is below. No duplicate tables are created for anything already covered.

### Module 1 — Student Information System: ~80% built

| Brief item | State | Notes |
| --- | --- | --- |
| Admissions | ✅ Built | `/app/admissions`, `admissions` + `admission_documents` |
| Student profiles | ✅ Built | `/app/students` profile modal, ID card, household balances |
| Enrollment | ✅ Built | `enrollments` table (one row per student per academic year), backfilled for all 36 students, plus a promotion-safe history UI and per-year transcript on the student profile |
| Classes | ✅ Built | `/app/academics` — classes, sections, subject assignments, timetable |
| Attendance | ✅ Built | `/app/attendance` — daily grid, class upsert, trend, follow-up list |
| Academic history | ✅ Built | Per-year transcript rebuilt from `exam_results` → `exam_subjects` → `exams` → `terms` → `academic_years`, rendered per enrollment year with average and expandable marks |
| Documents | ✅ Built | `student_documents` + private `documents` bucket, signed upload/download via `student-documents` function; upload, open, verify, delete |

### Module 2 — Finance ERP: ~75% built

| Brief item | State | Notes |
| --- | --- | --- |
| Fee management | ✅ Built | `fee_heads`, `/app/fees` |
| Invoices | ✅ Built | `invoices` + `invoice_items`, create/print |
| Payments | ✅ Built | `payments`, status recalculation, maker-checker for adjustments |
| Receipts | ✅ Built | `receipt_no` + printable A4 `FeeReceipt` |
| Installments | ✅ Built | `fee_installments` with split generator and reconciliation guard |
| Scholarships | ⛔ Missing | Only an invoice-level `discount` number; no scholarship/concession entity, no coverage rules, no expiry |
| Financial reports | 🟡 Partial | Outstanding + family statements + CSV exist; missing collection-over-time, per-fee-head recovery and scholarship impact |

### Module 3 — Portals: unblocked, shells not built

Six portals (admin / teacher / student / parent / accountant / HR) all rest on Supabase Auth. Before this phase **one** account existed and **no** student, guardian or staff record was linked to an identity. `/app/account-links` (`account-links` function) now provides audited link / provision / unlink for all three record types, so record→account identity is no longer the blocker. What remains is building the role-scoped portal shells and their read policies.

### Module 4 — LMS: not started

`exam_*` covers assessment only. Nothing for courses, lessons, assignments, or certificates.

### Next build queue (proposed order)

1. **Link records to accounts at scale** — run the new linking screen across all 36 students, 36 guardians and 8 staff, then build the student and parent portal shells on the existing `enrollments` self-read and `invoices` student-read policies.
2. **Scholarships** (entity + coverage rules + invoice application + impact report).
3. **Homework** (assignments + submissions + private attachments), reusing the `student-documents` signed-URL pattern.
4. **LMS foundation** (courses → lessons → assignments → grades → certificates).
