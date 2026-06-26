import { supabase } from '../supabase.js';
import { renderOrders, renderEditOrder } from './order.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';

function showToast(message, type = 'success') {
  let toastContainer = document.querySelector('#toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }
  const toast = document.createElement('div');
  const bgColor = type === 'error' ? 'bg-red-600' : type === 'warning' ? 'bg-amber-500' : 'bg-emerald-600';
  toast.className = `${bgColor} text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 transform translate-y-4 opacity-0 transition-all duration-300 pointer-events-auto max-w-sm`;
  toast.innerHTML = `<span>${type === 'error' ? '🚨' : type === 'warning' ? '⚠️' : '✅'}</span><div class="flex-1">${message}</div>`;
  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

export async function renderOrderDetails(orderId, profile) {
  const container = document.querySelector('#main-content');
  if (!container) return;

  const userRole = profile?.role?.toLowerCase() || 'customer';

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      business_units (id, name),
      reports (id, report_title, report_description, created_at),
      attachments (id, file_name, file_path),
      order_assignments (
        id,
        user_id,
        assignment_type,
        users (id, full_name, role)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    showToast(`Error loading order details: ${error.message}`, 'error');
    return;
  }

  const { data: allUsers } = await supabase.from('users').select('id, full_name, role');

  const canEdit = (userRole === 'admin' || userRole === 'hcam' || userRole === 'customer') && 
                  (order.status === 'Draft' || order.status === 'Submitted');
  const canDelete = (userRole === 'admin'); 
  const canAssign = (userRole === 'admin' || userRole === 'hcam');
  const canUpdateStatus = (userRole === 'admin' || userRole === 'hcam' || userRole === 'team solution');
  const canAddReport = (userRole === 'team solution') && 
                       (order.status === 'In Progress' || order.status === 'Review');

  const statusWorkflow = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed'];

  container.innerHTML = `
    <div class="max-w-5xl mx-auto text-left space-y-6">
      <div class="flex items-center justify-between">
        <button id="backToOrdersBtn" class="text-sm font-semibold text-blue-600 hover:text-blue-800 transition flex items-center gap-1">
          ← Back to Orders List
        </button>
        <span class="text-xs font-mono text-gray-400">UUID Tracking ID: #ORD-${order.id}</span>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div class="flex justify-between items-start border-b pb-4 mb-4">
              <div>
                <h1 class="text-2xl font-bold text-gray-900 !my-0">${order.order_title}</h1>
                <p class="text-xs text-gray-400 mt-1">Business Unit: ${order.business_units?.name ?? 'Unassigned'}</p>
              </div>
              <div class="flex items-center gap-2">
                ${canEdit ? `<button id="inlineEditBtn" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-semibold transition border border-gray-200 shadow-sm">✏️ Edit Order</button>` : ''}
                ${canDelete ? `<button id="inlineDeleteBtn" class="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded text-xs font-semibold transition border border-red-200 shadow-sm">🗑️ Delete</button>` : ''}
                <span class="px-3 py-1 text-xs font-bold rounded bg-blue-50 text-blue-700 uppercase border border-blue-200 tracking-wider">${order.status}</span>
              </div>
            </div>
            <div>
              <h4 class="text-xs font-bold uppercase text-gray-400 tracking-wider mb-2">Description / Requirement Parameters</h4>
              <p class="text-sm text-gray-700 whitespace-pre-line bg-gray-50 p-4 rounded border border-gray-100">${order.order_description || 'No system parameters provided.'}</p>
            </div>
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">📊 Work Reports History</h3>
            ${order.reports?.length ? `
              <div class="space-y-4">${order.reports.map((report, idx) => `
                <div class="p-4 border rounded-lg bg-gray-50 space-y-2">
                  <div class="flex justify-between items-center border-b pb-2"><h4 class="font-bold text-sm text-gray-800">[Laporan #${idx + 1}] - ${report.report_title}</h4><span class="text-[11px] text-gray-400">${new Date(report.created_at).toLocaleDateString()}</span></div>
                  <p class="text-xs text-gray-600 whitespace-pre-line">${report.report_description}</p>
                </div>`).join('')}
              </div>` : `<p class="text-sm text-gray-400 italic">No operational reports compiled yet.</p>`}
          </div>

          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">📎 Internal Attachments</h3>
            ${order.attachments?.length ? `<ul class="space-y-2 text-xs">${order.attachments.map(att => `<li class="flex items-center justify-between p-2 hover:bg-gray-50 rounded border border-transparent hover:border-gray-100"><span class="truncate max-w-[150px] text-gray-700 font-medium">${att.file_name}</span><a href="${att.file_path}" target="_blank" class="text-blue-600 font-semibold hover:underline">View File</a></li>`).join('')}</ul>` : `<p class="text-xs text-gray-400 italic">No asset files attached.</p>`}
          </div>
        </div>

        <div class="space-y-6">
          <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 class="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">👥 Team Assignments</h3>
            ${order.order_assignments?.length ? `
              <div class="space-y-2 mb-4">${order.order_assignments.map(asm => `
                <div class="flex items-center justify-between p-2 bg-gray-50 border rounded text-xs">
                  <div><p class="font-semibold text-gray-800">${asm.users?.full_name}</p><p class="text-[10px] text-gray-400 uppercase">${asm.assignment_type || asm.users?.role}</p></div>
                  ${canAssign ? `<button data-assign-id="${asm.id}" class="text-red-500 hover:text-red-700 font-bold">✕</button>` : ''}
                </div>`).join('')}
              </div>` : `<p class="text-xs text-gray-400 italic mb-4">No operators assigned.</p>`}
            ${canAssign ? `
              <div class="space-y-2 border-t pt-3">
                <select id="assignUserSelect" class="w-full border p-2 rounded bg-white text-xs"><option value="">Select User...</option>${allUsers?.map(u => `<option value="${u.id}" data-role="${u.role}">${u.full_name} (${u.role})</option>`).join('')}</select>
                <button id="submitAssignBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded transition shadow-sm">Assign User</button>
              </div>` : ''}
          </div>

          ${canUpdateStatus ? `
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 class="text-sm font-bold uppercase text-gray-400 tracking-wider mb-4">⚙️ Lifecycle Pipeline</h3>
              <select id="pipelineStatusSelect" class="w-full border p-2 rounded bg-white text-xs mb-2">${statusWorkflow.map(st => `<option value="${st}" ${order.status === st ? 'selected' : ''}>${st}</option>`).join('')}</select>
              <button id="updatePipelineBtn" class="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 rounded transition shadow-sm">Update Status</button>
            </div>` : ''}

          ${canAddReport ? `
            <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h3 class="text-sm font-bold uppercase text-slate-900 tracking-wider mb-4">➕ Submit Work Report</h3>
              <input id="repTitle" type="text" class="w-full border p-2 rounded bg-white text-xs mb-2" placeholder="Title" />
              <textarea id="repDesc" rows="3" class="w-full border p-2 rounded bg-white text-xs mb-2" placeholder="Description"></textarea>
              <button id="submitReportBtn" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 rounded transition shadow-sm">Kirim Laporan</button>
            </div>` : ''}
        </div>
      </div>
    </div>
  `;

  document.querySelector('#backToOrdersBtn').addEventListener('click', () => renderOrders(profile));
  if (canEdit && document.querySelector('#inlineEditBtn')) document.querySelector('#inlineEditBtn').addEventListener('click', () => renderEditOrder(order.id, profile));
  if (canDelete && document.querySelector('#inlineDeleteBtn')) {
    document.querySelector('#inlineDeleteBtn').addEventListener('click', async () => {
      await supabase.from('orders').delete().eq('id', order.id);
      renderOrders(profile);
    });
  }

  if (canAssign) {
    document.querySelector('#submitAssignBtn').addEventListener('click', async () => {
      const select = document.querySelector('#assignUserSelect');
      const userId = select.value;
      const role = select.options[select.selectedIndex].dataset.role;
      if (!userId) { showToast('Select user', 'warning'); return; }
      await supabase.from('order_assignments').insert({ order_id: order.id, user_id: userId, assignment_type: role });
      renderOrderDetails(order.id, profile);
    });
    document.querySelectorAll('[data-assign-id]').forEach(btn => {
      btn.addEventListener('click', async () => {
        await supabase.from('order_assignments').delete().eq('id', btn.dataset.assignId);
        renderOrderDetails(order.id, profile);
      });
    });
  }

  if (canUpdateStatus) {
    document.querySelector('#updatePipelineBtn').addEventListener('click', async () => {
      const newStatus = document.querySelector('#pipelineStatusSelect').value;
      await supabase.from('orders').update({ status: newStatus }).eq('id', order.id);
      showToast(`Status updated to ${newStatus}`);
      await sendWhatsAppMessage(order.contact_number, `🚨 [System Update]\nOrder: *${order.order_title}* (#ORD-${order.id})\nStatus has been updated to *${newStatus}*.\n\n> Sent via fonnte.com`);
      renderOrderDetails(order.id, profile);
    });
  }

  if (canAddReport && document.querySelector('#submitReportBtn')) {
    document.querySelector('#submitReportBtn').addEventListener('click', async () => {
      const title = document.querySelector('#repTitle').value.trim();
      const desc = document.querySelector('#repDesc').value.trim();
      if (!title || !desc) { showToast('Missing fields', 'warning'); return; }
      await supabase.from('reports').insert({ order_id: order.id, report_title: title, report_description: desc });
      await sendWhatsAppMessage(order.contact_number, `📊 [New Work Report]\nA new report has been submitted for Order: *${order.order_title}*.\n\n*Title:* ${title}\n*Summary:* ${desc}\n\n> Sent via fonnte.com`);
      renderOrderDetails(order.id, profile);
    });
  }
}