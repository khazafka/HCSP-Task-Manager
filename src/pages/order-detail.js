import { supabase } from '../supabase.js';
import { renderOrders, renderEditOrder, itemOrderLabel, orderUnitName } from './order.js';
import { createNotification } from '../utils/notifications.js';
import { notify } from '../utils/notify.js';
import { normalizeRole } from '../main.js';
import { deleteAttachmentFiles, downloadAttachments, formatFileSize, openAttachment, uploadReportFiles, validateReportFiles } from '../utils/report-files.js';
import { t, tf } from '../utils/i18n.js';
import { confirmDialog } from '../utils/dialogs.js';
import { waAssignment, waReport, waStatusChanged, waTitle } from '../utils/wa-templates.js';

const STATUS_FLOW = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed'];

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

async function notifyAssignment({ order, assignee, assignmentType }) {
  const role = normalizeRole(assignmentType || assignee?.role);
  if (!['hcam', 'team'].includes(role)) return { notified: false, skipped: true };

  const roleLabel = role === 'team' ? 'Team Solution' : 'HCAM';
  const body = waAssignment({
    orderId: order.id,
    service: order.order_title,
    unit: order.business_units?.name,
    assignedName: `${assignee?.full_name || assignee?.email || '-'} (${roleLabel})`,
    link: orderLink(order),
  });

  // In-app notification lands on the assignee's bell, and WhatsApp goes to
  // the assignee's profile phone from User Management.
  return createNotification({
    recipientId: assignee.id,
    recipientPhone: assignee.phone,
    orderId: order.id,
    type: 'order_assigned',
    title: waTitle('assign'),
    body,
  });
}

async function notifyReportToHcam({ order, reportTitle, reporterName }) {
  const hcamAssignees = uniqueAssignments(order.order_assignments || []).filter(a =>
    normalizeRole(`${a.assignment_type || ''} ${a.users?.role || ''}`) === 'hcam' ||
    `${a.assignment_type || ''} ${a.users?.role || ''}`.toLowerCase().includes('hcam'));

  const body = waReport({
    orderId: order.id,
    service: order.order_title,
    unit: order.business_units?.name,
    report: reportTitle,
    by: reporterName || 'Team Solution',
    time: new Date().toLocaleString(),
    link: orderLink(order),
  });

  // In-app + WhatsApp notifications for assigned HCAM users.
  // The WhatsApp goes to each HCAM user's profile phone from User Management.
  let sent = 0;
  let waError = '';
  let waTarget = '';
  for (const a of hcamAssignees) {
    const res = await createNotification({
      recipientId: a.user_id,
      recipientPhone: a.users?.phone,
      orderId: order.id,
      type: 'report_submitted',
      title: waTitle('report'),
      body,
    });
    if (res.waSent) {
      sent++;
      waTarget = res.waTarget || a.users?.phone || waTarget;
    } else if (res.waError) {
      waError = res.waError;
    }
  }

  return { total: hcamAssignees.length, sent, waError, waTarget };
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

function assignmentUserId(assignment) {
  return assignment?.user_id || assignment?.users?.id || '';
}

function uniqueAssignments(assignments = []) {
  const seen = new Set();
  return assignments.filter(assignment => {
    const key = assignmentUserId(assignment) || `row:${assignment.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isAssignedToOrder(order, userId) {
  if (!order || !userId) return false;
  return (order.order_assignments || []).some(a => a.user_id === userId || a.users?.id === userId);
}

function canViewOrder(order, profile, role) {
  if (['admin', 'hcam', 'management'].includes(role)) return true;
  if (role === 'customer') return order.created_by === profile?.id;
  if (role === 'team') return isAssignedToOrder(order, profile?.id);
  return false;
}

function canEditDetails(order, profile, role) {
  if (!['Draft', 'Submitted'].includes(order.status)) return false;
  if (['admin', 'hcam'].includes(role)) return true;
  return role === 'customer' && order.created_by === profile?.id;
}

function allowedStatusTargets(order, profile, role) {
  if (role === 'admin') {
    if (order.status === 'Closed') return ['Completed'];
    return STATUS_FLOW.filter(status => status !== order.status);
  }

  const assignedTeam = role === 'team' && isAssignedToOrder(order, profile?.id);
  const isCreator = role === 'customer' && order.created_by === profile?.id;
  const canHcamAdmin = role === 'hcam';

  switch (order.status) {
    case 'Draft':
      return (isCreator || canHcamAdmin) ? ['Submitted'] : [];
    case 'Submitted':
      return canHcamAdmin ? ['Assigned'] : [];
    case 'Assigned':
      return (assignedTeam || canHcamAdmin) ? ['In Progress'] : [];
    case 'In Progress':
      return (assignedTeam || canHcamAdmin) ? ['Review'] : [];
    case 'Review':
      if (canHcamAdmin) return ['In Progress', 'Completed'];
      return [];
    case 'Completed':
      return ['admin', 'management'].includes(role) ? ['Closed'] : [];
    default:
      return [];
  }
}

function showReportDetail(report) {
  const attachments = report.work_report_attachments || [];
  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="modal-card report-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div>
          <h3>${escapeHtml(report.report_title || t('rep.untitled'))}</h3>
          <p>${reportDateLabel(report)} - ${tf('rep.fileCount', { count: attachments.length })}</p>
        </div>
        <button class="modal-x" type="button" data-modal-cancel aria-label="${t('common.close')}">&times;</button>
      </div>
      <div class="detail-label">${t('rep.notes')}</div>
      <div class="detail-text" style="margin-bottom:14px">${escapeHtml(report.notes || t('rep.noNotes'))}</div>
      <div class="detail-label">${t('rep.attachments')}</div>
      ${attachments.length ? `
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          ${attachments.map(a => `
            <button class="attachment-row" type="button" data-open-attachment="${a.id}">
              <span>${escapeHtml(a.file_name)}</span>
              <small>${formatFileSize(a.file_size)}</small>
            </button>
          `).join('')}
        </div>` : `<div class="empty">${t('rep.noFiles')}</div>`}
      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-modal-cancel>${t('common.close')}</button>
        <button class="btn btn-ghost" type="button" data-export-report-pdf>${t('rep.exportPdf')}</button>
        <button class="btn btn-primary" type="button" data-download-report ${attachments.length ? '' : 'disabled'}>${t('rep.downloadAll')}</button>
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
  el.querySelector('[data-export-report-pdf]')?.addEventListener('click', async () => {
    const exp = await import('../utils/export-reports.js');
    exp.exportSingleReportPdf(report);
  });
  el.querySelector('[data-download-report]')?.addEventListener('click', async () => {
    try {
      await downloadAttachments(attachments, { zipName: `work-report-${report.id}-attachments` });
    } catch (err) {
      notify(err.message, 'error');
    }
  });
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
  const visibleAssignments = uniqueAssignments(order.order_assignments || []);
  const assignedUserIds = new Set((order.order_assignments || []).map(assignmentUserId).filter(Boolean));
  const assignableUsers = (allUsers || [])
    .filter(u => ['hcam', 'team'].includes(normalizeRole(u.role)))
    .filter(u => !assignedUserIds.has(u.id));
  const workReports = await fetchWorkReports(orderId);

  if (!canViewOrder(order, profile, role)) {
    container.innerHTML = `
      <div class="view">
        <button class="link-back" id="backBtn">&larr; ${t('det.back')}</button>
        <div class="placeholder-card">You do not have access to this order.</div>
      </div>
    `;
    container.querySelector('#backBtn').addEventListener('click', () => renderOrders(profile));
    return;
  }

  let history = [];
  try {
    const { data: h } = await supabase
      .from('order_status_history')
      .select('status, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    history = h || [];
  } catch (_) { /* table may not exist yet */ }

  const statusTargets = allowedStatusTargets(order, profile, role);
  const canEdit = canEditDetails(order, profile, role);
  const canDelete = role === 'admin';
  const canAssign = role === 'admin' || role === 'hcam';
  const canUpdateStatus = statusTargets.length > 0;
  const canAddReport = role === 'team'
    && isAssignedToOrder(order, profile?.id)
    && (order.status === 'In Progress' || order.status === 'Review');
  const canDeleteReport = role === 'admin';

  container.innerHTML = `
    <div class="view">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <button class="link-back" id="backBtn" style="margin:0">&larr; ${t('det.back')}</button>
        <span style="font:500 11px var(--mono,monospace);color:var(--text-faint)">${t('det.tracking')} · #ORD-${order.id}</span>
      </div>

      <div class="detail-grid">
        <div>
          <div class="detail-block">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line-soft);padding-bottom:14px;margin-bottom:14px">
              <div>
                <h1 style="font-size:22px;margin:0">${order.order_title || t('ord.untitled')}</h1>
                <p style="font-size:12px;color:var(--text-dim);margin-top:4px">${t('cr.unit')} · ${orderUnitName(order)}${order.item_order ? ` &nbsp;·&nbsp; ${itemOrderLabel(order.item_order)}` : ''}</p>
              </div>
              <div style="display:flex;align-items:center;gap:8px">
                ${canEdit ? `<button class="btn btn-ghost" id="editBtn" style="padding:8px 12px">${t('ord.edit')}</button>` : ''}
                ${canDelete ? `<button class="btn btn-ghost" id="deleteBtn" style="padding:8px 12px;color:var(--danger);border-color:rgba(255,107,107,.3)">${t('ord.delete')}</button>` : ''}
                <span class="pill ${pillClass(order.status)}">${order.status}</span>
              </div>
            </div>
            <div class="detail-label">${t('det.descReq')}</div>
            <div class="detail-text">${order.order_description || t('det.noDetails')}</div>
          </div>

          <div class="detail-block">
            <h3>${t('det.statusTracking')}</h3>
            ${history.length ? history.map(h => `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div>
                  <div class="timeline-main">${h.status}</div>
                  <div class="timeline-time">${new Date(h.created_at).toLocaleString()}</div>
                </div>
              </div>`).join('') : `<div class="empty">${t('det.noStatus')}</div>`}
          </div>

          <div class="detail-block">
            <h3>${t('det.reports')}</h3>
            ${workReports.length ? workReports.map((r, idx) => `
              <div class="report-item">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <span style="font:600 13px var(--sans);color:var(--text)">[Laporan #${workReports.length - idx}] ${escapeHtml(r.report_title)}</span>
                  <span style="font-size:11px;color:var(--text-faint)">${reportDateLabel(r)}</span>
                </div>
                <div style="font-size:12.5px;color:var(--text-dim);white-space:pre-line">${escapeHtml(r.notes || t('rep.noNotes'))}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
                  <button class="btn btn-ghost" data-report-detail="${r.id}" style="padding:7px 10px">${t('rep.viewDetail')}</button>
                  <button class="btn btn-ghost" data-report-download="${r.id}" style="padding:7px 10px" ${r.work_report_attachments?.length ? '' : 'disabled'}>${t('rep.downloadAll')}</button>
                  ${canDeleteReport ? `<button class="btn btn-ghost" data-report-delete="${r.id}" style="padding:7px 10px;color:var(--danger);border-color:rgba(255,107,107,.3)">${t('rep.delete')}</button>` : ''}
                  <span class="row-sub">${tf('rep.fileCount', { count: r.work_report_attachments?.length || 0 })}</span>
                </div>
              </div>`).join('') : `<div class="empty">${t('det.noReports')}</div>`}
          </div>
        </div>

        <div>
          <div class="detail-block">
            <h3>${t('det.assignments')}</h3>
            ${visibleAssignments.length ? `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">${visibleAssignments.map(a => `
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-3);border:1px solid var(--line-soft);border-radius:var(--radius-sm);padding:9px 12px">
                <div><div style="font:600 12.5px var(--sans);color:var(--text)">${a.users?.full_name || '—'}</div><div style="font-size:10.5px;color:var(--text-faint);text-transform:uppercase">${a.assignment_type || a.users?.role || ''}</div></div>
                ${canAssign ? `<div style="display:flex;align-items:center;gap:8px">
                  <button class="btn btn-ghost" data-resend-assignment="${assignmentUserId(a)}" style="padding:6px 9px;font-size:11px">${t('det.resendWa')}</button>
                  <button data-unassign-user="${assignmentUserId(a)}" data-unassign="${a.id}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px">&times;</button>
                </div>` : ''}
              </div>`).join('')}</div>` : `<div class="empty" style="padding:10px 0">${t('det.noOperators')}</div>`}
            ${canAssign ? `
              <div style="display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--line-soft);padding-top:12px">
                <select id="assignUserSelect" class="select"><option value="">${assignableUsers.length ? t('det.selectUser') : 'All assignable users are already assigned'}</option>${assignableUsers.map(u => `<option value="${u.id}" data-role="${escapeHtml(u.role)}">${escapeHtml(u.full_name || u.email || 'Unnamed user')} (${escapeHtml(u.role)})</option>`).join('')}</select>
                <div style="font-size:11px;color:var(--text-faint)">Assignment WhatsApp is sent to the selected user's phone in User Management, not the order contact number.</div>
                <button id="assignBtn" class="btn btn-primary" style="width:100%;justify-content:center" ${assignableUsers.length ? '' : 'disabled'}>${t('det.assignUser')}</button>
              </div>` : ''}
          </div>

          ${canUpdateStatus ? `
            <div class="detail-block">
              <h3>${t('det.pipeline')}</h3>
              <select id="statusSelect" class="select" style="margin-bottom:10px">
                <option value="${order.status}">${order.status}</option>
                ${statusTargets.map(s => `<option value="${s}">${s}</option>`).join('')}
              </select>
              <button id="updateStatusBtn" class="btn btn-ghost" style="width:100%;justify-content:center">${t('det.updateStatus')}</button>
            </div>` : ''}

          ${canAddReport ? `
            <div class="detail-block">
              <h3>${t('det.submitReport')}</h3>
              <input id="repTitle" class="input" placeholder="${t('det.reportTitle')}" style="margin-bottom:8px"/>
              <input id="repDate" class="input" type="date" aria-label="${t('det.reportDate')}" value="${todayValue()}" style="margin-bottom:8px"/>
              <textarea id="repNotes" class="textarea" rows="4" placeholder="${t('det.reportNotes')}" style="margin-bottom:8px"></textarea>
              <div class="file-picker">
                <label class="file-picker-label" for="repFiles">${t('det.chooseFiles')}</label>
                <input id="repFiles" type="file" multiple/>
                <span class="file-picker-name" id="repFilesName">${t('det.noFileChosen')}</span>
              </div>
              <div class="row-sub" style="margin-bottom:10px">${t('det.fileHelp')}</div>
              <button id="submitReportBtn" class="btn btn-primary" style="width:100%;justify-content:center">${t('det.sendReport')}</button>
            </div>` : ''}
        </div>
      </div>
    </div>
  `;

  container.querySelector('#backBtn').addEventListener('click', () => renderOrders(profile));
  container.querySelector('#editBtn')?.addEventListener('click', () => renderEditOrder(order.id, profile));
  container.querySelector('#deleteBtn')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: t('dlg.deleteOrderTitle'),
      message: tf('dlg.deleteOrderBody', { id: `#ORD-${order.id}` }),
      confirmText: t('common.delete'),
      tone: 'danger',
    });
    if (!confirmed) return;
    await supabase.from('orders').delete().eq('id', order.id);
    notify(`#ORD-${order.id} ${t('ord.deleted')}`, 'success');
    renderOrders(profile);
  });
  container.querySelectorAll('[data-report-detail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const report = workReports.find(r => `${r.id}` === btn.dataset.reportDetail);
      if (report) showReportDetail({ ...report, orders: order });
    });
  });
  container.querySelectorAll('[data-report-download]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const report = workReports.find(r => `${r.id}` === btn.dataset.reportDownload);
      if (!report) return;
      try {
        await downloadAttachments(report.work_report_attachments || [], { zipName: `work-report-${report.id}-attachments` });
      } catch (err) {
        notify(err.message, 'error');
      }
    });
  });
  container.querySelectorAll('[data-report-delete]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const report = workReports.find(r => `${r.id}` === btn.dataset.reportDelete);
      if (!report) return;
      const confirmed = await confirmDialog({
        title: t('dlg.deleteReportTitle'),
        message: tf('dlg.deleteReportBody', { title: report.report_title || `#${report.id}` }),
        confirmText: t('common.delete'),
        tone: 'danger',
      });
      if (!confirmed) return;
      try {
        await deleteAttachmentFiles(report.work_report_attachments || []);
      } catch (err) {
        notify(`Storage cleanup failed; deleting database row anyway: ${err.message}`, 'warning');
      }
      const { error: deleteErr } = await supabase.from('work_reports').delete().eq('id', report.id);
      if (deleteErr) { notify(deleteErr.message, 'error'); return; }
      notify('Work report deleted.', 'success');
      renderOrderDetails(order.id, profile);
    });
  });

  if (canAssign) {
    container.querySelector('#assignBtn').addEventListener('click', async () => {
      const sel = container.querySelector('#assignUserSelect');
      const userId = sel.value;
      if (!userId) { notify('Select a user first.', 'warning'); return; }
      if (isAssignedToOrder(order, userId)) {
        notify('This user is already assigned to this order.', 'warning');
        return;
      }
      const assignRole = sel.options[sel.selectedIndex].dataset.role;
      const { data: existingAssignment, error: existingErr } = await supabase
        .from('order_assignments')
        .select('id')
        .eq('order_id', order.id)
        .eq('user_id', userId)
        .limit(1);
      if (existingErr) { notify(existingErr.message, 'error'); return; }
      if (existingAssignment?.length) {
        notify('This user is already assigned to this order.', 'warning');
        renderOrderDetails(order.id, profile);
        return;
      }
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
      else if (res.waSent) notify(`User assigned and WhatsApp sent to ${res.waTarget || res.phone || 'the selected user'}.`, 'success');
      else notify(`User assigned, but WhatsApp notification could not be sent${res.waError ? `: ${res.waError}` : '.'}`, 'warning');
      renderOrderDetails(order.id, profile);
    });
    container.querySelectorAll('[data-resend-assignment]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.resendAssignment;
        const assignment = visibleAssignments.find(a => assignmentUserId(a) === userId);
        const assignee = assignment?.users || (allUsers || []).find(u => u.id === userId);
        if (!assignee?.id) {
          notify('Assigned user could not be found.', 'error');
          return;
        }
        btn.disabled = true;
        const original = btn.textContent;
        btn.textContent = 'Sending...';
        const res = await notifyAssignment({
          order,
          assignee,
          assignmentType: assignment?.assignment_type || assignee.role,
        });
        btn.disabled = false;
        btn.textContent = original;
        if (res.skipped) notify('This role does not receive assignment WhatsApp notifications.', 'warning');
        else if (res.waSent) notify(`WhatsApp resent to ${res.waTarget || res.phone || assignee.full_name || 'the assigned user'}.`, 'success');
        else notify(`WhatsApp could not be sent${res.waError ? `: ${res.waError}` : '.'}`, 'warning');
      });
    });
    container.querySelectorAll('[data-unassign]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const userId = btn.dataset.unassignUser;
        if (userId) {
          await supabase.from('order_assignments').delete().eq('order_id', order.id).eq('user_id', userId);
        } else {
          await supabase.from('order_assignments').delete().eq('id', btn.dataset.unassign);
        }
        renderOrderDetails(order.id, profile);
      });
    });
  }

  if (canUpdateStatus) {
    container.querySelector('#updateStatusBtn').addEventListener('click', async () => {
      const newStatus = container.querySelector('#statusSelect').value;
      if (newStatus === order.status) {
        notify('Choose the next status first.', 'warning');
        return;
      }
      if (!statusTargets.includes(newStatus)) {
        notify('You are not allowed to move this order to that status.', 'warning');
        return;
      }
      if (newStatus === 'Closed') {
        const confirmed = await confirmDialog({
          title: t('dlg.closeOrderTitle'),
          message: t('dlg.closeOrderBody'),
          confirmText: t('dlg.closeOrderConfirm'),
          tone: 'danger',
        });
        if (!confirmed) return;
      }
      if (order.status === 'Closed' && newStatus !== 'Closed') {
        const confirmed = await confirmDialog({
          title: t('dlg.reopenOrderTitle'),
          message: tf('dlg.reopenOrderBody', { status: newStatus }),
          confirmText: t('dlg.reopenOrderConfirm'),
        });
        if (!confirmed) return;
      }
      const { error: e } = await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      if (e) { notify(e.message, 'error'); return; }
      await recordStatusHistory(order.id, newStatus);
      notify(`${t('det.statusUpdated')} ${newStatus}.`, 'success');
      const statusBody = waStatusChanged({
        orderId: order.id,
        service: order.order_title,
        unit: order.business_units?.name,
        status: newStatus,
        link: orderLink(order),
      });
      const res = await createNotification({ recipientId: order.created_by, recipientPhone: order.contact_number, orderId: order.id, type: 'status_changed', title: `${waTitle('status')} — ${newStatus}`, body: statusBody });
      if (!res.logged) {
        notify(res.reason === 'no-recipient'
          ? t('det.noCustomer')
          : 'Status saved, but the notification could not be logged. Check the console.', 'warning');
      }
      renderOrderDetails(order.id, profile);
    });
  }

  if (canAddReport) {
    const fileInput = container.querySelector('#repFiles');
    const fileName = container.querySelector('#repFilesName');
    fileInput?.addEventListener('change', () => {
      const files = Array.from(fileInput.files || []);
      if (!fileName) return;
      fileName.textContent = files.length
        ? (files.length === 1 ? files[0].name : tf('det.filesSelected', { count: files.length }))
        : t('det.noFileChosen');
    });

    container.querySelector('#submitReportBtn').addEventListener('click', async () => {
      if (!isAssignedToOrder(order, profile?.id) || !['In Progress', 'Review'].includes(order.status)) {
        notify('Only the assigned Team Solution can submit reports while the order is In Progress or Review.', 'warning');
        return;
      }
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
        btn.textContent = t('det.sendReport');
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
      if (reportNotify.sent) {
        notify(`Work report submitted and WhatsApp sent to ${reportNotify.sent} HCAM user${reportNotify.sent > 1 ? 's' : ''}${reportNotify.waTarget ? ` (${reportNotify.waTarget})` : ''}.`, 'success');
      } else {
        notify(`Report saved, but WhatsApp could not be sent${reportNotify.waError ? `: ${reportNotify.waError}` : '.'}`, 'warning');
      }
      renderOrderDetails(order.id, profile);
      return;
    });
  }
}
