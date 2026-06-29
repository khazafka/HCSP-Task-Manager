import { supabase } from '../supabase.js';
import { renderOrderDetails } from './order-detail.js';
import { sendWhatsAppMessage } from '../utils/whatsapp.js';
import { notify } from '../utils/notify.js';
import { can, normalizeRole } from '../main.js';
import { t } from '../utils/i18n.js';

const STATUSES = ['Draft', 'Submitted', 'Assigned', 'In Progress', 'Review', 'Completed', 'Closed'];

const SVG = {
  grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>`,
  view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
};

function pillClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('closed')) return 'pill-green';
  if (s.includes('progress') || s.includes('assign') || s.includes('review')) return 'pill-amber';
  return 'pill-dim';
}

// view + filter state (persisted across re-renders)
let view = localStorage.getItem('orders-view') || 'grid';
const filters = { sort: 'newest', statuses: [], unit: '' };

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
  if (role === 'customer' && profile?.id) orders = orders.filter(o => o.created_by === profile.id);

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
    if (filters.unit) out = out.filter(o => o.business_units?.name === filters.unit);
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
        ${can('editOrder', role) ? `<button data-act="edit" data-id="${o.id}">${SVG.edit} ${t('ord.edit')}</button>` : ''}
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
          <div class="oc-sub"><span class="pill ${pillClass(o.status)}">${o.status || 'Draft'}</span></div>
          <div class="oc-meta">
            <span><b>${t('ord.unit')}:</b> ${o.business_units?.name || '—'}</span>
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
              <div class="oc-meta"><span><b>${t('ord.unit')}:</b> ${o.business_units?.name || '—'}</span><span><b>${t('ord.contact')}:</b> ${o.contact_number || '—'}</span></div>
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
      } else if (group === 'unit') {
        const v = chip.dataset.val;
        filters.unit = filters.unit === v ? '' : v;
        filterPop.querySelectorAll('[data-group="unit"] .chip').forEach(c => c.classList.toggle('active', c.dataset.val === filters.unit));
      }
      draw();
    });
  });
  container.querySelector('#filterClear').addEventListener('click', () => {
    filters.sort = 'newest'; filters.statuses = []; filters.unit = '';
    filterPop.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    filterPop.querySelector('[data-group="sort"] [data-val="newest"]')?.classList.add('active');
    draw();
  });

  // FAB
  container.querySelector('#createFab')?.addEventListener('click', () => renderCreateOrderForm(profile));
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
  const { data: businessUnits } = await supabase.from('business_units').select('*').order('id');

  container.innerHTML = `
    <div class="view">
      <button class="link-back" id="cancelBtn">&larr; ${t('cr.back')}</button>
      <div class="page-head"><h1>${t('cr.title')}</h1><p>${t('cr.sub')}</p></div>
      <div class="form-card">
        <div class="form-grid">
          <div class="field"><label>${t('cr.orderTitle')}</label><input id="orderTitle" class="input" placeholder="e.g. Pengisian Formasi — Unit ABC"/></div>
          <div class="field"><label>${t('cr.contact')}</label><input id="contactNumber" class="input" placeholder="08xxxxxxxxxx"/></div>
          <div class="field"><label>${t('cr.desc')}</label><textarea id="orderDescription" class="textarea" rows="4"></textarea></div>
          <div class="field"><label>${t('cr.unit')}</label>
            <select id="businessUnit" class="select">
              ${(businessUnits || []).map(u => `<option value="${u.id}">${u.name}</option>`).join('')}
            </select>
          </div>
          <div class="form-actions">
            <button id="saveOrderBtn" class="btn btn-primary">${t('cr.save')}</button>
            <button id="cancelBtn2" class="btn btn-ghost">${t('common.cancel')}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const back = () => renderOrders(profile);
  container.querySelector('#cancelBtn').addEventListener('click', back);
  container.querySelector('#cancelBtn2').addEventListener('click', back);
  container.querySelector('#saveOrderBtn').addEventListener('click', async () => {
    const payload = {
      business_unit_id: Number(container.querySelector('#businessUnit').value) || null,
      contact_number: container.querySelector('#contactNumber').value,
      order_title: container.querySelector('#orderTitle').value,
      order_description: container.querySelector('#orderDescription').value,
      status: 'Draft',
      created_by: (await supabase.auth.getUser()).data.user?.id,
    };
    if (!payload.order_title) { notify(t('cr.titleReq'), 'warning'); return; }
    const { error } = await supabase.from('orders').insert(payload);
    if (error) { notify(error.message, 'error'); return; }
    notify(t('cr.created'), 'success');
    renderOrders(profile);
  });
}

// --- EDIT ---
export async function renderEditOrder(orderId, profile) {
  const container = document.querySelector('#appContent');
  if (!container) return;
  const { data: order, error } = await supabase.from('orders').select('*').eq('id', orderId).single();
  if (error) { notify(error.message, 'error'); return; }

  container.innerHTML = `
    <div class="view">
      <button class="link-back" id="cancelEditBtn">&larr; ${t('common.back')}</button>
      <div class="page-head"><h1>${t('ed.title')} #ORD-${order.id}</h1><p>${t('ed.sub')}</p></div>
      <div class="form-card">
        <div class="form-grid">
          <div class="field"><label>${t('cr.orderTitle')}</label><input id="orderTitle" class="input" value="${(order.order_title || '').replace(/"/g, '&quot;')}"/></div>
          <div class="field"><label>${t('cr.contact')}</label><input id="contactNumber" class="input" value="${(order.contact_number || '').replace(/"/g, '&quot;')}"/></div>
          <div class="field"><label>${t('cr.desc')}</label><textarea id="orderDescription" class="textarea" rows="4">${order.order_description || ''}</textarea></div>
          <div class="field"><label>${t('cr.status')}</label>
            <select id="orderStatus" class="select">
              ${STATUSES.map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
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
  container.querySelector('#saveEditBtn').addEventListener('click', async () => {
    const updated = {
      order_title: container.querySelector('#orderTitle').value,
      contact_number: container.querySelector('#contactNumber').value,
      order_description: container.querySelector('#orderDescription').value,
      status: container.querySelector('#orderStatus').value,
    };
    const { error: updateErr } = await supabase.from('orders').update(updated).eq('id', orderId);
    if (updateErr) { notify(updateErr.message, 'error'); return; }
    try {
      await sendWhatsAppMessage(updated.contact_number, `🚨 [System Update]\nOrder: ${updated.order_title} (#ORD-${orderId})\nStatus updated to ${updated.status}.`);
      notify(t('ed.updated'), 'success');
    } catch (_) {
      notify(t('ed.updatedNoWa'), 'warning');
    }
    renderOrderDetails(orderId, profile);
  });
}
