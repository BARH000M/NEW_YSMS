import { supabase } from './supabaseClient';
import type { StudentDocument, StudentDocumentType } from './types';

/** Files live in a private bucket, so the browser can only ever get a signed link. */
const BUCKET = 'documents';
const MAX_BYTES = 10 * 1024 * 1024;

const invoke = async <T>(body: Record<string, unknown>): Promise<T> => {
  const { data, error } = await supabase.functions.invoke('student-documents', { body });

  if (error) {
    const context = (error as { context?: Response }).context;
    let message = error.message;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) message = payload.error;
      } catch {
        // keep the original message
      }
    }
    throw new Error(message);
  }

  if (data && typeof data === 'object' && 'error' in data) {
    const maybeError = (data as { error?: unknown }).error;
    if (maybeError) throw new Error(String(maybeError));
  }

  return data as T;
};

export async function fetchStudentDocuments(studentId: string): Promise<StudentDocument[]> {
  const { data, error } = await supabase
    .from('student_documents')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as StudentDocument[];
}

export interface SignedDocumentUrl {
  id: string;
  url: string | null;
  error?: string;
}

/** Signed links expire in an hour and are never persisted. */
export async function requestSignedDocumentUrls(documentIds: string[]): Promise<SignedDocumentUrl[]> {
  if (documentIds.length === 0) return [];
  const result = await invoke<{ urls: SignedDocumentUrl[] }>({
    action: 'sign-download',
    documentIds,
  });
  return result.urls ?? [];
}

export interface UploadDocumentInput {
  studentId: string;
  institutionId: string;
  file: File;
  type: StudentDocumentType;
  title: string;
}

/** Ticket → direct upload → metadata row. The file never passes through the API. */
export async function uploadStudentDocument(input: UploadDocumentInput): Promise<void> {
  if (input.file.size > MAX_BYTES) {
    throw new Error('That file is larger than 10 MB. Please compress it and try again.');
  }

  const ticket = await invoke<{ path: string; token: string | null }>({
    action: 'sign-upload',
    studentId: input.studentId,
    fileName: input.file.name,
  });

  if (!ticket.path || !ticket.token) {
    throw new Error('The backend did not return an upload ticket.');
  }

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(ticket.path, ticket.token, input.file);
  if (uploadError) throw new Error(uploadError.message);

  const { data: userData } = await supabase.auth.getUser();

  const { error: rowError } = await supabase.from('student_documents').insert({
    institution_id: input.institutionId,
    student_id: input.studentId,
    type: input.type,
    title: input.title.trim() || input.file.name,
    file_path: ticket.path,
    verified: false,
    uploaded_by: userData.user?.id ?? null,
  });

  if (rowError) throw new Error(rowError.message);
}

export async function setDocumentVerified(documentId: string, verified: boolean): Promise<void> {
  const { error } = await supabase
    .from('student_documents')
    .update({ verified, updated_at: new Date().toISOString() })
    .eq('id', documentId);
  if (error) throw new Error(error.message);
}

export async function deleteStudentDocument(documentId: string): Promise<void> {
  await invoke<{ ok: boolean }>({ action: 'delete', documentId });
}