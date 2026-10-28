// Portal self-service endpoint.
// Verifies the caller's JWT, reads their role, and returns ONLY the records
// that belong to them (student) or to their children (parent).
// Staff never use this endpoint - they read through RLS-protected tables.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const num = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!url || !anonKey || !serviceKey) return json({ error: 'Backend is not configured' }, 500);

  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'Missing bearer token' }, 401);

  // 1. Verify the caller with the anon client only.
  const authClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json({ error: 'Invalid session' }, 401);

  // 2. Privileged reads happen only after the identity is proven.
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const db = admin as any;

  const { data: roleRow, error: roleError } = await db
    .from('user_roles')
    .select('role, institution_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (roleError) return json({ error: roleError.message }, 500);

  const role = roleRow?.role ?? null;
  if (role !== 'student' && role !== 'parent') {
    return json({ error: 'This endpoint is for student and parent accounts only', role }, 403);
  }

  const studentSelect =
    'id, student_no, first_name, last_name, first_name_ar, last_name_ar, status, photo_url, section_id, dob, gender, nationality, sections(id, name, class_id, classes(id, name, level))';

  let students: Array<Record<string, any>> = [];

  if (role === 'student') {
    const { data, error } = await db.from('students').select(studentSelect).eq('profile_id', user.id);
    if (error) return json({ error: error.message }, 500);
    students = data ?? [];
  } else {
    const { data: guardianRows, error: guardianError } = await db
      .from('guardians')
      .select('id')
      .eq('profile_id', user.id);
    if (guardianError) return json({ error: guardianError.message }, 500);

    const guardianIds = (guardianRows ?? []).map((row: any) => row.id as string);
    if (guardianIds.length > 0) {
      const { data: links, error: linkError } = await db
        .from('student_guardians')
        .select('student_id')
        .in('guardian_id', guardianIds);
      if (linkError) return json({ error: linkError.message }, 500);

      const studentIds = Array.from(new Set((links ?? []).map((row: any) => row.student_id as string)));
      if (studentIds.length > 0) {
        const { data, error } = await db.from('students').select(studentSelect).in('id', studentIds);
        if (error) return json({ error: error.message }, 500);
        students = data ?? [];
      }
    }
  }

  if (students.length === 0) {
    return json({ role, students: [], linked: false });
  }

  const ids = students.map((row) => row.id as string);

  const [invoicesRes, paymentsRes, resultsRes, attendanceRes, enrollmentsRes, docsRes, discountsRes] =
    await Promise.all([
      db
        .from('invoices')
        .select('id, student_id, invoice_no, issue_date, due_date, status, subtotal, discount, total')
        .in('student_id', ids)
        .order('issue_date', { ascending: false })
        .limit(200),
      db
        .from('payments')
        .select('id, invoice_id, student_id, amount, method, paid_at, receipt_no')
        .in('student_id', ids)
        .order('paid_at', { ascending: false })
        .limit(300),
      db
        .from('exam_results')
        .select('id, student_id, exam_subject_id, marks_obtained, grade, remarks')
        .in('student_id', ids)
        .limit(600),
      db.from('attendance').select('student_id, status, attendance_date').in('student_id', ids).limit(3000),
      db
        .from('enrollments')
        .select(
          'id, student_id, status, started_on, ended_on, final_average, result, academic_years(name, is_current), classes(name), sections(name)',
        )
        .in('student_id', ids),
      db.from('student_documents').select('id, student_id, type, title, verified, created_at').in('student_id', ids),
      db
        .from('fee_discount_allotments')
        .select('id, student_id, amount, fee_discounts(name, discount_type, amount)')
        .in('student_id', ids),
    ]);

  const paperIds = Array.from(
    new Set((resultsRes.data ?? []).map((row: any) => row.exam_subject_id as string).filter(Boolean)),
  );

  const paperMap = new Map<
    string,
    { max_marks: number | null; subjects: { name: string; name_ar: string | null } | null }
  >();

  if (paperIds.length > 0) {
    const { data } = await db
      .from('exam_subjects')
      .select('id, max_marks, pass_marks, subjects(name, name_ar)')
      .in('id', paperIds);
    (data ?? []).forEach((paper: any) => {
      paperMap.set(paper.id, { max_marks: paper.max_marks, subjects: paper.subjects });
    });
  }

  const payload = students.map((student) => {
    const studentId = student.id as string;
    const ownPayments = (paymentsRes.data ?? []).filter((row: any) => row.student_id === studentId);
    const ownInvoices = (invoicesRes.data ?? []).filter((row: any) => row.student_id === studentId);
    const ownAttendance = (attendanceRes.data ?? []).filter((row: any) => row.student_id === studentId);

    const billed = ownInvoices.reduce((sum: number, invoice: any) => sum + num(invoice.total), 0);
    const paid = ownPayments.reduce((sum: number, payment: any) => sum + num(payment.amount), 0);

    const attendanceSummary = {
      total: ownAttendance.length,
      present: ownAttendance.filter((row: any) => row.status === 'present').length,
      absent: ownAttendance.filter((row: any) => row.status === 'absent').length,
      late: ownAttendance.filter((row: any) => row.status === 'late').length,
      excused: ownAttendance.filter((row: any) => row.status === 'excused').length,
    };

    const results = (resultsRes.data ?? [])
      .filter((row: any) => row.student_id === studentId)
      .map((row: any) => {
        const paper = paperMap.get(row.exam_subject_id as string);
        const max = num(paper?.max_marks) || 100;
        return {
          id: row.id,
          subject: paper?.subjects?.name ?? '',
          subject_ar: paper?.subjects?.name_ar ?? null,
          marks: num(row.marks_obtained),
          max,
          grade: row.grade,
          percentage: Math.round((num(row.marks_obtained) / max) * 100),
        };
      });

    return {
      ...student,
      attendance: attendanceSummary,
      invoices: ownInvoices.map((invoice: any) => ({
        ...invoice,
        paid: ownPayments
          .filter((payment: any) => payment.invoice_id === invoice.id)
          .reduce((sum: number, payment: any) => sum + num(payment.amount), 0),
      })),
      payments: ownPayments,
      finance: { billed, paid, outstanding: Math.max(0, billed - paid) },
      results,
      enrollments: (enrollmentsRes.data ?? []).filter((row: any) => row.student_id === studentId),
      documents: (docsRes.data ?? []).filter((row: any) => row.student_id === studentId),
      discounts: (discountsRes.data ?? []).filter((row: any) => row.student_id === studentId),
    };
  });

  return json({ role, linked: true, students: payload });
});
