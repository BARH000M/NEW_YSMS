-- 007_campus_transport_hostel_income.sql
-- Transport, hostel, other-income and student 360 extension tables.
-- Applied to the Readdy Backend on 2026-10-28 (tables + seed rows).
--
-- PENDING: the ENABLE ROW LEVEL SECURITY / CREATE POLICY block at the bottom of
-- this file could not be executed because the backend's risky-statement
-- confirmation channel returned "confirmation_invalid" for every ALTER after the
-- first long migration was consumed. Re-run this block once a fresh
-- confirmation is issued.

create table if not exists public.student_profile_extras (
  student_id uuid primary key references public.students(id) on delete cascade,
  caste text, religion text, rte boolean default false, skill_ability text,
  mother_tongue text, national_id text, father_name text, mother_name text,
  guardian_occupation text, city text, state text, postal_code text,
  prev_school_name text, prev_school_class text, prev_school_tc_no text,
  updated_at timestamptz not null default now()
);

create table if not exists public.admission_details (
  admission_id uuid primary key references public.admissions(id) on delete cascade,
  middle_name text, dob date, gender text, blood_group text, nationality text,
  mother_tongue text, religion text, caste text, category text,
  rte boolean default false, national_id text, address text, city text,
  state text, postal_code text, father_name text, father_occupation text,
  mother_name text, mother_occupation text, guardian_name text,
  guardian_phone text, guardian_relation text, annual_income text,
  prev_school_name text, prev_school_class text, prev_school_tc_no text,
  prev_school_percentage text, transport_required boolean default false,
  hostel_required boolean default false, siblings jsonb default '[]'::jsonb,
  documents jsonb default '[]'::jsonb, medical_notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.student_siblings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  sibling_name text not null,
  sibling_student_id uuid references public.students(id) on delete set null,
  relation text, class_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.transport_vehicles (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  vehicle_no text not null, model text, capacity int not null default 0,
  driver_name text, driver_phone text, driver_license text,
  insurance_expiry date, notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  name text not null, start_point text, end_point text, distance_km numeric,
  fare numeric not null default 0,
  vehicle_id uuid references public.transport_vehicles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.transport_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  stop_name text not null, pickup_time text, drop_time text,
  sort_order int not null default 0
);

create table if not exists public.transport_allocations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  route_id uuid not null references public.transport_routes(id) on delete cascade,
  stop_id uuid references public.transport_route_stops(id) on delete set null,
  allocated_on date not null default current_date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hostels (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  name text not null, hostel_type text not null default 'boys', address text,
  warden_name text, warden_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hostel_room_types (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  name text not null, beds int not null default 1,
  monthly_fee numeric not null default 0
);

create table if not exists public.hostel_rooms (
  id uuid primary key default gen_random_uuid(),
  hostel_id uuid not null references public.hostels(id) on delete cascade,
  room_type_id uuid references public.hostel_room_types(id) on delete set null,
  room_no text not null, floor text, beds int not null default 1,
  is_active boolean not null default true
);

create table if not exists public.hostel_allocations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  room_id uuid not null references public.hostel_rooms(id) on delete cascade,
  allocated_on date not null default current_date,
  vacated_on date, status text not null default 'active', notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.income_heads (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  name text not null, code text, description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.other_incomes (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  head_id uuid references public.income_heads(id) on delete set null,
  title text not null, amount numeric not null default 0,
  received_on date not null default current_date,
  method text not null default 'cash', reference text,
  receipt_url text, receipt_name text, notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);

-- ------------------------------ PENDING BLOCK ------------------------------
-- Staff-only writes; a student reads only their own transport / hostel records.

alter table public.student_profile_extras enable row level security;
alter table public.admission_details enable row level security;
alter table public.student_siblings enable row level security;
alter table public.transport_vehicles enable row level security;
alter table public.transport_routes enable row level security;
alter table public.transport_route_stops enable row level security;
alter table public.transport_allocations enable row level security;
alter table public.hostels enable row level security;
alter table public.hostel_room_types enable row level security;
alter table public.hostel_rooms enable row level security;
alter table public.hostel_allocations enable row level security;
alter table public.income_heads enable row level security;
alter table public.other_incomes enable row level security;

create policy student_extras_read on public.student_profile_extras for select using (
  exists (select 1 from public.students s where s.id = student_profile_extras.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant','librarian']))
);
create policy student_extras_write on public.student_profile_extras for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy admission_details_read on public.admission_details for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist','teacher']))
);
create policy admission_details_write on public.admission_details for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy siblings_read on public.student_siblings for select using (
  exists (select 1 from public.students s where s.id = student_siblings.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant']))
);
create policy siblings_write on public.student_siblings for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy transport_read on public.transport_vehicles for select using (auth.uid() is not null);
create policy transport_write on public.transport_vehicles for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy routes_read on public.transport_routes for select using (auth.uid() is not null);
create policy routes_write on public.transport_routes for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy stops_read on public.transport_route_stops for select using (auth.uid() is not null);
create policy stops_write on public.transport_route_stops for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy transport_alloc_read on public.transport_allocations for select using (
  exists (select 1 from public.students s where s.id = transport_allocations.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant']))
);
create policy transport_alloc_write on public.transport_allocations for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

create policy hostels_read on public.hostels for select using (auth.uid() is not null);
create policy hostels_write on public.hostels for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
);

create policy room_types_read on public.hostel_room_types for select using (auth.uid() is not null);
create policy room_types_write on public.hostel_room_types for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
);

create policy rooms_read on public.hostel_rooms for select using (auth.uid() is not null);
create policy rooms_write on public.hostel_rooms for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
);

create policy hostel_alloc_read on public.hostel_allocations for select using (
  exists (select 1 from public.students s where s.id = hostel_allocations.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant']))
);
create policy hostel_alloc_write on public.hostel_allocations for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
);

create policy income_heads_read on public.income_heads for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','accountant']))
);
create policy income_heads_write on public.income_heads for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','accountant']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','accountant']))
);

create policy other_incomes_read on public.other_incomes for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','accountant']))
);
create policy other_incomes_write on public.other_incomes for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','accountant']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','accountant']))
);