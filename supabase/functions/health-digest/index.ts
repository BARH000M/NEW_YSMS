// Weekly database-health digest.
// Verifies the caller, re-runs the integrity sweep server-side, emails the findings via Resend.
// mode "now" = an admin pressed Send digest now · mode "scheduled" = timer, honours weekday/hour.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ROW_LIMIT = 20000;
const SAMPLE_LIMIT = 5;

/**
 * Publishable project key — the exact value the browser bundle already ships,
 * so it is public by design. It is only ever used to verify the caller's JWT;
 * every privileged read goes through the service-role client below.
 */
const publishableKey = 'sb_publishable_faz0jtGzgdHPoAmMjXw7FoAbMHHQQOqA';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const short = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '-';
  const text = String(value);
  return text.length > 8 ? `${text.slice(0, 8)}...` : text;
};

const money = (value: number): string => value.toFixed(2);

const num = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const HISTORY_LIMIT = 12;

interface Finding {
  key: string;
  category: 'orphan' | 'duplicate' | 'mismatch';
  table: string;
  parent: string | null;
  count: number;
  samples: string[];
}

/** One entry of the sign-off trail saved by the health page. */
interface HistoryEntry {
  checkKey: string;
  action: 'signed_off' | 'cleared' | 'reopened';
  note: string | null;
  at: string;
  byName: string | null;
}

/**
 * Read the sign-off trail from the protected settings row, so admins see what a
 * colleague already dealt with before they read the findings list.
 */
function parseHistory(value: unknown): HistoryEntry[] {
  const raw = Array.isArray(value)
    ? value
    : value && typeof value === 'object' && Array.isArray((value as Record<string, unknown>).events)
      ? ((value as Record<string, unknown>).events as unknown[])
      : [];

  const events: HistoryEntry[] = [];
  raw.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const checkKey = typeof record.checkKey === 'string' ? record.checkKey : null;
    const at = typeof record.at === 'string' ? record.at : null;
    if (!checkKey || !at) return;
    events.push({
      checkKey,
      action:
        record.action === 'reopened'
          ? 'reopened'
          : record.action === 'cleared'
            ? 'cleared'
            : 'signed_off',
      note: typeof record.note === 'string' && record.note.trim() ? record.note.trim() : null,
      at,
      byName: typeof record.byName === 'string' && record.byName.trim() ? record.byName.trim() : null,
    });
  });

  return events.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, HISTORY_LIMIT);
}

const historyLabel = (action: HistoryEntry['action']): string => {
  if (action === 'reopened') return 'Reopened';
  if (action === 'cleared') return 'Cleared';
  return 'Signed off';
};

const historyStamp = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
};

const HINTS: Record<string, string> = {
  students_section: 'Pick a current section for the student, or clear the field.',
  guardian_link_student: 'Delete the orphan guardian link, or re-link it to the right student.',
  guardian_link_guardian: 'Recreate the guardian contact, then link it back to the student.',
  enrollment_student: 'Remove the placement row, or restore the student it belongs to.',
  invoice_student: 'Re-attach the invoice to a student before it goes out for collection.',
  invoice_item_invoice: 'Delete the line, or move it onto the correct invoice.',
  payment_invoice: 'Re-point the receipt to the right invoice; refund it if that invoice was voided.',
  payment_student: 'Set the payer to the correct student so balances match.',
  result_student: 'Re-enter the mark against a live student, or delete the row.',
  result_exam: 'Move the mark to a current exam, or delete it.',
  attendance_student: 'Drop the row so attendance percentages stop counting a ghost student.',
  transport_student: 'Remove the allocation, or rebuild it for an enrolled student.',
  hostel_student: 'Remove the allocation, or rebuild it for an enrolled student.',
  dup_student_no: 'Keep the earliest record, renumber the newer one, then merge guardians.',
  dup_invoice_no: 'Void the later invoice and reissue it with a fresh number.',
  dup_receipt_no: 'Check the bank slip, then delete the accidental double entry.',
  dup_exam_result: 'Keep the latest mark, delete the other, then re-check the report card.',
  dup_attendance: 'Keep one status per day so the monthly percentage stays honest.',
  dup_enrollment: 'Withdraw the duplicate placement and keep the one matching the fee ledger.',
  mismatch_overpaid: 'Check for a double entry, then refund the excess or move it to another invoice.',
  mismatch_paid_no_payments: 'Record the missing receipt, or set the invoice back to unpaid.',
  mismatch_invoice_lines: 'Recalculate the total from the lines, then reissue the invoice.',
};

const hintFor = (key: string) => HINTS[key] ?? 'Open the Database health page to inspect the rows.';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderText(findings: Finding[], ranAt: string, history: HistoryEntry[]): string {
  const flagged = findings.filter((finding) => finding.count > 0);
  const total = flagged.reduce((sum, finding) => sum + finding.count, 0);

  const trail: string[] = [];
  if (history.length > 0) {
    trail.push('Already handled - sign-off trail (newest first)', '');
    history.forEach((entry) => {
      trail.push(
        `- ${historyLabel(entry.action)} · ${entry.checkKey} · ${entry.byName ?? 'unknown staff'} · ${historyStamp(entry.at)}`,
      );
      if (entry.note) trail.push(`   reason/note: "${entry.note}"`);
    });
    trail.push('');
  } else {
    trail.push('Already handled - sign-off trail: no sign-offs recorded yet.', '');
  }

  if (flagged.length === 0) {
    return [
      'Database health digest',
      '',
      `Run at ${ranAt}. Every check came back clean - nothing needs fixing.`,
      '',
      ...trail,
      'This is an automated read-only sweep. No data was changed.',
    ].join('\n');
  }

  const lines: string[] = [
    'Database health digest',
    '',
    `Run at ${ranAt} · ${flagged.length} check(s) flagged · ${total} affected row(s)`,
    '',
    ...trail,
    'Findings to fix',
    '',
  ];

  flagged.forEach((finding, index) => {
    lines.push(`${index + 1}. ${finding.key} [${finding.category}]`);
    lines.push(`   Table: ${finding.table}${finding.parent ? ` -> ${finding.parent}` : ''}`);
    lines.push(`   Affected rows: ${finding.count}`);
    lines.push(`   Fix: ${hintFor(finding.key)}`);
    finding.samples.forEach((sample) => lines.push(`     - ${sample}`));
    if (finding.count > finding.samples.length) {
      lines.push(`     ... ${finding.count - finding.samples.length} more row(s) - open the health page.`);
    }
    lines.push('');
  });

  lines.push('This is an automated read-only sweep. No data was changed.');
  return lines.join('\n');
}

function renderHtml(findings: Finding[], ranAt: string, history: HistoryEntry[]): string {
  const flagged = findings.filter((finding) => finding.count > 0);
  const total = flagged.reduce((sum, finding) => sum + finding.count, 0);

  const trailRows =
    history.length === 0
      ? '<li style="color:#71717a">No sign-offs recorded yet.</li>'
      : history
          .map((entry) => {
            const color =
              entry.action === 'reopened' ? '#b45309' : entry.action === 'cleared' ? '#a16207' : '#15803d';
            const note = entry.note
              ? `<div style="color:#52525b">note: ${escapeHtml(entry.note)}</div>`
              : '';
            return (
              '<li style="margin-bottom:6px">' +
              `<strong style="color:${color}">${escapeHtml(historyLabel(entry.action))}</strong> · ` +
              `${escapeHtml(entry.checkKey)} · ${escapeHtml(entry.byName ?? 'unknown staff')} · ` +
              `<span style="color:#71717a">${escapeHtml(historyStamp(entry.at))}</span>` +
              note +
              '</li>'
            );
          })
          .join('');

  const trail =
    '<div style="border:1px solid #e4e4e7;border-radius:8px;padding:12px 14px;margin-bottom:14px;background:#fafafa">' +
    '<p style="margin:0 0 6px;font-weight:600;color:#18181b;font-size:13px">Already handled — sign-off trail</p>' +
    `<ul style="margin:0;padding-left:18px;color:#3f3f46;font-size:12px">${trailRows}</ul></div>`;

  const body =
    flagged.length === 0
      ? '<p style="margin:0;color:#3f3f46">Every check came back clean - nothing needs fixing.</p>'
      : flagged
          .map((finding) => {
            const samples = finding.samples.map((sample) => `<li>${escapeHtml(sample)}</li>`).join('');
            const parent = finding.parent ? ` -&gt; ${escapeHtml(finding.parent)}` : '';
            return (
              '<div style="border:1px solid #e4e4e7;border-radius:8px;padding:12px 14px;margin-bottom:10px">' +
              '<p style="margin:0 0 4px;font-weight:600;color:#18181b;font-size:14px">' +
              `${escapeHtml(finding.key)} <span style="font-weight:400;color:#71717a;font-size:12px">· ${escapeHtml(finding.category)}</span></p>` +
              `<p style="margin:0 0 6px;color:#52525b;font-size:12px">${escapeHtml(finding.table)}${parent} · <strong>${finding.count}</strong> affected row(s)</p>` +
              `<p style="margin:0 0 6px;color:#3f3f46;font-size:12px"><strong>Fix:</strong> ${escapeHtml(hintFor(finding.key))}</p>` +
              `<ul style="margin:0;padding-left:18px;color:#52525b;font-size:12px">${samples}</ul></div>`
            );
          })
          .join('');

  return (
    '<!doctype html><html><body style="margin:0;padding:20px;background:#fafafa;font-family:system-ui,-apple-system,sans-serif">' +
    '<div style="max-width:640px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:10px;padding:20px">' +
    '<h1 style="margin:0 0 4px;font-size:17px;color:#18181b">Database health digest</h1>' +
    `<p style="margin:0 0 14px;color:#71717a;font-size:12px">Run at ${escapeHtml(ranAt)} · ${flagged.length} check(s) flagged · ${total} affected row(s)</p>` +
    trail +
    body +
    '<p style="margin:14px 0 0;color:#a1a1aa;font-size:11px;border-top:1px solid #f4f4f5;padding-top:10px">Automated read-only sweep. No data was changed.</p>' +
    '</div></body></html>'
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json({ sent: false, findings: 0, recipients: [], message: 'Use POST.', error: true }, 405);
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const resendApiKey = Deno.env.get('RESEND_API_KEY') ?? '';
  const resendFromDomain = Deno.env.get('RESEND_FROM_DOMAIN') ?? '';
  if (!url || !serviceKey) {
    return json({ sent: false, findings: 0, recipients: [], message: 'Backend is not configured.', error: true }, 500);
  }

  let body: Record<string, any> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const mode = body?.mode === 'scheduled' ? 'scheduled' : 'now';

  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ sent: false, findings: 0, recipients: [], message: 'Sign in required.', error: true }, 401);

  // 1. Verify the caller with the public client only.
  const authClient = createClient(url, publishableKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) {
    return json({ sent: false, findings: 0, recipients: [], message: 'Session is not valid.', error: true }, 401);
  }

  // 2. Privileged work happens only after the identity is proven.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const db = admin as any;

  const { data: roleRow, error: roleError } = await db
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', user.id)
    .maybeSingle();

  if (roleError) {
    return json({ sent: false, findings: 0, recipients: [], message: roleError.message, error: true }, 500);
  }

  const role = roleRow?.role ?? null;
  const isActive = roleRow?.is_active !== false;
  if (!isActive || (role !== 'super_admin' && role !== 'admin')) {
    return json(
      { sent: false, findings: 0, recipients: [], message: 'Only admins can send the digest.', error: true },
      403,
    );
  }

  const readTable = async (table: string, columns: string): Promise<any[]> => {
    const { data, error } = await db.from(table).select(columns).limit(ROW_LIMIT);
    if (error) throw new Error(`${table}: ${error.message}`);
    return data ?? [];
  };

  try {
    const { data: settingRow } = await db
      .from('settings')
      .select('id, value')
      .eq('key', 'health_digest')
      .limit(1)
      .maybeSingle();

    const saved: Record<string, any> = settingRow?.value ?? {};

    // Sign-off trail: what a colleague already cleared, reopened or removed.
    const { data: logRow } = await db
      .from('settings')
      .select('value')
      .eq('key', 'health_review_log')
      .limit(1)
      .maybeSingle();
    const history = parseHistory(logRow?.value);

    const savedRecipients: string[] = Array.isArray(saved.recipients)
      ? saved.recipients.filter((item: unknown) => typeof item === 'string' && item.includes('@'))
      : [];
    const bodyRecipients: string[] = Array.isArray(body?.recipients)
      ? body.recipients.filter((item: unknown) => typeof item === 'string' && item.includes('@'))
      : [];
    const recipients = (bodyRecipients.length > 0 ? bodyRecipients : savedRecipients).map((item) => item.trim());

    if (mode === 'scheduled') {
      const now = new Date();
      const todayIso = now.getUTCDay() === 0 ? 7 : now.getUTCDay();
      if (saved.enabled !== true) {
        return json({ sent: false, findings: 0, recipients: [], message: 'Weekly sending is switched off.' });
      }
      if (todayIso !== Number(saved.weekday ?? 1) || now.getUTCHours() !== Number(saved.hourUtc ?? 7)) {
        return json({ sent: false, findings: 0, recipients: [], message: 'Not the scheduled time yet.' });
      }
    }

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
    ] = await Promise.all([
      readTable('students', 'id, student_no, first_name, last_name, section_id'),
      readTable('sections', 'id'),
      readTable('guardians', 'id, full_name'),
      readTable('exams', 'id, name'),
      readTable('invoices', 'id, invoice_no, student_id, status, total'),
      readTable('invoice_items', 'id, invoice_id, description, amount'),
      readTable('payments', 'id, invoice_id, student_id, receipt_no, amount'),
      readTable('exam_results', 'id, exam_id, exam_subject_id, student_id, marks_obtained'),
      readTable('attendance', 'id, student_id, attendance_date, status'),
      readTable('enrollments', 'id, student_id, academic_year_id, status'),
      readTable('transport_allocations', 'id, student_id'),
      readTable('hostel_allocations', 'id, student_id'),
      readTable('student_guardians', 'id, student_id, guardian_id'),
    ]);

    const studentMap = new Map<string, any>();
    students.forEach((row: any) => studentMap.set(String(row.id), row));

    const idSet = (rows: any[]) => {
      const set = new Set<string>();
      rows.forEach((row: any) => set.add(String(row.id)));
      return set;
    };

    const studentName = (studentId: unknown): string => {
      if (!studentId) return '-';
      const student = studentMap.get(String(studentId));
      if (!student) return `Unknown student ${short(studentId)}`;
      return `${student.first_name ?? ''} ${student.last_name ?? ''}`.trim() || 'Unnamed student';
    };

    const studentIds = idSet(students);
    const sectionIds = idSet(sections);
    const guardianIds = idSet(guardians);
    const examIds = idSet(exams);
    const invoiceIds = idSet(invoices);

    const orphan = (input: {
      key: string;
      table: string;
      parent: string;
      column: string;
      rows: any[];
      parents: Set<string>;
      label: (row: any) => string;
    }): Finding => {
      const offenders = input.rows.filter((row) => {
        const value = row[input.column];
        if (value === null || value === undefined || value === '') return false;
        return !input.parents.has(String(value));
      });
      return {
        key: input.key,
        category: 'orphan',
        table: input.table,
        parent: input.parent,
        count: offenders.length,
        samples: offenders.slice(0, SAMPLE_LIMIT).map(input.label),
      };
    };

    const duplicate = (
      key: string,
      table: string,
      rows: any[],
      groupOf: (row: any) => string,
      label: (row: any) => string,
    ): Finding => {
      const buckets = new Map<string, any[]>();
      rows.forEach((row) => {
        const group = groupOf(row);
        if (!group) return;
        const bucket = buckets.get(group) ?? [];
        bucket.push(row);
        buckets.set(group, bucket);
      });
      const offenders: any[] = [];
      buckets.forEach((bucket) => {
        if (bucket.length > 1) offenders.push(...bucket);
      });
      return {
        key,
        category: 'duplicate',
        table,
        parent: null,
        count: offenders.length,
        samples: offenders.slice(0, SAMPLE_LIMIT).map(label),
      };
    };

    const findings: Finding[] = [
      orphan({
        key: 'students_section',
        table: 'students',
        parent: 'sections',
        column: 'section_id',
        rows: students,
        parents: sectionIds,
        label: (row) => `${studentName(row.id)} · ${row.student_no ?? 'no number'}`,
      }),
      orphan({
        key: 'guardian_link_student',
        table: 'student_guardians',
        parent: 'students',
        column: 'student_id',
        rows: guardianLinks,
        parents: studentIds,
        label: (row) => `link ${short(row.id)} · student_id ${short(row.student_id)}`,
      }),
      orphan({
        key: 'guardian_link_guardian',
        table: 'student_guardians',
        parent: 'guardians',
        column: 'guardian_id',
        rows: guardianLinks,
        parents: guardianIds,
        label: (row) => `link ${short(row.id)} · guardian_id ${short(row.guardian_id)}`,
      }),
      orphan({
        key: 'enrollment_student',
        table: 'enrollments',
        parent: 'students',
        column: 'student_id',
        rows: enrollments,
        parents: studentIds,
        label: (row) => `${studentName(row.student_id)} · ${row.status ?? ''}`.trim(),
      }),
      orphan({
        key: 'invoice_student',
        table: 'invoices',
        parent: 'students',
        column: 'student_id',
        rows: invoices,
        parents: studentIds,
        label: (row) => `invoice ${row.invoice_no ?? short(row.id)}`,
      }),
      orphan({
        key: 'invoice_item_invoice',
        table: 'invoice_items',
        parent: 'invoices',
        column: 'invoice_id',
        rows: invoiceItems,
        parents: invoiceIds,
        label: (row) => `${row.description ?? 'Invoice line'} · invoice_id ${short(row.invoice_id)}`,
      }),
      orphan({
        key: 'payment_invoice',
        table: 'payments',
        parent: 'invoices',
        column: 'invoice_id',
        rows: payments,
        parents: invoiceIds,
        label: (row) => `receipt ${row.receipt_no ?? short(row.id)} · amount ${row.amount ?? 0}`,
      }),
      orphan({
        key: 'payment_student',
        table: 'payments',
        parent: 'students',
        column: 'student_id',
        rows: payments,
        parents: studentIds,
        label: (row) => `receipt ${row.receipt_no ?? short(row.id)}`,
      }),
      orphan({
        key: 'result_student',
        table: 'exam_results',
        parent: 'students',
        column: 'student_id',
        rows: examResults,
        parents: studentIds,
        label: (row) => `${studentName(row.student_id)} · marks ${row.marks_obtained ?? 0}`,
      }),
      orphan({
        key: 'result_exam',
        table: 'exam_results',
        parent: 'exams',
        column: 'exam_id',
        rows: examResults,
        parents: examIds,
        label: (row) => `exam_id ${short(row.exam_id)} · marks ${row.marks_obtained ?? 0}`,
      }),
      orphan({
        key: 'attendance_student',
        table: 'attendance',
        parent: 'students',
        column: 'student_id',
        rows: attendance,
        parents: studentIds,
        label: (row) => `${row.attendance_date ?? ''} · ${row.status ?? ''}`.trim(),
      }),
      orphan({
        key: 'transport_student',
        table: 'transport_allocations',
        parent: 'students',
        column: 'student_id',
        rows: transportAllocations,
        parents: studentIds,
        label: (row) => `allocation ${short(row.id)}`,
      }),
      orphan({
        key: 'hostel_student',
        table: 'hostel_allocations',
        parent: 'students',
        column: 'student_id',
        rows: hostelAllocations,
        parents: studentIds,
        label: (row) => `allocation ${short(row.id)}`,
      }),
      duplicate(
        'dup_student_no',
        'students',
        students.filter((row: any) => Boolean(row.student_no)),
        (row) => String(row.student_no ?? '').trim().toLowerCase(),
        (row) => `${studentName(row.id)} · student_no ${row.student_no}`,
      ),
      duplicate(
        'dup_invoice_no',
        'invoices',
        invoices,
        (row) => String(row.invoice_no ?? '').trim().toLowerCase(),
        (row) => `invoice ${row.invoice_no} · ${studentName(row.student_id)}`,
      ),
      duplicate(
        'dup_receipt_no',
        'payments',
        payments.filter((row: any) => Boolean(row.receipt_no)),
        (row) => String(row.receipt_no ?? '').trim().toLowerCase(),
        (row) => `receipt ${row.receipt_no} · amount ${row.amount ?? 0}`,
      ),
      duplicate(
        'dup_exam_result',
        'exam_results',
        examResults,
        (row) => `${row.exam_subject_id ?? ''}:${row.student_id ?? ''}`,
        (row) => `${studentName(row.student_id)} · paper ${short(row.exam_subject_id)} · marks ${row.marks_obtained ?? 0}`,
      ),
      duplicate(
        'dup_attendance',
        'attendance',
        attendance,
        (row) => `${row.student_id ?? ''}:${row.attendance_date ?? ''}`,
        (row) => `${studentName(row.student_id)} · ${row.attendance_date} · ${row.status}`,
      ),
      duplicate(
        'dup_enrollment',
        'enrollments',
        enrollments,
        (row) => `${row.student_id ?? ''}:${row.academic_year_id ?? ''}`,
        (row) => `${studentName(row.student_id)} · year ${short(row.academic_year_id)}`,
      ),
    ];

    const paidByInvoice = new Map<string, number>();
    payments.forEach((row: any) => {
      const invoiceId = String(row.invoice_id ?? '');
      if (!invoiceId) return;
      paidByInvoice.set(invoiceId, (paidByInvoice.get(invoiceId) ?? 0) + num(row.amount));
    });

    const linesByInvoice = new Map<string, { sum: number; count: number }>();
    invoiceItems.forEach((row: any) => {
      const invoiceId = String(row.invoice_id ?? '');
      if (!invoiceId) return;
      const bucket = linesByInvoice.get(invoiceId) ?? { sum: 0, count: 0 };
      bucket.sum += num(row.amount);
      bucket.count += 1;
      linesByInvoice.set(invoiceId, bucket);
    });

    const overpaidSamples: string[] = [];
    const paidNoReceiptSamples: string[] = [];
    const lineDriftSamples: string[] = [];
    let overpaidCount = 0;
    let paidNoReceiptCount = 0;
    let lineDriftCount = 0;

    invoices.forEach((row: any) => {
      const invoiceId = String(row.id);
      const paid = paidByInvoice.get(invoiceId) ?? 0;
      const total = num(row.total);
      const invoiceNo = String(row.invoice_no ?? short(row.id));

      if (paid - total > 0.01) {
        overpaidCount += 1;
        if (overpaidSamples.length < SAMPLE_LIMIT) {
          overpaidSamples.push(`${invoiceNo} · paid ${money(paid)} of ${money(total)} (+${money(paid - total)})`);
        }
      }

      if (String(row.status ?? '').trim().toLowerCase() === 'paid' && paid <= 0.01) {
        paidNoReceiptCount += 1;
        if (paidNoReceiptSamples.length < SAMPLE_LIMIT) {
          paidNoReceiptSamples.push(`${invoiceNo} · total ${money(total)} · status paid, no receipts`);
        }
      }

      const lines = linesByInvoice.get(invoiceId);
      if (!lines || lines.count === 0) return;

      const diff = total - lines.sum;
      if (Math.abs(diff) <= 0.01) return;
      lineDriftCount += 1;
      if (lineDriftSamples.length < SAMPLE_LIMIT) {
        lineDriftSamples.push(
          `${invoiceNo} · total ${money(total)} vs lines ${money(lines.sum)} (${diff > 0 ? '+' : ''}${money(diff)}) · ${lines.count} line(s)`,
        );
      }
    });

    findings.push(
      {
        key: 'mismatch_overpaid',
        category: 'mismatch',
        table: 'invoices',
        parent: 'payments',
        count: overpaidCount,
        samples: overpaidSamples,
      },
      {
        key: 'mismatch_paid_no_payments',
        category: 'mismatch',
        table: 'invoices',
        parent: 'payments',
        count: paidNoReceiptCount,
        samples: paidNoReceiptSamples,
      },
      {
        key: 'mismatch_invoice_lines',
        category: 'mismatch',
        table: 'invoices',
        parent: 'invoice_items',
        count: lineDriftCount,
        samples: lineDriftSamples,
      },
    );

    const flagged = findings.filter((finding) => finding.count > 0);
    const totalFindings = flagged.reduce((sum, finding) => sum + finding.count, 0);
    const ranAt = new Date().toISOString();

    if (totalFindings === 0) {
      return json({ sent: false, findings: 0, recipients: [], message: 'Nothing is flagged, so no email was sent.' });
    }

    if (recipients.length === 0) {
      return json({
        sent: false,
        findings: totalFindings,
        recipients: [],
        message: 'No recipients saved yet - add at least one email address.',
        error: true,
      });
    }

    if (!resendApiKey || !resendFromDomain) {
      return json({
        sent: false,
        findings: totalFindings,
        recipients,
        message: 'Email delivery is not set up yet. Verify the sending domain in Resend settings, then send again.',
        error: true,
      });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `noreply@${resendFromDomain}`,
        to: recipients,
        subject: `Database health digest - ${flagged.length} check(s), ${totalFindings} row(s) flagged`,
        text: renderText(findings, ranAt, history),
        html: renderHtml(findings, ranAt, history),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Resend rejected the email (${response.status}): ${detail.slice(0, 300)}`);
    }

    if (settingRow?.id) {
      await db
        .from('settings')
        .update({
          value: { ...saved, lastSentAt: ranAt, lastStatus: `sent:${recipients.length}` },
          updated_at: ranAt,
        })
        .eq('id', settingRow.id);
    }

    return json({
      sent: true,
      findings: totalFindings,
      recipients,
      message: `Digest sent to ${recipients.length} recipient(s).`,
      ranAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ sent: false, findings: 0, recipients: [], message, error: true }, 500);
  }
});