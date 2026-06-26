import { supabase } from '../supabase.js';
import { renderOrders, renderEditOrder } from './order.js';
import { createNotification } from '../utils/notifications.js';
import { notify } from '../utils/notify.js';
import { normalizeRole } from '../main.js';

const STATUSES = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed'];

function pillClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('closed')) return 'pill-green';
  if (s.includes('progress') || s.includes('assign') || s.includes('review')) return 'pill-amber';
  return 'pill-dim';
}

export async function renderOrderDetails(orderId, profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;
  const role = normalizeRole(profile?.role);

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *, business_units (id, name),
      reports (id, report_title, report_description, created_at),
      attachments (id, file_name, file_path),
      order_assignments ( id, user_id, assignment_type, users (id, full_name, role) )
    `)
    .eq('id', orderId)
    .single();

  if (error) { notify(`Error loading order: ${error.message}`, 'error'); return; }

  const { data: allUsers } = await supabase.from('users').select('id, full_name, role');

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
            ${order.reports?.length ? order.reports.map((r, idx) => `
              <div class="report-item">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                  <span style="font:600 13px var(--sans);color:var(--text)">[Laporan #${idx + 1}] ${r.report_title}</span>
                  <span style="font-size:11px;color:var(--text-faint)">${new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                <div style="font-size:12.5px;color:var(--text-dim);white-space:pre-line">${r.report_description}</div>
              </div>`).join('') : `<div class="empty">No reports compiled yet.</div>`}
          </div>

          <div class="detail-block">
            <h3>Attachments</h3>
            ${order.attachments?.length ? `<div style="display:flex;flex-direction:column;gap:8px">${order.attachments.map(a => `
              <div style="display:flex;align-items:center;justify-content:space-between;background:var(--bg-3);border:1px solid var(--line-soft);border-radius:var(--radius-sm);padding:9px 12px">
                <span style="font-size:12.5px;color:var(--text)">${a.file_name}</span>
                <a href="${a.file_path}" target="_blank" style="color:var(--green);font:600 12px var(--sans);text-decoration:none">Download</a>
              </div>`).join('')}</div>` : `<div class="empty">No files attached.</div>`}
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
              <textarea id="repDesc" class="textarea" rows="3" placeholder="Report description" style="margin-bottom:8px"></textarea>
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

  if (canAssign) {
    container.querySelector('#assignBtn').addEventListener('click', async () => {
      const sel = container.querySelector('#assignUserSelect');
      const userId = sel.value;
      if (!userId) { notify('Select a user first.', 'warning'); return; }
      const assignRole = sel.options[sel.selectedIndex].dataset.role;
      const { error: e } = await supabase.from('order_assignments').insert({ order_id: order.id, user_id: userId, assignment_type: assignRole });
      if (e) { notify(e.message, 'error'); return; }
      notify('User assigned to order.', 'success');
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
      notify(`Status updated to ${newStatus}.`, 'success');
      const body = `[HCSP-OM] Order #ORD-${order.id} – ${order.order_title}\nStatus is now: ${newStatus}\n${location.origin}`;
      const res = await createNotification({ recipientId: order.created_by, orderId: order.id, type: 'status_changed', title: `Order ${newStatus}`, body });
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
      const desc = container.querySelector('#repDesc').value.trim();
      if (!title || !desc) { notify('Title and description are required.', 'warning'); return; }
      const { error: e } = await supabase.from('reports').insert({ order_id: order.id, report_title: title, report_description: desc });
      if (e) { notify(e.message, 'error'); return; }
      notify('Work report submitted.', 'success');
      const hcamAssignees = (order.order_assignments || []).filter(a =>
        `${a.assignment_type || ''} ${a.users?.role || ''}`.toLowerCase().includes('hcam'));
      const body = `[HCSP-OM] Laporan Hasil Pengerjaan\nOrder #ORD-${order.id} – ${order.order_title}\nReport: ${title}\nBy: ${profile?.full_name || 'Team Solution'}\n${location.origin}`;
      if (hcamAssignees.length) {
        for (const a of hcamAssignees) {
          await createNotification({ recipientId: a.user_id, orderId: order.id, type: 'report_submitted', title: 'New work report', body });
        }
      } else {
        notify('No HCAM assigned to this order — report saved, no one notified.', 'warning');
      }
      renderOrderDetails(order.id, profile);
    });
  }
}
