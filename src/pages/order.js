import { supabase } from '../supabase.js';
import { renderOrderDetails } from './order-detail.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';
import { createNotification } from '../utils/notifications.js';
import { notify } from '../utils/notify.js';
import { can, normalizeRole } from '../main.js';
import { t } from '../utils/i18n.js';
import { buildBusinessUnitOptions } from '../utils/business-units.js';
import { subscribeOrders, debounce } from '../utils/realtime.js';

const STATUSES = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed'];

export const ITEM_ORDERS = [
  { code: 'PRO', name: 'Promosi' },
  { code: 'MUT', name: 'Mutasi' },
  { code: 'PGS', name: 'PGS (Pejabat Ganti Sementara)' },
  { code: 'DIK', name: 'Pendidikan / Pelatihan' },
  { code: 'FOR', name: 'Pengisian Formasi' },
  { code: 'INF', name: 'Permintaan Informasi' },
  { code: 'PKA', name: 'Pengembangan Karyawan' },
  { code: 'OTH', name: 'Others (di luar 7 item di atas)' },
];
function itemOrderOptions(selected = '') {
  return `<option value="">Select service…</option>` +
    ITEM_ORDERS.map(i => `<option value="${i.code}" ${i.code === selected ? 'selected' : ''}>${i.code} — ${i.name}</option>`).join('');
}
export function itemOrderLabel(code) {
  const m = ITEM_ORDERS.find(i => i.code === code);
  return m ? `${m.code} · ${m.name}` : (code || '');
}
export function orderUnitName(o) {
  return o?.business_units?.name || o?.business_unit_other || '—';
}

const SVG = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`,
  view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
};

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

async function fetchContactUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role, phone, unit_bisnis')
    .order('full_name', { ascending: true });

  if (error) {
    console.warn('[orders] unable to load user contacts:', error.message);
    return [];
  }

  return (data || []).filter(u => (u.phone || '').trim());
}

function contactOptions(users, selectedPhone = '') {
  const selected = (selectedPhone || '').trim();
  const hasSelected = users.some(u => (u.phone || '').trim() === selected);

  return `
    <option value="">Select contact from users...</option>
    ${users.map(u => {
      const phone = (u.phone || '').trim();
      const label = `${u.full_name || u.email || 'Unnamed user'} - ${phone}`;
      return `<option value="${escapeHtml(phone)}" ${phone === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('')}
    ${selected && !hasSelected ? `<option value="${escapeHtml(selected)}" selected>Current number - ${escapeHtml(selected)}</option>` : ''}
  `;
}

function canEditDetails(order, profile, role) {
  if (!['Draft', 'Submitted'].includes(order.status)) return false;
  if (['admin', 'hcam'].includes(role)) return true;
  return role === 'customer' && order.created_by === profile?.id;
}

async function notifyHcamOrderSubmitted(order, businessUnitName, creatorName) {
  const contacts = await fetchContactUsers();
  const allHcams = contacts.filter(u => normalizeRole(u.role) === 'hcam');
  const unitKey = (businessUnitName || '').trim().toLowerCase();
  const relatedHcams = unitKey
    ? allHcams.filter(u => (u.unit_bisnis || '').trim().toLowerCase() === unitKey)
    : [];
  const hcams = relatedHcams.length ? relatedHcams : allHcams;

  if (!hcams.length) {
    notify('Order submitted, but no HCAM user with a phone number was found.', 'warning');
    return;
  }

  const body = `[HCSP-OM] Order Baru Masuk\n\nOrder   : #ORD-${order.id}\nLayanan : ${order.order_title || '-'}\nCustomer: ${creatorName || '-'}\nUnit    : ${businessUnitName || '-'}\nStatus  : ${order.status}\n\nSilakan review order di:\n${location.origin}/orders/ORD-${order.id}`;

  let sent = 0;
  let lastError = '';
  for (const hcam of hcams) {
    const res = await createNotification({
      recipientId: hcam.id,
      recipientPhone: hcam.phone,
      orderId: order.id,
      type: 'order_submitted',
      title: 'Order baru masuk',
      body,
    });
    if (res.waSent) {
      sent++;
      continue;
    }
    if (res.waError) lastError = res.waError;
    try {
      await sendWhatsAppMessage(hcam.phone, body);
      sent++;
    } catch (err) {
      lastError = err.message || lastError;
      console.warn('[orders] WhatsApp send failed:', err.message, hcam.phone);
      // Keep notifying the remaining HCAM users.
    }
  }

  if (sent) notify(`Order submitted and WhatsApp sent to ${sent} HCAM user${sent > 1 ? 's' : ''}.`, 'success');
  else notify(`Order submitted, but WhatsApp could not be sent${lastError ? `: ${lastError}` : '. Check HCAM phone numbers and Fonnte settings.'}`, 'warning');
}

async function recordStatusHistory(orderId, status) {
  try {
    await supabase.from('order_status_history').insert({ order_id: orderId, status });
  } catch (_) {
    // Status history is best-effort here; order save should not be blocked.
  }
}

// view + filter state (persisted across re-renders)
let view = localStorage.getItem('orders-view') || 'grid';
const filters = { sort: 'newest', statuses: [], items: [], unit: '', dateFrom: '', dateTo: '' };

export async function renderOrders(profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;
  const role = normalizeRole(profile?.role);

  const { data, error } = await supabase
    .from('orders')
    .select(`*, business_units (name)`)
    .order('id', { ascending: false });

  if (error) { notify(error.message, 'error'); return; }
  let orders = data || [];

  // role-based visibility
  if (role === 'customer' && profile?.id) {
    orders = orders.filter(o => o.created_by === profile.id);
  } else if (role === 'team' && profile?.id) {
    // Team Solution only sees orders assigned to them (via order_assignments).
    const { data: asn } = await supabase.from('order_assignments').select('order_id').eq('user_id', profile.id);
    const assigned = new Set((asn || []).map(a => a.order_id));
    orders = orders.filter(o => assigned.has(o.id));
  }

  const units = [...new Set(orders.map(o => o.business_units?.name).filter(Boolean))];

  container.innerHTML = `
    <div class="view">
      <div class="toolbar">
        <div class="page-head" style="margin:0">
          <h1>${t('ord.title')}</h1>
          <p>${t('ord.sub')}</p>
        </div>
        <div class="toolbar-tools">
          <div class="seg" id="viewSeg">
            <button data-view="grid" class="${view === 'grid' ? 'active' : ''}" aria-label="Grid view">${SVG.grid}</button>
            <button data-view="list" class="${view === 'list' ? 'active' : ''}" aria-label="List view">${SVG.list}</button>
          </div>
          <button class="tool-btn" id="filterBtn">${SVG.filter}<span>${t('ord.filter')}</span></button>
          ${can('exportReport', role) ? `
          <div class="export-wrap">
            <button class="tool-btn" id="exportBtn">${SVG.download}<span>${t('ord.export')}</span></button>
            <div class="lang-menu" id="exportMenu" hidden>
              <button data-exp="excel">${t('ord.exportExcel')}</button>
              <button data-exp="pdf">${t('ord.exportPdf')}</button>
            </div>
          </div>` : ''}
          <div class="filter-pop" id="filterPop" hidden>
            <div class="filter-group">
              <h5>${t('ord.sort')}</h5>
              <div class="chip-row" data-group="sort">
                <button class="chip" data-val="az">${t('ord.az')}</button>
                <button class="chip" data-val="za">${t('ord.za')}</button>
                <button class="chip" data-val="newest">${t('ord.newest')}</button>
                <button class="chip" data-val="oldest">${t('ord.oldest')}</button>
              </div>
            </div>
            <div class="filter-group">
              <h5>${t('ord.lifecycle')}</h5>
              <div class="chip-row" data-group="status">
                ${STATUSES.map(s => `<button class="chip" data-val="${s}">${s}</button>`).join('')}
              </div>
            </div>
            <div class="filter-group">
              <h5>${t('ord.service')}</h5>
              <div class="chip-row" data-group="item">
                ${ITEM_ORDERS.map(i => `<button class="chip" data-val="${i.code}" title="${i.name}">${i.code}</button>`).join('')}
              </div>
            </div>
            <div class="filter-group">
              <h5>${t('ord.dateRange')}</h5>
              <div class="date-row">
                <input type="date" id="dateFrom" class="input date-input" value="${filters.dateFrom}" aria-label="From"/>
                <span class="date-sep">—</span>
                <input type="date" id="dateTo" class="input date-input" value="${filters.dateTo}" aria-label="To"/>
              </div>
            </div>
            ${units.length ? `
            <div class="filter-group">
              <h5>${t('ord.teamUnit')}</h5>
              <div class="chip-row" data-group="unit">
                ${units.map(u => `<button class="chip" data-val="${u}">${u}</button>`).join('')}
              </div>
            </div>` : ''}
            <button class="filter-clear" id="filterClear">${t('ord.clear')}</button>
          </div>
        </div>
      </div>

      <div id="ordersBody"></div>
    </div>

    ${can('createOrder', role) ? `<button class="fab" id="createFab">${SVG.plus}<span>${t('ord.createBtn')}</span></button>` : ''}
  `;

  const body = container.querySelector('#ordersBody');

  function applyFilters(list) {
    let out = [...list];
    if (filters.statuses.length) out = out.filter(o => filters.statuses.includes(o.status));
    if (filters.items.length) out = out.filter(o => filters.items.includes(o.item_order));
    if (filters.unit) out = out.filter(o => o.business_units?.name === filters.unit);
    if (filters.dateFrom) out = out.filter(o => o.created_at && o.created_at.slice(0, 10) >= filters.dateFrom);
    if (filters.dateTo) out = out.filter(o => o.created_at && o.created_at.slice(0, 10) <= filters.dateTo);
    const byTitle = (a, b) => (a.order_title || '').localeCompare(b.order_title || '');
    if (filters.sort === 'az') out.sort(byTitle);
    else if (filters.sort === 'za') out.sort((a, b) => byTitle(b, a));
    else if (filters.sort === 'oldest') out.sort((a, b) => a.id - b.id);
    else out.sort((a, b) => b.id - a.id);
    return out;
  }

  function draw() {
    const list = applyFilters(orders);
    if (!list.length) {
      body.innerHTML = `<div class="placeholder-card">${t('ord.noMatch')}${can('createOrder', role) ? t('ord.noMatchCta') : '.'}</div>`;
      return;
    }
    const menu = (o) => `
      <button class="card-menu-btn" data-menu="${o.id}" aria-label="Order actions">${SVG.dots}</button>
      <div class="card-menu" id="menu-${o.id}" hidden>
        <button data-act="view" data-id="${o.id}">${SVG.view} ${t('ord.view')}</button>
        ${canEditDetails(o, profile, role) ? `<button data-act="edit" data-id="${o.id}">${SVG.edit} ${t('ord.edit')}</button>` : ''}
        ${can('deleteOrder', role) ? `<button class="danger" data-act="delete" data-id="${o.id}">${SVG.trash} ${t('ord.delete')}</button>` : ''}
      </div>`;

    if (view === 'grid') {
      body.className = 'orders-grid';
      body.innerHTML = list.map((o, i) => `
        <div class="order-card" data-card="${o.id}" style="transition-delay:${i * 45}ms">
          <div class="oc-top">
            <h3>#ORD-${o.id} · ${o.order_title || t('ord.untitled')}</h3>
          </div>
          ${menu(o)}
          <div class="oc-sub"><span class="pill ${pillClass(o.status)}">${o.status || 'Draft'}</span>${o.item_order ? ` <span class="pill pill-dim">${o.item_order}</span>` : ''}</div>
          <div class="oc-meta">
            <span><b>${t('ord.unit')}:</b> ${orderUnitName(o)}</span>
            <span><b>${t('ord.contact')}:</b> ${o.contact_number || '—'}</span>
          </div>
        </div>`).join('');
    } else {
      body.className = 'orders-list';
      body.innerHTML = list.map((o, i) => `
        <div class="order-card" data-card="${o.id}" style="transition-delay:${i * 40}ms">
          <div class="oc-row">
            <div class="left">
              <h3>#ORD-${o.id} · ${o.order_title || t('ord.untitled')}</h3>
              <div class="oc-meta"><span><b>${t('ord.unit')}:</b> ${orderUnitName(o)}</span><span><b>${t('ord.contact')}:</b> ${o.contact_number || '—'}</span></div>
            </div>
            <span class="pill ${pillClass(o.status)}" style="margin-right:34px">${o.status || 'Draft'}</span>
          </div>
          ${menu(o)}
        </div>`).join('');
    }

    // staggered fade-in (top → bottom)
    requestAnimationFrame(() => body.querySelectorAll('.order-card').forEach(c => c.classList.add('in')));

    // card click → detail (ignore clicks on menu)
    body.querySelectorAll('[data-card]').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.card-menu-btn') || e.target.closest('.card-menu')) return;
        renderOrderDetails(card.dataset.card, profile);
      });
    });
    // 3-dot menus
    body.querySelectorAll('[data-menu]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const menuEl = body.querySelector(`#menu-${btn.dataset.menu}`);
        const wasOpen = !menuEl.hasAttribute('hidden');
        body.querySelectorAll('.card-menu').forEach(m => m.setAttribute('hidden', ''));
        if (!wasOpen) menuEl.removeAttribute('hidden');
      });
    });
    body.querySelectorAll('.card-menu [data-act]').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = item.dataset.id;
        if (item.dataset.act === 'view') renderOrderDetails(id, profile);
        else if (item.dataset.act === 'edit') renderEditOrder(id, profile);
        else if (item.dataset.act === 'delete') deleteOrder(id, profile);
      });
    });
  }

  draw();

  // view toggle
  container.querySelectorAll('#viewSeg button').forEach(b => {
    b.addEventListener('click', () => {
      view = b.dataset.view;
      localStorage.setItem('orders-view', view);
      container.querySelectorAll('#viewSeg button').forEach(x => x.classList.toggle('active', x === b));
      draw();
    });
  });

  // filter popover
  const filterBtn = container.querySelector('#filterBtn');
  const filterPop = container.querySelector('#filterPop');
  filterBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    filterPop.toggleAttribute('hidden');
    filterBtn.classList.toggle('active', !filterPop.hasAttribute('hidden'));
  });
  document.addEventListener('click', (e) => {
    if (!filterPop.hasAttribute('hidden') && !filterPop.contains(e.target) && e.target !== filterBtn && !filterBtn.contains(e.target)) {
      filterPop.setAttribute('hidden', '');
      filterBtn.classList.remove('active');
    }
    if (!e.target.closest('[data-menu]') && !e.target.closest('.card-menu')) {
      container.querySelectorAll('.card-menu').forEach(m => m.setAttribute('hidden', ''));
    }
  });
  // reflect current sort selection
  filterPop.querySelector(`[data-group="sort"] [data-val="${filters.sort}"]`)?.classList.add('active');
  filters.statuses.forEach(s => filterPop.querySelector(`[data-group="status"] [data-val="${s}"]`)?.classList.add('active'));
  filters.items.forEach(s => filterPop.querySelector(`[data-group="item"] [data-val="${s}"]`)?.classList.add('active'));
  filterPop.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const group = chip.closest('.chip-row').dataset.group;
      if (group === 'sort') {
        filters.sort = chip.dataset.val;
        filterPop.querySelectorAll('[data-group="sort"] .chip').forEach(c => c.classList.toggle('active', c === chip));
      } else if (group === 'status') {
        chip.classList.toggle('active');
        const v = chip.dataset.val;
        if (filters.statuses.includes(v)) filters.statuses = filters.statuses.filter(x => x !== v);
        else filters.statuses.push(v);
      } else if (group === 'item') {
        chip.classList.toggle('active');
        const v = chip.dataset.val;
        if (filters.items.includes(v)) filters.items = filters.items.filter(x => x !== v);
        else filters.items.push(v);
      } else if (group === 'unit') {
        const v = chip.dataset.val;
        filters.unit = filters.unit === v ? '' : v;
        filterPop.querySelectorAll('[data-group="unit"] .chip').forEach(c => c.classList.toggle('active', c.dataset.val === filters.unit));
      }
      draw();
    });
  });
  // date range inputs
  const dateFromEl = container.querySelector('#dateFrom');
  const dateToEl = container.querySelector('#dateTo');
  dateFromEl?.addEventListener('change', () => { filters.dateFrom = dateFromEl.value; draw(); });
  dateToEl?.addEventListener('change', () => { filters.dateTo = dateToEl.value; draw(); });

  container.querySelector('#filterClear').addEventListener('click', () => {
    filters.sort = 'newest'; filters.statuses = []; filters.items = []; filters.unit = '';
    filters.dateFrom = ''; filters.dateTo = '';
    filterPop.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    if (dateFromEl) dateFromEl.value = '';
    if (dateToEl) dateToEl.value = '';
    filterPop.querySelector('[data-group="sort"] [data-val="newest"]')?.classList.add('active');
    draw();
  });

  // Export (PDF / Excel) — exports the currently filtered list
  const exportBtn = container.querySelector('#exportBtn');
  if (exportBtn) {
    const exportMenu = container.querySelector('#exportMenu');
    exportBtn.addEventListener('click', (e) => { e.stopPropagation(); exportMenu.toggleAttribute('hidden'); });
    document.addEventListener('click', (e) => {
      if (!exportMenu.hasAttribute('hidden') && !exportMenu.contains(e.target) && !exportBtn.contains(e.target)) exportMenu.setAttribute('hidden', '');
    });
    exportMenu.querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', async () => {
      exportMenu.setAttribute('hidden', '');
      const rows = applyFilters(orders);
      if (!rows.length) { notify('No orders to export.', 'warning'); return; }
      try {
        const exp = await import('../utils/export-orders.js'); // lazy-load heavy libs
        if (b.dataset.exp === 'excel') await exp.exportOrdersExcel(rows);
        else exp.exportOrdersPdf(rows);
        notify(`Exported ${rows.length} order(s).`, 'success');
      } catch (err) {
        notify(`Export failed: ${err.message}`, 'error');
      }
    }));
  }

  // FAB
  container.querySelector('#createFab')?.addEventListener('click', () => renderCreateOrderForm(profile));

  // Live updates — re-render when orders change elsewhere (skip while the filter popover is open)
  subscribeOrders(debounce(() => {
    const stillHere = document.querySelector('#ordersBody');
    const filtering = !document.querySelector('#filterPop')?.hasAttribute('hidden');
    if (stillHere && !filtering) renderOrders(profile);
  }, 600));
}

async function deleteOrder(orderId, profile) {
  if (!confirm(`${t('ord.deleteConfirm')} #ORD-${orderId}?`)) return;
  const { error } = await supabase.from('orders').delete().eq('id', orderId);
  if (error) { notify(error.message, 'error'); return; }
  notify(`#ORD-${orderId} ${t('ord.deleted')}`, 'success');
  renderOrders(profile);
}

// --- CREATE ---
async function renderCreateOrderForm(profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;
  const [{ data: rawBusinessUnits }, contactUsers] = await Promise.all([
    supabase.from('business_units').select('*').order('id'),
    fetchContactUsers(),
  ]);
  const businessUnits = buildBusinessUnitOptions(rawBusinessUnits || []);

  container.innerHTML = `
    <div class="view">
      <button class="link-back" id="cancelBtn">&larr; ${t('cr.back')}</button>
      <div class="page-head"><h1>${t('cr.title')}</h1><p>${t('cr.sub')}</p></div>
      <div class="form-card">
        <div class="form-grid">
          <div class="field"><label>${t('cr.orderTitle')}</label><input id="orderTitle" class="input" placeholder="e.g. Pengisian Formasi - Unit ABC"/></div>
          <div class="field"><label>${t('cr.itemOrder')}</label>
            <select id="itemOrder" class="select">${itemOrderOptions()}</select>
          </div>
          <div class="field"><label>Contact person</label>
            <select id="contactUser" class="select">${contactOptions(contactUsers)}</select>
          </div>
          <div class="field"><label>${t('cr.contact')}</label><input id="contactNumber" class="input" placeholder="08xxxxxxxxxx"/></div>
          <div class="field"><label>${t('cr.desc')}</label><textarea id="orderDescription" class="textarea" rows="4"></textarea></div>
          <div class="field"><label>${t('cr.unit')}</label>
            <select id="businessUnit" class="select">
              ${businessUnits.map(u => `<option value="${u.id}" ${u.configured ? '' : 'disabled'}>${u.name}${u.configured ? '' : ' - run SQL seed'}</option>`).join('')}
              <option value="__other__">${t('cr.unitOther')}</option>
            </select>
            <input id="businessUnitOther" class="input" style="margin-top:8px;display:none" placeholder="${t('cr.unitOtherPh')}"/>
          </div>
          <div class="form-actions">
            <button id="saveDraftBtn" class="btn btn-ghost">Save draft</button>
            <button id="submitOrderBtn" class="btn btn-primary">Submit order</button>
            <button id="cancelBtn2" class="btn btn-ghost">${t('common.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const back = () => renderOrders(profile);
  container.querySelector('#cancelBtn').addEventListener('click', back);
  container.querySelector('#cancelBtn2').addEventListener('click', back);
  container.querySelector('#contactUser').addEventListener('change', () => {
    container.querySelector('#contactNumber').value = container.querySelector('#contactUser').value;
  });

  const buSel = container.querySelector('#businessUnit');
  const buOther = container.querySelector('#businessUnitOther');
  const toggleBuOther = () => { buOther.style.display = buSel.value === '__other__' ? 'block' : 'none'; };
  buSel.addEventListener('change', toggleBuOther);
  toggleBuOther();

  async function saveOrder(status) {
    const isOther = buSel.value === '__other__';
    const otherName = buOther.value.trim();
    const businessUnitId = isOther ? null : (Number(buSel.value) || null);
    const businessUnitName = isOther ? otherName : (businessUnits.find(u => u.id === businessUnitId)?.name || '');
    const payload = {
      business_unit_id: businessUnitId,
      business_unit_other: isOther ? (otherName || null) : null,
      item_order: container.querySelector('#itemOrder').value || null,
      contact_number: container.querySelector('#contactNumber').value.trim(),
      order_title: container.querySelector('#orderTitle').value.trim(),
      order_description: container.querySelector('#orderDescription').value,
      status,
      created_by: (await supabase.auth.getUser()).data.user?.id,
    };
    if (!payload.order_title) { notify(t('cr.titleReq'), 'warning'); return; }
    if (!payload.item_order) { notify('Select a service / item order.', 'warning'); return; }
    if (!payload.contact_number) { notify('Select a contact person with a phone number.', 'warning'); return; }
    if (isOther && !otherName) { notify('Type the other business unit name.', 'warning'); return; }
    if (!isOther && !payload.business_unit_id) { notify('Select a valid business unit.', 'warning'); return; }

    const { data: order, error } = await supabase.from('orders').insert(payload).select('*').single();
    if (error) { notify(error.message, 'error'); return; }
    await recordStatusHistory(order.id, status);
    if (status === 'Submitted') {
      await notifyHcamOrderSubmitted(order, businessUnitName, profile?.full_name || profile?.email);
    } else {
      notify('Draft order saved successfully.', 'success');
    }
    renderOrders(profile);
  }

  container.querySelector('#saveDraftBtn').addEventListener('click', () => saveOrder('Draft'));
  container.querySelector('#submitOrderBtn').addEventListener('click', () => saveOrder('Submitted'));
}

// --- EDIT ---
export async function renderEditOrder(orderId, profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;
  const [{ data: order, error }, contactUsers] = await Promise.all([
    supabase.from('orders').select('*').eq('id', orderId).single(),
    fetchContactUsers(),
  ]);
  if (error) { notify(error.message, 'error'); return; }
  const role = normalizeRole(profile?.role);
  if (!canEditDetails(order, profile, role)) {
    notify('Order details can only be edited while Draft or Submitted.', 'warning');
    renderOrderDetails(orderId, profile);
    return;
  }

  container.innerHTML = `
    <div class="view">
      <button class="link-back" id="cancelEditBtn">&larr; ${t('common.back')}</button>
      <div class="page-head"><h1>${t('ed.title')} #ORD-${order.id}</h1><p>${t('ed.sub')}</p></div>
      <div class="form-card">
        <div class="form-grid">
          <div class="field"><label>${t('cr.orderTitle')}</label><input id="orderTitle" class="input" value="${(order.order_title || '').replace(/"/g, '&quot;')}"/></div>
          <div class="field"><label>${t('cr.itemOrder')}</label>
            <select id="itemOrder" class="select">${itemOrderOptions(order.item_order || '')}</select>
          </div>
          <div class="field"><label>Contact person</label>
            <select id="contactUser" class="select">${contactOptions(contactUsers, order.contact_number)}</select>
          </div>
          <div class="field"><label>${t('cr.contact')}</label><input id="contactNumber" class="input" value="${escapeHtml(order.contact_number || '')}"/></div>
          <div class="field"><label>${t('cr.desc')}</label><textarea id="orderDescription" class="textarea" rows="4">${order.order_description || ''}</textarea></div>
          <div class="form-actions">
            <button id="saveEditBtn" class="btn btn-primary">${t('ed.save')}</button>
            <button id="cancelEditBtn2" class="btn btn-ghost">${t('common.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const back = () => renderOrderDetails(orderId, profile);
  container.querySelector('#cancelEditBtn').addEventListener('click', back);
  container.querySelector('#cancelEditBtn2').addEventListener('click', back);
  container.querySelector('#contactUser').addEventListener('change', () => {
    container.querySelector('#contactNumber').value = container.querySelector('#contactUser').value;
  });
  container.querySelector('#saveEditBtn').addEventListener('click', async () => {
    const updated = {
      order_title: container.querySelector('#orderTitle').value,
      item_order: container.querySelector('#itemOrder').value || null,
      contact_number: container.querySelector('#contactNumber').value.trim(),
      order_description: container.querySelector('#orderDescription').value,
    };
    const { error: updateErr } = await supabase.from('orders').update(updated).eq('id', orderId);
    if (updateErr) { notify(updateErr.message, 'error'); return; }
    notify('Order updated successfully.', 'success');
    renderOrderDetails(orderId, profile);
  });
}
