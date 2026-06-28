import './style.css';
import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderOrders } from './pages/order.js';
import { initTheme, getTheme, applyTheme } from './utils/theme.js';
import { notify } from './utils/notify.js';
import { fetchNotifications, markNotificationsRead } from './utils/notifications.js';

initTheme();

/* ---------------- Roles & permissions (RBAC) ---------------- */

export function normalizeRole(raw) {
  const r = (raw || '').toString().toLowerCase().trim();
  if (r.includes('admin')) return 'admin';
  if (r.includes('manage')) return 'management';
  if (r.includes('team') || r.includes('solution')) return 'team';
  if (r.includes('hcam') || r.includes('account')) return 'hcam';
  if (r.includes('customer') || r.includes('unit')) return 'customer';
  return r || 'customer';
}

const PERMS = {
  createOrder: ['customer', 'hcam', 'admin'],
  editOrder: ['customer', 'hcam', 'admin'],
  deleteOrder: ['admin'],
  assignOrder: ['hcam', 'admin'],
  updateStatus: ['hcam', 'team', 'admin'],
  uploadReport: ['team'],
  reviewOrder: ['hcam', 'management', 'admin'],
  manageUsers: ['admin'],
  viewAllOrders: ['hcam', 'management', 'admin'],
  exportReport: ['hcam', 'management', 'admin'],
};

export function can(action, role) {
  return (PERMS[action] || []).includes(normalizeRole(role));
}

/* ---------------- Icons ---------------- */

const ICON = {
  dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
  orders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/></svg>`,
  reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11"/></svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`,
};
export { ICON };

/* ---------------- Boot ---------------- */

async function fetchProfile(session) {
  if (!session) return null;
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();
  return data || { role: 'customer', full_name: session.user.email, email: session.user.email };
}

async function initApp() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    renderLogin(async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      const profile = await fetchProfile(s);
      renderApp(profile, true);
    });
    return;
  }

  const profile = await fetchProfile(session);
  renderApp(profile, false);
}

/* ---------------- App shell ---------------- */

function renderApp(profile, animate) {
  const role = normalizeRole(profile?.role);
  const name = profile?.full_name || profile?.email || 'User';
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const nav = [
    { id: 'dashboard', label: 'Dashboard', icon: ICON.dashboard },
    { id: 'orders', label: 'Orders', icon: ICON.orders },
    { id: 'reports', label: 'Work Reports', icon: ICON.reports },
    { id: 'users', label: 'Users', icon: ICON.users, perm: 'manageUsers' },
    { id: 'profile', label: 'Profile', icon: ICON.profile },
  ].filter(item => !item.perm || can(item.perm, role));

  document.querySelector('#app').innerHTML = `
    <div class="app-shell ${animate ? 'entering' : ''}" id="appShell">
      <aside class="app-sidebar">
        <div class="app-brand">HCSP-OM</div>
        <div class="nav-section">Menu</div>
        <nav id="sideNav">
          ${nav.map(item => `
            <button class="nav-item ${item.id === 'dashboard' ? 'active' : ''}" data-route="${item.id}">
              ${item.icon}<span>${item.label}</span>
            </button>`).join('')}
        </nav>
        <div class="nav-spacer"></div>
        <button class="nav-item" id="logoutBtn">${ICON.logout}<span>Log out</span></button>
        <div class="nav-foot">${role.toUpperCase()} · HCSP-OM</div>
      </aside>

      <div class="app-main">
        <header class="app-header">
          <div class="crumb">Pages / <b id="crumbPage">Dashboard</b></div>
          <div class="header-tools">
            <input class="header-search" placeholder="Search…" />
            <div class="bell-wrap">
              <button class="icon-btn" id="bellBtn" aria-label="Notifications">${ICON.bell}<span class="bell-badge" id="bellBadge" hidden>0</span></button>
              <div class="notif-panel" id="notifPanel" hidden>
                <div class="notif-panel-head">Notifications</div>
                <div id="notifList"></div>
              </div>
            </div>
            <button class="icon-btn" id="settingsBtn" aria-label="Settings">${ICON.settings}</button>
            <div class="avatar" title="${name}">${initials}</div>
          </div>
        </header>
        <main class="app-content" id="appContent"></main>
      </div>
    </div>
  `;

  if (animate) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      document.querySelector('#appShell').classList.remove('entering');
    }));
  }

  const routes = {
    dashboard: { title: 'Dashboard', render: () => renderDashboard(profile) },
    orders: { title: 'Orders', render: () => renderOrders(profile) },
    reports: { title: 'Work Reports', render: () => renderPlaceholder('Work Reports', 'Submitted work reports and attachments appear here.') },
    users: { title: 'Users', render: () => renderPlaceholder('User Management', 'Create, edit, and assign roles to users.') },
    profile: { title: 'Profile', render: () => renderProfile(profile) },
    settings: { title: 'Settings', render: () => renderSettings() },
  };

  function go(routeId) {
    const route = routes[routeId];
    if (!route) return;
    document.querySelectorAll('#sideNav .nav-item').forEach(b => {
      b.classList.toggle('active', b.dataset.route === routeId);
    });
    document.querySelector('#crumbPage').textContent = route.title;
    swapView(route.render);
  }

  document.querySelectorAll('#sideNav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => go(btn.dataset.route));
  });

  document.querySelector('#settingsBtn').addEventListener('click', () => go('settings'));
  setupBell();

  document.querySelector('#logoutBtn').addEventListener('click', async () => {
    const shell = document.querySelector('#appShell');
    shell.style.transition = 'opacity .4s ease, filter .4s ease';
    shell.style.opacity = '0';
    shell.style.filter = 'blur(10px)';
    await supabase.auth.signOut();
    setTimeout(() => window.location.reload(), 380);
  });

  // expose for cross-module navigation
  window.navigateTo = go;
  window.navigateToOrders = () => go('orders');

  go('dashboard');
}

/* Blur-fade view transition wrapper */
async function swapView(renderFn) {
  const content = document.querySelector('#appContent');
  if (!content) return;
  const current = content.firstElementChild;
  if (current) {
    current.classList.add('leaving');
    await new Promise(r => setTimeout(r, 220));
  }
  content.innerHTML = '<div class="view"></div>';
  const view = content.firstElementChild;
  await Promise.resolve(renderFn(view));
}

/* ---------------- Simple themed pages ---------------- */

function renderPlaceholder(title, sub) {
  const view = document.querySelector('#appContent .view');
  if (!view) return;
  view.innerHTML = `
    <div class="page-head"><h1>${title}</h1><p>${sub}</p></div>
    <div class="placeholder-card">Coming next — this module is scaffolded and ready to wire up.</div>
  `;
}

async function setupBell() {
  const btn = document.querySelector('#bellBtn');
  const panel = document.querySelector('#notifPanel');
  const badge = document.querySelector('#bellBadge');
  const list = document.querySelector('#notifList');
  if (!btn) return;

  const timeAgo = (ts) => {
    const d = (Date.now() - new Date(ts).getTime()) / 1000;
    if (d < 60) return 'just now';
    if (d < 3600) return Math.floor(d / 60) + 'm ago';
    if (d < 86400) return Math.floor(d / 3600) + 'h ago';
    return new Date(ts).toLocaleDateString();
  };

  const renderList = (items) => {
    list.innerHTML = items.length
      ? items.map(n => `
        <div class="notif-row ${n.is_read ? '' : 'unread'}">
          <div class="nr-title">${n.title || 'Notification'}</div>
          <div class="nr-body">${n.body || ''}</div>
          <div class="nr-time">${timeAgo(n.created_at)}</div>
        </div>`).join('')
      : '<div class="notif-empty">No notifications yet.</div>';
  };

  const setBadge = (items) => {
    const unread = items.filter(n => !n.is_read).length;
    if (unread > 0) { badge.textContent = unread > 9 ? '9+' : unread; badge.hidden = false; }
    else badge.hidden = true;
  };

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const opening = panel.hidden;
    panel.hidden = !opening;
    if (!opening) return;
    const items = await fetchNotifications(20);
    renderList(items);
    if (items.some(n => !n.is_read)) { await markNotificationsRead(); badge.hidden = true; }
  });

  document.addEventListener('click', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) panel.hidden = true;
  });

  setBadge(await fetchNotifications(20));
}

function renderSettings() {
  const view = document.querySelector('#appContent .view');
  if (!view) return;
  const sun = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;
  const moon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>`;
  const corp = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 9h8M12 9v7"/></svg>`;
  const current = getTheme();

  view.innerHTML = `
    <div class="page-head"><h1>Settings</h1><p>Personalize your HCSP-OM workspace.</p></div>
    <div class="settings-section">
      <h3>Theme</h3>
      <p>Choose how the interface looks. Your choice is saved on this device.</p>
      <div class="theme-toggle" id="themeToggle">
        <button data-theme-val="telkom" class="${current === 'telkom' ? 'active' : ''}">${corp} Telkom</button>
        <button data-theme-val="light" class="${current === 'light' ? 'active' : ''}">${sun} Light</button>
        <button data-theme-val="dark" class="${current === 'dark' ? 'active' : ''}">${moon} Dark</button>
      </div>
    </div>
  `;

  view.querySelectorAll('#themeToggle button').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = btn.dataset.themeVal;
      applyTheme(val);
      view.querySelectorAll('#themeToggle button').forEach(b => b.classList.toggle('active', b === btn));
      notify(`Switched to ${val} mode.`, 'success', { title: 'Theme updated' });
    });
  });
}

function renderProfile(profile) {
  const view = document.querySelector('#appContent .view');
  if (!view) return;
  const role = normalizeRole(profile?.role);
  view.innerHTML = `
    <div class="page-head"><h1>Profile</h1><p>Your account details.</p></div>
    <div class="cards-grid">
      <div class="metric"><span class="metric-label">Name</span><span class="metric-value" style="font-size:18px">${profile?.full_name || '-'}</span></div>
      <div class="metric"><span class="metric-label">Email</span><span class="metric-value" style="font-size:18px">${profile?.email || '-'}</span></div>
      <div class="metric"><span class="metric-label">Role</span><span class="metric-value" style="font-size:18px;text-transform:uppercase">${role}</span></div>
    </div>
  `;
}

initApp();
