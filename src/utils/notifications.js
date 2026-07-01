import { supabase } from '../supabase.js';
import { sendWhatsAppMessage } from './whatsapp.js';

// Logs an in-app notification row and (best-effort) sends a WhatsApp to the
// recipient's own phone (users.phone). WA failure never blocks the DB log.
export async function createNotification({ recipientId, recipientPhone, orderId, type, title, body, whatsapp = true }) {
  if (!recipientId) {
    console.warn('[notify] skipped — no recipient', { orderId, type });
    return { logged: false, waSent: false, reason: 'no-recipient' };
  }

  const { error } = await supabase.from('notifications').insert({
    user_id: recipientId,
    order_id: orderId,
    type,
    title,
    body,
    channel: whatsapp ? 'whatsapp' : 'app',
  });
  if (error) console.error('[notify] insert failed:', error.message, error);

  let waSent = false;
  let waError = '';
  let waResult = null;
  let waFailureTarget = '';
  let phone = recipientPhone;
  if (whatsapp) {
    if (!phone) {
      const { data: u } = await supabase.from('users').select('phone').eq('id', recipientId).single();
      phone = u?.phone;
    }
    try {
      waResult = await sendWhatsAppMessage(phone || '', body, { recipientId });
      waSent = true;
      console.info('[notify] WhatsApp request accepted:', {
        recipientId,
        orderId,
        type,
        target: waResult?.target || phone,
        response: waResult?.data,
      });
    } catch (err) {
      waError = err.message || 'WhatsApp request failed';
      waFailureTarget = err.target || phone || '';
      console.warn('[notify] WhatsApp send failed:', err.message, {
        recipientId,
        orderId,
        type,
        phone,
        status: err.status,
        target: err.target,
        payload: err.payload,
      });
    }
  }
  return {
    logged: !error,
    waSent,
    waError,
    phone,
    waTarget: waResult?.target || waFailureTarget || phone,
    waResponse: waResult?.data || null,
  };
}

// Reads the current user's notifications (RLS already restricts to their own rows).
export async function fetchNotifications(limit = 20) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) { console.error('[notify] fetch failed:', error.message); return []; }
  return data || [];
}

export async function markNotificationsRead() {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  if (error) console.error('[notify] markRead failed:', error.message);
}
