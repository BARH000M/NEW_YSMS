-- 005 — Campus services: subject type, download center, notice board, library
-- Applied to the Backend. Additive only: no existing table, column or row is
-- modified or deleted (subjects gains one nullable-with-default column).

-- ============ Academics: theory / practical subject type ============
alter table public.subjects add column if not exists subject_type text not null default 'theory';

-- The class timetable upserts on (section, day, period), so that triple must be unique.
create unique index if not exists timetable_slots_section_day_period_key
  on public.timetable_slots (section_id, day_of_week, period);

-- ============ Download center ============
create table if not exists public.download_contents (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  title text not null,
  content_type text not null default 'syllabus',
  class_id uuid references public.classes(id) on delete set null,
  description text,
  file_name text,
  file_url text,
  publish_date date not null default current_date,
  is_published boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists download_contents_publish_idx on public.download_contents (publish_date desc);

alter table public.download_contents enable row level security;

-- Everyone signed in may read; students and parents must be able to download.
drop policy if exists download_contents_read on public.download_contents;
create policy download_contents_read on public.download_contents
  for select to authenticated using (true);

drop policy if exists download_contents_staff_write on public.download_contents;
create policy download_contents_staff_write on public.download_contents
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher','librarian')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher','librarian')));

-- ============ Notice board (communicate) ============
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  title text not null,
  body text,
  audience text not null default 'all',
  is_pinned boolean not null default false,
  publish_date date not null default current_date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists notices_publish_idx on public.notices (publish_date desc);

alter table public.notices enable row level security;

drop policy if exists notices_read on public.notices;
create policy notices_read on public.notices
  for select to authenticated using (true);

drop policy if exists notices_staff_write on public.notices;
create policy notices_staff_write on public.notices
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher','receptionist')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','teacher','receptionist')));

-- ============ Library: books, members, issues ============
create table if not exists public.library_books (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  title text not null,
  isbn text,
  author text,
  publisher text,
  subject text,
  rack_no text,
  quantity integer not null default 1,
  price numeric(12,2) not null default 0,
  post_date date not null default current_date,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.library_books enable row level security;

drop policy if exists library_books_staff_read on public.library_books;
create policy library_books_staff_read on public.library_books
  for select to authenticated using (true);

drop policy if exists library_books_staff_write on public.library_books;
create policy library_books_staff_write on public.library_books
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','librarian')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','librarian')));

create table if not exists public.library_members (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  member_type text not null default 'student',
  student_id uuid references public.students(id) on delete cascade,
  staff_id uuid references public.staff(id) on delete cascade,
  card_no text,
  name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.library_members enable row level security;

drop policy if exists library_members_staff_read on public.library_members;
create policy library_members_staff_read on public.library_members
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active));

-- A student only ever reads their own member row.
drop policy if exists library_members_self_read on public.library_members;
create policy library_members_self_read on public.library_members
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = library_members.student_id and s.profile_id = auth.uid()));

drop policy if exists library_members_staff_write on public.library_members;
create policy library_members_staff_write on public.library_members
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','librarian')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','librarian')));

create table if not exists public.library_issues (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id) on delete cascade,
  book_id uuid not null references public.library_books(id) on delete cascade,
  member_id uuid not null references public.library_members(id) on delete cascade,
  issued_on date not null default current_date,
  due_on date,
  returned_on date,
  status text not null default 'issued',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists library_issues_status_idx on public.library_issues (status);
alter table public.library_issues enable row level security;

drop policy if exists library_issues_staff_read on public.library_issues;
create policy library_issues_staff_read on public.library_issues
  for select to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active));

-- A student reads only their own loans, which is what the student portal shows.
drop policy if exists library_issues_self_read on public.library_issues;
create policy library_issues_self_read on public.library_issues
  for select to authenticated
  using (exists (select 1 from public.library_members m join public.students s on s.id = m.student_id
    where m.id = library_issues.member_id and s.profile_id = auth.uid()));

drop policy if exists library_issues_staff_write on public.library_issues;
create policy library_issues_staff_write on public.library_issues
  for all to authenticated
  using (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','librarian')))
  with check (exists (select 1 from public.user_roles ur where ur.user_id = auth.uid() and ur.is_active
    and ur.role in ('super_admin','admin','librarian')));

grant select, insert, update, delete on
  public.download_contents, public.notices, public.library_books,
  public.library_members, public.library_issues to authenticated;

-- ============ Seed content ============
insert into public.notices (institution_id, title, body, audience, is_pinned, publish_date)
select i.id, v.title, v.body, v.audience, v.pinned, current_date - v.ago
from (select id from public.institutions limit 1) i
cross join (values
  ('بدء التسجيل للفصل القادم', 'التسجيل مفتوح لجميع البرامج حتى نهاية الشهر. يرجى مراجعة مكتب القبول.', 'all', true, 1),
  ('اجتماع أولياء الأمور', 'اجتماع دوري يوم الخميس الساعة العاشرة صباحاً في القاعة الكبرى.', 'parents', false, 3),
  ('جدول الاختبارات النصفية', 'تم نشر جدول الاختبارات النصفية على لوحة الإعلانات ومركز التحميل.', 'students', true, 6),
  ('ورشة تطوير مهارات التدريس', 'ورشة إلزامية لهيئة التدريس يوم الأحد القادم.', 'staff', false, 9),
  ('إجازة رسمية', 'الإجازة الرسمية تشمل جميع الأقسام الإدارية والأكاديمية.', 'all', false, 13)
) as v(title, body, audience, pinned, ago)
where not exists (select 1 from public.notices);

insert into public.download_contents (institution_id, title, content_type, class_id, description, file_name, publish_date)
select i.id, v.title, v.type, (select id from public.classes order by level nulls last limit 1), v.descr, v.file_name, current_date - v.ago
from (select id from public.institutions limit 1) i
cross join (values
  ('الخطة الدراسية — الفصل الأول', 'syllabus', 'خطة توزيع المنهج على أسابيع الفصل.', 'syllabus-term1.pdf', 2),
  ('واجب الرياضيات — الوحدة الثالثة', 'assignment', 'تمارين متنوعة مع الحلول النموذجية.', 'math-unit3.pdf', 4),
  ('مذكرة المحاسبة المالية', 'study_material', 'ملخص شامل للمحاضرات الأولى.', 'accounting-notes.pdf', 7),
  ('استمارة طلب شهادة قيد', 'form', 'تُعبأ وتُسلّم لمكتب التسجيل.', 'enrollment-certificate.pdf', 11),
  ('نماذج اختبارات سابقة', 'study_material', 'نماذج مع مفتاح التصحيح.', 'past-papers.pdf', 15)
) as v(title, type, descr, file_name, ago)
where not exists (select 1 from public.download_contents);

insert into public.library_books (institution_id, title, isbn, author, publisher, subject, rack_no, quantity, price, post_date, description)
select i.id, v.title, v.isbn, v.author, v.publisher, v.subject, v.rack, v.qty, v.price, current_date - v.ago, v.descr
from (select id from public.institutions limit 1) i
cross join (values
  ('مبادئ المحاسبة المالية', '9780134741147', 'Harrison & Horngren', 'Pearson', 'المحاسبة', 'R-101', 8, 45.00, 20, 'مرجع أساسي للمستوى الأول.'),
  ('إدارة الأعمال الحديثة', '9780135175156', 'Robbins & Coulter', 'Pearson', 'إدارة الأعمال', 'R-102', 6, 52.00, 22, 'يغطي وظائف الإدارة الأساسية.'),
  ('الرياضيات التطبيقية', '9781285740621', 'James Stewart', 'Cengage', 'الرياضيات', 'R-103', 10, 60.00, 25, 'تمارين محلولة في كل فصل.'),
  ('أساسيات البرمجة بلغة بايثون', '9781492051200', 'Eric Matthes', 'No Starch', 'الحاسوب', 'R-104', 12, 38.00, 28, 'مقدمة عملية مع مشاريع.'),
  ('اللغة الإنجليزية للأعمال', '9780194573934', 'Vicki Hollett', 'Oxford', 'اللغة الإنجليزية', 'R-105', 9, 30.00, 31, 'أنشطة تواصل مهني.'),
  ('مهارات البحث الأكاديمي', '9781138781805', 'Walliman', 'Routledge', 'مناهج البحث', 'R-106', 5, 42.00, 34, 'دليل كتابة البحث والتوثيق.')
) as v(title, isbn, author, publisher, subject, rack, qty, price, ago, descr)
where not exists (select 1 from public.library_books);

insert into public.library_members (institution_id, member_type, student_id, name, phone, card_no)
select i.id, 'student', s.id, concat_ws(' ', s.first_name, s.last_name), null, concat('LIB-', upper(substr(s.id::text, 1, 6)))
from (select id from public.institutions limit 1) i
cross join (select id, first_name, last_name from public.students order by student_no limit 12) s
where not exists (select 1 from public.library_members);

insert into public.library_issues (institution_id, book_id, member_id, issued_on, due_on, returned_on, status)
select i.id, b.id, m.id, current_date - 5, current_date + 9, null, 'issued'
from (select id from public.institutions limit 1) i
cross join lateral (select id from public.library_books order by title limit 1) b
cross join lateral (select id from public.library_members order by name limit 1) m
where not exists (select 1 from public.library_issues);