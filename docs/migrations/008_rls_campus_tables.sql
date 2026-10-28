-- 008_rls_campus_tables.sql
-- Row-level security for the campus modules added in 007.
--
-- STATUS (2026-10-28) — APPLIED AND VERIFIED ON THE LIVE BACKEND
--   DONE  : all 26 policies below exist on the live backend.
--   DONE  : `enable row level security` is now ON for all 13 tables
--           (student_profile_extras + the 12 that were still open).
--           Verified after execution: every one of the 13 reports
--           relrowsecurity = true and policy_count = 2.
--
-- REVERSIBLE: `alter table <t> disable row level security;` turns any single
-- table back, nothing is deleted and no rows were modified.
--
-- Re-run the query at the bottom of the file any time to confirm
-- rls_enabled = true and policy_count >= 2 everywhere.

-- ---------------------------------------------------------------------------
-- 1. Enable row level security (one statement per table) — ALL DONE
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- 2. Policies
--    Read  : the student themself (students.profile_id = auth.uid()) or staff.
--    Write : admin / receptionist (finance heads: admin / accountant).
-- ---------------------------------------------------------------------------

-- Student 360 record ---------------------------------------------------------
create policy student_extras_read on public.student_profile_extras for select using (
  exists (select 1 from public.students s where s.id = student_profile_extras.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant','librarian']))
);
create policy student_extras_write on public.student_profile_extras for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

-- Siblings -------------------------------------------------------------------
create policy siblings_read on public.student_siblings for select using (
  exists (select 1 from public.students s where s.id = student_siblings.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant']))
);
create policy siblings_write on public.student_siblings for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

-- Admission details ----------------------------------------------------------
create policy admission_details_read on public.admission_details for select using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist','teacher']))
);
create policy admission_details_write on public.admission_details for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

-- Transport master data (any signed-in account may read the catalogue) --------
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

-- Transport allocation: a student sees only their own boarding record --------
create policy transport_alloc_read on public.transport_allocations for select using (
  exists (select 1 from public.students s where s.id = transport_allocations.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant']))
);
create policy transport_alloc_write on public.transport_allocations for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','receptionist']))
);

-- Hostel master data ---------------------------------------------------------
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

-- Hostel allocation: a student sees only their own room ---------------------
create policy hostel_alloc_read on public.hostel_allocations for select using (
  exists (select 1 from public.students s where s.id = hostel_allocations.student_id and s.profile_id = auth.uid())
  or exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin','teacher','receptionist','accountant']))
);
create policy hostel_alloc_write on public.hostel_allocations for all using (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
) with check (
  exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active and ur.role = any (array['super_admin','admin']))
);

-- Finance: income is never visible to students or parents -------------------
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

-- ---------------------------------------------------------------------------
-- 3. Verification
-- ---------------------------------------------------------------------------
-- select c.relname,
--        c.relrowsecurity as rls_enabled,
--        (select count(*) from pg_policies p
--          where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
--   from pg_class c
--   join pg_namespace n on n.oid = c.relnamespace
--  where n.nspname = 'public' and c.relkind = 'r'
--    and c.relname in ('student_profile_extras','admission_details','student_siblings',
--                      'transport_vehicles','transport_routes','transport_route_stops',
--                      'transport_allocations','hostels','hostel_room_types','hostel_rooms',
--                      'hostel_allocations','income_heads','other_incomes')
--  order by c.relname;