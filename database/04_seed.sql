-- ============================================================================
--  SAI College — Academic OS
--  04 / 04 — STARTER DATA
-- ----------------------------------------------------------------------------
--  Run AFTER 03_security.sql.
--
--  This is the minimum an empty install needs to open the console and behave
--  like a real school: one institution, one current academic year with two
--  terms, the subject list, the class/section ladder, fee heads, the grading
--  scale and the module switches.
--
--  It deliberately contains NO students, invoices or marks — the app is ready
--  for your real data. Every block is guarded, so running the file twice will
--  not create duplicates.
--
--  The one thing SQL cannot create is your login. Create the first account in
--  Authentication -> Users, then run the snippet at the bottom of this file to
--  make that account the platform owner.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Institution
-- ---------------------------------------------------------------------------

insert into public.institutions (name, name_ar, name_zh, code, address, phone, email, timezone, currency)
select 'Yemen Sai Educational College', 'كلية ساي التعليمية اليمنية', '也门赛艾教育学院',
       'SAI', 'Remax roundabout, Haddad street, Sanaa, Yemen', '+967 775 182 228',
       'info@sai-college.com', 'Asia/Aden', 'YER'
where not exists (select 1 from public.institutions);


-- ---------------------------------------------------------------------------
-- 2. Academic year + terms
-- ---------------------------------------------------------------------------

insert into public.academic_years (institution_id, name, start_date, end_date, is_current)
select i.id, '2026-2027', date '2026-09-01', date '2027-06-30', true
from public.institutions i
where not exists (select 1 from public.academic_years);

insert into public.terms (academic_year_id, name, start_date, end_date, is_current)
select y.id, v.name, v.sd, v.ed, v.cur
from public.academic_years y
cross join (values
  ('Term 1', date '2026-09-01', date '2026-12-31', true),
  ('Term 2', date '2027-01-15', date '2027-06-30', false)
) as v(name, sd, ed, cur)
where y.is_current
  and not exists (select 1 from public.terms);


-- ---------------------------------------------------------------------------
-- 3. Subjects
-- ---------------------------------------------------------------------------

insert into public.subjects (institution_id, code, name, name_ar, credit_hours, subject_type)
select i.id, v.code, v.name, v.name_ar, v.ch, v.stype
from public.institutions i
cross join (values
  ('ARB',  'Arabic Language',        'اللغة العربية',      3, 'theory'),
  ('ENG',  'English Language',       'اللغة الإنجليزية',   3, 'theory'),
  ('MATH', 'Mathematics',            'الرياضيات',          4, 'theory'),
  ('SCI',  'General Science',        'العلوم العامة',      3, 'practical'),
  ('COMP', 'Computer Studies',       'الحاسوب',            2, 'practical'),
  ('ACC',  'Financial Accounting',   'المحاسبة المالية',    3, 'theory'),
  ('BUS',  'Business Management',    'إدارة الأعمال',      3, 'theory')
) as v(code, name, name_ar, ch, stype)
where not exists (select 1 from public.subjects);


-- ---------------------------------------------------------------------------
-- 4. Classes and sections
-- ---------------------------------------------------------------------------

insert into public.classes (academic_year_id, name, level, capacity)
select y.id, v.name, v.level, v.cap
from public.academic_years y
cross join (values
  ('Year 1', 1, 40),
  ('Year 2', 2, 40),
  ('Year 3', 3, 35),
  ('Year 4', 4, 35)
) as v(name, level, cap)
where y.is_current
  and not exists (select 1 from public.classes);

insert into public.sections (class_id, name, room)
select c.id, v.name, v.room
from public.classes c
cross join (values ('A', null), ('B', null)) as v(name, room)
where not exists (select 1 from public.sections);


-- ---------------------------------------------------------------------------
-- 5. Fee heads
-- ---------------------------------------------------------------------------

insert into public.fee_heads (institution_id, name, code, category, amount)
select i.id, v.name, v.code, v.cat, v.amount
from public.institutions i
cross join (values
  ('Tuition Fee',        'TUI', 'tuition',  120000.00),
  ('Registration Fee',   'REG', 'other',      5000.00),
  ('Library Fee',        'LIB', 'library',    3000.00),
  ('Transport Fee',      'TRN', 'transport', 15000.00)
) as v(name, code, cat, amount)
where not exists (select 1 from public.fee_heads);


-- ---------------------------------------------------------------------------
-- 6. Grading scale  (90+ = A+ ... below 50 = F, pass mark 50%)
-- ---------------------------------------------------------------------------

insert into public.grade_bands (institution_id, name, percent_from, percent_upto, remark, sort_order)
select i.id, v.name, v.pf, v.pu, v.remark, v.sort
from public.institutions i
cross join (values
  ('A+', 90.00, 100.00, 'Outstanding', 1),
  ('A',  85.00,  89.99, 'Excellent',   2),
  ('B+', 80.00,  84.99, 'Very good',   3),
  ('B',  75.00,  79.99, 'Good',        4),
  ('C+', 70.00,  74.99, 'Above average', 5),
  ('C',  65.00,  69.99, 'Average',     6),
  ('D+', 60.00,  64.99, 'Below average', 7),
  ('D',  50.00,  59.99, 'Pass',        8),
  ('F',   0.00,  49.99, 'Fail',        9)
) as v(name, pf, pu, remark, sort)
where not exists (select 1 from public.grade_bands);


-- ---------------------------------------------------------------------------
-- 7. Module switches
-- ---------------------------------------------------------------------------

insert into public.module_flags (institution_id, module, is_enabled)
select i.id, m.name, true
from public.institutions i
cross join (values
  ('admissions'), ('attendance'), ('behavior'), ('certificates'), ('cms'),
  ('comms'), ('exams'), ('fees'), ('finance'), ('front_office'), ('homework'),
  ('hostel'), ('inventory'), ('library'), ('reports'), ('settings'),
  ('staff'), ('students'), ('timetable'), ('transport')
) as m(name)
where not exists (select 1 from public.module_flags);


-- ---------------------------------------------------------------------------
-- 8. Institution settings
-- ---------------------------------------------------------------------------

insert into public.settings (institution_id, key, value)
select i.id, v.key, v.value
from public.institutions i
cross join (values
  ('school.short_name',  '"SAI College"'::jsonb),
  ('school.currency',    '"YER"'::jsonb),
  ('academic.pass_mark', '50'::jsonb),
  ('fees.currency',      '"YER"'::jsonb)
) as v(key, value)
where not exists (select 1 from public.settings);


-- ---------------------------------------------------------------------------
-- 9. Make your first account the platform owner
-- ---------------------------------------------------------------------------
--  1. Authentication -> Users -> Add user. Set the email and a password,
--     and tick "auto confirm".
--  2. Copy that user's UUID.
--  3. Paste it below in place of the placeholder and run only this block.
--
--  Why not automatic? Role lives only in public.user_roles, never inside the
--  auth metadata, so a role can never be forged by editing a profile.
-- ---------------------------------------------------------------------------

-- insert into public.profiles (id, institution_id, full_name, locale)
-- select '00000000-0000-0000-0000-000000000000',
--        (select id from public.institutions limit 1),
--        'Platform Owner', 'ar'
-- where not exists (select 1 from public.profiles);
--
-- insert into public.user_roles (user_id, institution_id, role, is_active)
-- values ('00000000-0000-0000-0000-000000000000',
--         (select id from public.institutions limit 1),
--         'super_admin', true)
-- on conflict (user_id) do update set role = 'super_admin', is_active = true;