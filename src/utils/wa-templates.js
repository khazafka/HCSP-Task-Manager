// WhatsApp message templates for HCSP-OM notifications.
// The language follows whatever language the acting user has selected on the
// page (getLang()), so an English user sends English messages and an
// Indonesian user sends Indonesian ones. Status values (e.g. "Submitted",
// "Assigned") stay as stored in the DB; only labels and prompts translate.
import { getLang } from './i18n.js';

const STR = {
  en: {
    t_new: 'New Order Received',
    t_assign: 'Order Assignment',
    t_report: 'Work Report Submitted',
    t_status: 'Order Status Changed',
    l_order: 'Order', l_service: 'Service', l_customer: 'Customer',
    l_unit: 'Unit', l_status: 'Status', l_assigned: 'Assigned',
    l_report: 'Report', l_by: 'By', l_time: 'Time',
    cta_review: 'Please review the order at:',
    cta_follow: 'Please follow up at:',
    cta_report: 'Please review the report at:',
    cta_detail: 'View details at:',
  },
  id: {
    t_new: 'Order Baru Masuk',
    t_assign: 'Assignment Order',
    t_report: 'Laporan Hasil Pengerjaan',
    t_status: 'Status Order Berubah',
    l_order: 'Order', l_service: 'Layanan', l_customer: 'Customer',
    l_unit: 'Unit', l_status: 'Status', l_assigned: 'Assigned',
    l_report: 'Laporan', l_by: 'Oleh', l_time: 'Waktu',
    cta_review: 'Silakan review order di:',
    cta_follow: 'Silakan tindak lanjuti di:',
    cta_report: 'Silakan review laporan di:',
    cta_detail: 'Lihat detail di:',
  },
};

function s() {
  return STR[getLang()] || STR.en;
}

// Aligns the colons the way the reference message looks:
//   Order   : #ORD-20
//   Customer: Admin User
function build(title, rows, cta, link) {
  const width = Math.max(...rows.map(([k]) => k.length));
  const body = rows.map(([k, v]) => `${k.padEnd(width)}: ${v || '-'}`).join('\n');
  return `[HCSP-OM] ${title}\n\n${body}\n\n${cta}\n${link}`;
}

export function waOrderSubmitted({ orderId, service, customer, unit, status, link }) {
  const x = s();
  return build(x.t_new, [
    [x.l_order, `#ORD-${orderId}`],
    [x.l_service, service],
    [x.l_customer, customer],
    [x.l_unit, unit],
    [x.l_status, status],
  ], x.cta_review, link);
}

export function waAssignment({ orderId, service, unit, assignedName, link }) {
  const x = s();
  return build(x.t_assign, [
    [x.l_order, `#ORD-${orderId}`],
    [x.l_service, service],
    [x.l_unit, unit],
    [x.l_status, 'Assigned'],
    [x.l_assigned, assignedName],
  ], x.cta_follow, link);
}

export function waReport({ orderId, service, unit, report, by, time, link }) {
  const x = s();
  return build(x.t_report, [
    [x.l_order, `#ORD-${orderId}`],
    [x.l_service, service],
    [x.l_unit, unit],
    [x.l_report, report],
    [x.l_by, by],
    [x.l_time, time],
  ], x.cta_report, link);
}

export function waStatusChanged({ orderId, service, unit, status, link }) {
  const x = s();
  return build(x.t_status, [
    [x.l_order, `#ORD-${orderId}`],
    [x.l_service, service],
    [x.l_unit, unit],
    [x.l_status, status],
  ], x.cta_detail, link);
}

// In-app notification titles (bell dropdown) — also follow the page language.
export function waTitle(kind) {
  const x = s();
  return { new: x.t_new, assign: x.t_assign, report: x.t_report, status: x.t_status }[kind] || '';
}
