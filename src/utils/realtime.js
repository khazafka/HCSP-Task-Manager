import { supabase } from '../supabase.js';

// Only the most recently subscribed view stays live; subscribing replaces the
// previous channel, so navigating between views swaps the listener cleanly.
let channel = null;

export function subscribeOrders(handler) {
  unsubscribeRealtime();
  channel = supabase
    .channel('hcsp-orders-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handler)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history' }, handler)
    .subscribe();
  return channel;
}

export function unsubscribeRealtime() {
  if (channel) { supabase.removeChannel(channel); channel = null; }
}

export function debounce(fn, ms = 500) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
}
