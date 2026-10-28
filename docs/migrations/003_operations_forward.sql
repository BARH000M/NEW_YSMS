-- 003 — Operations: call log, expenses, assignments, online courses
-- Additive only. No existing table, column or row is modified or deleted.

create extension if not exists pgcrypto;

-- ============ Front office: telephone call register ============
create table if not exists public.call_logs (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  caller_name text not null,
  phone text,
  direction text not null default 'incoming',
  purpose text,
  call_at timestamptz not null default now(),
  handled_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists call_logs_call_at_idx on public.call_logs (call_at desc);

alter table public.call_logs enable row level security;

drop policy if exists call_logs_staff_read on public.call_logs;
create policy call_logs_staff_read on public.call_logs
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active));

drop policy if exists call_logs_reception_write on public.call_logs;
create policy call_logs_reception_write on public.call_logs
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','receptionist')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','receptionist')));

-- ============ Finance: income & expense register ============
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  title text not null,
  category text not null default 'other',
  amount numeric(12,2) not null default 0,
  spent_on date not null default current_date,
  method text not null default 'cash',
  reference text,
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists expenses_spent_on_idx on public.expenses (spent_on desc);

alter table public.expenses enable row level security;

drop policy if exists expenses_staff_read on public.expenses;
create policy expenses_staff_read on public.expenses
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','accountant')));

drop policy if exists expenses_finance_write on public.expenses;
create policy expenses_finance_write on public.expenses
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','accountant')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','accountant')));

-- ============ Teaching: assignments ============
create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  section_id uuid references public.sections(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  title text not null,
  instructions text,
  due_date date,
  max_score numeric(6,2) not null default 100,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists assignments_due_date_idx on public.assignments (due_date);
create index if not exists assignments_section_idx on public.assignments (section_id);

alter table public.assignments enable row level security;

drop policy if exists assignments_staff_read on public.assignments;
create policy assignments_staff_read on public.assignments
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active));

drop policy if exists assignments_teacher_write on public.assignments;
create policy assignments_teacher_write on public.assignments
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher')));

-- ============ Learning: online course catalogue ============
create table if not exists public.online_courses (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  title text not null,
  provider text,
  url text,
  level text not null default 'beginner',
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.online_courses enable row level security;

drop policy if exists online_courses_staff_read on public.online_courses;
create policy online_courses_staff_read on public.online_courses
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active));

drop policy if exists online_courses_admin_write on public.online_courses;
create policy online_courses_admin_write on public.online_courses
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher')));

grant select, insert, update, delete on public.call_logs, public.expenses, public.assignments, public.online_courses to authenticated;

-- ============ Demo content so the screens are not empty on day one ============
insert into public.call_logs (institution_id, caller_name, phone, direction, purpose, call_at, notes)
select i.id, v.name, v.phone, v.direction, v.purpose, now() - (v.ago || ' hours')::interval, v.notes
from (select id from public.institutions limit 1) i
cross join (values
  ('أحمد الشرعبي', '+967771234001', 'incoming', 'استفسار عن القبول في دبلوم المحاسبة', 3, 'يرغب بمعرفة الرسوم'),
  ('منى القباطي', '+967771234002', 'incoming', 'متابعة طلب ابنها', 6, 'تم تحويلها للقبول والتسجيل'),
  ('شركة النهضة للتوريدات', '+967712345003', 'outgoing', 'تأكيد موعد توريد القرطاسية', 9, 'تم التأكيد مع المورد'),
  ('خالد العزي', '+967771234004', 'incoming', 'طلب شهادة قيد', 22, null),
  ('فاطمة الحداد', '+967771234005', 'outgoing', 'تنبيه بقسط متأخر', 27, 'القسط الثاني'),
  ('وزارة التعليم الفني', '+9671200006', 'incoming', 'طلب تقرير إحصائي سنوي', 31, 'يُسلّم قبل نهاية الشهر'),
  ('سامي المقطري', '+967771234007', 'incoming', 'شكوى حول النقل', 45, 'تم فتح تذكرة'),
  ('هدى الشامي', '+967771234008', 'outgoing', 'دعوة لورشة أولياء الأمور', 50, null)
) as v(name, phone, direction, purpose, ago, notes)
where not exists (select 1 from public.call_logs);

insert into public.expenses (institution_id, title, category, amount, spent_on, method, reference, notes)
select i.id, v.title, v.category, v.amount, current_date - v.days, v.method, v.reference, v.notes
from (select id from public.institutions limit 1) i
cross join (values
  ('قرطاسية ومطبوعات الفصل', 'supplies', 185000, 2, 'cash', 'EXP-2401', 'دفعة أولى'),
  ('فاتورة الكهرباء', 'utilities', 320000, 4, 'bank_transfer', 'EXP-2402', null),
  ('صيانة أجهزة المعمل', 'maintenance', 96000, 6, 'cash', 'EXP-2403', 'معمل الحاسوب'),
  ('رواتب الخدمات المساندة', 'salaries', 720000, 8, 'bank_transfer', 'EXP-2404', null),
  ('اتصال وإنترنت', 'utilities', 120000, 10, 'mobile_wallet', 'EXP-2405', null),
  ('نقل ومواصلات', 'transport', 64000, 12, 'cash', 'EXP-2406', null),
  ('دعاية وتسويق القبول', 'marketing', 210000, 15, 'bank_transfer', 'EXP-2407', 'حملة التسجيل'),
  ('أثاث قاعة المحاضرات', 'assets', 540000, 18, 'bank_transfer', 'EXP-2408', null),
  ('مياه ونظافة', 'utilities', 48000, 21, 'cash', 'EXP-2409', null),
  ('قرطاسية إدارية', 'supplies', 39000, 24, 'cash', 'EXP-2410', null),
  ('صيانة مكيفات', 'maintenance', 87000, 27, 'cash', 'EXP-2411', null),
  ('مكافآت تفوق', 'other', 150000, 30, 'cash', 'EXP-2412', 'طلاب الأوائل')
) as v(title, category, amount, days, method, reference, notes)
where not exists (select 1 from public.expenses);

insert into public.assignments (institution_id, section_id, subject_id, title, instructions, due_date, max_score)
select i.id, s.id, sub.id, v.title, v.instructions, current_date + v.due_in, v.max_score
from (select id from public.institutions limit 1) i
cross join lateral (select id from public.sections order by name limit 1) s
cross join lateral (select id from public.subjects order by code limit 1) sub
cross join (values
  ('تقرير تحليلي عن سوق العمل المحلي', 'لا يقل عن 800 كلمة مع مصادر موثقة.', 3, 100),
  ('حل مسائل الفصل الرابع', 'التمارين 1 إلى 12 في الكتاب المقرر.', 5, 50),
  ('مشروع جماعي: دراسة حالة مؤسسة', 'مجموعات من ثلاثة طلاب، عرض تقديمي في المحاضرة القادمة.', 9, 100),
  ('ملخص قراءة', 'ملخص من صفحتين للمقال المرفق.', 12, 25)
) as v(title, instructions, due_in, max_score)
where not exists (select 1 from public.assignments);

insert into public.online_courses (institution_id, title, provider, url, level, description, is_active)
select i.id, v.title, v.provider, v.url, v.level, v.description, true
from (select id from public.institutions limit 1) i
cross join (values
  ('أساسيات المحاسبة المالية', 'Coursera', 'https://www.coursera.org/learn/financial-accounting', 'beginner', 'مسار تمهيدي لطلاب دبلوم المحاسبة.'),
  ('إدارة المشاريع الاحترافية', 'edX', 'https://www.edx.org/learn/project-management', 'intermediate', 'يغطي دورة حياة المشروع وأدوات المتابعة.'),
  ('تحليل البيانات باستخدام Excel', 'Microsoft Learn', 'https://learn.microsoft.com/training/', 'beginner', 'مهارات عملية في الجداول المحورية والتصفية.'),
  ('أمن المعلومات للمبتدئين', 'Cisco Networking Academy', 'https://www.netacad.com/', 'beginner', 'مقدمة في حماية الأنظمة والشبكات.'),
  ('مهارات التواصل المهني', 'Alison', 'https://alison.com/', 'beginner', 'مهارات العرض والمراسلات الرسمية.')
) as v(title, provider, url, level, description)
where not exists (select 1 from public.online_courses);