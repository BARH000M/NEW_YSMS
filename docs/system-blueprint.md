# SAI College — School Management System Blueprint

Status: PROPOSAL / PRE-BUILD. No application code has been written for this scope yet.
Backend status at time of writing: **not connected** (neither Readdy Backend nor SaaS Supabase).
Date: 2026-10-28

---

## 1. What the reference images actually describe

The five reference images are a sales presentation for a school management product ("Smart School"). Reading them line by line, the vendor is promising 20 modules across 8 user types.

### 1.1 Module inventory from the references

| # | Module | What it must do |
|---|--------|-----------------|
| 1 | Student admission form | Structured online enrolment with document upload, status tracking |
| 2 | Fees collection | Fee heads, invoices, partial payment, receipts, dues ageing |
| 3 | Examination | Exam terms, subject marks entry, grade/percentage, report cards |
| 4 | Attendance | One-click daily attendance for students and staff |
| 5 | Teacher restricted mode | A teacher sees only their own classes/subjects, nothing else |
| 6 | Front CMS | Edit website pages, news, banners, menus from inside the system |
| 7 | HR module + payroll | Staff records, salary components, deductions, attendance-linked pay, payslips |
| 8 | Front office / admission leads | Enquiries, calls, complaints, visitors, postal register |
| 9 | Print certificates / letters / ID cards | Templated PDF output with serial numbers |
| 10 | Homework | Assign per subject/class, receive submissions, evaluate and grade |
| 11 | Student & staff timeline | Merged chronological activity feed per person |
| 12 | Student history | Full academic record across years |
| 13 | Calendar + to-do | Academic calendar, exam dates, personal tasks |
| 14 | Enable / disable students & staff | Soft deactivate accounts without deleting history |
| 15 | Business intelligence reports | Charts for collection, attendance, results, enrolment trend |
| 16 | Roles and permissions | Granular per-role access matrix |
| 17 | Enable / disable modules | Turn whole modules on/off per institution |
| 18 | Parent panel | Child monitoring: attendance, marks, fees, homework |
| 19 | Track everything | Central dashboard summary |
| 20 | Responsive UI / support | Works on phone, tablet, desktop |

### 1.2 The 8 user types

Super Admin, Admin, Teacher, Accountant, Student, Parent, Receptionist, Librarian.

The "How it works" diagram in image 5 makes the role boundaries explicit:

- **Super Admin** — manages all institutions, all settings, all modules
- **Admin** — manages staff and students, all daily operations
- **Teacher** — students and subjects only, restricted to own classes
- **Accountant** — expenses, salary, fees
- **Student** — limited access: attendance, marks, homework, communicate with teacher
- **Parent** — child attendance, marks, fees, updates, communicate with admin
- **Receptionist** — enquiries, calls, complaints, visitor log, postal
- **Librarian** — book issue/return, fines, library inventory

This maps 1:1 onto the screenshots of the admin panel, so I'll treat the references as the functional spec.

---

## 2. What we will build

### 2.1 Two surfaces, one backend

**Surface A — Public website (mostly exists already)**
- Home, Online Admission, Complain, Contact (built, Arabic default, AR/EN/ZH)
- Add a new "System" product section that reflects the screenshots: 20 modules, 8 roles, how-it-works diagram
- Login entry point

**Surface B — Management application (`/app/*`)**
- Protected, role-aware dashboard
- Separate shells per role group:
  - Admin shell: left sidebar, dense tables, module switcher
  - Teacher shell: reduced nav, attendance + homework + marks only
  - Parent / Student shell: mobile-first, bottom tab bar, cards not tables
  - Accountant / Receptionist / Librarian: scoped single-domain shells

### 2.2 Application route map

```
/app/login                      Public
/app                            Dashboard (role-aware widget set)
/app/admissions                 Admin, Receptionist
/app/students                   Admin, Receptionist (Teacher: read, own classes)
/app/students/:id               Profile, timeline, history, documents
/app/staff                      Admin
/app/staff/:id                  Profile, timeline, payroll link
/app/academics/classes          Admin
/app/academics/subjects         Admin
/app/academics/timetable        Admin, Teacher
/app/attendance                 Admin, Teacher
/app/homework                   Teacher, Student, Parent
/app/exams                      Admin
/app/exams/:id/marks            Teacher (own subjects), Admin
/app/exams/results              Admin, Teacher, Student, Parent
/app/fees                       Accountant, Admin
/app/fees/invoices/:id          Accountant, Parent (own child)
/app/hr/payroll                 Admin, Accountant
/app/library                    Librarian, Admin
/app/front-office               Receptionist, Admin
/app/cms                        Admin
/app/certificates               Admin, Receptionist
/app/reports                    Admin, Accountant
/app/settings/users             Admin
/app/settings/roles             Super Admin
/app/settings/modules           Super Admin
/app/settings/school            Admin
/app/portal                     Parent / Student mobile home
```

### 2.3 Navigation shells

- Desktop: fixed 260px sidebar + 64px top bar. Sidebar groups: Dashboard, People, Academics, Finance, Operations, Reports, Settings.
- Tablet (768–1024): sidebar collapses to icon rail.
- Mobile (<768): sidebar becomes a drawer; parent/student get a bottom tab bar (Home / Attendance / Marks / Fees / More).
- Every table has a mobile card fallback — no horizontal scroll on phones.

---

## 3. Data model

All tables live in schema `public`. Every table has `id uuid default gen_random_uuid()`, `created_at`, `updated_at`. Soft delete via `deleted_at` where history matters (students, staff, invoices) — never hard delete.

### 3.1 Identity and access

| Table | Key columns |
|-------|-------------|
| `profiles` | id (= auth.users.id), full_name, role, phone, avatar_url, locale, is_active, last_login_at |
| `role_permissions` | role, module, can_view, can_create, can_edit, can_delete |
| `institutions` | name, name_ar, name_zh, logo_url, address, phone, email, timezone, currency |
| `settings` | institution_id, key, value jsonb |
| `module_flags` | module, is_enabled |
| `audit_log` | actor_id, action, table_name, record_id, before jsonb, after jsonb, ip |
| `notifications` | user_id, title, body, channel, read_at, link |

### 3.2 Academic structure

| Table | Key columns |
|-------|-------------|
| `academic_years` | name, start_date, end_date, is_current |
| `terms` | academic_year_id, name, start_date, end_date |
| `classes` | academic_year_id, name, level, capacity |
| `sections` | class_id, name, room, class_teacher_id |
| `subjects` | code, name, name_ar, name_zh, credit_hours |
| `class_subjects` | section_id, subject_id, teacher_id — the backbone of teacher restriction |
| `timetable_slots` | section_id, subject_id, day_of_week, period, start_time, end_time, teacher_id |
| `calendar_events` | title, type, starts_at, ends_at, audience, class_id |

### 3.3 People

| Table | Key columns |
|-------|-------------|
| `students` | profile_id (nullable), student_no, first_name, last_name, first_name_ar, dob, gender, nationality, section_id, admission_id, status, photo_url, enrolled_at |
| `guardians` | profile_id (nullable), full_name, relation, phone, email, occupation, address |
| `student_guardians` | student_id, guardian_id, is_primary |
| `staff` | profile_id, staff_no, designation, department, join_date, contract_type, is_active, base_salary |
| `staff_documents` | staff_id, type, file_path, expires_at |

### 3.4 Admissions and front office

| Table | Key columns |
|-------|-------------|
| `admissions` | applicant_name, phone, email, program_id, preferred_schedule, education_level, notes, status, source, assigned_to, converted_student_id |
| `admission_documents` | admission_id, type, file_path, verified |
| `enquiries` | name, phone, subject, message, handled_by, status |
| `complaints` | subject, type, details, is_anonymous, contact, status, reference_no, resolution |
| `visitors` | name, phone, purpose, host_staff_id, in_at, out_at, badge_no |
| `postal_records` | direction, sender, recipient, reference, received_at |

### 3.5 Attendance

| Table | Key columns |
|-------|-------------|
| `student_attendance` | date, section_id, student_id, status (present/absent/late/leave), note, marked_by |
| `staff_attendance` | date, staff_id, check_in, check_out, status, marked_by |

Unique index on `(date, student_id)` and `(date, staff_id)` — one record per person per day, so re-saving is an update, not a duplicate.

### 3.6 Exams and results

| Table | Key columns |
|-------|-------------|
| `exams` | term_id, name, type, starts_on, ends_on, published |
| `exam_subjects` | exam_id, section_id, subject_id, max_marks, pass_marks, exam_date |
| `marks` | exam_subject_id, student_id, obtained, remark, entered_by |
| `grading_scales` | name, min_percent, max_percent, grade, gpa, is_pass |
| `results` | exam_id, student_id, total, percentage, grade, gpa, rank, published |

### 3.7 Fees and payments

| Table | Key columns |
|-------|-------------|
| `fee_heads` | name, name_ar, is_recurring, is_optional |
| `fee_structures` | academic_year_id, section_id, fee_head_id, amount, due_day |
| `invoices` | invoice_no, student_id, term_id, issue_date, due_date, subtotal, discount, total, paid, status |
| `invoice_items` | invoice_id, fee_head_id, description, amount |
| `concessions` | student_id, fee_head_id, type (percent/fixed), value, reason, approved_by |
| `payments` | invoice_id, amount, method, reference, paid_at, received_by, receipt_no, gateway_txn_id, status |
| `expenses` | category, description, amount, spent_on, approved_by, attachment_path |

### 3.8 HR and payroll

| Table | Key columns |
|-------|-------------|
| `salary_components` | name, type (earning/deduction), is_percent, value |
| `staff_salary_components` | staff_id, component_id, amount |
| `payroll_runs` | month, year, status (draft/finalised/paid), total_gross, total_net, run_by |
| `payslips` | payroll_run_id, staff_id, gross, total_deductions, net, breakdown jsonb, pdf_path |
| `leave_requests` | staff_id, type, from_date, to_date, status, approved_by |
| `staff_advances` | staff_id, amount, installment, balance |

### 3.9 Learning and library

| Table | Key columns |
|-------|-------------|
| `homework` | section_id, subject_id, title, description, due_date, attachment_path, created_by |
| `homework_submissions` | homework_id, student_id, file_path, submitted_at, marks, feedback, evaluated_by |
| `books` | isbn, title, author, category, publisher |
| `book_copies` | book_id, copy_code, status, shelf |
| `book_loans` | copy_id, student_id, staff_id, issued_at, due_at, returned_at, fine_amount, fine_paid |

### 3.10 CMS, documents and tracking

| Table | Key columns |
|-------|-------------|
| `cms_pages` | slug, title jsonb (ar/en/zh), body jsonb, status, published_at |
| `cms_posts` | slug, title jsonb, excerpt jsonb, body jsonb, cover_url, category, status, published_at |
| `cms_media` | file_path, alt, width, height, uploaded_by |
| `issued_documents` | type (certificate/id_card/letter), student_id, staff_id, serial_no, template, pdf_path, issued_by |
| `student_history` | student_id, academic_year_id, section_id, result, promoted |
| `activity_feed` | subject_type, subject_id, event, summary, actor_id, occurred_at |

`activity_feed` is what powers "student and staff timeline" — one append-only table instead of per-module history tables.

### 3.11 Derived views

- `v_student_dues` — invoice totals minus paid, per student
- `v_attendance_monthly` — attendance percentage per student per month
- `v_class_strength` — enrolled count per section
- `v_fee_collection_daily` / `v_fee_collection_monthly` — for BI charts
- `v_payroll_summary` — gross/deduction/net per run

Views run with `security_invoker = true` so the caller's RLS still applies. No view ever bypasses row security.

---

## 4. Security model

This is the part that actually decides whether the system is safe. A school holds minors' data, medical notes, guardian phone numbers, salaries, and money. Treat it as high sensitivity.

### 4.1 Authentication

- Supabase Auth, email + password.
- **No public self-signup.** Accounts are created by an Admin (invite flow via Edge Function using the service role key). Students and parents receive an invite link with a forced password set.
- Password policy: minimum 10 characters, checked against a weak-password list, reset via email token.
- Optional Google sign-in for staff only.
- MFA (TOTP) required for Super Admin and Admin, optional for Accountant.
- Session: short-lived access token, refresh rotation, auto sign-out after 30 min idle on shared office machines.
- Role is **never** stored in `user_metadata` (users can edit their own metadata). It lives in `public.profiles.role` and is read server-side.

### 4.2 Row Level Security

Every table: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` with no permissive default. Deny by default, then explicit grants.

Helper functions (all `security definer`, `stable`, locked `search_path`):

```sql
current_role()                 -- reads profiles.role for auth.uid()
is_admin()                     -- role in ('super_admin','admin')
teaches_section(section uuid)  -- exists in class_subjects for auth.uid()
is_own_child(student uuid)     -- exists in student_guardians for auth.uid()
is_own_student(student uuid)   -- students.profile_id = auth.uid()
can_finance()                  -- role in ('accountant','admin')
```

Policy patterns:

| Table | Policy |
|-------|--------|
| `students` | Admin: all. Teacher: `teaches_section(section_id)`. Student: own row. Parent: `is_own_child(id)`. Receptionist: all but no edit of academic fields |
| `marks` | Admin: all. Teacher: only `exam_subjects` they teach, and only while `exams.published = false`. Student/parent: only published results for own/child |
| `invoices`, `payments` | Accountant/Admin full. Parent: own child, read only |
| `payroll_runs`, `payslips` | Admin + Accountant full. Staff: own payslip only |
| `complaints` | Receptionist/Admin full. Anonymous complaints carry no identity columns at all |
| `homework` | Teacher: own sections. Student/parent: own section, read |
| `book_loans` | Librarian full. Student: own loans |
| `audit_log` | Super Admin read only, nobody can update or delete |

Critical detail: RLS helper functions must not recursively query the same table inside its own policy. I use `security definer` functions that read `profiles` and membership tables, so no policy recurses.

### 4.3 Storage

| Bucket | Public | Access |
|--------|--------|--------|
| `avatars` | yes | owner writes own folder, admin writes any |
| `documents` | no | signed URLs only, 5-minute expiry, per-owner policy |
| `cms-media` | yes | admin write |
| `certificates` | no | admin writes, owner reads via signed URL |
| `homework-submissions` | no | student writes own, teacher of that section reads |

Uploads validated client-side and server-side: max 5 MB, MIME allowlist (pdf, jpg, png), filename sanitised to lowercase alphanumeric. Readdy Backend requires 1–63 lowercase characters — no Arabic filenames, no spaces, no uppercase.

### 4.4 Edge Functions (the only place with the service role key)

| Function | Purpose | Auth |
|----------|---------|------|
| `admin-create-user` | Invite staff/student/parent, assign role | JWT + admin role check |
| `fees-create-checkout` | Build gateway session from an invoice, amount recomputed server-side | JWT |
| `fees-webhook` | Receive payment confirmation, mark invoice paid, write receipt | `verify_jwt = false`, gateway signature verified |
| `payroll-finalise` | Compute payslips in one transaction, lock run | JWT + admin/accountant |
| `documents-render` | Generate certificate / ID card / payslip PDF, store, return signed URL | JWT |
| `notify-send` | Email via Resend (invoice, receipt, admission status, attendance alert) | JWT + staff role |

Rules enforced in code:
- The service role key is **never** shipped to the browser. Frontend uses only the anon key.
- Payments: the client sends an invoice id, never an amount. Amount comes from the database. Gateway webhook is the single source of truth for "paid".
- Every edge function verifies the caller JWT, reads `profiles.role`, and re-checks permission — RLS does not apply to the service role client.
- Two clients inside a function that both authenticates and does privileged work: anon client only for `auth.getUser(token)`, service-role client only for the writes. Never call `auth.getUser` on the service-role client.

### 4.5 Other hardening

- Audit log written by database triggers on money and marks tables, not by the UI.
- No PII in client console logs, no PII in URLs (use ids).
- Public forms: server-side validation, honeypot fields, rate limiting, and no error text that reveals whether a phone number exists.
- Password reset and invite emails do not disclose account existence.
- Field-level masking: guardian phone shown partially to teachers.
- Daily backups; 30-day retention on `audit_log`; 7-year retention on financial records.
- Content-Security-Policy added only after every external origin is inventoried (fonts, icons, Supabase, maps, gateway).

---

## 5. Integration plan

| Integration | Use | Status |
|-------------|-----|--------|
| Readdy Backend **or** SaaS Supabase | Auth, Postgres, Storage, Realtime, Edge Functions | **Not connected — must connect first** |
| Stripe / Toss / PayPal / Square | Online fee payment | Choose one; region matters (Yemen) |
| Resend | Transactional email: invite, receipt, invoice due, admission status, payslip | Product panel not configured |
| JS PDF generation | Certificates, ID cards, payslips, report cards | Needs a library decision |
| Recharts | BI charts (already installed) | Ready |
| Google Maps embed | Contact page (already live) | Ready |
| WhatsApp deep link | Parent ↔ school messaging | Ready |
| Built-in Form service | Public admission / complaint / contact (already wired) | Ready |

### 5.1 Why the backend must be connected first

Every module above depends on persistent, per-user, permission-filtered data. Building screens against mock arrays would produce something that looks done but cannot be used by a real school. So: connect the backend, create the schema and RLS, then build the UI module by module against real tables.

Two choices, both Supabase-compatible under the hood but separate products with separate data:
- **Readdy Backend** — managed inside this workspace, simplest path.
- **SaaS Supabase** — your own Supabase project, you own the dashboard and billing.

### 5.2 Payment provider decision needed

Yemen has limited card penetration. Realistically a school here collects cash and bank transfer, with online payment as an optional extra. My recommendation: build the fee module around **manual receipting** first (Accountant marks cash/bank payment, system issues receipt), and treat online gateway checkout as a later add-on. That avoids locking you to a provider that cannot serve your parents.

---

## 6. API layer

- One typed data module per domain: `src/api/students.ts`, `src/api/fees.ts`, etc. Components never call `supabase.from()` directly.
- Reads: `supabase.from(...).select()` with explicit column lists, always `.maybeSingle()` instead of `.single()`.
- Aggregates: Postgres functions exposed via `rpc()` — attendance percentages, dues ageing, collection totals. Never fetch 10k rows to sum in the browser.
- Writes: server-validated. Money and marks writes go through RPC for transactional integrity.
- Caching: SWR-style hooks with revalidation on focus, optimistic updates only for attendance marking and task toggles.
- Error contract: every hook returns `{ data, error, loading, refetch }`; every page renders an error state with a retry button, never an infinite spinner.
- Realtime: subscribe only to `notifications` and the current attendance sheet. Everything else refetches on navigation.

---

## 7. Mobile friendliness

The references explicitly claim "modern, responsive, user friendly". Concretely:

- Breakpoints: mobile < 768, tablet 768–1024, desktop > 1024.
- Admin desktop-first, but every table renders as stacked cards below 768px with the key field as the card title.
- Parent and student shells are designed mobile-first — most parents will only ever use a phone.
- Bottom tab bar for parent/student; drawer nav for staff.
- Sticky bottom action bar on long forms (Save / Cancel), min 44px touch targets.
- Charts reflow to single-column, no horizontal scroll.
- Installable web app: manifest, icons, theme colour. Offline caching only if explicitly requested (a school system with stale marks is worse than no app).
- RTL: every layout must work mirrored. Use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) instead of `ml-`/`mr-`.
- Arabic default, English and Chinese switch retained from the current site, including all admin screens.

---

## 8. Delivery phases

| Phase | Contents | Depends on |
|-------|----------|-----------|
| 0 | Connect backend, create schema, RLS, helper functions, storage buckets | Backend connection |
| 1 | Auth + invite flow + role shells + settings/modules | Phase 0 |
| 2 | Students, guardians, staff, classes, sections, subjects, timetable | Phase 1 |
| 3 | Attendance (student + staff), homework, calendar/to-do | Phase 2 |
| 4 | Exams, marks entry, grading, results, report cards | Phase 2 |
| 5 | Fees: structures, invoices, receipts, dues, expenses | Phase 2 |
| 6 | HR: salary setup, payroll run, payslips, leave | Phase 2 |
| 7 | Front office, complaints, library, CMS, issued documents | Phase 2 |
| 8 | Parent/student portal, notifications, BI reports, mobile polish | Phases 3–5 |
| 9 | Online payment gateway (only after provider decision) | Phase 5 |
| 10 | Public site: "System" product section matching the references | Independent |

Each phase ends with a build check and a working demo, not a half-finished pile.

---

## 9. Risks and honest limitations

1. **Scope.** These references describe roughly a year of product work in a normal team. We should ship phase by phase, not one giant drop.
2. **No backend yet.** Nothing database-backed can be built until Readdy Backend or SaaS Supabase is connected.
3. **Multi-tenant or single school?** The screenshots sell to many institutions ("Super Admin — manages all institutions"). Supporting true multi-tenancy from day one adds an `institution_id` on nearly every table plus tighter RLS. Supporting one college is much simpler. This must be decided before phase 0.
4. **Payroll and money modules need real rules.** Tax, deductions, overtime, leave — I cannot invent these. I need the actual policy.
5. **Legal.** Student data of minors, plus 7-year financial retention. Needs a written privacy notice and a named data controller.
6. **PDF output** needs a library decision and template designs from you (certificate layout, ID card layout).
7. **Email deliverability** requires a verified sending domain in Resend.
8. **Arabic content** in admin UI needs your review — machine translation of academic terms is risky.

---

## 10. What I need from you before phase 0

1. Connect Readdy Backend or SaaS Supabase.
2. Confirm single college or multi-school.
3. Confirm phase 1 priority (which module matters most on day one).
4. Confirm fee collection method (cash receipt first, or gateway now).
5. Provide real payroll/fee rules and certificate/ID card templates when we reach those phases.

---

## 11. Explicitly not doing yet

- No mock-data admin screens that pretend to be functional.
- No hard-coded credentials, no service role key in the browser.
- No payment gateway wiring before a provider is chosen and the backend exists.
- No admin CRUD that bypasses RLS.