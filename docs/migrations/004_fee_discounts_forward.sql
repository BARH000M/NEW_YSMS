-- =====================================================================
-- Migration 004 — Fee discount catalogue + allotment
-- Additive only. No existing table, column or row is modified or removed.
-- Source of truth for the gap found in the reference screens:
--   "Fees Discount" (discount codes with amount) and
--   "Fees/Discount Allotment" (allocate to a whole class-section or one student).
-- Rollback: docs/migrations/004_fee_discounts_rollback.sql
-- =====================================================================

-- ---------------------------------------------------------------- catalogue
create table if not exists public.fee_discounts (
  id             uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  name           text not null,
  code           text,
  discount_type  text not null default 'fixed',
  amount         numeric(12,2) not null default 0,
  description    text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint fee_discounts_type_check check (discount_type in ('fixed', 'percent')),
  constraint fee_discounts_amount_check check (amount >= 0)
);

-- A discount code must be unique inside one institution (case-insensitive).
create unique index if not exists fee_discounts_code_key
  on public.fee_discounts (institution_id, lower(code))
  where code is not null;

create index if not exists fee_discounts_institution_idx
  on public.fee_discounts (institution_id, is_active);

-- --------------------------------------------------------------- allotments
create table if not exists public.fee_discount_allotments (
  id               uuid primary key default gen_random_uuid(),
  institution_id   uuid not null references public.institutions(id) on delete cascade,
  discount_id      uuid not null references public.fee_discounts(id) on delete cascade,
  student_id       uuid not null references public.students(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete set null,
  -- optional override so the same discount can be a different value per student
  amount           numeric(12,2),
  note             text,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

-- One student can hold a given discount only once.
create unique index if not exists fee_discount_allotments_unique
  on public.fee_discount_allotments (discount_id, student_id);

create index if not exists fee_discount_allotments_student_idx
  on public.fee_discount_allotments (student_id);

create index if not exists fee_discount_allotments_discount_idx
  on public.fee_discount_allotments (discount_id, academic_year_id);

-- ----------------------------------------------------------------------- RLS
alter table public.fee_discounts enable row level security;
alter table public.fee_discount_allotments enable row level security;

drop policy if exists fee_discounts_staff_read on public.fee_discounts;
create policy fee_discounts_staff_read on public.fee_discounts
  for select using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.is_active
        and ur.role = any (array['super_admin','admin','accountant','receptionist','teacher'])
    )
  );

drop policy if exists fee_discounts_finance_write on public.fee_discounts;
create policy fee_discounts_finance_write on public.fee_discounts
  for all using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.is_active
        and ur.role = any (array['super_admin','admin','accountant'])
    )
  ) with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.is_active
        and ur.role = any (array['super_admin','admin','accountant'])
    )
  );

drop policy if exists fee_discount_allotments_staff_read on public.fee_discount_allotments;
create policy fee_discount_allotments_staff_read on public.fee_discount_allotments
  for select using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.is_active
        and ur.role = any (array['super_admin','admin','accountant','receptionist','teacher'])
    )
  );

-- A linked student may see the discounts granted to their own record only.
drop policy if exists fee_discount_allotments_self_read on public.fee_discount_allotments;
create policy fee_discount_allotments_self_read on public.fee_discount_allotments
  for select using (
    student_id in (select s.id from public.students s where s.profile_id = auth.uid())
  );

drop policy if exists fee_discount_allotments_finance_write on public.fee_discount_allotments;
create policy fee_discount_allotments_finance_write on public.fee_discount_allotments
  for all using (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.is_active
        and ur.role = any (array['super_admin','admin','accountant'])
    )
  ) with check (
    exists (
      select 1 from public.user_roles ur
      where ur.user_id = auth.uid() and ur.is_active
        and ur.role = any (array['super_admin','admin','accountant'])
    )
  );

-- ---------------------------------------------------------------------- seed
-- Mirrors the reference discount list. ON CONFLICT DO NOTHING keeps this re-runnable.
insert into public.fee_discounts (institution_id, name, code, discount_type, amount, description)
select i.id, d.name, d.code, d.discount_type, d.amount, d.description
from public.institutions i
cross join (
  values
    ('Sibling discount',   'sibling-disc',    'percent', 10.00, 'Second and later child from the same household.'),
    ('Early admission',    'early-adm-disc',  'fixed',   500.00, 'Paid in full before the start of the academic year.'),
    ('Handicapped support','handicap-disc',   'fixed',   1000.00,'Support granted after review of the medical file.'),
    ('Staff child',        'staff-child-disc','percent', 50.00, 'Children of employees of the college.')
) as d(name, code, discount_type, amount, description)
where i.is_active
on conflict do nothing;