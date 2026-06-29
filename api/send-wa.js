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
  const jwt = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!jwt) return res.status(401).json({ error: 'Missing auth token' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return res.status(401).json({
      error: `Invalid or expired session. WhatsApp API is validating against ${safeHost(SUPABASE_URL)}. Make sure server Supabase env vars match the browser Supabase env vars. ${authErr?.message ? `Supabase said: ${authErr.message}` : ''}`.trim(),
    });
  }

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

    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: FONNTE_TOKEN,
      },
      body: form,
    });
    const data = await fonnteRes.json();
    if (!data.status) {
      return res.status(502).json({ error: data.reason || data.detail || 'Fonnte rejected the message', data });
    }
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
