import { createClient } from '@supabase/supabase-js';

// Vercel serverless function: POST /api/send-wa
// Keeps the Fonnte token server-side and gates the call behind a valid Supabase session.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1) Require a valid Supabase session (prevents an open relay using your token)
  const jwt = (req.headers.authorization || '').replace('Bearer ', '').trim();
  if (!jwt) return res.status(401).json({ error: 'Missing auth token' });

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid or expired session' });

  // 2) Validate input
  const { target, message } = req.body || {};
  if (!target || !message) {
    return res.status(400).json({ error: 'target and message are required' });
  }

  // 3) Forward to Fonnte with the server-only token
  try {
    const fonnteRes = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        Authorization: process.env.FONNTE_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ target, message }),
    });
    const data = await fonnteRes.json();
    if (!data.status) {
      return res.status(502).json({ error: data.reason || 'Fonnte rejected the message' });
    }
    return res.status(200).json({ ok: true, data });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
