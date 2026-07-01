// src/utils/whatsapp.js
import { supabase } from '../supabase.js';

// Sends a WhatsApp message via our server-side proxy (/api/send-wa).
// The Fonnte token never reaches the browser.
export const sendWhatsAppMessage = async (target, message, options = {}) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const res = await fetch('/api/send-wa', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ target, recipientId: options.recipientId, message }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.data?.reason || data.data?.detail || data.data?.message || data.error;
    const err = new Error(detail || 'Failed to send WhatsApp message');
    err.status = res.status;
    err.payload = data;
    err.target = data.target;
    throw err;
  }
  return data;
};
