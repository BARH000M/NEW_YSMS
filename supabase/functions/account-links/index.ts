import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

const ENTITY_TABLE: Record<string, string> = {
  staff: 'staff',
  student: 'students',
  guardian: 'guardians',
};

const ASSIGNABLE = ['admin', 'teacher', 'accountant', 'receptionist', 'librarian', 'student', 'parent'];

/** Default role for a newly linked record when the caller does not pick one. */
const DEFAULT_ROLE: Record<string, string> = {
  staff: 'teacher',
  student: 'student',
  guardian: 'parent',
};

interface Body {
  action?: 'list' | 'link' | 'unlink' | 'provision';
  entity?: string;
  recordId?: string;
  email?: string;
  fullName?: string;
  role?: string;
}

const randomPassword = (): string => {
  const bytes = new Uint8Array(15);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16);
  return `${body}Aa9!`;
};

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
  const action = body.action ?? 'list';

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'You must be signed in.' }, 401);

  // Step 1 - verify the caller on an anon-key client ONLY.
  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) return json({ error: 'Invalid or expired session.' }, 401);

  // Step 2 - privileged work only on the service-role client.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: callerRoleRow, error: callerRoleError } = await admin
    .from('user_roles')
    .select('role, institution_id, is_active')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (callerRoleError) return json({ error: callerRoleError.message }, 500);

  const callerRole = callerRoleRow?.is_active ? (callerRoleRow.role as string) : null;
  if (!callerRole || !['super_admin', 'admin'].includes(callerRole)) {
    return json({ error: 'Only an administrator can link login accounts.' }, 403);
  }
  const institutionId = (callerRoleRow?.institution_id as string | null) ?? null;

  if (action === 'list') {
    const [
      { data: authList, error: authError },
      { data: roleRows, error: rolesError },
      { data: profiles, error: profilesError },
      { data: staffRows, error: staffError },
      { data: studentRows, error: studentsError },
      { data: guardianRows, error: guardiansError },
    ] = await Promise.all([
      admin.auth.admin.listUsers({ page: 1, perPage: 500 }),
      admin.from('user_roles').select('user_id, role, is_active'),
      admin.from('profiles').select('id, full_name, full_name_ar'),
      admin.from('staff').select('id, staff_no, full_name, designation, profile_id').order('staff_no', { ascending: true }),
      admin
        .from('students')
        .select('id, student_no, first_name, last_name, first_name_ar, last_name_ar, profile_id, sections(id, name, classes(id, name))')
        .order('student_no', { ascending: true })
        .limit(1000),
      admin.from('guardians').select('id, full_name, relation, phone, email, profile_id').order('full_name', { ascending: true }).limit(1000),
    ]);

    if (authError) return json({ error: authError.message }, 500);
    if (rolesError) return json({ error: rolesError.message }, 500);
    if (profilesError) return json({ error: profilesError.message }, 500);
    if (staffError) return json({ error: staffError.message }, 500);
    if (studentsError) return json({ error: studentsError.message }, 500);
    if (guardiansError) return json({ error: guardiansError.message }, 500);

    const roleMap = new Map<string, string | null>();
    (roleRows ?? []).forEach((row) => {
      roleMap.set(row.user_id as string, row.is_active ? (row.role as string) : null);
    });
    const profileMap = new Map<string, string | null>();
    (profiles ?? []).forEach((row) => {
      profileMap.set(row.id as string, (row.full_name as string) ?? (row.full_name_ar as string) ?? null);
    });

    const accounts = (authList?.users ?? []).map((account) => ({
      userId: account.id,
      email: account.email ?? '',
      fullName: profileMap.get(account.id) ?? null,
      role: roleMap.get(account.id) ?? null,
    }));

    const staff = (staffRows ?? []).map((row) => ({
      id: row.id as string,
      code: (row.staff_no as string) ?? null,
      name: (row.full_name as string) ?? '',
      meta: (row.designation as string) ?? null,
      profileId: (row.profile_id as string) ?? null,
    }));

    const students = (studentRows ?? []).map((row) => {
      const section = row.sections as { name?: string; classes?: { name?: string } } | null;
      const name = `${(row.first_name as string) ?? ''} ${(row.last_name as string) ?? ''}`.trim();
      return {
        id: row.id as string,
        code: (row.student_no as string) ?? null,
        name: name || ((row.first_name_ar as string) ?? ''),
        meta: section ? `${section.classes?.name ?? ''} / ${section.name ?? ''}`.trim() : null,
        profileId: (row.profile_id as string) ?? null,
      };
    });

    const guardians = (guardianRows ?? []).map((row) => ({
      id: row.id as string,
      code: (row.phone as string) ?? null,
      name: (row.full_name as string) ?? '',
      meta: (row.relation as string) ?? null,
      profileId: (row.profile_id as string) ?? null,
    }));

    return json({ accounts, staff, students, guardians, callerRole, assignableRoles: ASSIGNABLE });
  }

  if (action === 'link' || action === 'provision') {
    const entity = (body.entity ?? '').trim();
    const recordId = (body.recordId ?? '').trim();
    const table = ENTITY_TABLE[entity];
    if (!table) return json({ error: 'Unknown record type.' }, 400);
    if (!recordId) return json({ error: 'A record is required.' }, 400);

    const email = (body.email ?? '').trim().toLowerCase();
    if (!email) return json({ error: 'An email address is required.' }, 400);

    const requestedRole = (body.role ?? '').trim() || DEFAULT_ROLE[entity] || 'student';
    if (!ASSIGNABLE.includes(requestedRole) && requestedRole !== 'super_admin') {
      return json({ error: 'Unknown role.' }, 400);
    }
    if (requestedRole === 'super_admin' && callerRole !== 'super_admin') {
      return json({ error: 'Only a super admin can grant super admin.' }, 403);
    }

    const { data: record, error: recordError } = await admin
      .from(table)
      .select('id, profile_id')
      .eq('id', recordId)
      .maybeSingle();
    if (recordError) return json({ error: recordError.message }, 500);
    if (!record) return json({ error: 'That record no longer exists.' }, 404);

    let targetId: string | null = null;
    let tempPassword: string | null = null;

    if (action === 'link') {
      const { data: authList, error: authError } = await admin.auth.admin.listUsers({ page: 1, perPage: 500 });
      if (authError) return json({ error: authError.message }, 500);
      const target = (authList?.users ?? []).find((account) => (account.email ?? '').toLowerCase() === email);
      if (!target) {
        return json(
          { error: 'No login uses that email yet. Create the account first, or ask them to sign up.' },
          404,
        );
      }
      targetId = target.id;
    } else {
      // We generate the password ourselves so it can be handed over exactly once.
      const password = randomPassword();
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: (body.fullName ?? '').trim() || email },
      });
      if (createError) return json({ error: createError.message }, 400);
      targetId = created.user?.id ?? null;
      tempPassword = password;
    }

    if (!targetId) return json({ error: 'Could not resolve the login account.' }, 500);

    // A profile row is the identity spine every record points at.
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, full_name')
      .eq('id', targetId)
      .maybeSingle();

    const resolvedName =
      (body.fullName ?? '').trim() ||
      (existingProfile?.full_name as string | null) ||
      email;

    const { error: profileError } = await admin.from('profiles').upsert(
      { id: targetId, institution_id: institutionId, full_name: resolvedName, locale: 'ar' },
      { onConflict: 'id' },
    );
    if (profileError) return json({ error: profileError.message }, 500);

    // One identity can only ever hold one record per entity type.
    const { error: releaseError } = await admin
      .from(table)
      .update({ profile_id: null })
      .eq('profile_id', targetId)
      .neq('id', recordId);
    if (releaseError) return json({ error: releaseError.message }, 500);

    const { error: linkError } = await admin.from(table).update({ profile_id: targetId }).eq('id', recordId);
    if (linkError) return json({ error: linkError.message }, 500);

    const { error: roleError } = await admin.from('user_roles').upsert(
      {
        user_id: targetId,
        institution_id: institutionId,
        role: requestedRole,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (roleError) return json({ error: roleError.message }, 500);

    await admin.from('audit_log').insert({
      institution_id: institutionId,
      actor_id: caller.id,
      action: action === 'link' ? 'link_account' : 'provision_account',
      table_name: table,
      record_id: recordId,
      after: { user_id: targetId, email, role: requestedRole, entity },
    });

    return json({ ok: true, userId: targetId, role: requestedRole, email, tempPassword });
  }

  if (action === 'unlink') {
    const entity = (body.entity ?? '').trim();
    const recordId = (body.recordId ?? '').trim();
    const table = ENTITY_TABLE[entity];
    if (!table) return json({ error: 'Unknown record type.' }, 400);
    if (!recordId) return json({ error: 'A record is required.' }, 400);

    const { data: record, error: recordError } = await admin
      .from(table)
      .select('id, profile_id')
      .eq('id', recordId)
      .maybeSingle();
    if (recordError) return json({ error: recordError.message }, 500);
    if (!record) return json({ error: 'That record no longer exists.' }, 404);

    // Only the link is removed. The login account itself is never deleted here.
    const { error: clearError } = await admin.from(table).update({ profile_id: null }).eq('id', recordId);
    if (clearError) return json({ error: clearError.message }, 500);

    await admin.from('audit_log').insert({
      institution_id: institutionId,
      actor_id: caller.id,
      action: 'unlink_account',
      table_name: table,
      record_id: recordId,
      after: { user_id: record.profile_id },
    });

    return json({ ok: true });
  }

  return json({ error: 'Unknown action.' }, 400);
});
