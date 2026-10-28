import { supabase } from './supabaseClient';
import { fetchAcademicYears, fetchInstitution } from './college';

const fail = (message: string): never => {
  throw new Error(message);
};

async function run<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) return fail(error.message);
    return (data ?? []) as T;
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown backend error');
  }
}

const shortSuffix = () => String(Date.now()).slice(-5);

/* ============================== Academics ============================== */

export interface TimetableSlotRow {
  id: string;
  section_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  day_of_week: number;
  period: number;
  start_time: string | null;
  end_time: string | null;
}

export async function fetchTimetable(): Promise<TimetableSlotRow[]> {
  return run<TimetableSlotRow[]>(
    supabase
      .from('timetable_slots')
      .select('id, section_id, subject_id, teacher_id, day_of_week, period, start_time, end_time')
      .order('period', { ascending: true }),
  );
}

export interface NewClassInput {
  name: string;
  level: number | null;
  capacity: number;
  sectionNames: string[];
}

/** Creates the class and every requested section in one go. */
export async function createClass(input: NewClassInput): Promise<void> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const years = await fetchAcademicYears();
  const year = years.find((row) => row.is_current) ?? years[0];
  if (!year) throw new Error('Create an academic year before adding classes.');

  const { data, error } = await supabase
    .from('classes')
    .insert({
      institution_id: institution.id,
      academic_year_id: year.id,
      name: input.name.trim(),
      level: input.level,
      capacity: input.capacity,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);

  const names = input.sectionNames.map((name) => name.trim()).filter(Boolean);
  if (names.length === 0) return;

  const { error: sectionError } = await supabase.from('sections').insert(
    names.map((name) => ({
      class_id: (data as { id: string }).id,
      name,
    })),
  );
  if (sectionError) throw new Error(sectionError.message);
}

export interface NewSectionInput {
  classId: string;
  name: string;
  room?: string;
  classTeacherId?: string | null;
}

export async function createSection(input: NewSectionInput): Promise<void> {
  const { error } = await supabase.from('sections').insert({
    class_id: input.classId,
    name: input.name.trim(),
    room: input.room?.trim() || null,
    class_teacher_id: input.classTeacherId || null,
  });
  if (error) throw new Error(error.message);
}

export interface NewSubjectInput {
  name: string;
  code?: string;
  creditHours: number;
  subjectType: 'theory' | 'practical';
  nameAr?: string;
  nameZh?: string;
}

export async function createSubject(input: NewSubjectInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('subjects').insert({
    institution_id: institution?.id ?? null,
    name: input.name.trim() || fail('Subject name is required'),
    code: input.code?.trim() || null,
    credit_hours: input.creditHours,
    subject_type: input.subjectType,
    name_ar: input.nameAr?.trim() || null,
    name_zh: input.nameZh?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export interface AssignSubjectInput {
  sectionId: string;
  subjectId: string;
  teacherId?: string | null;
}

/** Re-assigning the same subject to a section updates the teacher instead of failing. */
export async function assignSubject(input: AssignSubjectInput): Promise<void> {
  const { error } = await supabase.from('class_subjects').upsert(
    {
      section_id: input.sectionId,
      subject_id: input.subjectId,
      teacher_id: input.teacherId || null,
    },
    { onConflict: 'section_id,subject_id' },
  );
  if (error) throw new Error(error.message);
}

export async function removeClassSubject(id: string): Promise<void> {
  const { error } = await supabase.from('class_subjects').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface TimetableSlotInput {
  sectionId: string;
  subjectId: string;
  teacherId?: string | null;
  dayOfWeek: number;
  period: number;
  startTime?: string | null;
  endTime?: string | null;
}

export async function saveTimetableSlot(input: TimetableSlotInput): Promise<void> {
  const { error } = await supabase.from('timetable_slots').upsert(
    {
      section_id: input.sectionId,
      subject_id: input.subjectId,
      teacher_id: input.teacherId || null,
      day_of_week: input.dayOfWeek,
      period: input.period,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
    },
    { onConflict: 'section_id,day_of_week,period' },
  );
  if (error) throw new Error(error.message);
}

export async function deleteTimetableSlot(id: string): Promise<void> {
  const { error } = await supabase.from('timetable_slots').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* =========================== Download center =========================== */

export interface DownloadContent {
  id: string;
  title: string;
  content_type: string;
  class_id: string | null;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  publish_date: string;
  is_published: boolean;
}

export async function fetchDownloads(): Promise<DownloadContent[]> {
  return run<DownloadContent[]>(
    supabase
      .from('download_contents')
      .select('id, title, content_type, class_id, description, file_name, file_url, publish_date, is_published')
      .order('publish_date', { ascending: false }),
  );
}

export interface DownloadInput {
  title: string;
  contentType: string;
  classId?: string | null;
  description?: string;
  fileUrl?: string;
  publishDate?: string | null;
}

export async function createDownload(input: DownloadInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const fileName = input.fileUrl?.split('/').filter(Boolean).pop() ?? null;
  const { error } = await supabase.from('download_contents').insert({
    institution_id: institution?.id ?? null,
    title: input.title.trim() || fail('A title is required'),
    content_type: input.contentType,
    class_id: input.classId || null,
    description: input.description?.trim() || null,
    file_name: fileName,
    file_url: input.fileUrl?.trim() || null,
    publish_date: input.publishDate || new Date().toISOString().slice(0, 10),
    is_published: true,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setDownloadPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase.from('download_contents').update({ is_published: published }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteDownload(id: string): Promise<void> {
  const { error } = await supabase.from('download_contents').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ============================= Notice board ============================= */

export interface Notice {
  id: string;
  title: string;
  body: string | null;
  audience: 'all' | 'staff' | 'students' | 'parents';
  is_pinned: boolean;
  publish_date: string;
}

export async function fetchNotices(): Promise<Notice[]> {
  return run<Notice[]>(
    supabase
      .from('notices')
      .select('id, title, body, audience, is_pinned, publish_date')
      .order('is_pinned', { ascending: false })
      .order('publish_date', { ascending: false }),
  );
}

export interface NoticeInput {
  title: string;
  body?: string;
  audience: 'all' | 'staff' | 'students' | 'parents';
  publishDate?: string | null;
  isPinned?: boolean;
}

export async function createNotice(input: NoticeInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('notices').insert({
    institution_id: institution?.id ?? null,
    title: input.title.trim() || fail('A title is required'),
    body: input.body?.trim() || null,
    audience: input.audience,
    is_pinned: input.isPinned ?? false,
    publish_date: input.publishDate || new Date().toISOString().slice(0, 10),
    created_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setNoticePinned(id: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('notices').update({ is_pinned: pinned }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteNotice(id: string): Promise<void> {
  const { error } = await supabase.from('notices').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ================================ Library =============================== */

export interface LibraryBook {
  id: string;
  title: string;
  isbn: string | null;
  author: string | null;
  publisher: string | null;
  subject: string | null;
  rack_no: string | null;
  quantity: number;
  price: number;
  post_date: string;
  description: string | null;
  is_active: boolean;
}

export async function fetchBooks(): Promise<LibraryBook[]> {
  return run<LibraryBook[]>(
    supabase
      .from('library_books')
      .select('id, title, isbn, author, publisher, subject, rack_no, quantity, price, post_date, description, is_active')
      .order('title', { ascending: true }),
  );
}

export interface BookInput {
  title: string;
  isbn?: string;
  author?: string;
  publisher?: string;
  subject?: string;
  rackNo?: string;
  quantity: number;
  price: number;
  postDate?: string | null;
  description?: string;
}

export async function createBook(input: BookInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('library_books').insert({
    institution_id: institution?.id ?? null,
    title: input.title.trim() || fail('A book title is required'),
    isbn: input.isbn?.trim() || null,
    author: input.author?.trim() || null,
    publisher: input.publisher?.trim() || null,
    subject: input.subject?.trim() || null,
    rack_no: input.rackNo?.trim() || null,
    quantity: input.quantity,
    price: input.price,
    post_date: input.postDate || new Date().toISOString().slice(0, 10),
    description: input.description?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function setBookActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('library_books').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export interface LibraryMember {
  id: string;
  member_type: string;
  student_id: string | null;
  staff_id: string | null;
  card_no: string | null;
  name: string;
  phone: string | null;
  is_active: boolean;
}

export async function fetchLibraryMembers(): Promise<LibraryMember[]> {
  return run<LibraryMember[]>(
    supabase
      .from('library_members')
      .select('id, member_type, student_id, staff_id, card_no, name, phone, is_active')
      .order('name', { ascending: true }),
  );
}

export interface NewMemberInput {
  memberType: 'student' | 'teacher' | 'staff';
  studentId?: string | null;
  staffId?: string | null;
  name: string;
  phone?: string;
}

export async function createLibraryMember(input: NewMemberInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('library_members').insert({
    institution_id: institution?.id ?? null,
    member_type: input.memberType,
    student_id: input.memberType === 'student' ? input.studentId || null : null,
    staff_id: input.memberType === 'student' ? null : input.staffId || null,
    card_no: `LIB-${shortSuffix()}`,
    name: input.name.trim() || fail('A member name is required'),
    phone: input.phone?.trim() || null,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export interface LibraryIssueRow {
  id: string;
  book_id: string;
  member_id: string;
  issued_on: string;
  due_on: string | null;
  returned_on: string | null;
  status: string;
  notes: string | null;
  library_books: { id: string; title: string; author: string | null } | null;
  library_members: { id: string; name: string; member_type: string; card_no: string | null } | null;
}

export async function fetchLibraryIssues(): Promise<LibraryIssueRow[]> {
  return run<LibraryIssueRow[]>(
    supabase
      .from('library_issues')
      .select(
        'id, book_id, member_id, issued_on, due_on, returned_on, status, notes, library_books(id, title, author), library_members(id, name, member_type, card_no)',
      )
      .order('issued_on', { ascending: false }),
  );
}

export interface IssueInput {
  bookId: string;
  memberId: string;
  dueOn?: string | null;
  notes?: string;
}

export async function issueBook(input: IssueInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('library_issues').insert({
    institution_id: institution?.id ?? null,
    book_id: input.bookId,
    member_id: input.memberId,
    issued_on: new Date().toISOString().slice(0, 10),
    due_on: input.dueOn || null,
    status: 'issued',
    notes: input.notes?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function returnBook(id: string): Promise<void> {
  const { error } = await supabase
    .from('library_issues')
    .update({ status: 'returned', returned_on: new Date().toISOString().slice(0, 10) })
    .eq('id', id);
  if (error) throw new Error(error.message);
}