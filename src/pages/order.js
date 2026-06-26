import { supabase } from '../supabase.js';
import { renderOrderDetails } from './order-detail.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';

// Reusable Modern Toast Notification
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
  toast.innerHTML = `
    <span>${type === 'error' ? '🚨' : type === 'warning' ? '⚠️' : '✅'}</span>
    <div class="flex-1">${message}</div>
  `;

  toastContainer.appendChild(toast);
  setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- READ (List view) ---
export async function renderOrders(profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;

  const { data: orders, error } = await supabase
    .from('orders')
    .select(`*, business_units (name)`)
    .order('id', { ascending: false });

  if (error) {
    showToast(`Error: ${error.message}`, 'error');
    return;
  }

  container.innerHTML = `
    <div class="max-w-5xl mx-auto text-left">
      <div class="flex justify-between items-center mb-6">
        <div>
          <h1 class="text-3xl font-bold text-gray-900 !my-0">Orders</h1>
          <p class="text-xs text-gray-500 mt-1">Operational service request tracks</p>
        </div>
        <button id="createOrderBtn" class="bg-blue-600 text-white px-4 py-2 rounded font-medium text-sm hover:bg-blue-700 transition">
          Create Order
        </button>
      </div>

      <div class="space-y-3">
        ${orders.length ? orders.map(order => `
          <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200 hover:border-blue-400 transition cursor-pointer" data-id="${order.id}">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-bold text-base text-gray-900">#ORD-${order.id} - ${order.order_title}</h3>
              <span class="px-2.5 py-0.5 text-xs font-semibold rounded bg-blue-50 text-blue-700 uppercase border border-blue-200">${order.status}</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 mt-3 pt-3 border-t border-gray-100">
              <p><span class="font-medium text-gray-400">Contact:</span> ${order.contact_number ?? '-'}</p>
              <p><span class="font-medium text-gray-400">Business Unit:</span> ${order.business_units?.name ?? '-'}</p>
            </div>
          </div>
        `).join('') : '<p class="text-gray-400 text-sm italic">No Orders Found</p>'}
      </div>
    </div>
  `;

  document.querySelector('#createOrderBtn').addEventListener('click', () => renderCreateOrderForm(profile));
  document.querySelectorAll('[data-id]').forEach(card => {
    card.addEventListener('click', () => renderOrderDetails(card.dataset.id, profile));
  });
}

// --- CREATE ---
async function renderCreateOrderForm(profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;

  const { data: businessUnits } = await supabase.from('business_units').select('*').order('id');

  container.innerHTML = `
    <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow border border-gray-200 text-left">
      <h1 class="text-2xl font-bold text-gray-900 mb-6 !my-0">Create Order</h1>
      <div class="space-y-4 mt-6">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Order Title</label>
          <input id="orderTitle" type="text" class="border p-3 rounded w-full text-sm bg-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Number</label>
          <input id="contactNumber" type="text" class="border p-3 rounded w-full text-sm bg-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
          <textarea id="orderDescription" rows="4" class="border p-3 rounded w-full text-sm bg-white"></textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Business Unit</label>
          <select id="businessUnit" class="border p-3 rounded w-full text-sm bg-white">
            ${businessUnits.map(unit => `<option value="${unit.id}">${unit.name}</option>`).join('')}
          </select>
        </div>
        <div class="flex gap-2 pt-4">
          <button id="saveOrderBtn" class="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition">Save Order</button>
          <button id="cancelBtn" class="bg-gray-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-600 transition">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.querySelector('#cancelBtn').addEventListener('click', () => renderOrders(profile));
  document.querySelector('#saveOrderBtn').addEventListener('click', async () => {
    const payload = {
      business_unit_id: Number(document.querySelector('#businessUnit').value),
      contact_number: document.querySelector('#contactNumber').value,
      order_title: document.querySelector('#orderTitle').value,
      order_description: document.querySelector('#orderDescription').value,
      status: 'Draft',
      created_by: (await supabase.auth.getUser()).data.user?.id
    };

    const { error } = await supabase.from('orders').insert(payload);
    if (error) {
      showToast(error.message, 'error');
      return;
    }
    showToast('Order created successfully');
    renderOrders(profile);
  });
}

// --- UPDATE & EDIT VIEW ---
export async function renderEditOrder(orderId, profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;

  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (error) {
    showToast(error.message, 'error');
    return;
  }

  container.innerHTML = `
    <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow border border-gray-200 text-left">
      <h1 class="text-2xl font-bold text-gray-900 mb-6 !my-0">Edit Order #ORD-${order.id}</h1>
      <div class="space-y-4 mt-6">
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Order Title</label>
          <input id="orderTitle" value="${order.order_title ?? ''}" class="border p-3 rounded w-full text-sm bg-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Number</label>
          <input id="contactNumber" value="${order.contact_number ?? ''}" class="border p-3 rounded w-full text-sm bg-white" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
          <textarea id="orderDescription" rows="4" class="border p-3 rounded w-full text-sm bg-white">${order.order_description ?? ''}</textarea>
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-500 uppercase mb-1">Pipeline Status</label>
          <select id="orderStatus" class="border p-3 rounded w-full text-sm bg-white">
            <option value="Draft" ${order.status === 'Draft' ? 'selected' : ''}>Draft</option>
            <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
            <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
          </select>
        </div>
        <div class="flex gap-2 pt-4">
          <button id="saveEditBtn" class="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition">Save Changes</button>
          <button id="cancelEditBtn" class="bg-gray-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-gray-600 transition">Cancel</button>
        </div>
      </div>
    </div>
  `;

  document.querySelector('#cancelEditBtn').addEventListener('click', () => renderOrderDetails(orderId, profile));
  
  document.querySelector('#saveEditBtn').addEventListener('click', async () => {
    const updatedData = {
      order_title: document.querySelector('#orderTitle').value,
      contact_number: document.querySelector('#contactNumber').value,
      order_description: document.querySelector('#orderDescription').value,
      status: document.querySelector('#orderStatus').value
    };

    const { error: updateErr } = await supabase
      .from('orders')
      .update(updatedData)
      .eq('id', orderId);

    if (updateErr) {
      showToast(updateErr.message, 'error');
      return;
    }

    try {
      await sendWhatsAppMessage(
        updatedData.contact_number, 
        `🚨 [System Update]\nOrder: ${updatedData.order_title} (#ORD-${orderId})\nStatus has been updated to ${updatedData.status}.`
      );
      showToast('Order updated & notification sent');
    } catch (err) {
      console.error('WhatsApp failed:', err);
      showToast('Order updated, but notification failed', 'warning');
    }

    renderOrderDetails(orderId, profile);
  });
}