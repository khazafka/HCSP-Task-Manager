import { supabase } from '../supabase.js';
import { normalizeRole, can, ICON } from '../main.js';
import { t } from '../utils/i18n.js';

export async function renderDashboard(profile) {
  const view = document.querySelector('#appContent .view');
  if (!view) return;

  const role = normalizeRole(profile?.role);
  const firstName = (profile?.full_name || 'there').split(' ')[0];

  // Best-effort data load (filtered by role); falls back gracefully.
  let orders = [];
  try {
    let query = supabase.from('orders').select('*').order('id', { ascending: false });
    const { data, error } = await query;
    if (!error && Array.isArray(data)) orders = data;
  } catch (_) { /* keep empty */ }

  // Role-based filtering
  const uid = profile?.id;
  let visible = orders;
  if (role === 'customer' && uid) {
    visible = orders.filter(o => o.created_by === uid);
  } else if (role === 'team' && uid) {
    // Team Solution only sees orders actually assigned to them (via order_assignments).
    const { data: asn } = await supabase.from('order_assignments').select('order_id').eq('user_id', uid);
    const assigned = new Set((asn || []).map(a => a.order_id));
    visible = orders.filter(o => assigned.has(o.id));
  }

  const norm = s => (s || '').toString().toLowerCase();
  const count = (...sts) => visible.filter(o => sts.includes(norm(o.status))).length;
  const total = visible.length;
  const inProgress = count('in progress', 'assigned');
  const completed = count('completed', 'closed');
  const pending = count('submitted', 'draft', 'review');

  // Role-specific 4th metric
  const extra = {
    customer: { label: t('dash.myDrafts'), value: count('draft') },
    team: { label: t('dash.assignedToMe'), value: inProgress },
    hcam: { label: t('dash.awaitingReview'), value: count('review') },
    management: { label: t('dash.closed'), value: count('closed') },
    admin: { label: t('dash.totalUsers'), value: '—' },
  }[role] || { label: t('dash.pending'), value: pending };

  // Action buttons by permission
  const actions = [];
  if (can('createOrder', role)) actions.push(`<button class="btn btn-primary" data-act="create">${plus()} ${t('dash.createOrder')}</button>`);
  if (can('assignOrder', role)) actions.push(`<button class="btn btn-ghost" data-act="orders">${t('dash.assignOrders')}</button>`);
  if (can('reviewOrder', role)) actions.push(`<button class="btn btn-ghost" data-act="orders">${t('dash.reviewQueue')}</button>`);
  if (can('uploadReport', role)) actions.push(`<button class="btn btn-primary" data-act="reports">${plus()} ${t('dash.uploadReport')}</button>`);
  if (can('manageUsers', role)) actions.push(`<button class="btn btn-ghost" data-act="users">${t('dash.manageUsers')}</button>`);
  if (actions.length === 0) actions.push(`<button class="btn btn-ghost" data-act="orders">${t('dash.viewMyOrders')}</button>`);

  // Weekly bar data (best-effort: bucket by created_at day, else demo)
  const bars = weeklyBars(visible);

  // Recent + timeline
  const recent = visible.slice(0, 5);

  view.innerHTML = `
    <div class="page-head">
      <h1>${t('dash.welcome')}, ${firstName}</h1>
      <p>${role === 'customer' ? t('dash.subOrders') : t('dash.subWorkspace')}</p>
    </div>

    <div class="actions-row">${actions.join('')}</div>

    <div class="cards-grid">
      ${metric(t('dash.totalOrders'), total, '+ ' + t('dash.thisPeriod'), false)}
      ${metric(t('dash.inProgress'), inProgress, t('dash.activeNow'), false)}
      ${metric(t('dash.completed'), completed, t('dash.delivered'), false)}
      ${metric(extra.label, extra.value, t('dash.snapshot'), false)}
    </div>

    <div class="panels-grid">
      <div class="panel">
        <div class="panel-title">${t('dash.ordersThisWeek')}</div>
        <div class="panel-sub">${t('dash.volumeByDay')}</div>
        <div class="bars">
          ${bars.map(b => `
            <div class="bar-col">
              <div class="bar" style="height:0%" data-h="${b.pct}%"></div>
              <div class="bar-label">${b.label}</div>
            </div>`).join('')}
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">${t('dash.statusBreakdown')}</div>
        <div class="panel-sub">${t('dash.acrossVisible')}</div>
        <div style="margin-top:4px">
          ${statusRow(t('dash.inProgress'), inProgress, total, 'pill-amber')}
          ${statusRow(t('dash.completed'), completed, total, 'pill-green')}
          ${statusRow(t('dash.pending'), pending, total, 'pill-dim')}
        </div>
      </div>
    </div>

    <div class="panels-grid" style="margin-top:16px">
      <div class="panel">
        <div class="panel-title">${t('dash.recentOrders')}</div>
        <div class="panel-sub">${role === 'customer' ? t('dash.yourLatest') : t('dash.latestTeam')}</div>
        ${recent.length ? recent.map(o => `
          <div class="row-item" data-order="${o.id}" style="cursor:pointer">
            <div>
              <div class="row-main">#ORD-${o.id} · ${o.order_title || t('ord.untitled')}</div>
              <div class="row-sub">${o.contact_number || '—'}</div>
            </div>
            <span class="pill ${pillClass(o.status)}">${o.status || 'draft'}</span>
          </div>`).join('') : `<div class="empty">${t('dash.noOrders')}${can('createOrder', role) ? t('dash.noOrdersCta') : '.'}</div>`}
      </div>

      <div class="panel">
        <div class="panel-title">${t('dash.activity')}</div>
        <div class="panel-sub">${t('dash.recentUpdates')}</div>
        ${recent.length ? recent.slice(0, 4).map(o => `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div>
              <div class="timeline-main">#ORD-${o.id} ${t('dash.marked')} <b style="color:var(--green)">${o.status || 'draft'}</b></div>
              <div class="timeline-time">${o.order_title || 'Order'}</div>
            </div>
          </div>`).join('') : `<div class="empty">${t('dash.noActivity')}</div>`}
      </div>
    </div>
  `;

  // Animate bars in
  requestAnimationFrame(() => {
    view.querySelectorAll('.bar').forEach(b => { b.style.height = b.dataset.h; });
  });

  // Wire actions
  view.querySelectorAll('[data-act]').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.dataset.act;
      if (act === 'create' || act === 'orders') window.navigateTo?.('orders');
      else window.navigateTo?.(act);
    });
  });
  view.querySelectorAll('[data-order]').forEach(row => {
    row.addEventListener('click', () => window.navigateTo?.('orders'));
  });
}

/* helpers */
function plus() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}
function metric(label, value, delta, down) {
  return `<div class="metric">
    <span class="metric-label">${label}</span>
    <span class="metric-value">${value}</span>
    <span class="metric-delta ${down ? 'down' : ''}"><b>${delta}</b></span>
  </div>`;
}
function pillClass(status) {
  const s = (status || '').toLowerCase();
  if (s.includes('complete') || s.includes('closed')) return 'pill-green';
  if (s.includes('progress') || s.includes('assign') || s.includes('review')) return 'pill-amber';
  return 'pill-dim';
}
function statusRow(label, value, total, pill) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return `<div class="row-item">
    <div class="row-main">${label}</div>
    <div style="display:flex;align-items:center;gap:10px">
      <span class="row-sub">${pct}%</span>
      <span class="pill ${pill}">${value}</span>
    </div>
  </div>`;
}
function weeklyBars(orders) {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const counts = new Array(7).fill(0);
  let any = false;
  orders.forEach(o => {
    const d = o.created_at ? new Date(o.created_at) : null;
    if (d && !isNaN(d)) { counts[(d.getDay() + 6) % 7]++; any = true; }
  });
  const data = any ? counts : [3, 5, 2, 6, 4, 1, 3]; // demo shape when no dates
  const max = Math.max(...data, 1);
  return labels.map((label, i) => ({ label, pct: Math.round((data[i] / max) * 100) }));
}
