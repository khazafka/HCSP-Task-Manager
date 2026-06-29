import './style.css';
import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderOrders } from './pages/order.js';
import { renderUsers } from './pages/users.js';
import { renderWorkReports } from './pages/work-reports.js';
import { initTheme, getTheme, applyTheme } from './utils/theme.js';
import { notify } from './utils/notify.js';
import { fetchNotifications, markNotificationsRead } from './utils/notifications.js';
import { t, getLang, langLabel, setLang } from './utils/i18n.js';

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
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`,
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
    { id: 'dashboard', label: t('nav.dashboard'), icon: ICON.dashboard },
    { id: 'orders', label: t('nav.orders'), icon: ICON.orders },
    { id: 'reports', label: t('nav.reports'), icon: ICON.reports },
    { id: 'users', label: t('nav.users'), icon: ICON.users, perm: 'manageUsers' },
    { id: 'profile', label: t('nav.profile'), icon: ICON.profile },
  ].filter(item => !item.perm || can(item.perm, role));

  const collapsed = localStorage.getItem('hcsp-sidebar') === 'collapsed';
  const dock = localStorage.getItem('hcsp-dock') === 'right' ? 'dock-right' : '';

  document.querySelector('#app').innerHTML = `
    <div class="app-shell ${animate ? 'entering' : ''} ${collapsed ? 'collapsed' : ''} ${dock}" id="appShell">
      <aside class="app-sidebar" id="appSidebar">
        <div class="sidebar-top">
          <div class="app-brand">HCSP-OM</div>
          <button class="burger" id="burgerBtn" aria-label="Toggle sidebar"><span></span><span></span><span></span></button>
        </div>
        <div class="nav-section">Menu</div>
        <nav id="sideNav">
          ${nav.map(item => `
            <button class="nav-item ${item.id === 'dashboard' ? 'active' : ''}" data-route="${item.id}" title="${item.label}">
              ${item.icon}<span>${item.label}</span>
            </button>`).join('')}
        </nav>
        <div class="nav-spacer"></div>
        <div class="profile-wrap" id="profileWrap">
          <button class="nav-item profile-trigger" id="avatarBtn" title="${name}">
            <span class="avatar avatar-sm">${initials}</span><span>${name}</span>
          </button>
          <div class="profile-menu profile-menu-up" id="profileMenu" hidden>
            <div class="profile-head">
              <div class="pa">${initials}</div>
              <div style="min-width:0">
                <div class="pn">${name}</div>
                <div class="pe">${profile?.email || ''}</div>
              </div>
            </div>
            <div class="profile-items">
              <button data-pm="profile">${ICON.profile}<span>${t('nav.profile')}</span></button>
              <button data-pm="changePass">${ICON.lock}<span>${t('menu.changePass')}</span></button>
              <button data-pm="settings">${ICON.settings}<span>${t('set.title')}</span></button>
              <div class="profile-sep"></div>
              <button class="danger" data-pm="logout">${ICON.logout}<span>${t('nav.logout')}</span></button>
            </div>
          </div>
        </div>
      </aside>

      <div class="app-main">
        <header class="app-header">
          <div class="crumb">${t('hdr.pages')} / <b id="crumbPage">${t('nav.dashboard')}</b></div>
          <div class="header-tools">
            <input class="header-search" placeholder="${t('hdr.search')}" />
            <div class="bell-wrap">
              <button class="icon-btn" id="bellBtn" aria-label="${t('hdr.notifications')}">${ICON.bell}<span class="bell-badge" id="bellBadge" hidden>0</span></button>
              <div class="notif-panel" id="notifPanel" hidden>
                <div class="notif-panel-head">${t('hdr.notifications')}</div>
                <div id="notifList"></div>
              </div>
            </div>
            <div class="lang-wrap">
              <button class="icon-btn lang-btn" id="langBtn" aria-label="${t('set.lang')}">${ICON.globe}<span>${langLabel()}</span></button>
              <div class="lang-menu" id="langMenu" hidden>
                <button data-lang="en" class="${getLang() === 'en' ? 'on' : ''}">EN · ${t('lang.en')}</button>
                <button data-lang="id" class="${getLang() === 'id' ? 'on' : ''}">ID · ${t('lang.id')}</button>
              </div>
            </div>
            <button class="icon-btn" id="settingsBtn" aria-label="${t('set.title')}">${ICON.settings}</button>
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
    dashboard: { title: t('nav.dashboard'), render: () => renderDashboard(profile) },
    orders: { title: t('nav.orders'), render: () => renderOrders(profile) },
    reports: { title: t('nav.reports'), render: () => renderWorkReports(profile) },
    users: { title: t('nav.users'), render: () => renderUsers(profile) },
    profile: { title: t('nav.profile'), render: () => renderProfile(profile) },
    settings: { title: t('set.title'), render: () => renderSettings() },
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

  async function doLogout() {
    const shell = document.querySelector('#appShell');
    shell.style.transition = 'opacity .4s ease, filter .4s ease';
    shell.style.opacity = '0';
    shell.style.filter = 'blur(10px)';
    await supabase.auth.signOut();
    setTimeout(() => window.location.reload(), 380);
  }

  document.querySelector('#settingsBtn').addEventListener('click', () => go('settings'));
  setupBell();
  setupLang();
  setupSidebar();
  setupProfileMenu(go, doLogout);

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
    <div class="placeholder-card">${t('ph.soon')}</div>
  `;
}

function setupLang() {
  const btn = document.querySelector('#langBtn');
  const menu = document.querySelector('#langMenu');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.toggleAttribute('hidden');
  });
  menu.querySelectorAll('[data-lang]').forEach(b => {
    b.addEventListener('click', () => { if (b.dataset.lang !== getLang()) setLang(b.dataset.lang); });
  });
  document.addEventListener('click', (e) => {
    if (!menu.hasAttribute('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) menu.setAttribute('hidden', '');
  });
}

function setupSidebar() {
  const shell = document.querySelector('#appShell');
  const burger = document.querySelector('#burgerBtn');
  const sidebar = document.querySelector('#appSidebar');
  if (!shell || !burger) return;

  const setCollapsed = (c) => {
    shell.classList.toggle('collapsed', c);
    localStorage.setItem('hcsp-sidebar', c ? 'collapsed' : 'expanded');
  };
  const setDock = (side) => {
    shell.classList.toggle('dock-right', side === 'right');
    localStorage.setItem('hcsp-dock', side);
  };

  burger.addEventListener('click', () => setCollapsed(!shell.classList.contains('collapsed')));

  const closeCtx = () => document.querySelector('#sidebarCtx')?.remove();
  sidebar.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    closeCtx();
    const collapsed = shell.classList.contains('collapsed');
    const isRight = shell.classList.contains('dock-right');
    const menu = document.createElement('div');
    menu.className = 'ctx-menu';
    menu.id = 'sidebarCtx';
    menu.innerHTML = `
      <button data-cx="collapse">${collapsed ? t('side.expand') : t('side.collapse')}</button>
      <div class="ctx-sep"></div>
      <button data-cx="left" ${!isRight ? 'style="color:var(--green)"' : ''}>${t('side.dockLeft')}</button>
      <button data-cx="right" ${isRight ? 'style="color:var(--green)"' : ''}>${t('side.dockRight')}</button>`;
    document.body.appendChild(menu);
    menu.style.left = Math.min(e.clientX, window.innerWidth - 190) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 140) + 'px';
    menu.querySelectorAll('[data-cx]').forEach(b => b.addEventListener('click', () => {
      const cx = b.dataset.cx;
      if (cx === 'collapse') setCollapsed(!collapsed); else setDock(cx);
      closeCtx();
    }));
  });
  document.addEventListener('click', closeCtx);
  window.addEventListener('blur', closeCtx);

  // drag anywhere in the sidebar (empty area) to re-dock left / right
  let dragging = false, startX = 0, armed = false;
  const hint = () => {
    let h = document.querySelector('#dockHint');
    if (!h) { h = document.createElement('div'); h.id = 'dockHint'; h.className = 'dock-hint'; document.body.appendChild(h); }
    return h;
  };
  const clearHint = () => document.querySelector('#dockHint')?.remove();

  sidebar.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.nav-item, .burger, .profile-wrap, button, a, input, select')) return;
    armed = true; startX = e.clientX;
  });
  window.addEventListener('mousemove', (e) => {
    if (!armed) return;
    if (!dragging && Math.abs(e.clientX - startX) < 6) return;
    dragging = true;
    document.body.style.userSelect = 'none';
    sidebar.classList.add('dragging');
    const side = e.clientX > window.innerWidth / 2 ? 'right' : 'left';
    const h = hint();
    h.classList.toggle('right', side === 'right');
  });
  window.addEventListener('mouseup', (e) => {
    if (dragging) setDock(e.clientX > window.innerWidth / 2 ? 'right' : 'left');
    armed = false; dragging = false;
    document.body.style.userSelect = '';
    sidebar.classList.remove('dragging');
    clearHint();
  });
}

function setupProfileMenu(go, doLogout) {
  const btn = document.querySelector('#avatarBtn');
  const menu = document.querySelector('#profileMenu');
  if (!btn) return;
  btn.addEventListener('click', (e) => { e.stopPropagation(); menu.toggleAttribute('hidden'); });
  document.addEventListener('click', (e) => {
    if (!menu.hasAttribute('hidden') && !menu.contains(e.target) && !btn.contains(e.target)) menu.setAttribute('hidden', '');
  });
  menu.querySelectorAll('[data-pm]').forEach(b => b.addEventListener('click', () => {
    menu.setAttribute('hidden', '');
    const pm = b.dataset.pm;
    if (pm === 'profile' || pm === 'changePass') go('profile');
    else if (pm === 'settings') go('settings');
    else if (pm === 'logout') doLogout();
  }));
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
      : `<div class="notif-empty">${t('common.noNotifs')}</div>`;
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
  const globe = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z"/></svg>`;
  const current = getTheme();
  const lang = getLang();

  view.innerHTML = `
    <div class="page-head"><h1>${t('set.title')}</h1><p>${t('set.sub')}</p></div>
    <div class="settings-section">
      <h3>${t('set.theme')}</h3>
      <p>${t('set.themeSub')}</p>
      <div class="theme-toggle" id="themeToggle">
        <button data-theme-val="telkom" class="${current === 'telkom' ? 'active' : ''}">${corp} Telkom</button>
        <button data-theme-val="light" class="${current === 'light' ? 'active' : ''}">${sun} Light</button>
        <button data-theme-val="dark" class="${current === 'dark' ? 'active' : ''}">${moon} Dark</button>
      </div>
    </div>
    <div class="settings-section">
      <h3>${t('set.lang')}</h3>
      <p>${t('set.langSub')}</p>
      <div class="theme-toggle" id="langToggle">
        <button data-lang-val="en" class="${lang === 'en' ? 'active' : ''}">${globe} EN · ${t('lang.en')}</button>
        <button data-lang-val="id" class="${lang === 'id' ? 'active' : ''}">${globe} ID · ${t('lang.id')}</button>
      </div>
    </div>
  `;

  view.querySelectorAll('#langToggle button').forEach(b => {
    b.addEventListener('click', () => { if (b.dataset.langVal !== getLang()) setLang(b.dataset.langVal); });
  });

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
    <div class="page-head"><h1>${t('prof.title')}</h1><p>${t('prof.sub')}</p></div>
    <div class="cards-grid">
      <div class="metric"><span class="metric-label">${t('prof.name')}</span><span class="metric-value" style="font-size:18px">${profile?.full_name || '-'}</span></div>
      <div class="metric"><span class="metric-label">${t('prof.email')}</span><span class="metric-value" style="font-size:18px">${profile?.email || '-'}</span></div>
      <div class="metric"><span class="metric-label">${t('prof.role')}</span><span class="metric-value" style="font-size:18px;text-transform:uppercase">${role}</span></div>
    </div>

    <div class="settings-section" style="margin-top:18px">
      <h3>${t('prof.security')}</h3>
      <p>${t('prof.changePass')}</p>
      <div class="form-grid" style="max-width:360px">
        <div class="field"><label>${t('prof.newPass')}</label><input id="newPass" class="input" type="password" autocomplete="new-password"/></div>
        <div class="field"><label>${t('prof.confirmPass')}</label><input id="confirmPass" class="input" type="password" autocomplete="new-password"/></div>
        <div class="form-actions"><button id="updatePassBtn" class="btn btn-primary">${t('prof.updatePass')}</button></div>
      </div>
    </div>
  `;

  view.querySelector('#updatePassBtn').addEventListener('click', async () => {
    const p1 = view.querySelector('#newPass').value;
    const p2 = view.querySelector('#confirmPass').value;
    if (p1.length < 6) { notify(t('prof.passShort'), 'warning'); return; }
    if (p1 !== p2) { notify(t('prof.passMismatch'), 'warning'); return; }
    const { error } = await supabase.auth.updateUser({ password: p1 });
    if (error) { notify(error.message, 'error'); return; }
    notify(t('prof.passUpdated'), 'success');
    view.querySelector('#newPass').value = '';
    view.querySelector('#confirmPass').value = '';
  });
}

initApp();
