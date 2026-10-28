import { supabase } from './supabaseClient';
import type {
  AcademicYear,
  Admission,
  Enrollment,
  EnrollmentStatus,
  Exam,
  Term,
  ExamResult,
  ExamSubject,
  FeeHead,
  Guardian,
  Institution,
  Invoice,
  InvoiceItem,
  Notification,
  Payment,
  Profile,
  SchoolClass,
  Section,
  Staff,
  Student,
  Subject,
  UserRole,
} from './types';

export interface Complaint {
  id: string;
  reference_no: string | null;
  subject: string;
  type: string | null;
  details: string | null;
  is_anonymous: boolean;
  contact: string | null;
  status: 'new' | 'investigating' | 'resolved' | 'closed';
  resolution: string | null;
  created_at: string;
}

export interface Enquiry {
  id: string;
  name: string;
  phone: string | null;
  subject: string | null;
  message: string | null;
  status: 'open' | 'in_progress' | 'closed';
  created_at: string;
}

export interface Visitor {
  id: string;
  name: string;
  phone: string | null;
  purpose: string | null;
  badge_no: string | null;
  in_at: string | null;
  out_at: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'general' | 'exam' | 'holiday' | 'event' | 'meeting';
  starts_at: string;
  ends_at: string | null;
  audience: 'all' | 'staff' | 'students' | 'parents';
}

export interface ModuleFlag {
  id: string;
  module: string;
  is_enabled: boolean;
}

export interface SettingRow {
  id: string;
  key: string;
  value: Record<string, unknown>;
}

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  created_at: string;
}

export interface StudentRow extends Student {
  sections: (Section & { classes: SchoolClass | null }) | null;
}

export interface GuardianLink {
  student_id: string;
  is_primary: boolean | null;
  guardians: Guardian | null;
}

const fail = (message: string): never => {
  throw new Error(message);
};

/** Every read goes through here so a broken query always surfaces as a message. */
async function run<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  try {
    const { data, error } = await promise;
    if (error) return fail(error.message);
    return (data ?? []) as T;
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Unknown backend error');
  }
}

export async function fetchMyRole(): Promise<UserRole | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, institution_id, role, is_active')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as UserRole | null) ?? null;
}

export async function fetchMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}

export async function fetchInstitution(): Promise<Institution | null> {
  const rows = await run<Institution[]>(supabase.from('institutions').select('*').limit(1));
  return rows[0] ?? null;
}

export async function countRows(table: string, filters?: Record<string, string>): Promise<number> {
  let query = supabase.from(table).select('id', { count: 'exact', head: true });
  if (filters) {
    Object.entries(filters).forEach(([column, value]) => {
      query = query.eq(column, value);
    });
  }
  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function fetchStudents(): Promise<StudentRow[]> {
  return run<StudentRow[]>(
    supabase
      .from('students')
      .select('*, sections(id, class_id, name, room, class_teacher_id, classes(id, name, level, capacity, academic_year_id))')
      .order('student_no', { ascending: true }),
  );
}

export async function fetchGuardianLinks(): Promise<GuardianLink[]> {
  return run<GuardianLink[]>(
    supabase
      .from('student_guardians')
      .select(
        'student_id, is_primary, guardians(id, institution_id, profile_id, full_name, relation, phone, email, occupation, address)',
      ),
  );
}

export async function fetchAdmissions(): Promise<Admission[]> {
  return run<Admission[]>(
    supabase.from('admissions').select('*').order('created_at', { ascending: false }),
  );
}

export async function fetchComplaints(): Promise<Complaint[]> {
  return run<Complaint[]>(
    supabase.from('complaints').select('*').order('created_at', { ascending: false }),
  );
}

export async function fetchEnquiries(): Promise<Enquiry[]> {
  return run<Enquiry[]>(
    supabase.from('enquiries').select('*').order('created_at', { ascending: false }),
  );
}

export async function fetchVisitors(): Promise<Visitor[]> {
  return run<Visitor[]>(
    supabase.from('visitors').select('*').order('in_at', { ascending: false }),
  );
}

export async function fetchStaff(): Promise<Staff[]> {
  return run<Staff[]>(supabase.from('staff').select('*').order('staff_no', { ascending: true }));
}

export async function fetchClasses(): Promise<SchoolClass[]> {
  return run<SchoolClass[]>(supabase.from('classes').select('*').order('level', { ascending: true }));
}

export async function fetchSections(): Promise<Section[]> {
  return run<Section[]>(supabase.from('sections').select('*').order('name', { ascending: true }));
}

export async function fetchSubjects(): Promise<Subject[]> {
  return run<Subject[]>(supabase.from('subjects').select('*').order('code', { ascending: true }));
}

export async function fetchTerms(): Promise<Term[]> {
  return run<Term[]>(supabase.from('terms').select('*').order('start_date', { ascending: true }));
}

export interface ClassSubjectRow {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string | null;
}

export async function fetchClassSubjects(): Promise<ClassSubjectRow[]> {
  return run<ClassSubjectRow[]>(supabase.from('class_subjects').select('*'));
}

export async function fetchEvents(): Promise<CalendarEvent[]> {
  return run<CalendarEvent[]>(
    supabase.from('calendar_events').select('*').order('starts_at', { ascending: true }),
  );
}

export async function fetchModuleFlags(): Promise<ModuleFlag[]> {
  return run<ModuleFlag[]>(supabase.from('module_flags').select('*').order('module', { ascending: true }));
}

export async function fetchSettings(): Promise<SettingRow[]> {
  return run<SettingRow[]>(supabase.from('settings').select('*').order('key', { ascending: true }));
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  return run<AuditEntry[]>(
    supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(40),
  );
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  return run<Notification[]>(
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  );
}

export async function toggleModule(id: string, enabled: boolean): Promise<void> {
  const { error } = await supabase.from('module_flags').update({ is_enabled: enabled }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateAdmissionStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('admissions').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function updateComplaintStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase.from('complaints').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Claim the console for the very first signed-in account. Server decides if allowed. */
export async function claimFirstAdmin(): Promise<{ role: string }> {
  const { data, error } = await supabase.functions.invoke('bootstrap-admin', { body: {} });

  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      try {
        const body = (await context.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // keep the original message
      }
    }
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as { role: string };
}

/**
 * First-run only: creates the owner account as a confirmed super admin.
 * The server refuses this once any account exists.
 */
export async function createFirstOwner(input: {
  email: string;
  password: string;
  fullName?: string;
}): Promise<{ role: string }> {
  const { data, error } = await supabase.functions.invoke('bootstrap-admin', {
    body: {
      email: input.email.trim(),
      password: input.password,
      fullName: input.fullName?.trim() || undefined,
    },
  });

  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      try {
        const body = (await context.json()) as { error?: string };
        if (body?.error) message = body.error;
      } catch {
        // keep the original message
      }
    }
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: unknown }).error));
  }
  return data as { role: string };
}

export interface InvoiceWithStudent extends Invoice {
  students: {
    id: string;
    student_no: string | null;
    first_name: string;
    last_name: string | null;
    sections: { name: string; classes: { name: string } | null } | null;
  } | null;
  payments: { amount: number }[] | null;
}

export async function fetchFeeHeads(): Promise<FeeHead[]> {
  return run<FeeHead[]>(supabase.from('fee_heads').select('*').order('name', { ascending: true }));
}

export interface FeeHeadInput {
  name: string;
  code?: string;
  category: string;
  amount: number;
}

/** Fee catalogue entry — one row per billable item (tuition, lab, transport…). */
export async function createFeeHead(input: FeeHeadInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('fee_heads').insert({
    institution_id: institution?.id ?? null,
    name: input.name.trim(),
    code: input.code?.trim() || null,
    category: input.category,
    amount: input.amount,
    is_active: true,
  });
  if (error) throw new Error(error.message);
}

export async function updateFeeHead(id: string, input: FeeHeadInput): Promise<void> {
  const { error } = await supabase
    .from('fee_heads')
    .update({
      name: input.name.trim(),
      code: input.code?.trim() || null,
      category: input.category,
      amount: input.amount,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function setFeeHeadActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('fee_heads').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchInvoices(): Promise<InvoiceWithStudent[]> {
  return run<InvoiceWithStudent[]>(
    supabase
      .from('invoices')
      .select(
        '*, students(id, student_no, first_name, last_name, sections(name, classes(name))), payments(amount)',
      )
      .order('issue_date', { ascending: false })
      .limit(200),
  );
}

export async function fetchPayments(): Promise<Payment[]> {
  return run<Payment[]>(
    supabase.from('payments').select('*').order('paid_at', { ascending: false }).limit(100),
  );
}

export async function fetchInvoiceItems(): Promise<InvoiceItem[]> {
  return run<InvoiceItem[]>(supabase.from('invoice_items').select('*'));
}

export interface ExamSubjectRow extends ExamSubject {
  subjects: { id: string; name: string; name_ar: string | null; code: string | null } | null;
  sections: { id: string; name: string } | null;
}

export async function fetchExams(): Promise<Exam[]> {
  return run<Exam[]>(
    supabase.from('exams').select('*').order('starts_on', { ascending: false }),
  );
}

export async function fetchExamSubjects(): Promise<ExamSubjectRow[]> {
  return run<ExamSubjectRow[]>(
    supabase
      .from('exam_subjects')
      .select('*, subjects(id, name, name_ar, code), sections(id, name)')
      .order('exam_date', { ascending: true }),
  );
}

export async function fetchExamResults(): Promise<ExamResult[]> {
  return run<ExamResult[]>(supabase.from('exam_results').select('*').limit(3000));
}

export interface ExamResultInput {
  examId: string;
  examSubjectId: string;
  studentId: string;
  marksObtained: number;
  grade: string | null;
  remarks?: string | null;
}

/** Upsert by paper + student so re-entering marks never creates duplicates. */
export async function saveExamResults(rows: ExamResultInput[]): Promise<void> {
  if (rows.length === 0) return;
  const { error } = await supabase.from('exam_results').upsert(
    rows.map((row) => ({
      exam_id: row.examId,
      exam_subject_id: row.examSubjectId,
      student_id: row.studentId,
      marks_obtained: row.marksObtained,
      grade: row.grade,
      remarks: row.remarks?.trim() || null,
    })),
    { onConflict: 'exam_subject_id,student_id' },
  );
  if (error) throw new Error(error.message);
}

const shortSuffix = () => String(Date.now()).slice(-5);

export interface NewStudentInput {
  firstName: string;
  lastName?: string;
  firstNameAr?: string;
  lastNameAr?: string;
  gender?: 'male' | 'female' | null;
  dob?: string | null;
  nationality?: string | null;
  sectionId?: string | null;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: 'father' | 'mother' | 'guardian' | 'other';
}

export async function createStudent(input: NewStudentInput): Promise<string> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const { data, error } = await supabase
    .from('students')
    .insert({
      institution_id: institution.id,
      student_no: `STU-${new Date().getFullYear()}-${shortSuffix()}`,
      first_name: input.firstName.trim(),
      last_name: input.lastName?.trim() || null,
      first_name_ar: input.firstNameAr?.trim() || null,
      last_name_ar: input.lastNameAr?.trim() || null,
      gender: input.gender ?? null,
      dob: input.dob || null,
      nationality: input.nationality?.trim() || null,
      section_id: input.sectionId || null,
      status: 'active',
      enrolled_at: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  const studentId = (data as { id: string }).id;

  if (input.guardianName?.trim()) {
    const { data: guardian, error: guardianError } = await supabase
      .from('guardians')
      .insert({
        institution_id: institution.id,
        full_name: input.guardianName.trim(),
        relation: input.guardianRelation ?? 'father',
        phone: input.guardianPhone?.trim() || null,
      })
      .select('id')
      .single();
    if (guardianError) throw new Error(guardianError.message);

    const { error: linkError } = await supabase.from('student_guardians').insert({
      student_id: studentId,
      guardian_id: (guardian as { id: string }).id,
      is_primary: true,
    });
    if (linkError) throw new Error(linkError.message);
  }

  return studentId;
}

export interface NewAdmissionInput {
  applicantName: string;
  phone?: string;
  email?: string;
  program?: string;
  educationLevel?: string;
  preferredSchedule?: string;
  source?: 'website' | 'walk_in' | 'phone' | 'referral';
  notes?: string;
}

export async function createAdmission(input: NewAdmissionInput): Promise<string> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const { data, error } = await supabase
    .from('admissions')
    .insert({
      institution_id: institution.id,
      applicant_name: input.applicantName.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      program: input.program?.trim() || null,
      education_level: input.educationLevel?.trim() || null,
      preferred_schedule: input.preferredSchedule?.trim() || null,
      source: input.source ?? 'walk_in',
      notes: input.notes?.trim() || null,
      reference_no: `ADM-${new Date().getFullYear()}-${shortSuffix()}`,
      status: 'new',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

export interface NewInvoiceInput {
  studentId: string;
  feeHeadId?: string | null;
  description: string;
  amount: number;
  discount?: number;
  dueDate?: string | null;
  termId?: string | null;
}

export async function createInvoice(input: NewInvoiceInput): Promise<string> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const discount = Math.max(0, input.discount ?? 0);
  const total = Math.max(0, input.amount - discount);

  const { data, error } = await supabase
    .from('invoices')
    .insert({
      institution_id: institution.id,
      student_id: input.studentId,
      term_id: input.termId ?? null,
      invoice_no: `INV-${new Date().getFullYear()}-${shortSuffix()}`,
      due_date: input.dueDate || null,
      status: 'unpaid',
      subtotal: input.amount,
      discount,
      total,
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  const invoiceId = (data as { id: string }).id;

  const { error: itemError } = await supabase.from('invoice_items').insert({
    invoice_id: invoiceId,
    fee_head_id: input.feeHeadId ?? null,
    description: input.description,
    amount: input.amount,
  });
  if (itemError) throw new Error(itemError.message);

  return invoiceId;
}

export interface RecordPaymentInput {
  invoiceId: string;
  studentId: string;
  amount: number;
  method: string;
  reference?: string;
}

export async function recordPayment(input: RecordPaymentInput): Promise<void> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const { error } = await supabase.from('payments').insert({
    institution_id: institution.id,
    invoice_id: input.invoiceId,
    student_id: input.studentId,
    amount: input.amount,
    method: input.method,
    reference: input.reference?.trim() || null,
    receipt_no: `RCP-${new Date().getFullYear()}-${shortSuffix()}`,
  });
  if (error) throw new Error(error.message);

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('total')
    .eq('id', input.invoiceId)
    .maybeSingle();
  if (invoiceError) throw new Error(invoiceError.message);

  const { data: paidRows, error: paidError } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', input.invoiceId);
  if (paidError) throw new Error(paidError.message);

  const paid = (paidRows ?? []).reduce(
    (sum: number, row: { amount: number | string }) => sum + Number(row.amount ?? 0),
    0,
  );
  const total = Number((invoice as { total: number } | null)?.total ?? 0);
  const status = paid <= 0 ? 'unpaid' : paid + 0.01 >= total ? 'paid' : 'partial';

  const { error: statusError } = await supabase
    .from('invoices')
    .update({ status })
    .eq('id', input.invoiceId);
  if (statusError) throw new Error(statusError.message);
}

export interface NewExamInput {
  name: string;
  examType: 'quiz' | 'midterm' | 'final' | 'practical';
  termId?: string | null;
  startsOn?: string | null;
  endsOn?: string | null;
  notes?: string;
}

export async function createExam(input: NewExamInput): Promise<string> {
  const institution = await fetchInstitution();
  if (!institution) throw new Error('Institution is not configured');

  const { data, error } = await supabase
    .from('exams')
    .insert({
      institution_id: institution.id,
      name: input.name.trim(),
      exam_type: input.examType,
      term_id: input.termId ?? null,
      starts_on: input.startsOn || null,
      ends_on: input.endsOn || null,
      notes: input.notes?.trim() || null,
      status: 'scheduled',
    })
    .select('id')
    .single();

  if (error) throw new Error(error.message);
  return (data as { id: string }).id;
}

// ===================== Attendance =====================

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceRecord {
  id: string;
  institution_id: string | null;
  student_id: string;
  section_id: string | null;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
}

/** Attendance rows for one section on one day (used by the daily grid). */
export async function fetchAttendanceForDay(sectionId: string, date: string): Promise<AttendanceRecord[]> {
  return run<AttendanceRecord[]>(
    supabase
      .from('attendance')
      .select('id, institution_id, student_id, section_id, attendance_date, status, remarks')
      .eq('section_id', sectionId)
      .eq('attendance_date', date),
  );
}

/** All attendance from a start date forward — powers the 7-day trend + follow-up list. */
export async function fetchAttendanceSince(fromDate: string): Promise<AttendanceRecord[]> {
  return run<AttendanceRecord[]>(
    supabase
      .from('attendance')
      .select('id, institution_id, student_id, section_id, attendance_date, status, remarks')
      .gte('attendance_date', fromDate)
      .limit(5000),
  );
}

export interface AttendanceInput {
  studentId: string;
  sectionId: string | null;
  status: AttendanceStatus;
  remarks?: string | null;
}

/** Whole-class upsert: re-saving the same day overwrites instead of duplicating. */
export async function saveAttendance(date: string, rows: AttendanceInput[]): Promise<void> {
  if (rows.length === 0) return;
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const markedBy = userData.user?.id ?? null;

  const { error } = await supabase.from('attendance').upsert(
    rows.map((row) => ({
      institution_id: institution?.id ?? null,
      student_id: row.studentId,
      section_id: row.sectionId,
      attendance_date: date,
      status: row.status,
      remarks: row.remarks?.trim() || null,
      marked_by: markedBy,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: 'student_id,attendance_date' },
  );
  if (error) throw new Error(error.message);
}

// ===================== Fee installments =====================

export interface Installment {
  id: string;
  institution_id: string | null;
  invoice_id: string;
  seq: number;
  label: string | null;
  amount: number;
  due_date: string | null;
  status: 'pending' | 'paid';
  created_at: string;
}

export async function fetchInstallments(): Promise<Installment[]> {
  return run<Installment[]>(
    supabase.from('fee_installments').select('*').order('seq', { ascending: true }),
  );
}

export interface InstallmentInput {
  seq: number;
  label: string;
  amount: number;
  dueDate: string | null;
}

/** Replace the whole schedule for an invoice (delete + re-insert keeps it simple). */
export async function saveInstallments(invoiceId: string, rows: InstallmentInput[]): Promise<void> {
  const institution = await fetchInstitution();
  const { error: delError } = await supabase.from('fee_installments').delete().eq('invoice_id', invoiceId);
  if (delError) throw new Error(delError.message);
  if (rows.length === 0) return;
  const { error } = await supabase.from('fee_installments').insert(
    rows.map((row) => ({
      institution_id: institution?.id ?? null,
      invoice_id: invoiceId,
      seq: row.seq,
      label: row.label.trim() || null,
      amount: row.amount,
      due_date: row.dueDate || null,
      status: 'pending',
    })),
  );
  if (error) throw new Error(error.message);
}

export async function setInstallmentStatus(id: string, status: 'pending' | 'paid'): Promise<void> {
  const { error } = await supabase.from('fee_installments').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

// ===================== Maker-checker approvals =====================

export type ApprovalType = 'invoice_adjustment' | 'discount' | 'refund' | 'write_off' | 'other';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface FeeApproval {
  id: string;
  institution_id: string | null;
  request_type: ApprovalType;
  title: string | null;
  student_id: string | null;
  invoice_id: string | null;
  amount: number;
  note: string | null;
  status: ApprovalStatus;
  requested_by: string | null;
  requested_by_name: string | null;
  reviewed_by: string | null;
  reviewed_by_name: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export async function fetchApprovals(): Promise<FeeApproval[]> {
  return run<FeeApproval[]>(
    supabase.from('fee_approvals').select('*').order('created_at', { ascending: false }).limit(200),
  );
}

export interface ApprovalInput {
  requestType: ApprovalType;
  title: string;
  amount: number;
  studentId?: string | null;
  invoiceId?: string | null;
  note?: string;
  requestedByName?: string | null;
}

/** A "maker" raises a request; it stays pending until a different "checker" acts. */
export async function createApproval(input: ApprovalInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('fee_approvals').insert({
    institution_id: institution?.id ?? null,
    request_type: input.requestType,
    title: input.title.trim(),
    amount: input.amount,
    student_id: input.studentId ?? null,
    invoice_id: input.invoiceId ?? null,
    note: input.note?.trim() || null,
    status: 'pending',
    requested_by: userData.user?.id ?? null,
    requested_by_name: input.requestedByName?.trim() || userData.user?.email || null,
  });
  if (error) throw new Error(error.message);
}

export interface ReviewApprovalResult {
  selfReview: boolean;
}

/** The checker approves/rejects. A maker cannot sign off their own request. */
export async function reviewApproval(
  approval: FeeApproval,
  decision: 'approved' | 'rejected',
  reviewerName: string | null,
  reviewNote?: string,
): Promise<ReviewApprovalResult> {
  const { data: userData } = await supabase.auth.getUser();
  const reviewerId = userData.user?.id ?? null;
  if (reviewerId && approval.requested_by && reviewerId === approval.requested_by) {
    return { selfReview: true };
  }
  const { error } = await supabase
    .from('fee_approvals')
    .update({
      status: decision,
      reviewed_by: reviewerId,
      reviewed_by_name: reviewerName?.trim() || userData.user?.email || null,
      review_note: reviewNote?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', approval.id)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  return { selfReview: false };
}

export interface NewExamPaperInput {
  examId: string;
  subjectId: string;
  sectionId?: string | null;
  examDate?: string | null;
  startTime?: string | null;
  durationMinutes?: number;
  maxMarks?: number;
  passMarks?: number;
}

export async function createExamPaper(input: NewExamPaperInput): Promise<void> {
  const { error } = await supabase.from('exam_subjects').insert({
    exam_id: input.examId,
    subject_id: input.subjectId,
    section_id: input.sectionId || null,
    exam_date: input.examDate || null,
    start_time: input.startTime || null,
    duration_minutes: input.durationMinutes ?? 60,
    max_marks: input.maxMarks ?? 100,
    pass_marks: input.passMarks ?? 50,
  });
  if (error) throw new Error(error.message);
}

// ===================== Enrollment history =====================

export interface EnrollmentRow extends Enrollment {
  academic_years: { id: string; name: string; is_current: boolean } | null;
  sections: { id: string; name: string } | null;
  classes: { id: string; name: string } | null;
}

export async function fetchAcademicYears(): Promise<AcademicYear[]> {
  return run<AcademicYear[]>(
    supabase.from('academic_years').select('*').order('start_date', { ascending: false }),
  );
}

/** Full placement history for one student — one row per academic year. */
export async function fetchEnrollments(studentId: string): Promise<EnrollmentRow[]> {
  return run<EnrollmentRow[]>(
    supabase
      .from('enrollments')
      .select('*, academic_years(id, name, is_current), sections(id, name), classes(id, name)')
      .eq('student_id', studentId)
      .order('started_on', { ascending: false }),
  );
}

export interface EnrollmentInput {
  studentId: string;
  institutionId: string;
  academicYearId: string;
  sectionId?: string | null;
  classId?: string | null;
  rollNo?: number | null;
  status: EnrollmentStatus;
  startedOn?: string | null;
  endedOn?: string | null;
  finalAverage?: number | null;
  result?: string | null;
  notes?: string | null;
}

/** Upsert on (student, academic year) so a year can only hold one placement. */
export async function saveEnrollment(input: EnrollmentInput): Promise<void> {
  const { error } = await supabase.from('enrollments').upsert(
    {
      institution_id: input.institutionId,
      student_id: input.studentId,
      academic_year_id: input.academicYearId,
      section_id: input.sectionId || null,
      class_id: input.classId || null,
      roll_no: input.rollNo ?? null,
      status: input.status,
      started_on: input.startedOn || null,
      ended_on: input.endedOn || null,
      final_average: input.finalAverage ?? null,
      result: input.result?.trim() || null,
      notes: input.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'student_id,academic_year_id' },
  );
  if (error) throw new Error(error.message);
}

export async function deleteEnrollment(id: string): Promise<void> {
  const { error } = await supabase.from('enrollments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}