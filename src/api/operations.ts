import { supabase } from './supabaseClient';
import { fetchInstitution } from './college';

/** Small shared runner so every new screen can surface a real error message. */
async function run<T>(promise: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error) throw new Error(error.message);
  return (data ?? []) as T;
}

const fail = (message: string): never => {
  throw new Error(message);
};

/* ------------------------------ Front office ------------------------------ */

export interface CallLog {
  id: string;
  caller_name: string;
  phone: string | null;
  direction: 'incoming' | 'outgoing';
  purpose: string | null;
  call_at: string;
  notes: string | null;
}

export async function fetchCallLogs(): Promise<CallLog[]> {
  return run<CallLog[]>(
    supabase
      .from('call_logs')
      .select('id, caller_name, phone, direction, purpose, call_at, notes')
      .order('call_at', { ascending: false })
      .limit(200),
  );
}

export interface CallLogInput {
  callerName: string;
  phone?: string;
  direction: 'incoming' | 'outgoing';
  purpose?: string;
  notes?: string;
}

export async function createCallLog(input: CallLogInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('call_logs').insert({
    institution_id: institution?.id ?? null,
    caller_name: input.callerName.trim() || fail('Name is required'),
    phone: input.phone?.trim() || null,
    direction: input.direction,
    purpose: input.purpose?.trim() || null,
    notes: input.notes?.trim() || null,
    handled_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export interface PostalRecord {
  id: string;
  direction: 'incoming' | 'outgoing' | string;
  sender: string | null;
  recipient: string | null;
  reference: string | null;
  received_at: string | null;
}

/** Incoming / outgoing registry — one table, filtered by direction. */
export async function fetchPostalRecords(): Promise<PostalRecord[]> {
  return run<PostalRecord[]>(
    supabase
      .from('postal_records')
      .select('id, direction, sender, recipient, reference, received_at')
      .order('received_at', { ascending: false })
      .limit(200),
  );
}

export interface PostalInput {
  direction: 'incoming' | 'outgoing';
  sender?: string;
  recipient?: string;
  reference?: string;
}

export async function createPostalRecord(input: PostalInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('postal_records').insert({
    institution_id: institution?.id ?? null,
    direction: input.direction,
    sender: input.sender?.trim() || null,
    recipient: input.recipient?.trim() || null,
    reference: input.reference?.trim() || null,
    received_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

/* -------------------------------- Finance -------------------------------- */

export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  spent_on: string;
  method: string;
  reference: string | null;
  notes: string | null;
}

export async function fetchExpenses(): Promise<Expense[]> {
  return run<Expense[]>(
    supabase
      .from('expenses')
      .select('id, title, category, amount, spent_on, method, reference, notes')
      .order('spent_on', { ascending: false })
      .limit(300),
  );
}

export interface ExpenseInput {
  title: string;
  category: string;
  amount: number;
  spentOn: string;
  method: string;
  reference?: string;
  notes?: string;
}

export async function createExpense(input: ExpenseInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('expenses').insert({
    institution_id: institution?.id ?? null,
    title: input.title.trim() || fail('Title is required'),
    category: input.category,
    amount: input.amount,
    spent_on: input.spentOn || new Date().toISOString().slice(0, 10),
    method: input.method,
    reference: input.reference?.trim() || null,
    notes: input.notes?.trim() || null,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

/* ---------------------------------- LMS ---------------------------------- */

export interface AssignmentRow {
  id: string;
  section_id: string | null;
  subject_id: string | null;
  title: string;
  instructions: string | null;
  due_date: string | null;
  max_score: number;
  is_published: boolean;
  sections: { id: string; name: string; classes: { name: string } | null } | null;
  subjects: { id: string; name: string } | null;
}

export async function fetchAssignments(): Promise<AssignmentRow[]> {
  return run<AssignmentRow[]>(
    supabase
      .from('assignments')
      .select(
        'id, section_id, subject_id, title, instructions, due_date, max_score, is_published, sections(id, name, classes(name)), subjects(id, name)',
      )
      .order('due_date', { ascending: true }),
  );
}

export interface AssignmentInput {
  title: string;
  instructions?: string;
  sectionId?: string | null;
  subjectId?: string | null;
  dueDate?: string | null;
  maxScore?: number;
}

export async function createAssignment(input: AssignmentInput): Promise<void> {
  const institution = await fetchInstitution();
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from('assignments').insert({
    institution_id: institution?.id ?? null,
    title: input.title.trim() || fail('Title is required'),
    instructions: input.instructions?.trim() || null,
    section_id: input.sectionId || null,
    subject_id: input.subjectId || null,
    due_date: input.dueDate || null,
    max_score: input.maxScore ?? 100,
    created_by: userData.user?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function setAssignmentPublished(id: string, published: boolean): Promise<void> {
  const { error } = await supabase.from('assignments').update({ is_published: published }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export interface OnlineCourse {
  id: string;
  title: string;
  provider: string | null;
  url: string | null;
  level: string;
  description: string | null;
  is_active: boolean;
}

export async function fetchCourses(): Promise<OnlineCourse[]> {
  return run<OnlineCourse[]>(
    supabase
      .from('online_courses')
      .select('id, title, provider, url, level, description, is_active')
      .order('created_at', { ascending: true }),
  );
}

export interface CourseInput {
  title: string;
  provider?: string;
  url?: string;
  level: string;
  description?: string;
}

export async function createCourse(input: CourseInput): Promise<void> {
  const institution = await fetchInstitution();
  const { error } = await supabase.from('online_courses').insert({
    institution_id: institution?.id ?? null,
    title: input.title.trim() || fail('Title is required'),
    provider: input.provider?.trim() || null,
    url: input.url?.trim() || null,
    level: input.level,
    description: input.description?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

export async function setCourseActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('online_courses').update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}