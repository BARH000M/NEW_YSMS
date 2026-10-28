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

interface Body {
  email?: string;
  password?: string;
  fullName?: string;
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

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const institutionRow = await admin
    .from('institutions')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (institutionRow.error) return json({ error: institutionRow.error.message }, 500);
  const institutionId = institutionRow.data?.id ?? null;

  // Path A - first-run setup: create the owner account itself.
  const email = (body.email ?? '').trim().toLowerCase();
  const password = body.password ?? '';

  if (email || password) {
    if (!email || !password) return json({ error: 'Email and password are both required.' }, 400);
    if (password.length < 8) {
      return json({ error: 'The password must be at least 8 characters long.' }, 400);
    }

    const { count, error: countError } = await admin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (countError) return json({ error: countError.message }, 500);
    if ((count ?? 0) > 0) {
      return json(
        {
          error:
            'This console already has accounts. Sign in with your existing account and use "Activate first admin" instead.',
        },
        409,
      );
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName?.trim() || email },
    });
    if (createError) return json({ error: createError.message }, 500);
    const owner = created?.user;
    if (!owner) return json({ error: 'The account could not be created.' }, 500);

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: owner.id,
        institution_id: institutionId,
        full_name: body.fullName?.trim() || email,
        locale: 'ar',
      },
      { onConflict: 'id' },
    );
    if (profileError) return json({ error: profileError.message }, 500);

    const { error: roleInsertError } = await admin.from('user_roles').insert({
      user_id: owner.id,
      institution_id: institutionId,
      role: 'super_admin',
      is_active: true,
    });
    if (roleInsertError) return json({ error: roleInsertError.message }, 500);

    await admin.from('audit_log').insert({
      institution_id: institutionId,
      actor_id: owner.id,
      action: 'bootstrap_owner',
      table_name: 'user_roles',
      record_id: owner.id,
      after: { role: 'super_admin', email },
    });

    return json({ ok: true, role: 'super_admin', userId: owner.id, created: true });
  }

  // Path B - claim: the signed-in first account becomes the owner.
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'You must be signed in to claim the console.' }, 401);

  const authClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  const caller = userData?.user;
  if (userError || !caller) return json({ error: 'Invalid or expired session.' }, 401);

  const { data: existingRole, error: existingError } = await admin
    .from('user_roles')
    .select('role, is_active')
    .eq('user_id', caller.id)
    .maybeSingle();
  if (existingError) return json({ error: existingError.message }, 500);
  if (existingRole) return json({ ok: true, role: existingRole.role, alreadyAssigned: true });

  const { count: roleCount, error: roleCountError } = await admin
    .from('user_roles')
    .select('user_id', { count: 'exact', head: true });
  if (roleCountError) return json({ error: roleCountError.message }, 500);
  if ((roleCount ?? 0) > 0) {
    return json(
      { error: 'This console already has an administrator. Ask them to assign your role.' },
      409,
    );
  }

  const fullName = (caller.user_metadata?.full_name as string | undefined) ?? caller.email ?? null;

  const { error: profileError } = await admin.from('profiles').upsert(
    {
      id: caller.id,
      institution_id: institutionId,
      full_name: fullName,
      locale: 'ar',
    },
    { onConflict: 'id' },
  );
  if (profileError) return json({ error: profileError.message }, 500);

  const { error: insertError } = await admin.from('user_roles').insert({
    user_id: caller.id,
    institution_id: institutionId,
    role: 'super_admin',
    is_active: true,
  });
  if (insertError) return json({ error: insertError.message }, 500);

  await admin.from('audit_log').insert({
    institution_id: institutionId,
    actor_id: caller.id,
    action: 'bootstrap_owner',
    table_name: 'user_roles',
    record_id: caller.id,
    after: { role: 'super_admin' },
  });

  return json({ ok: true, role: 'super_admin', userId: caller.id, alreadyAssigned: false });
});