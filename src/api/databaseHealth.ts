import { supabase } from './supabaseClient';

/**
 * Database health — read-only integrity sweep for staff.
 *
 * Three families of problems only, because they are the ones that silently rot
 * a school database:
 *   1. ORPHANS  — a row pointing at a parent that no longer exists. Nothing
 *                 errors at write time, the record just becomes invisible.
 *   2. DUPLICATES — the same fact stored twice (a student marked twice on one
 *                 day, two invoices with one number), which quietly doubles
 *                 money or attendance.
 *   3. FEE MISMATCHES — invoices whose receipts no longer agree with the
 *                 billed total, so the ledger and the cash box disagree.
 *
 * Every check is a plain read against the live tables, so it respects RLS and
 * never mutates anything. Comparisons happen in the browser over id sets,
 * which keeps the whole sweep to one round of parallel queries.
 */

export type HealthCategory = 'orphan' | 'duplicate' | 'mismatch';

export interface HealthIssue {
  /** Stable row key for React lists. */
  id: string;
  /** Human-readable subject of the problem (usually a student). */
  label: string;
  /** What exactly is wrong, e.g. "student_no STU-2026-00114". */
  detail: string;
}

export interface HealthCheck {
  key: string;
  category: HealthCategory;
  /** Table the offending rows live in. */
  table: string;
  /** Parent table the row should have matched, when relevant. */
  parent: string | null;
  count: number;
  /** Offending rows, capped so one broken table can never freeze the page. */
  rows: HealthIssue[];
  /** ISO stamp of the sweep that produced this check. */
  ranAt: string;
}

export interface HealthReport {
  checks: HealthCheck[];
  orphans: number;
  duplicates: number;
  mismatches: number;
  cleanChecks: number;
  totalChecks: number;
  tablesScanned: number;
  ranAt: string;
}

/** Rows pulled per table. Well above any real school's row count, still bounded. */
const ROW_LIMIT = 20000;

/** Offending rows kept per check — enough to hand off, still bounded. */
const ROW_SAMPLE_LIMIT = 200;

interface StudentLite {
  id: string;
  student_no: string | null;
  first_name: string;
  last_name: string | null;
  section_id: string | null;
}

interface IdLite {
  id: string;
}

interface InvoiceLite {
  id: string;
  invoice_no: string;
  student_id: string;
  status: string | null;
  total: number | string | null;
}

interface GuardianLite {
  id: string;
  full_name: string;
}

interface ExamLite {
  id: string;
  name: string;
}

interface ExamResultLite {
  id: string;
  exam_id: string;
  exam_subject_id: string;
  student_id: string;
  marks_obtained: number | string | null;
}

interface AttendanceLite {
  id: string;
  student_id: string;
  attendance_date: string;
  status: string;
}

interface EnrollmentLite {
  id: string;
  student_id: string;
  academic_year_id: string;
  status: string;
}

interface PlacementLite {
  id: string;
  student_id: string;
}

interface InvoiceItemLite {
  id: string;
  invoice_id: string;
  description: string | null;
  amount: number | string | null;
}

interface PaymentLite {
  id: string;
  invoice_id: string;
  student_id: string | null;
  receipt_no: string | null;
  amount: number | string | null;
}

interface GuardianLinkLite {
  id: string;
  student_id: string;
  guardian_id: string;
}

interface YearLite {
  id: string;
  name: string;
}

async function fetchRows<T>(table: string, columns: string): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(columns).limit(ROW_LIMIT);
  if (error) throw new Error(`${table}: ${error.message}`);
  return (data ?? []) as T[];
}

const ids = <T extends IdLite>(rows: T[]): Set<string> => new Set(rows.map((row) => row.id));

const shortId = (value: string | null | undefined): string =>
  value ? `${value.slice(0, 8)}…` : '—';

/** Orphan result builder — keeps the check definition to a single object. */
function orphanCheck(input: {
  key: string;
  table: string;
  parent: string;
  offenders: HealthIssue[];
}): Omit<HealthCheck, 'ranAt'> {
  return {
    key: input.key,
    category: 'orphan',
    table: input.table,
    parent: input.parent,
    count: input.offenders.length,
    rows: input.offenders.slice(0, ROW_SAMPLE_LIMIT),
  };
}

/** Group rows by a natural key; every group with more than one row is a duplicate. */
function duplicateCheck(input: {
  key: string;
  table: string;
  grouped: { group: string; issue: HealthIssue }[];
}): Omit<HealthCheck, 'ranAt'> {
  const buckets = new Map<string, HealthIssue[]>();
  input.grouped.forEach(({ group, issue }) => {
    const bucket = buckets.get(group) ?? [];
    bucket.push(issue);
    buckets.set(group, bucket);
  });
  const offenders: HealthIssue[] = [];
  buckets.forEach((bucket) => {
    if (bucket.length > 1) offenders.push(...bucket);
  });
  return {
    key: input.key,
    category: 'duplicate',
    table: input.table,
    parent: null,
    count: offenders.length,
    rows: offenders.slice(0, ROW_SAMPLE_LIMIT),
  };
}

/** Fee mismatch builder — invoices that disagree with their own receipts or lines. */
function mismatchCheck(input: {
  key: string;
  offenders: HealthIssue[];
  parent?: string;
}): Omit<HealthCheck, 'ranAt'> {
  return {
    key: input.key,
    category: 'mismatch',
    table: 'invoices',
    parent: input.parent ?? 'payments',
    count: input.offenders.length,
    rows: input.offenders.slice(0, ROW_SAMPLE_LIMIT),
  };
}

/**
 * Run every check. Throws only when a table read itself fails (permissions or
 * a missing table) so the page can show a real error instead of "all clean".
 */
export async function runDatabaseHealth(): Promise<HealthReport> {
  const [
    students,
    sections,
    guardians,
    exams,
    invoices,
    invoiceItems,
    payments,
    examResults,
    attendance,
    enrollments,
    transportAllocations,
    hostelAllocations,
    guardianLinks,
    academicYears,
  ] = await Promise.all([
    fetchRows<StudentLite>('students', 'id, student_no, first_name, last_name, section_id'),
    fetchRows<IdLite>('sections', 'id'),
    fetchRows<GuardianLite>('guardians', 'id, full_name'),
    fetchRows<ExamLite>('exams', 'id, name'),
    fetchRows<InvoiceLite>('invoices', 'id, invoice_no, student_id, status, total'),
    fetchRows<InvoiceItemLite>('invoice_items', 'id, invoice_id, description, amount'),
    fetchRows<PaymentLite>('payments', 'id, invoice_id, student_id, receipt_no, amount'),
    fetchRows<ExamResultLite>(
      'exam_results',
      'id, exam_id, exam_subject_id, student_id, marks_obtained',
    ),
    fetchRows<AttendanceLite>('attendance', 'id, student_id, attendance_date, status'),
    fetchRows<EnrollmentLite>('enrollments', 'id, student_id, academic_year_id, status'),
    fetchRows<PlacementLite>('transport_allocations', 'id, student_id'),
    fetchRows<PlacementLite>('hostel_allocations', 'id, student_id'),
    fetchRows<GuardianLinkLite>('student_guardians', 'id, student_id, guardian_id'),
    fetchRows<YearLite>('academic_years', 'id, name'),
  ]);

  const studentMap = new Map(students.map((row) => [row.id, row]));
  const sectionIds = ids(sections);
  const guardianIds = ids(guardians);
  const examIds = ids(exams);
  const invoiceIds = ids(invoices);
  const examMap = new Map(exams.map((row) => [row.id, row]));
  const yearMap = new Map(academicYears.map((row) => [row.id, row]));

  const studentName = (studentId: string | null): string => {
    if (!studentId) return '—';
    const student = studentMap.get(studentId);
    if (!student) return `Unknown student ${shortId(studentId)}`;
    return `${student.first_name} ${student.last_name ?? ''}`.trim();
  };

  const checks: Omit<HealthCheck, 'ranAt'>[] = [];

  // ---------------------------------------------------------------- orphans

  checks.push(
    orphanCheck({
      key: 'students_section',
      table: 'students',
      parent: 'sections',
      offenders: students
        .filter((row) => row.section_id && !sectionIds.has(row.section_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.id),
          detail: `section_id ${shortId(row.section_id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'guardian_link_student',
      table: 'student_guardians',
      parent: 'students',
      offenders: guardianLinks
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `link ${shortId(row.id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'guardian_link_guardian',
      table: 'student_guardians',
      parent: 'guardians',
      offenders: guardianLinks
        .filter((row) => !guardianIds.has(row.guardian_id))
        .map((row) => ({
          id: row.id,
          label: guardians.find((g) => g.id === row.guardian_id)?.full_name ?? 'Unknown guardian',
          detail: `guardian_id ${shortId(row.guardian_id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'enrollment_student',
      table: 'enrollments',
      parent: 'students',
      offenders: enrollments
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `${yearMap.get(row.academic_year_id)?.name ?? shortId(row.academic_year_id)} · ${row.status}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'invoice_student',
      table: 'invoices',
      parent: 'students',
      offenders: invoices
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `invoice ${row.invoice_no}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'invoice_item_invoice',
      table: 'invoice_items',
      parent: 'invoices',
      offenders: invoiceItems
        .filter((row) => !invoiceIds.has(row.invoice_id))
        .map((row) => ({
          id: row.id,
          label: row.description ?? 'Invoice line',
          detail: `invoice_id ${shortId(row.invoice_id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'payment_invoice',
      table: 'payments',
      parent: 'invoices',
      offenders: payments
        .filter((row) => !invoiceIds.has(row.invoice_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `receipt ${row.receipt_no ?? shortId(row.id)} · amount ${row.amount ?? 0}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'payment_student',
      table: 'payments',
      parent: 'students',
      offenders: payments
        .filter((row) => row.student_id && !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `receipt ${row.receipt_no ?? shortId(row.id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'result_student',
      table: 'exam_results',
      parent: 'students',
      offenders: examResults
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `marks ${row.marks_obtained ?? 0}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'result_exam',
      table: 'exam_results',
      parent: 'exams',
      offenders: examResults
        .filter((row) => !examIds.has(row.exam_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `exam_id ${shortId(row.exam_id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'attendance_student',
      table: 'attendance',
      parent: 'students',
      offenders: attendance
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `${row.attendance_date} · ${row.status}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'transport_student',
      table: 'transport_allocations',
      parent: 'students',
      offenders: transportAllocations
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `allocation ${shortId(row.id)}`,
        })),
    }),
  );

  checks.push(
    orphanCheck({
      key: 'hostel_student',
      table: 'hostel_allocations',
      parent: 'students',
      offenders: hostelAllocations
        .filter((row) => !studentMap.has(row.student_id))
        .map((row) => ({
          id: row.id,
          label: studentName(row.student_id),
          detail: `allocation ${shortId(row.id)}`,
        })),
    }),
  );

  // ------------------------------------------------------------- duplicates

  checks.push(
    duplicateCheck({
      key: 'dup_student_no',
      table: 'students',
      grouped: students
        .filter((row) => Boolean(row.student_no))
        .map((row) => ({
          group: String(row.student_no).trim().toLowerCase(),
          issue: {
            id: row.id,
            label: studentName(row.id),
            detail: `student_no ${row.student_no}`,
          },
        })),
    }),
  );

  checks.push(
    duplicateCheck({
      key: 'dup_invoice_no',
      table: 'invoices',
      grouped: invoices.map((row) => ({
        group: String(row.invoice_no).trim().toLowerCase(),
        issue: {
          id: row.id,
          label: studentName(row.student_id),
          detail: `invoice ${row.invoice_no}`,
        },
      })),
    }),
  );

  checks.push(
    duplicateCheck({
      key: 'dup_receipt_no',
      table: 'payments',
      grouped: payments
        .filter((row) => Boolean(row.receipt_no))
        .map((row) => ({
          group: String(row.receipt_no).trim().toLowerCase(),
          issue: {
            id: row.id,
            label: studentName(row.student_id),
            detail: `receipt ${row.receipt_no} · amount ${row.amount ?? 0}`,
          },
        })),
    }),
  );

  checks.push(
    duplicateCheck({
      key: 'dup_exam_result',
      table: 'exam_results',
      grouped: examResults.map((row) => ({
        group: `${row.exam_subject_id}:${row.student_id}`,
        issue: {
          id: row.id,
          label: studentName(row.student_id),
          detail: `${examMap.get(row.exam_id)?.name ?? 'Exam'} · marks ${row.marks_obtained ?? 0}`,
        },
      })),
    }),
  );

  checks.push(
    duplicateCheck({
      key: 'dup_attendance',
      table: 'attendance',
      grouped: attendance.map((row) => ({
        group: `${row.student_id}:${row.attendance_date}`,
        issue: {
          id: row.id,
          label: studentName(row.student_id),
          detail: `${row.attendance_date} · ${row.status}`,
        },
      })),
    }),
  );

  checks.push(
    duplicateCheck({
      key: 'dup_enrollment',
      table: 'enrollments',
      grouped: enrollments.map((row) => ({
        group: `${row.student_id}:${row.academic_year_id}`,
        issue: {
          id: row.id,
          label: studentName(row.student_id),
          detail: yearMap.get(row.academic_year_id)?.name ?? shortId(row.academic_year_id),
        },
      })),
    }),
  );

  // ------------------------------------------------------- fee mismatches

  // One pass over every receipt, so each invoice knows what it actually
  // collected. Anything off by more than a cent is a real ledger problem.
  const paidByInvoice = new Map<string, number>();
  payments.forEach((row) => {
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount)) return;
    paidByInvoice.set(row.invoice_id, (paidByInvoice.get(row.invoice_id) ?? 0) + amount);
  });

  const money = (value: number): string => value.toFixed(2);
  const overpaid: HealthIssue[] = [];
  const paidWithoutReceipts: HealthIssue[] = [];

  // Bills are built line by line, so the header total must equal its own lines.
  // A drift here means the family is billed one number and shown another.
  const linesByInvoice = new Map<string, { sum: number; count: number }>();
  invoiceItems.forEach((row) => {
    const amount = Number(row.amount ?? 0);
    if (!Number.isFinite(amount)) return;
    const bucket = linesByInvoice.get(row.invoice_id) ?? { sum: 0, count: 0 };
    bucket.sum += amount;
    bucket.count += 1;
    linesByInvoice.set(row.invoice_id, bucket);
  });

  const totalVsLines: HealthIssue[] = [];

  invoices.forEach((row) => {
    const paid = paidByInvoice.get(row.id) ?? 0;
    const total = Number(row.total ?? 0);
    const safeTotal = Number.isFinite(total) ? total : 0;
    const label = studentName(row.student_id);

    if (paid - safeTotal > 0.01) {
      overpaid.push({
        id: row.id,
        label,
        detail: `invoice ${row.invoice_no} · paid ${money(paid)} of ${money(safeTotal)} (+${money(paid - safeTotal)})`,
      });
    }

    const status = String(row.status ?? '').trim().toLowerCase();
    if (status === 'paid' && paid <= 0.01) {
      paidWithoutReceipts.push({
        id: row.id,
        label,
        detail: `invoice ${row.invoice_no} · total ${money(safeTotal)} · status paid, no receipts`,
      });
    }

    const lines = linesByInvoice.get(row.id);
    // An invoice with no lines at all is caught by the orphan family instead.
    if (!lines || lines.count === 0) return;

    const diff = safeTotal - lines.sum;
    if (Math.abs(diff) <= 0.01) return;

    totalVsLines.push({
      id: row.id,
      label,
      detail: `invoice ${row.invoice_no} · total ${money(safeTotal)} vs lines ${money(lines.sum)} (${
        diff > 0 ? '+' : ''
      }${money(diff)}) · ${lines.count} line${lines.count === 1 ? '' : 's'}`,
    });
  });

  checks.push(mismatchCheck({ key: 'mismatch_overpaid', offenders: overpaid }));
  checks.push(
    mismatchCheck({ key: 'mismatch_paid_no_payments', offenders: paidWithoutReceipts }),
  );
  checks.push(
    mismatchCheck({
      key: 'mismatch_invoice_lines',
      offenders: totalVsLines,
      parent: 'invoice_items',
    }),
  );

  const ranAt = new Date().toISOString();
  const stamped: HealthCheck[] = checks.map((check) => ({ ...check, ranAt }));

  const orphanRows = stamped.filter((c) => c.category === 'orphan').reduce((sum, c) => sum + c.count, 0);
  const duplicateRows = stamped
    .filter((c) => c.category === 'duplicate')
    .reduce((sum, c) => sum + c.count, 0);
  const mismatchRows = stamped
    .filter((c) => c.category === 'mismatch')
    .reduce((sum, c) => sum + c.count, 0);

  return {
    checks: stamped,
    orphans: orphanRows,
    duplicates: duplicateRows,
    mismatches: mismatchRows,
    cleanChecks: stamped.filter((c) => c.count === 0).length,
    totalChecks: stamped.length,
    tablesScanned: 15,
    ranAt,
  };
}

/** Guard for the page: only the two roles that own the platform may open it. */
export const HEALTH_ROLES = ['super_admin', 'admin'];