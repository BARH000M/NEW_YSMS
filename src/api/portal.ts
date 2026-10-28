import { supabase } from './supabaseClient';

export interface SelfStudent {
  id: string;
  student_no: string | null;
  first_name: string;
  last_name: string | null;
  first_name_ar: string | null;
  last_name_ar: string | null;
  status: string;
  photo_url: string | null;
  dob: string | null;
  gender: string | null;
  nationality: string | null;
  sections: { id: string; name: string; class_id: string; classes: { id: string; name: string; level: number | null } | null } | null;
  attendance: { total: number; present: number; absent: number; late: number; excused: number };
  invoices: {
    id: string;
    invoice_no: string;
    issue_date: string;
    due_date: string | null;
    status: string;
    subtotal: number | string;
    discount: number | string;
    total: number | string;
    paid: number;
  }[];
  payments: { id: string; invoice_id: string; amount: number | string; method: string; paid_at: string; receipt_no: string | null }[];
  finance: { billed: number; paid: number; outstanding: number };
  results: { id: string; subject: string; subject_ar: string | null; marks: number; max: number; grade: string | null; percentage: number }[];
  enrollments: {
    id: string;
    status: string;
    started_on: string | null;
    ended_on: string | null;
    final_average: number | string | null;
    result: string | null;
    academic_years: { name: string; is_current: boolean } | null;
    classes: { name: string } | null;
    sections: { name: string } | null;
  }[];
  documents: { id: string; type: string; title: string | null; verified: boolean; created_at: string }[];
  discounts: {
    id: string;
    amount: number | string | null;
    fee_discounts: { name: string; discount_type: 'fixed' | 'percent'; amount: number | string } | null;
  }[];
}

export interface SelfPayload {
  role: 'student' | 'parent';
  linked: boolean;
  students: SelfStudent[];
}

/**
 * Server-resolved self-service bundle. The student id is never sent from the
 * browser — the function derives it from the verified JWT.
 */
export async function fetchSelfPortal(): Promise<SelfPayload> {
  const { data, error } = await supabase.functions.invoke('portal-self', { body: {} });

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

  const payload = data as SelfPayload & { error?: string };
  if (payload?.error) throw new Error(payload.error);
  return { role: payload.role, linked: Boolean(payload.linked), students: payload.students ?? [] };
}

export function fullName(student: SelfStudent, arabic: boolean): string {
  const first = arabic ? student.first_name_ar || student.first_name : student.first_name;
  const last = arabic ? student.last_name_ar || student.last_name : student.last_name;
  return `${first} ${last ?? ''}`.trim();
}

export function attendanceRate(summary: SelfStudent['attendance']): number {
  if (!summary.total) return 0;
  return Math.round(((summary.present + summary.late) / summary.total) * 100);
}