import { createClient } from '@supabase/supabase-js';

// Vercel serverless function: POST /api/send-wa
// Keeps the Fonnte token server-side and gates the call behind a valid Supabase session.
function normalizeWhatsappTarget(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

function fonnteErrorMessage(data) {
  if (!data || typeof data !== 'object') return 'Fonnte rejected the message';
  return data.reason
    || data.detail
    || data.message
    || data.error
    || data.msg
    || 'Fonnte rejected the message';
}

function normalizeSupabaseUrl(value) {
  const raw = (value || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) return '';

  const dashboardMatch = raw.match(/supabase\.com\/(?:dashboard\/)?project\/([a-z0-9-]+)/i);
  if (dashboardMatch?.[1]) return `https://${dashboardMatch[1]}.supabase.co`;

  if (/^[a-z0-9-]+\.supabase\.co(?:\/.*)?$/i.test(raw)) {
    return new URL(`https://${raw}`).origin;
  }

  if (/^[a-z0-9]{15,30}$/i.test(raw)) {
    return `https://${raw}.supabase.co`;
  }

  try {
    const url = new URL(raw);
    return url.origin;
  } catch (_) {
    return raw.replace(/\/+$/, '');
  }
}

function cleanEnv(value) {
  return (value || '').trim().replace(/^['"]|['"]$/g, '');
}

function safeHost(value) {
  try { return new URL(value).host; } catch (_) { return value || '(empty)'; }
}

// Read the payload of a JWT without verifying it (verification is done by the
// data-API probe). Used only to extract the user id for logging.
function decodeJwt(jwt) {
  try {
    const part = jwt.split('.')[1];
    const json = Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
    return JSON.parse(json);
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = normalizeSupabaseUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL);
  const SUPABASE_ANON_KEY = cleanEnv(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY);
  const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const FONNTE_TOKEN = cleanEnv(process.env.FONNTE_TOKEN);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !FONNTE_TOKEN) {
    return res.status(500).json({ error: 'Missing server environment variables' });
  }

  // 1) Require a valid Supabase session (prevents an open relay using your token)
  const jwt = (req.headers.authorization || req.headers.Authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return res.status(401).json({ error: 'Missing auth token' });

  // Validate the caller's token the same way every other app request is: against
  // the data API (PostgREST). It checks the JWT signature + expiry but — unlike
  // /auth/v1/user — does NOT require the login session row to still exist. So a
  // valid, unexpired token that was signed out elsewhere ("session_not_found")
  // still works here, exactly like the DB write that triggered this send.
  // A forged/expired token gets 401 and is rejected.
  const claims = decodeJwt(jwt);
  try {
    const probe = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id&limit=1`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jwt}` },
    });
    if (probe.status === 401 || probe.status === 403) {
      const detail = (await probe.text().catch(() => '')).slice(0, 200);
      return res.status(401).json({
        error: `Invalid or expired token (HTTP ${probe.status} from ${safeHost(SUPABASE_URL)}). Please log in again. ${detail}`.trim(),
      });
    }
  } catch (e) {
    return res.status(401).json({ error: `Could not verify token against ${safeHost(SUPABASE_URL)}: ${e.message}` });
  }
  if (!claims?.sub) {
    return res.status(401).json({ error: 'Invalid auth token (could not read user id)' });
  }
  console.info('[send-wa] authorized caller:', { userId: claims.sub, email: claims.email });

  // 2) Validate input
  const { target, recipientId, message } = req.body || {};
  let normalizedTarget = normalizeWhatsappTarget(target);
  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  if (!normalizedTarget && recipientId) {
    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY for recipient lookup' });
    }
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: recipient, error: recipientError } = await adminClient
      .from('users')
      .select('phone')
      .eq('id', recipientId)
      .single();

    if (recipientError) return res.status(404).json({ error: `Recipient lookup failed: ${recipientError.message}` });
    normalizedTarget = normalizeWhatsappTarget(recipient?.phone);
  }

  if (!normalizedTarget) {
    return res.status(400).json({ error: 'target or recipient with phone number is required' });
  }

  // 3) Forward to Fonnte with the server-only token
  try {
    const form = new FormData();
    form.append('target', normalizedTarget);
    form.append('message', message);
    // Queue the notification instead of rejecting it when the Fonnte device is temporarily disconnected.
    // The target is already normalized to a full international number, so disable country-code rewriting.
    form.append('connectOnly', 'false');
    form.append('countryCode', '0');

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
      },
      body: form,
    });
    const data = await fonnteRes.json().catch(() => ({}));
    if (!fonnteRes.ok || !data.status) {
      return res.status(502).json({ error: fonnteErrorMessage(data), target: normalizedTarget, data });
    }
    return res.status(200).json({ ok: true, target: normalizedTarget, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
