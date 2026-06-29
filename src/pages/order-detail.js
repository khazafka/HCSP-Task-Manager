import { supabase } from '../supabase.js';
import { renderOrders, renderEditOrder } from './order.js';
import { createNotification } from '../utils/notifications.js';
import { notify } from '../utils/notify.js';
import { normalizeRole } from '../main.js';
import { downloadAttachments, formatFileSize, openAttachment, uploadReportFiles, validateReportFiles } from '../utils/report-files.js';

const STATUSES = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed'];

function pillClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('closed')) return 'pill-green';
  if (s.includes('progress') || s.includes('assign') || s.includes('review')) return 'pill-amber';
  return 'pill-dim';
}

function escapeHtml(value) {
  return (value ?? '').toString().replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

async function recordStatusHistory(orderId, status) {
  const { error } = await supabase.from('order_status_history').insert({ order_id: orderId, status });
  if (error) console.warn('[status-history] insert failed:', error.message);
}

function orderLink(order) {
  return `${location.origin}/orders/ORD-${order.id}`;
}

function orderLabel(order) {
  return `#ORD-${order.id}`;
}

async function notifyAssignment({ order, assignee, assignmentType }) {
  const role = normalizeRole(assignmentType || assignee?.role);
  if (!['hcam', 'team'].includes(role)) return { notified: false, skipped: true };

  const roleLabel = role === 'team' ? 'Team Solution' : 'HCAM';
  const body = `[HCSP-OM] Assignment Order\n\nOrder   : ${orderLabel(order)}\nLayanan : ${order.order_title || '-'}\nUnit    : ${order.business_units?.name || '-'}\nStatus  : Assigned\nAssigned: ${assignee?.full_name || assignee?.email || '-'} (${roleLabel})\n\nSilakan tindak lanjuti di:\n${orderLink(order)}`;

  return createNotification({
    recipientId: assignee.id,
    recipientPhone: assignee.phone,
    orderId: order.id,
    type: 'order_assigned',
    title: `Order assigned to ${roleLabel}`,
    body,
  });
}

async function notifyReportToHcam({ order, reportTitle, reporterName }) {
  const hcamAssignees = (order.order_assignments || []).filter(a =>
    normalizeRole(`${a.assignment_type || ''} ${a.users?.role || ''}`) === 'hcam' ||
    `${a.assignment_type || ''} ${a.users?.role || ''}`.toLowerCase().includes('hcam'));

  const body = `[HCSP-OM] Laporan Hasil Pengerjaan\n\nOrder   : ${orderLabel(order)}\nLayanan : ${order.order_title || '-'}\nUnit    : ${order.business_units?.name || '-'}\nLaporan : ${reportTitle}\nOleh    : ${reporterName || 'Team Solution'}\nWaktu   : ${new Date().toLocaleString()}\n\nSilakan review laporan di:\n${orderLink(order)}`;

  let sent = 0;
  let lastError = '';
  for (const a of hcamAssignees) {
    const res = await createNotification({
      recipientId: a.user_id,
      recipientPhone: a.users?.phone,
      orderId: order.id,
      type: 'report_submitted',
      title: 'Laporan hasil baru',
      body,
    });
    if (res.waSent) sent++;
    else if (res.waError) lastError = res.waError;
  }

  return { total: hcamAssignees.length, sent, waError: lastError };
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

async function fetchWorkReports(orderId) {
  const { data, error } = await supabase
    .from('work_reports')
    .select('*, work_report_attachments (*)')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[work-reports] load failed:', error.message);
    return [];
  }
  return data || [];
}

function reportDateLabel(report) {
  const value = report.report_date || report.created_at;
  return value ? new Date(value).toLocaleDateString() : '-';
}

function showReportDetail(report) {
  const attachments = report.work_report_attachments || [];
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="modal-card report-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h3>${escapeHtml(report.report_title || 'Work report')}</h3>
          <p>${reportDateLabel(report)} · ${attachments.length} attachment(s)</p>
        </div>
        <button class="modal-x" type="button" data-modal-cancel aria-label="Close">&times;</button>
      </div>
      <div class="detail-label">Notes</div>
      <div class="detail-text" style="margin-bottom:14px">${escapeHtml(report.notes || 'No notes provided.')}</div>
      <div class="detail-label">Attachments</div>
      ${attachments.length ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          ${attachments.map(a => `
            <button class="attachment-row" type="button" data-open-attachment="${a.id}">
              <span>${escapeHtml(a.file_name)}</span>
              <small>${formatFileSize(a.file_size)}</small>
            </button>
          `).join('')}
        </div>` : '<div class="empty">No attachments uploaded.</div>'}
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-modal-cancel>Close</button>
        <button class="btn btn-primary" type="button" data-download-report ${attachments.length ? '' : 'disabled'}>Unduh semua</button>
      </div>
    </div>
  `;

  document.body.appendChild(el);
  const close = () => {
    el.classList.add('closing');
    setTimeout(() => el.remove(), 160);
  };
  el.querySelectorAll('[data-modal-cancel]').forEach(btn => btn.addEventListener('click', close));
  el.addEventListener('click', e => { if (e.target === el) close(); });
  el.querySelector('[data-download-report]')?.addEventListener('click', () => downloadAttachments(attachments));
  el.querySelectorAll('[data-open-attachment]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const attachment = attachments.find(a => `${a.id}` === btn.dataset.openAttachment);
      if (!attachment) return;
      try {
        await openAttachment(attachment.file_path);
      } catch (err) {
        notify(err.message, 'error');
      }
    });
  });
}

export async function renderOrderDetails(orderId, profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;
  const role = normalizeRole(profile?.role);

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *, business_units (id, name),
      order_assignments ( id, user_id, assignment_type, users (id, full_name, email, role, phone) )
    `)
    .eq('id', orderId)
    .single();

  if (error) { notify(`Error loading order: ${error.message}`, 'error'); return; }

  const { data: allUsers } = await supabase.from('users').select('id, full_name, email, role, phone');
  const assignableUsers = (allUsers || []).filter(u => ['hcam', 'team'].includes(normalizeRole(u.role)));
  const workReports = await fetchWorkReports(orderId);

  let history = [];
  try {
    const { data: h } = await supabase
      .from('order_status_history')
      .select('status, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    history = h || [];
  } catch (_) { /* table may not exist yet */ }

  const canEdit = (role === 'admin' || role === 'hcam' || role === 'customer') && (order.status === 'Draft' || order.status === 'Submitted');
  const canDelete = role === 'admin';
  const canAssign = role === 'admin' || role === 'hcam';
  const canUpdateStatus = role === 'admin' || role === 'hcam' || role === 'team';
  const canAddReport = role === 'team' && (order.status === 'In Progress' || order.status === 'Review');

  container.innerHTML = `
    <div class="view">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <button class="link-back" id="backBtn" style="margin:0">&larr; Back to orders</button>
        <span style="font:500 11px var(--mono,monospace);color:var(--text-faint)">Tracking ID · #ORD-${order.id}</span>
      </div>

      <div class="detail-grid">
        <div>
          <div class="detail-block">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line-soft);padding-bottom:14px;margin-bottom:14px">
              <div>
                <h1 style="font-size:22px;margin:0">${order.order_title || 'Untitled order'}</h1>
                <p style="font-size:12px;color:var(--text-dim);margin-top:4px">Business unit · ${order.business_units?.name ?? 'Unassigned'}</p>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                ${canEdit ? `<button class="btn btn-ghost" id="editBtn" style="padding:8px 12px">Edit</button>` : ''}
                ${canDelete ? `<button class="btn btn-ghost" id="deleteBtn" style="padding:8px 12px;color:var(--danger);border-color:rgba(255,107,107,.3)">Delete</button>` : ''}
                <span class="pill ${pillClass(order.status)}">${order.status}</span>
              </div>
            </div>
            <div class="detail-label">Description / requirements</div>
            <div class="detail-text">${order.order_description || 'No details provided.'}</div>
          </div>

          <div class="detail-block">
            <h3>Status tracking</h3>
            ${history.length ? history.map(h => `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div>
                  <div class="timeline-main">${h.status}</div>
                  <div class="timeline-time">${new Date(h.created_at).toLocaleString()}</div>
                </div>
              </div>`).join('') : '<div class="empty">No status changes recorded yet.</div>'}
          </div>

          <div class="detail-block">
            <h3>Work reports history</h3>
            ${workReports.length ? workReports.map((r, idx) => `
              <div class="report-item">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <span style="font:600 13px var(--sans);color:var(--text)">[Laporan #${workReports.length - idx}] ${escapeHtml(r.report_title)}</span>
                  <span style="font-size:11px;color:var(--text-faint)">${reportDateLabel(r)}</span>
                </div>
                <div style="font-size:12.5px;color:var(--text-dim);white-space:pre-line">${escapeHtml(r.notes || 'No notes provided.')}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
                  <button class="btn btn-ghost" data-report-detail="${r.id}" style="padding:7px 10px">Lihat detail</button>
                  <button class="btn btn-ghost" data-report-download="${r.id}" style="padding:7px 10px" ${r.work_report_attachments?.length ? '' : 'disabled'}>Unduh semua</button>
                  <span class="row-sub">${r.work_report_attachments?.length || 0} attachment(s)</span>
                </div>
              </div>`).join('') : `<div class="empty">No reports compiled yet.</div>`}
          </div>
        </div>

        <div>
          <div class="detail-block">
            <h3>Team assignments</h3>
            ${order.order_assignments?.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${order.order_assignments.map(a => `
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-3);border:1px solid var(--line-soft);border-radius:var(--radius-sm);padding:9px 12px">
                <div><div style="font:600 12.5px var(--sans);color:var(--text)">${a.users?.full_name || '—'}</div><div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase">${a.assignment_type || a.users?.role || ''}</div></div>
                ${canAssign ? `<button data-unassign="${a.id}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px">&times;</button>` : ''}
              </div>`).join('')}</div>` : `<div class="empty" style="padding:10px 0">No operators assigned.</div>`}
            ${canAssign ? `
              <div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line-soft);padding-top:12px">
                <select id="assignUserSelect" class="select"><option value="">Select user…</option>${(allUsers || []).map(u => `<option value="${u.id}" data-role="${u.role}">${u.full_name} (${u.role})</option>`).join('')}</select>
                <div style="font-size:11px;color:var(--text-faint)">Assignment WhatsApp is sent to the selected user's phone in User Management, not the order contact number.</div>
                <button id="assignBtn" class="btn btn-primary" style="width:100%;justify-content:center">Assign user</button>
              </div>` : ''}
          </div>

          ${canUpdateStatus ? `
            <div class="detail-block">
              <h3>Lifecycle pipeline</h3>
              <select id="statusSelect" class="select" style="margin-bottom:10px">${STATUSES.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
              <button id="updateStatusBtn" class="btn btn-ghost" style="width:100%;justify-content:center">Update status</button>
            </div>` : ''}

          ${canAddReport ? `
            <div class="detail-block">
              <h3>Submit work report</h3>
              <input id="repTitle" class="input" placeholder="Report title" style="margin-bottom:8px"/>
              <input id="repDate" class="input" type="date" value="${todayValue()}" style="margin-bottom:8px"/>
              <textarea id="repNotes" class="textarea" rows="4" placeholder="Notes / report description" style="margin-bottom:8px"></textarea>
              <input id="repFiles" class="input" type="file" multiple style="margin-bottom:8px"/>
              <div class="row-sub" style="margin-bottom:10px">Multiple files allowed. Max 10 MB per file.</div>
              <button id="submitReportBtn" class="btn btn-primary" style="width:100%;justify-content:center">Send report</button>
            </div>` : ''}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#backBtn').addEventListener('click', () => renderOrders(profile));
  container.querySelector('#editBtn')?.addEventListener('click', () => renderEditOrder(order.id, profile));
  container.querySelector('#deleteBtn')?.addEventListener('click', async () => {
    if (!confirm(`Delete order #ORD-${order.id}?`)) return;
    await supabase.from('orders').delete().eq('id', order.id);
    notify(`Order #ORD-${order.id} deleted.`, 'success');
    renderOrders(profile);
  });
  container.querySelectorAll('[data-report-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const report = workReports.find(r => `${r.id}` === btn.dataset.reportDetail);
      if (report) showReportDetail(report);
    });
  });
  container.querySelectorAll('[data-report-download]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const report = workReports.find(r => `${r.id}` === btn.dataset.reportDownload);
      if (!report) return;
      try {
        await downloadAttachments(report.work_report_attachments || []);
      } catch (err) {
        notify(err.message, 'error');
      }
    });
  });

  if (canAssign) {
    container.querySelector('#assignBtn').addEventListener('click', async () => {
      const sel = container.querySelector('#assignUserSelect');
      const userId = sel.value;
      if (!userId) { notify('Select a user first.', 'warning'); return; }
      const assignRole = sel.options[sel.selectedIndex].dataset.role;
      const { error: e } = await supabase.from('order_assignments').insert({ order_id: order.id, user_id: userId, assignment_type: assignRole });
      if (e) { notify(e.message, 'error'); return; }

      let assignedOrder = order;
      if (['Draft', 'Submitted'].includes(order.status)) {
        const { data: updatedOrder, error: statusErr } = await supabase
          .from('orders')
          .update({ status: 'Assigned' })
          .eq('id', order.id)
          .select('*, business_units (id, name)')
          .single();
        if (!statusErr && updatedOrder) {
          assignedOrder = updatedOrder;
          await recordStatusHistory(order.id, 'Assigned');
        }
      }

      const assignee = (allUsers || []).find(u => u.id === userId);
      const res = assignee
        ? await notifyAssignment({ order: assignedOrder, assignee, assignmentType: assignRole })
        : { waSent: false, skipped: true };

      if (res.skipped) notify('User assigned to order.', 'success');
      else if (res.waSent) notify('User assigned and WhatsApp notification sent.', 'success');
      else notify(`User assigned, but WhatsApp notification could not be sent${res.waError ? `: ${res.waError}` : '.'}`, 'warning');
      renderOrderDetails(order.id, profile);
    });
    container.querySelectorAll('[data-unassign]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await supabase.from('order_assignments').delete().eq('id', btn.dataset.unassign);
        renderOrderDetails(order.id, profile);
      });
    });
  }

  if (canUpdateStatus) {
    container.querySelector('#updateStatusBtn').addEventListener('click', async () => {
      const newStatus = container.querySelector('#statusSelect').value;
      const { error: e } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      if (e) { notify(e.message, 'error'); return; }
      await recordStatusHistory(order.id, newStatus);
      notify(`Status updated to ${newStatus}.`, 'success');
      const statusBody = `[HCSP-OM] Status Order Berubah\n\nOrder   : ${orderLabel(order)}\nLayanan : ${order.order_title || '-'}\nUnit    : ${order.business_units?.name || '-'}\nStatus  : ${newStatus}\n\nLihat detail di:\n${orderLink(order)}`;
      const res = await createNotification({ recipientId: order.created_by, orderId: order.id, type: 'status_changed', title: `Order ${newStatus}`, body: statusBody });
      if (!res.logged) {
        notify(res.reason === 'no-recipient'
          ? 'This order has no customer (created_by) — no one to notify.'
          : 'Status saved, but the notification could not be logged. Check the console.', 'warning');
      }
      renderOrderDetails(order.id, profile);
    });
  }

  if (canAddReport) {
    container.querySelector('#submitReportBtn').addEventListener('click', async () => {
      const title = container.querySelector('#repTitle').value.trim();
      const reportDate = container.querySelector('#repDate').value || todayValue();
      const notes = container.querySelector('#repNotes').value.trim();
      const files = Array.from(container.querySelector('#repFiles').files || []);
      if (!title || !notes) { notify('Title and notes are required.', 'warning'); return; }
      try {
        validateReportFiles(files);
      } catch (err) {
        notify(err.message, 'warning');
        return;
      }

      const btn = container.querySelector('#submitReportBtn');
      btn.disabled = true;
      btn.textContent = 'Uploading...';

      const { data: report, error: e } = await supabase
        .from('work_reports')
        .insert({
          order_id: order.id,
          report_title: title,
          report_date: reportDate,
          notes,
          created_by: profile?.id,
        })
        .select('*')
        .single();
      if (e) {
        btn.disabled = false;
        btn.textContent = 'Send report';
        notify(e.message, 'error');
        return;
      }

      try {
        if (files.length) {
          const rows = await uploadReportFiles({ files, orderId: order.id, reportId: report.id, userId: profile?.id });
          const { error: attachErr } = await supabase.from('work_report_attachments').insert(rows);
          if (attachErr) throw new Error(attachErr.message);
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = 'Send report';
        notify(`Report saved, but attachments failed: ${err.message}`, 'warning');
        renderOrderDetails(order.id, profile);
        return;
      }

      const reportNotify = await notifyReportToHcam({
        order,
        reportTitle: title,
        reporterName: profile?.full_name || profile?.email || 'Team Solution',
      });
      if (!reportNotify.total) {
        notify('Report saved, but no assigned HCAM was found to notify.', 'warning');
      } else if (reportNotify.sent) {
        notify(`Work report submitted and WhatsApp sent to ${reportNotify.sent} HCAM user${reportNotify.sent > 1 ? 's' : ''}.`, 'success');
      } else {
        notify(`Report saved, but WhatsApp could not be sent to assigned HCAM${reportNotify.waError ? `: ${reportNotify.waError}` : '.'}`, 'warning');
      }
      renderOrderDetails(order.id, profile);
      return;
    });
  }
}
