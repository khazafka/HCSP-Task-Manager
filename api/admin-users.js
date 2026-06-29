import { createClient } from '@supabase/supabase-js';

const ROLES = ['customer', 'hcam', 'team', 'management', 'admin'];

function normalizeRole(raw) {
  const role = (raw || '').toString().toLowerCase().trim();
  if (role.includes('admin')) return 'admin';
  if (role.includes('manage')) return 'management';
  if (role.includes('team') || role.includes('solution')) return 'team';
  if (role.includes('hcam') || role.includes('account')) return 'hcam';
  if (role.includes('customer') || role.includes('unit')) return 'customer';
  return role;
}

function getBearer(req) {
  return (req.headers.authorization || '').replace('Bearer ', '').trim();
}

function sanitizeUser(row) {
  if (!row) return row;
  return {
    id: row.id,
    email: row.email || '',
    full_name: row.full_name || '',
    role: normalizeRole(row.role) || 'customer',
    phone: row.phone || '',
    unit_bisnis: row.unit_bisnis || '',
    created_at: row.created_at || null,
  };
}

function buildUserPayload(body, requirePassword) {
  const email = (body.email || '').toString().trim().toLowerCase();
  const password = (body.password || body.temporary_password || '').toString();
  const fullName = (body.full_name || body.fullName || '').toString().trim();
  const role = normalizeRole(body.role) || 'customer';
  const phone = (body.phone || '').toString().trim();
  const unitBisnis = (body.unit_bisnis || body.unitBisnis || '').toString().trim();

  if (!email || !fullName || (requirePassword && !password)) {
    throw new Error(requirePassword
      ? 'Email, password, and full name are required'
      : 'User id, email, and full name are required');
  }
  if (password && password.length < 6) throw new Error('Password must be at least 6 characters');
  if (!ROLES.includes(role)) throw new Error('Invalid role');

  return { email, password, fullName, role, phone, unitBisnis };
}

async function createManagedUser(adminClient, body) {
  const { email, password, fullName, role, phone, unitBisnis } = buildUserPayload(body, true);

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });
  if (createError) throw new Error(createError.message);

  const row = { id: created.user.id, email, full_name: fullName, role, phone };
  if (unitBisnis) row.unit_bisnis = unitBisnis;

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (profileError) {
    await adminClient.auth.admin.deleteUser(created.user.id).catch(() => {});
    throw new Error(profileError.message);
  }

  return sanitizeUser(profile);
}

async function requireAdmin(req) {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return { error: { status: 500, message: 'Missing admin environment variables' } };
  }

  const jwt = getBearer(req);
  if (!jwt) return { error: { status: 401, message: 'Missing auth token' } };

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
  if (authError || !user) return { error: { status: 401, message: 'Invalid or expired session' } };

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (profileError || normalizeRole(profile?.role) !== 'admin') {
    return { error: { status: 403, message: 'Admin access required' } };
  }

  return { adminClient, currentUser: user };
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

export default async function handler(req, res) {
  const guard = await requireAdmin(req);
  if (guard.error) return sendError(res, guard.error.status, guard.error.message);

  const { adminClient, currentUser } = guard;

  if (req.method === 'GET') {
    const { data, error } = await adminClient
      .from('users')
      .select('*')
      .order('full_name', { ascending: true });

    if (error) return sendError(res, 500, error.message);
    return res.status(200).json({ users: (data || []).map(sanitizeUser) });
  }

  if (req.method === 'POST') {
    const body = req.body || {};

    if (Array.isArray(body.users)) {
      const results = [];
      for (const [idx, row] of body.users.entries()) {
        try {
          const user = await createManagedUser(adminClient, row);
          results.push({ row: row.row || idx + 2, ok: true, user });
        } catch (err) {
          results.push({
            row: row.row || idx + 2,
            ok: false,
            email: row.email || '',
            error: err.message || 'Failed to create user',
          });
        }
      }
      return res.status(200).json({
        created: results.filter(r => r.ok).length,
        failed: results.filter(r => !r.ok).length,
        results,
      });
    }

    try {
      const user = await createManagedUser(adminClient, body);
      return res.status(201).json({ user });
    } catch (err) {
      return sendError(res, 400, err.message);
    }
  }

  if (req.method === 'PATCH') {
    const body = req.body || {};
    const id = (body.id || '').toString();
    if (!id) return sendError(res, 400, 'User id is required');

    let payload;
    try {
      payload = buildUserPayload(body, false);
    } catch (err) {
      return sendError(res, 400, err.message);
    }
    const { email, password, fullName, role, phone, unitBisnis } = payload;

    if (id === currentUser.id && role !== 'admin') return sendError(res, 400, 'You cannot remove your own admin role');

    const authUpdate = { email, user_metadata: { full_name: fullName, role } };
    if (password) authUpdate.password = password;

    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(id, authUpdate);
    if (authUpdateError) return sendError(res, 400, authUpdateError.message);

    const updateRow = { email, full_name: fullName, role, phone };
    if (unitBisnis) updateRow.unit_bisnis = unitBisnis;

    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .update(updateRow)
      .eq('id', id)
      .select('*')
      .single();

    if (profileError) return sendError(res, 500, profileError.message);
    return res.status(200).json({ user: sanitizeUser(profile) });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
