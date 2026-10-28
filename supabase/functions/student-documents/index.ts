import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const BUCKET = 'documents';
const READ_ROLES = ['super_admin', 'admin', 'receptionist', 'accountant'];
const WRITE_ROLES = ['super_admin', 'admin', 'receptionist'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

/** Storage accepts 1-63 lowercase chars starting with a letter or number. */
const safeFileName = (raw: string): string => {
  const cleaned = (raw || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .slice(-60);
  const name = cleaned.replace(/^[._-]+/, '');
  if (!name || !/^[a-z0-9]/.test(name)) return `document-${Date.now()}.dat`;
  return name;
};

interface Body {
  action?: 'sign-upload' | 'sign-download' | 'delete';
  studentId?: string;
  documentId?: string;
  documentIds?: string[];
  fileName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json({ error: 'Backend is not configured' }, 500);

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const action = body.action ?? 'sign-download';

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'You must be signed in.' }, 401);

  // Step 1 - the caller is verified on an anon-key client ONLY.
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) return json({ error: 'Invalid or expired session.' }, 401);

  // Step 2 - privileged storage work happens only on the service-role client.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: roleRow, error: roleError } = await admin
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (roleError) return json({ error: roleError.message }, 500);

  const role = roleRow?.is_active ? (roleRow.role as string) : null;
  if (!role) return json({ error: 'Your account has no access role yet.' }, 403);

  if (action === 'sign-upload') {
    if (!WRITE_ROLES.includes(role)) {
      return json({ error: 'You are not allowed to upload student documents.' }, 403);
    }
    const studentId = (body.studentId ?? '').trim();
    if (!studentId) return json({ error: 'A student is required.' }, 400);

    const { data: student, error: studentError } = await admin
      .from('students')
      .select('id, institution_id')
      .eq('id', studentId)
      .maybeSingle();
    if (studentError) return json({ error: studentError.message }, 500);
    if (!student) return json({ error: 'That student no longer exists.' }, 404);

    const path = `students/${studentId}/${Date.now()}-${safeFileName(body.fileName ?? 'document')}`;
    const { data: signed, error: signError } = await admin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (signError) return json({ error: signError.message }, 500);

    return json({ path, token: signed?.token ?? null, signedUrl: signed?.signedUrl ?? null });
  }

  if (action === 'sign-download') {
    if (!READ_ROLES.includes(role)) {
      return json({ error: 'You are not allowed to open student documents.' }, 403);
    }
    const ids = Array.isArray(body.documentIds) ? body.documentIds.filter(Boolean) : [];
    if (ids.length === 0) return json({ urls: [] });

    const { data: rows, error: rowsError } = await admin
      .from('student_documents')
      .select('id, file_path')
      .in('id', ids.slice(0, 50));
    if (rowsError) return json({ error: rowsError.message }, 500);

    const urls: { id: string; url: string | null; error?: string }[] = [];
    for (const row of rows ?? []) {
      if (!row.file_path) {
        urls.push({ id: row.id as string, url: null, error: 'No file attached' });
        continue;
      }
      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(row.file_path as string, 3600);
      urls.push({
        id: row.id as string,
        url: signed?.signedUrl ?? null,
        ...(signError ? { error: signError.message } : {}),
      });
    }
    return json({ urls });
  }

  if (action === 'delete') {
    if (!WRITE_ROLES.includes(role)) {
      return json({ error: 'You are not allowed to delete student documents.' }, 403);
    }
    const documentId = (body.documentId ?? '').trim();
    if (!documentId) return json({ error: 'A document is required.' }, 400);

    const { data: doc, error: docError } = await admin
      .from('student_documents')
      .select('id, file_path, student_id')
      .eq('id', documentId)
      .maybeSingle();
    if (docError) return json({ error: docError.message }, 500);
    if (!doc) return json({ error: 'That document no longer exists.' }, 404);

    if (doc.file_path) {
      await admin.storage.from(BUCKET).remove([doc.file_path as string]);
    }
    const { error: deleteError } = await admin.from('student_documents').delete().eq('id', documentId);
    if (deleteError) return json({ error: deleteError.message }, 500);

    await admin.from('audit_log').insert({
      actor_id: caller.id,
      action: 'delete_student_document',
      table_name: 'student_documents',
      record_id: documentId,
      after: { student_id: doc.student_id, file_path: doc.file_path },
    });

    return json({ ok: true });
  }

  return json({ error: 'Unknown action.' }, 400);
});
