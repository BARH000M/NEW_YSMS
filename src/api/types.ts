export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'teacher'
  | 'accountant'
  | 'student'
  | 'parent'
  | 'receptionist'
  | 'librarian';

export interface Institution {
  id: string;
  name: string;
  name_ar: string | null;
  name_zh: string | null;
  code: string | null;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
}

export interface Profile {
  id: string;
  institution_id: string | null;
  full_name: string | null;
  full_name_ar: string | null;
  phone: string | null;
  avatar_url: string | null;
  locale: 'ar' | 'en' | 'zh';
  is_active: boolean;
  last_login_at: string | null;
}

export interface UserRole {
  user_id: string;
  institution_id: string | null;
  role: AppRole;
  is_active: boolean;
}

export interface AcademicYear {
  id: string;
  institution_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

export interface Term {
  id: string;
  academic_year_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
}

export interface SchoolClass {
  id: string;
  academic_year_id: string;
  name: string;
  level: number | null;
  capacity: number;
}

export interface Section {
  id: string;
  class_id: string;
  name: string;
  room: string | null;
  class_teacher_id: string | null;
}

export interface Subject {
  id: string;
  institution_id: string;
  code: string | null;
  name: string;
  name_ar: string | null;
  name_zh: string | null;
  credit_hours: number;
  is_active: boolean;
}

export interface ClassSubject {
  id: string;
  section_id: string;
  subject_id: string;
  teacher_id: string | null;
}

export type StudentStatus = 'active' | 'suspended' | 'graduated' | 'withdrawn';

export interface Student {
  id: string;
  institution_id: string;
  profile_id: string | null;
  admission_id: string | null;
  student_no: string | null;
  first_name: string;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  dob: string | null;
  gender: 'male' | 'female' | null;
  nationality: string | null;
  section_id: string | null;
  status: StudentStatus;
  photo_url: string | null;
  enrolled_at: string | null;
}

export interface Guardian {
  id: string;
  institution_id: string;
  profile_id: string | null;
  full_name: string;
  relation: 'father' | 'mother' | 'guardian' | 'other';
  phone: string | null;
  email: string | null;
  occupation: string | null;
  address: string | null;
}

export interface Staff {
  id: string;
  institution_id: string;
  profile_id: string | null;
  staff_no: string | null;
  full_name: string;
  full_name_ar: string | null;
  designation: string | null;
  department: string | null;
  join_date: string | null;
  contract_type: 'full_time' | 'part_time' | 'contract';
  base_salary: number;
  is_active: boolean;
}

export type AdmissionStatus =
  | 'new'
  | 'contacted'
  | 'documents_pending'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'enrolled';

export interface Admission {
  id: string;
  institution_id: string;
  applicant_name: string;
  phone: string | null;
  email: string | null;
  program: string | null;
  preferred_schedule: string | null;
  education_level: string | null;
  notes: string | null;
  status: AdmissionStatus;
  source: 'website' | 'walk_in' | 'phone' | 'referral';
  reference_no: string | null;
  assigned_to: string | null;
  converted_student_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string | null;
  title: string;
  body: string | null;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp';
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface DataResult<T> {
  data: T | null;
  error: string | null;
}

export type InvoiceStatus = 'unpaid' | 'partial' | 'paid' | 'void';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'cheque' | 'mobile_wallet';

export interface FeeHead {
  id: string;
  institution_id: string;
  name: string;
  code: string | null;
  category: string;
  amount: number;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  institution_id: string;
  student_id: string;
  term_id: string | null;
  invoice_no: string;
  issue_date: string;
  due_date: string | null;
  status: InvoiceStatus;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  fee_head_id: string | null;
  description: string;
  amount: number;
}

export interface Payment {
  id: string;
  institution_id: string;
  invoice_id: string;
  student_id: string;
  amount: number;
  method: PaymentMethod;
  receipt_no: string | null;
  paid_at: string;
  reference: string | null;
  notes: string | null;
}

export type ExamType = 'quiz' | 'midterm' | 'final' | 'practical';
export type ExamStatus = 'scheduled' | 'ongoing' | 'published' | 'closed';

export interface Exam {
  id: string;
  institution_id: string;
  term_id: string | null;
  name: string;
  exam_type: ExamType;
  starts_on: string | null;
  ends_on: string | null;
  status: ExamStatus;
  notes: string | null;
}

export interface ExamSubject {
  id: string;
  exam_id: string;
  subject_id: string;
  section_id: string | null;
  exam_date: string | null;
  start_time: string | null;
  duration_minutes: number;
  max_marks: number;
  pass_marks: number;
}

export interface ExamResult {
  id: string;
  exam_id: string;
  exam_subject_id: string;
  student_id: string;
  marks_obtained: number;
  grade: string | null;
  remarks: string | null;
}

export type EnrollmentStatus =
  | 'enrolled'
  | 'promoted'
  | 'repeated'
  | 'transferred'
  | 'graduated'
  | 'withdrawn';

/** One placement of a student in one academic year (history is never overwritten). */
export interface Enrollment {
  id: string;
  institution_id: string;
  student_id: string;
  academic_year_id: string;
  section_id: string | null;
  class_id: string | null;
  roll_no: number | null;
  status: EnrollmentStatus;
  started_on: string | null;
  ended_on: string | null;
  final_average: number | string | null;
  result: string | null;
  notes: string | null;
  created_at: string;
}

export type StudentDocumentType =
  | 'birth_certificate'
  | 'national_id'
  | 'medical'
  | 'previous_report'
  | 'photo'
  | 'transfer'
  | 'other';

/** Metadata only — the file itself lives in the private `documents` bucket. */
export interface StudentDocument {
  id: string;
  institution_id: string;
  student_id: string;
  type: StudentDocumentType;
  title: string | null;
  file_path: string | null;
  verified: boolean;
  uploaded_by: string | null;
  created_at: string;
}