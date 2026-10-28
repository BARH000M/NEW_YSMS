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

const ASSIGNABLE = ['admin', 'teacher', 'accountant', 'receptionist', 'librarian', 'student', 'parent'];
const ALL_ROLES = ['super_admin', ...ASSIGNABLE];

interface Body {
  action?: 'list' | 'assign' | 'revoke';
  email?: string;
  userId?: string;
  role?: string;
  isActive?: boolean;
  staffId?: string | null;
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

  // Step 2 - privileged work happens only on the service-role client.
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
    return json({ error: 'Only an administrator can manage access roles.' }, 403);
  }
  const institutionId = callerRoleRow?.institution_id ?? null;

  if (action === 'list') {
    const { data: authList, error: authListError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authListError) return json({ error: authListError.message }, 500);

    const [
      { data: roleRows, error: rolesError },
      { data: profiles, error: profilesError },
      { data: staffRows, error: staffError },
    ] = await Promise.all([
      admin.from('user_roles').select('user_id, role, is_active, created_at'),
      admin.from('profiles').select('id, full_name, full_name_ar, phone'),
      admin
        .from('staff')
        .select('id, staff_no, full_name, full_name_ar, designation, department, profile_id, is_active')
        .order('staff_no', { ascending: true }),
    ]);
    if (rolesError) return json({ error: rolesError.message }, 500);
    if (profilesError) return json({ error: profilesError.message }, 500);
    if (staffError) return json({ error: staffError.message }, 500);

    const roleRowsSafe = roleRows ?? [];
    const profileRowsSafe = profiles ?? [];
    const roleMap = new Map<string, { role: string; is_active: boolean; created_at: string }>();
    roleRowsSafe.forEach((row) => {
      roleMap.set(row.user_id as string, {
        role: row.role as string,
        is_active: Boolean(row.is_active),
        created_at: (row.created_at as string) ?? '',
      });
    });
    const profileMap = new Map<string, { full_name: string | null; full_name_ar: string | null; phone: string | null }>();
    profileRowsSafe.forEach((row) => {
      profileMap.set(row.id as string, {
        full_name: (row.full_name as string) ?? null,
        full_name_ar: (row.full_name_ar as string) ?? null,
        phone: (row.phone as string) ?? null,
      });
    });

    const staff = (staffRows ?? []).map((row) => ({
      id: row.id as string,
      staffNo: (row.staff_no as string) ?? null,
      fullName: (row.full_name as string) ?? (row.full_name_ar as string) ?? '',
      designation: (row.designation as string) ?? null,
      department: (row.department as string) ?? null,
      profileId: (row.profile_id as string) ?? null,
      isActive: row.is_active !== false,
    }));

    const users = (authList?.users ?? []).map((account) => {
      const assigned = roleMap.get(account.id);
      const profile = profileMap.get(account.id);
      const metaName = (account.user_metadata?.full_name as string | undefined) ?? null;
      return {
        userId: account.id,
        email: account.email ?? '',
        fullName: profile?.full_name ?? profile?.full_name_ar ?? metaName,
        phone: profile?.phone ?? null,
        role: assigned?.role ?? null,
        isActive: assigned ? assigned.is_active : false,
        assignedAt: assigned?.created_at ?? null,
        createdAt: account.created_at ?? null,
        lastSignInAt: account.last_sign_in_at ?? null,
        staffId: staff.find((member) => member.profileId === account.id)?.id ?? null,
      };
    });

    users.sort((a, b) => {
      if (!a.role && b.role) return -1;
      if (a.role && !b.role) return 1;
      return (a.email ?? '').localeCompare(b.email ?? '');
    });

    return json({ users, staff, callerRole, assignableRoles: ASSIGNABLE });
  }

  if (action === 'assign') {
    const email = (body.email ?? '').trim().toLowerCase();
    const role = (body.role ?? '').trim();
    const isActive = body.isActive !== false;

    if (!email) return json({ error: 'An email address is required.' }, 400);
    if (!ALL_ROLES.includes(role)) return json({ error: 'Unknown role.' }, 400);
    if (role === 'super_admin' && callerRole !== 'super_admin') {
      return json({ error: 'Only a platform super admin can grant super admin.' }, 403);
    }

    const { data: authList, error: authListError } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (authListError) return json({ error: authListError.message }, 500);

    const target = (authList?.users ?? []).find(
      (account) => (account.email ?? '').toLowerCase() === email,
    );
    if (!target) {
      return json(
        {
          error:
            'No account uses that email yet. Ask the person to sign up first, then assign the role.',
        },
        404,
      );
    }
    if (target.id === caller.id) {
      return json({ error: 'You cannot change your own role.' }, 400);
    }

    const fullName =
      ((target.user_metadata?.full_name as string | undefined) ?? target.email ?? null) || null;

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: target.id,
        institution_id: institutionId,
        full_name: fullName,
        locale: 'ar',
      },
      { onConflict: 'id' },
    );
    if (profileError) return json({ error: profileError.message }, 500);

    const { error: upsertError } = await admin.from('user_roles').upsert(
      {
        user_id: target.id,
        institution_id: institutionId,
        role,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    if (upsertError) return json({ error: upsertError.message }, 500);

    // A teacher only sees their class-subject sections once the account is
    // linked to a staff record. An explicit pick from the Roles screen always
    // wins; the name match is only a last-resort fallback.
    const requestedStaffId = (body.staffId ?? '').trim();
    let linkedStaffId: string | null = null;

    if (requestedStaffId) {
      const { data: chosen, error: chosenError } = await admin
        .from('staff')
        .select('id, profile_id')
        .eq('id', requestedStaffId)
        .maybeSingle();
      if (chosenError) return json({ error: chosenError.message }, 500);
      if (!chosen) return json({ error: 'That staff record no longer exists.' }, 404);
      if (chosen.profile_id && chosen.profile_id !== target.id) {
        return json({ error: 'That staff record is already linked to another account.' }, 409);
      }

      // One account = one staff record: release any previous link first.
      await admin
        .from('staff')
        .update({ profile_id: null })
        .eq('profile_id', target.id)
        .neq('id', requestedStaffId);

      const { error: linkError } = await admin
        .from('staff')
        .update({ profile_id: target.id })
        .eq('id', requestedStaffId);
      if (linkError) return json({ error: linkError.message }, 500);
      linkedStaffId = requestedStaffId;
    } else if (role === 'teacher' && fullName) {
      const { data: linkedStaff } = await admin
        .from('staff')
        .select('id')
        .eq('profile_id', target.id)
        .maybeSingle();

      if (linkedStaff) {
        linkedStaffId = linkedStaff.id as string;
      } else {
        const { data: candidates } = await admin
          .from('staff')
          .select('id')
          .is('profile_id', null)
          .ilike('full_name', fullName.trim())
          .limit(1);
        const staffRow = candidates?.[0];
        if (staffRow) {
          await admin.from('staff').update({ profile_id: target.id }).eq('id', staffRow.id);
          linkedStaffId = staffRow.id as string;
        }
      }
    }

    await admin.from('audit_log').insert({
      institution_id: institutionId,
      actor_id: caller.id,
      action: 'assign_role',
      table_name: 'user_roles',
      record_id: target.id,
      after: { role, is_active: isActive, email, staff_id: linkedStaffId },
    });

    return json({ ok: true, userId: target.id, role, isActive, staffId: linkedStaffId });
  }

  if (action === 'revoke') {
    const targetId = (body.userId ?? '').trim();
    if (!targetId) return json({ error: 'A user is required.' }, 400);
    if (targetId === caller.id) return json({ error: 'You cannot revoke your own access.' }, 400);

    const { error: deleteError } = await admin
      .from('user_roles')
      .delete()
      .eq('user_id', targetId);
    if (deleteError) return json({ error: deleteError.message }, 500);

    await admin.from('audit_log').insert({
      institution_id: institutionId,
      actor_id: caller.id,
      action: 'revoke_role',
      table_name: 'user_roles',
      record_id: targetId,
      after: { role: null },
    });

    return json({ ok: true });
  }

  return json({ error: 'Unknown action.' }, 400);
});