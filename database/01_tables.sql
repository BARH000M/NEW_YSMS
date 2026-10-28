-- ============================================================================
--  SAI College — Academic OS
--  01 / 04 — TABLES
-- ----------------------------------------------------------------------------
--  Creates every table in the public schema. No keys, no indexes and no
--  policies live here — they come in 02 and 03 so the order never matters.
--
--  Run this file first, as the `postgres` role, in the Supabase SQL editor.
--  It is safe to run on an empty project. It uses "if not exists", so running
--  it twice will not destroy anything.
--
--  Requires: pgcrypto (gen_random_uuid) — enabled by default on Supabase.
-- ============================================================================

create extension if not exists pgcrypto;


-- ---------------------------------------------------------------------------
-- 1. Identity, access and platform settings
-- ---------------------------------------------------------------------------

create table if not exists public.institutions (
  id uuid default gen_random_uuid() not null,
  name text not null,
  name_ar text,
  name_zh text,
  code text,
  logo_url text,
  address text,
  phone text,
  email text,
  timezone text default 'Asia/Aden'::text not null,
  currency text default 'YER'::text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.profiles (
  id uuid not null,
  institution_id uuid,
  full_name text,
  full_name_ar text,
  phone text,
  avatar_url text,
  locale text default 'ar'::text not null,
  is_active boolean default true not null,
  last_login_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.user_roles (
  user_id uuid not null,
  institution_id uuid,
  role text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.role_permissions (
  role text not null,
  module text not null,
  can_view boolean default false not null,
  can_create boolean default false not null,
  can_edit boolean default false not null,
  can_delete boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.settings (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  key text not null,
  value jsonb,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.module_flags (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  module text not null,
  is_enabled boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.notifications (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  user_id uuid,
  title text not null,
  body text,
  channel text default 'in_app'::text not null,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.audit_log (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  actor_id uuid,
  action text not null,
  table_name text not null,
  record_id uuid,
  before jsonb,
  after jsonb,
  ip text,
  created_at timestamp with time zone default now() not null
);


-- ---------------------------------------------------------------------------
-- 2. Academic structure  (year -> term -> class -> section)
-- ---------------------------------------------------------------------------

create table if not exists public.academic_years (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  name text not null,
  start_date date,
  end_date date,
  is_current boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.terms (
  id uuid default gen_random_uuid() not null,
  academic_year_id uuid not null,
  name text not null,
  start_date date,
  end_date date,
  is_current boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.subjects (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  code text,
  name text not null,
  name_ar text,
  name_zh text,
  credit_hours integer default 0 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  subject_type text default 'theory'::text not null
);

create table if not exists public.classes (
  id uuid default gen_random_uuid() not null,
  academic_year_id uuid not null,
  name text not null,
  level integer,
  capacity integer default 30 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.sections (
  id uuid default gen_random_uuid() not null,
  class_id uuid not null,
  name text not null,
  room text,
  class_teacher_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.class_subjects (
  id uuid default gen_random_uuid() not null,
  section_id uuid not null,
  subject_id uuid not null,
  teacher_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.timetable_slots (
  id uuid default gen_random_uuid() not null,
  section_id uuid not null,
  subject_id uuid,
  teacher_id uuid,
  day_of_week integer not null,
  period integer default 1 not null,
  start_time time without time zone,
  end_time time without time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.calendar_events (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  title text not null,
  type text default 'general'::text not null,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  audience text default 'all'::text not null,
  class_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.grade_bands (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  name text not null,
  percent_from numeric(5,2) default 0 not null,
  percent_upto numeric(5,2) default 100 not null,
  remark text,
  sort_order integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);


-- ---------------------------------------------------------------------------
-- 3. People  (staff, students, guardians)
-- ---------------------------------------------------------------------------

create table if not exists public.staff (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  profile_id uuid,
  staff_no text,
  full_name text not null,
  full_name_ar text,
  designation text,
  department text,
  join_date date,
  contract_type text default 'full_time'::text not null,
  base_salary numeric(12,2) default 0 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.staff_documents (
  id uuid default gen_random_uuid() not null,
  staff_id uuid not null,
  type text not null,
  file_path text,
  expires_at date,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.students (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  profile_id uuid,
  admission_id uuid,
  student_no text,
  first_name text not null,
  last_name text,
  first_name_ar text,
  last_name_ar text,
  dob date,
  gender text,
  nationality text,
  section_id uuid,
  status text default 'active'::text not null,
  photo_url text,
  enrolled_at date,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  category text,
  address text,
  blood_group text,
  mobile text,
  admission_date date
);

create table if not exists public.student_profile_extras (
  student_id uuid not null,
  caste text,
  religion text,
  rte boolean default false,
  skill_ability text,
  mother_tongue text,
  national_id text,
  father_name text,
  mother_name text,
  guardian_occupation text,
  city text,
  state text,
  postal_code text,
  prev_school_name text,
  prev_school_class text,
  prev_school_tc_no text,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.guardians (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  profile_id uuid,
  full_name text not null,
  relation text default 'father'::text not null,
  phone text,
  email text,
  occupation text,
  address text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.student_guardians (
  id uuid default gen_random_uuid() not null,
  student_id uuid not null,
  guardian_id uuid not null,
  is_primary boolean default false not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.student_siblings (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  student_id uuid not null,
  sibling_name text not null,
  sibling_student_id uuid,
  relation text,
  class_name text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.enrollments (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  student_id uuid not null,
  academic_year_id uuid not null,
  section_id uuid,
  class_id uuid,
  roll_no integer,
  status text default 'enrolled'::text not null,
  started_on date,
  ended_on date,
  final_average numeric(5,2),
  result text,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.student_documents (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  student_id uuid not null,
  type text default 'other'::text not null,
  title text,
  file_path text,
  verified boolean default false not null,
  uploaded_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);


-- ---------------------------------------------------------------------------
-- 4. Admissions and front office
-- ---------------------------------------------------------------------------

create table if not exists public.admissions (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  applicant_name text not null,
  phone text,
  email text,
  program text,
  preferred_schedule text,
  education_level text,
  notes text,
  status text default 'new'::text not null,
  source text default 'website'::text not null,
  reference_no text,
  assigned_to uuid,
  converted_student_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.admission_documents (
  id uuid default gen_random_uuid() not null,
  admission_id uuid not null,
  type text not null,
  file_path text,
  verified boolean default false not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.admission_details (
  admission_id uuid not null,
  middle_name text,
  dob date,
  gender text,
  blood_group text,
  nationality text,
  mother_tongue text,
  religion text,
  caste text,
  category text,
  rte boolean default false,
  national_id text,
  address text,
  city text,
  state text,
  postal_code text,
  father_name text,
  father_occupation text,
  mother_name text,
  mother_occupation text,
  guardian_name text,
  guardian_phone text,
  guardian_relation text,
  annual_income text,
  prev_school_name text,
  prev_school_class text,
  prev_school_tc_no text,
  prev_school_percentage text,
  transport_required boolean default false,
  hostel_required boolean default false,
  siblings jsonb default '[]'::jsonb,
  documents jsonb default '[]'::jsonb,
  medical_notes text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.enquiries (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  name text not null,
  phone text,
  subject text,
  message text,
  status text default 'open'::text not null,
  handled_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.complaints (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  reference_no text,
  subject text not null,
  type text default 'general'::text not null,
  details text,
  is_anonymous boolean default false not null,
  contact text,
  status text default 'new'::text not null,
  resolution text,
  handled_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.visitors (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  name text not null,
  phone text,
  purpose text,
  host_staff_id uuid,
  badge_no text,
  in_at timestamp with time zone default now() not null,
  out_at timestamp with time zone,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.postal_records (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  direction text not null,
  sender text,
  recipient text,
  reference text,
  received_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.call_logs (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  caller_name text not null,
  phone text,
  direction text default 'incoming'::text not null,
  purpose text,
  call_at timestamp with time zone default now() not null,
  handled_by uuid,
  notes text,
  created_at timestamp with time zone default now() not null
);


-- ---------------------------------------------------------------------------
-- 5. Fees and finance
-- ---------------------------------------------------------------------------

create table if not exists public.fee_heads (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  name text not null,
  code text,
  category text default 'tuition'::text not null,
  amount numeric(12,2) default 0 not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.invoices (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  student_id uuid not null,
  term_id uuid,
  invoice_no text not null,
  issue_date date default CURRENT_DATE not null,
  due_date date,
  status text default 'unpaid'::text not null,
  subtotal numeric(12,2) default 0 not null,
  discount numeric(12,2) default 0 not null,
  total numeric(12,2) default 0 not null,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.invoice_items (
  id uuid default gen_random_uuid() not null,
  invoice_id uuid not null,
  fee_head_id uuid,
  description text not null,
  amount numeric(12,2) default 0 not null
);

create table if not exists public.payments (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  invoice_id uuid not null,
  student_id uuid not null,
  amount numeric(12,2) default 0 not null,
  method text default 'cash'::text not null,
  receipt_no text,
  paid_at timestamp with time zone default now() not null,
  received_by uuid,
  reference text,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.fee_installments (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  invoice_id uuid not null,
  seq integer default 1 not null,
  label text,
  amount numeric(12,2) default 0 not null,
  due_date date,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.fee_approvals (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  request_type text default 'adjustment'::text not null,
  title text,
  student_id uuid,
  invoice_id uuid,
  amount numeric(12,2) default 0 not null,
  payload jsonb,
  note text,
  status text default 'pending'::text not null,
  requested_by uuid,
  requested_by_name text,
  reviewed_by uuid,
  reviewed_by_name text,
  review_note text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default now()
);

create table if not exists public.fee_discounts (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  name text not null,
  code text,
  discount_type text default 'fixed'::text not null,
  amount numeric(12,2) default 0 not null,
  description text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.fee_discount_allotments (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  discount_id uuid not null,
  student_id uuid not null,
  academic_year_id uuid,
  amount numeric(12,2),
  note text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.expenses (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  title text not null,
  category text default 'other'::text not null,
  amount numeric(12,2) default 0 not null,
  spent_on date default CURRENT_DATE not null,
  method text default 'cash'::text not null,
  reference text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.income_heads (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  name text not null,
  code text,
  description text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.other_incomes (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  head_id uuid,
  title text not null,
  amount numeric default 0 not null,
  received_on date default CURRENT_DATE not null,
  method text default 'cash'::text not null,
  reference text,
  receipt_url text,
  receipt_name text,
  notes text,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);


-- ---------------------------------------------------------------------------
-- 6. Assessment, attendance and coursework
-- ---------------------------------------------------------------------------

create table if not exists public.exams (
  id uuid default gen_random_uuid() not null,
  institution_id uuid not null,
  term_id uuid,
  name text not null,
  exam_type text default 'midterm'::text not null,
  starts_on date,
  ends_on date,
  status text default 'scheduled'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.exam_subjects (
  id uuid default gen_random_uuid() not null,
  exam_id uuid not null,
  subject_id uuid not null,
  section_id uuid,
  exam_date date,
  start_time time without time zone,
  duration_minutes integer default 60 not null,
  max_marks numeric(6,2) default 100 not null,
  pass_marks numeric(6,2) default 50 not null,
  end_time time without time zone,
  room text
);

create table if not exists public.exam_results (
  id uuid default gen_random_uuid() not null,
  exam_id uuid not null,
  exam_subject_id uuid not null,
  student_id uuid not null,
  marks_obtained numeric(6,2) default 0 not null,
  grade text,
  remarks text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

create table if not exists public.attendance (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  student_id uuid not null,
  section_id uuid,
  attendance_date date not null,
  status text default 'present'::text not null,
  remarks text,
  marked_by uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.assignments (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  section_id uuid,
  subject_id uuid,
  title text not null,
  instructions text,
  due_date date,
  max_score numeric(6,2) default 100 not null,
  is_published boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.online_courses (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  title text not null,
  provider text,
  url text,
  level text default 'beginner'::text not null,
  description text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);


-- ---------------------------------------------------------------------------
-- 7. Campus services  (content, library, messages, transport, hostel)
-- ---------------------------------------------------------------------------

create table if not exists public.download_contents (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  title text not null,
  content_type text default 'syllabus'::text not null,
  class_id uuid,
  description text,
  file_name text,
  file_url text,
  publish_date date default CURRENT_DATE not null,
  is_published boolean default true not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.notices (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  title text not null,
  body text,
  audience text default 'all'::text not null,
  is_pinned boolean default false not null,
  publish_date date default CURRENT_DATE not null,
  created_by uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.library_books (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  title text not null,
  isbn text,
  author text,
  publisher text,
  subject text,
  rack_no text,
  quantity integer default 1 not null,
  price numeric(12,2) default 0 not null,
  post_date date default CURRENT_DATE not null,
  description text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.library_members (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  member_type text default 'student'::text not null,
  student_id uuid,
  staff_id uuid,
  card_no text,
  name text not null,
  phone text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.library_issues (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  book_id uuid not null,
  member_id uuid not null,
  issued_on date default CURRENT_DATE not null,
  due_on date,
  returned_on date,
  status text default 'issued'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.messages (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  sender_id uuid,
  sender_name text default 'School Office'::text not null,
  sender_role text,
  subject text not null,
  body text not null,
  audience text default 'all'::text not null,
  recipient_id uuid,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.message_reads (
  message_id uuid not null,
  user_id uuid not null,
  read_at timestamp with time zone default now() not null
);

create table if not exists public.transport_vehicles (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  vehicle_no text not null,
  model text,
  capacity integer default 0 not null,
  driver_name text,
  driver_phone text,
  driver_license text,
  insurance_expiry date,
  notes text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.transport_routes (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  name text not null,
  start_point text,
  end_point text,
  distance_km numeric,
  fare numeric default 0 not null,
  vehicle_id uuid,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.transport_route_stops (
  id uuid default gen_random_uuid() not null,
  route_id uuid not null,
  stop_name text not null,
  pickup_time text,
  drop_time text,
  sort_order integer default 0 not null
);

create table if not exists public.transport_allocations (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  student_id uuid not null,
  route_id uuid not null,
  stop_id uuid,
  allocated_on date default CURRENT_DATE not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.hostels (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  name text not null,
  hostel_type text default 'boys'::text not null,
  address text,
  warden_name text,
  warden_phone text,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null
);

create table if not exists public.hostel_room_types (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  name text not null,
  beds integer default 1 not null,
  monthly_fee numeric default 0 not null
);

create table if not exists public.hostel_rooms (
  id uuid default gen_random_uuid() not null,
  hostel_id uuid not null,
  room_type_id uuid,
  room_no text not null,
  floor text,
  beds integer default 1 not null,
  is_active boolean default true not null
);

create table if not exists public.hostel_allocations (
  id uuid default gen_random_uuid() not null,
  institution_id uuid,
  student_id uuid not null,
  room_id uuid not null,
  allocated_on date default CURRENT_DATE not null,
  vacated_on date,
  status text default 'active'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null
);