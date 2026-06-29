import { supabase } from '../supabase.js';
import { notify } from '../utils/notify.js';
import readXlsxFile from 'read-excel-file/browser';

const ROLES = [
  { value: 'customer', label: 'Customer' },
  { value: 'hcam', label: 'HCAM' },
  { value: 'team', label: 'Team Solution' },
  { value: 'management', label: 'Management' },
  { value: 'admin', label: 'Admin' },
];

let editingId = null;
let users = [];
let businessUnits = [];

export async function renderUsers() {
  const view = document.querySelector('#appContent .view');
  if (!view) return;
  await loadBusinessUnits();

  view.innerHTML = `
    <div class="toolbar">
      <div class="page-head" style="margin:0">
        <h1>User Management</h1>
        <p>Create Supabase login accounts and assign HCSP-OM roles.</p>
      </div>
      <div class="toolbar-tools">
        <button class="btn btn-ghost" id="importUserBtn">Import CSV/XLSX</button>
        <input id="importUserFile" type="file" accept=".csv,.xlsx" hidden/>
        <button class="btn btn-primary" id="newUserBtn">${plus()} New user</button>
      </div>
    </div>

    <div class="user-admin-grid">
      <div class="panel user-form-panel" id="userFormPanel" hidden>
        <div class="panel-title" id="formTitle">Create user</div>
        <div class="panel-sub">Users created here can sign in immediately. Import columns: full_name, email, role, phone, password.</div>
        <div class="form-grid">
          <div class="field"><label>Full name</label><input id="userFullName" class="input" autocomplete="off"/></div>
          <div class="field"><label>Email</label><input id="userEmail" class="input" type="email" autocomplete="off"/></div>
          <div class="field"><label>WhatsApp / phone</label><input id="userPhone" class="input" placeholder="08xxxxxxxxxx" autocomplete="off"/></div>
          <div class="field">
            <label>Unit bisnis</label>
            <select id="userUnitBisnisSelect" class="select">
              <option value="">Select business unit...</option>
              ${businessUnits.map(unit => `<option value="${escapeHtml(unit.name)}">${escapeHtml(unit.name)}</option>`).join('')}
              <option value="__custom">Other / type manually</option>
            </select>
            <input id="userUnitBisnisCustom" class="input" placeholder="Type business unit" autocomplete="off" hidden style="margin-top:8px"/>
          </div>
          <div class="field"><label>Role</label>
            <select id="userRole" class="select">${ROLES.map(r => `<option value="${r.value}">${r.label}</option>`).join('')}</select>
          </div>
          <div class="field"><label id="passwordLabel">Temporary password</label><input id="userPassword" class="input" type="password" autocomplete="new-password"/></div>
          <div class="form-actions">
            <button id="saveUserBtn" class="btn btn-primary">Save user</button>
            <button id="cancelUserBtn" class="btn btn-ghost">Cancel</button>
          </div>
        </div>
      </div>

      <div class="panel user-list-panel">
        <div class="user-list-head">
          <div>
            <div class="panel-title">Users</div>
            <div class="panel-sub">Role source for permissions, assignments, and notifications.</div>
          </div>
          <button class="btn btn-ghost" id="refreshUsersBtn">Refresh</button>
        </div>
        <div id="usersList"><div class="empty">Loading users...</div></div>
      </div>
    </div>
  `;

  view.querySelector('#newUserBtn').addEventListener('click', () => openForm());
  view.querySelector('#importUserBtn').addEventListener('click', () => view.querySelector('#importUserFile').click());
  view.querySelector('#importUserFile').addEventListener('change', importUsers);
  view.querySelector('#cancelUserBtn').addEventListener('click', closeForm);
  view.querySelector('#saveUserBtn').addEventListener('click', saveUser);
  view.querySelector('#refreshUsersBtn').addEventListener('click', loadUsers);
  view.querySelector('#userUnitBisnisSelect').addEventListener('change', updateUnitBisnisCustomField);

  await loadUsers();
}

async function loadBusinessUnits() {
  const { data, error } = await supabase.from('business_units').select('id, name').order('name', { ascending: true });
  if (error) {
    console.warn('[users] unable to load business units:', error.message);
    businessUnits = [];
    return;
  }
  businessUnits = data || [];
}

async function adminRequest(method, payload) {
  const session = await getFreshSession();
  const res = await sendAdminRequest(method, payload, session.access_token);
  if (res.status === 401) {
    const refreshed = await getFreshSession(true);
    const retry = await sendAdminRequest(method, payload, refreshed.access_token);
    return parseAdminResponse(retry);
  }
  return parseAdminResponse(res);
}

async function getFreshSession(forceRefresh = false) {
  const { data: { session } } = forceRefresh
    ? await supabase.auth.refreshSession()
    : await supabase.auth.getSession();

  if (!session?.access_token) throw new Error('Not authenticated. Please log out and sign in again.');

  const expiresAtMs = (session.expires_at || 0) * 1000;
  if (!forceRefresh && expiresAtMs && expiresAtMs - Date.now() < 60_000) {
    return getFreshSession(true);
  }

  return session;
}

function sendAdminRequest(method, payload, accessToken) {
  return fetch('/api/admin-users', {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
}

async function parseAdminResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  let data = {};
  if (contentType.includes('application/json') && text) {
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error(`Admin API returned invalid JSON with HTTP ${res.status}`);
    }
  } else if (!contentType.includes('application/json')) {
    throw new Error(`Admin API is unavailable or returned ${res.status}. Restart npm.cmd run dev so Vite loads the local API bridge.`);
  }

  if (!res.ok) {
    throw new Error(data.error || `Admin API failed with HTTP ${res.status}`);
  }
  return data;
}

async function loadUsers() {
  const list = document.querySelector('#usersList');
  if (!list) return;
  list.innerHTML = '<div class="empty">Loading users...</div>';

  try {
    const data = await adminRequest('GET');
    users = data.users || [];
    drawUsers();
  } catch (err) {
    list.innerHTML = `<div class="empty">${escapeHtml(err.message)}</div>`;
    notify(err.message, 'error');
  }
}

function drawUsers() {
  const list = document.querySelector('#usersList');
  if (!list) return;

  if (!users.length) {
    list.innerHTML = '<div class="empty">No users yet. Create the first account above.</div>';
    return;
  }

  list.innerHTML = `
    <div class="user-table">
      <div class="user-table-head">
        <span>User</span>
        <span>Number</span>
        <span>Unit</span>
        <span>Position</span>
        <span></span>
      </div>
      ${users.map(u => `
        <div class="user-row">
          <div class="user-main">
            <div class="user-avatar">${initials(u.full_name || u.email)}</div>
            <div>
              <div class="row-main">${escapeHtml(u.full_name || '-')}</div>
              <div class="row-sub">${escapeHtml(u.email || '-')}</div>
            </div>
          </div>
          <div class="user-cell" data-label="Number">${escapeHtml(u.phone || '-')}</div>
          <div class="user-cell" data-label="Unit">${escapeHtml(u.unit_bisnis || '-')}</div>
          <div class="user-position" data-label="Position"><span class="pill ${rolePill(u.role)}">${roleLabel(u.role)}</span></div>
          <div class="user-edit-cell">
            <button class="btn btn-ghost user-edit-btn" data-edit="${u.id}">Edit</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  list.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const user = users.find(u => u.id === btn.dataset.edit);
      if (user) openForm(user);
    });
  });
}

function openForm(user) {
  const panel = document.querySelector('#userFormPanel');
  if (!panel) return;
  editingId = user?.id || null;
  panel.hidden = false;
  document.querySelector('#formTitle').textContent = editingId ? 'Edit user' : 'Create user';
  document.querySelector('#passwordLabel').textContent = editingId ? 'New password (optional)' : 'Temporary password';
  document.querySelector('#userFullName').value = user?.full_name || '';
  document.querySelector('#userEmail').value = user?.email || '';
  document.querySelector('#userPhone').value = user?.phone || '';
  setUnitBisnisValue(user?.unit_bisnis || '');
  document.querySelector('#userRole').value = user?.role || 'customer';
  document.querySelector('#userPassword').value = '';
  document.querySelector('#userFullName').focus();
}

function closeForm() {
  const panel = document.querySelector('#userFormPanel');
  if (panel) panel.hidden = true;
  editingId = null;
}

async function saveUser() {
  const fullName = document.querySelector('#userFullName').value.trim();
  const email = document.querySelector('#userEmail').value.trim();
  const phone = document.querySelector('#userPhone').value.trim();
  const unitBisnis = getUnitBisnisValue();
  const role = document.querySelector('#userRole').value;
  const password = document.querySelector('#userPassword').value;

  if (!fullName || !email || (!editingId && !password)) {
    notify('Full name, email, and password are required.', 'warning');
    return;
  }

  const btn = document.querySelector('#saveUserBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    const payload = { id: editingId, full_name: fullName, email, phone, unit_bisnis: unitBisnis, role, password };
    await adminRequest(editingId ? 'PATCH' : 'POST', payload);
    notify(editingId ? 'User updated.' : 'User created.', 'success');
    closeForm();
    await loadUsers();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save user';
  }
}

function setUnitBisnisValue(value) {
  const select = document.querySelector('#userUnitBisnisSelect');
  const custom = document.querySelector('#userUnitBisnisCustom');
  if (!select || !custom) return;

  const normalized = (value || '').trim().toLowerCase();
  const match = businessUnits.find(unit => (unit.name || '').trim().toLowerCase() === normalized);

  if (!value) {
    select.value = '';
    custom.value = '';
  } else if (match) {
    select.value = match.name;
    custom.value = '';
  } else {
    select.value = '__custom';
    custom.value = value;
  }
  updateUnitBisnisCustomField();
}

function getUnitBisnisValue() {
  const select = document.querySelector('#userUnitBisnisSelect');
  const custom = document.querySelector('#userUnitBisnisCustom');
  if (!select) return '';
  if (select.value === '__custom') return (custom?.value || '').trim();
  return select.value.trim();
}

function updateUnitBisnisCustomField() {
  const select = document.querySelector('#userUnitBisnisSelect');
  const custom = document.querySelector('#userUnitBisnisCustom');
  if (!select || !custom) return;
  const showCustom = select.value === '__custom' || !businessUnits.length;
  custom.hidden = !showCustom;
  if (showCustom && select.value !== '__custom') select.value = '__custom';
}

async function importUsers(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file) return;

  try {
    const rows = await parseImportFile(file);
    if (!rows.length) {
      notify('No importable users found.', 'warning');
      return;
    }

    const validRows = rows.filter(r => r.email && r.full_name && r.password);
    const missing = rows.length - validRows.length;
    if (!validRows.length) {
      notify('Each imported user needs full_name, email, and password columns.', 'warning');
      return;
    }

    const ok = await confirmImportUsers({ file, validRows, missing });
    if (!ok) return;

    const result = await adminRequest('POST', { users: validRows });
    const failed = result.failed || 0;
    const created = result.created || 0;
    if (failed) {
      notify(`Imported ${created} users. ${failed} rows failed.`, 'warning');
      console.table(result.results?.filter(r => !r.ok) || []);
    } else {
      notify(`Imported ${created} users.`, 'success');
    }
    await loadUsers();
  } catch (err) {
    notify(err.message, 'error');
  } finally {
    input.value = '';
  }
}

async function parseImportFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return rowsToUsers(parseCsv(text));
  }
  if (name.endsWith('.xlsx')) {
    const rows = await readXlsxFile(file);
    return rowsToUsers(normalizeWorkbookRows(rows));
  }
  throw new Error('Upload a .csv or .xlsx file.');
}

function normalizeWorkbookRows(rows) {
  if (Array.isArray(rows?.[0]?.data)) return rows[0].data;
  return rows;
}

function rowsToUsers(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(h => normalizeHeader(h));
  return rows.slice(1).map((row, idx) => {
    const get = (...names) => {
      const pos = headers.findIndex(h => names.includes(h));
      return pos >= 0 ? (row[pos] ?? '').toString().trim() : '';
    };
    const parsed = {
      row: idx + 2,
      full_name: get('full_name', 'fullname', 'name', 'nama', 'nama_lengkap'),
      email: get('email', 'email_address', 'alamat_email'),
      phone: get('phone', 'whatsapp', 'wa', 'no_hp', 'nomor_hp', 'contact_number'),
      unit_bisnis: get('unit_bisnis', 'unit_bisnis', 'business_unit', 'unit'),
      role: get('role', 'hak_akses', 'roles') || 'customer',
      password: get('password', 'temporary_password', 'temp_password', 'kata_sandi'),
    };
    return parsed;
  }).filter(row => row.full_name || row.email || row.phone || row.unit_bisnis || row.password);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '"' && quoted && next === '"') {
      cell += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter(r => r.some(c => c.toString().trim()));
}

function normalizeHeader(value) {
  return (value ?? '').toString().trim().toLowerCase().replace(/[\s-]+/g, '_');
}

function confirmImportUsers({ file, validRows, missing }) {
  const roleCounts = validRows.reduce((acc, row) => {
    const role = row.role || 'customer';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {});

  const preview = validRows.slice(0, 5).map(row => `
    <div class="import-preview-row">
      <div>
        <div class="row-main">${escapeHtml(row.full_name)}</div>
        <div class="row-sub">${escapeHtml(row.email)}</div>
      </div>
      <span class="pill ${rolePill(row.role)}">${roleLabel(row.role)}</span>
    </div>
  `).join('');

  const el = document.createElement('div');
  el.className = 'modal-backdrop';
  el.innerHTML = `
    <div class="modal-card import-modal" role="dialog" aria-modal="true" aria-labelledby="importModalTitle">
      <div class="modal-head">
        <div>
          <h3 id="importModalTitle">Import users</h3>
          <p>Create Supabase Auth accounts and HCSP-OM user profiles from this file.</p>
        </div>
        <button class="modal-x" type="button" data-modal-cancel aria-label="Close">&times;</button>
      </div>

      <div class="import-summary">
        <div><span>File</span><b>${escapeHtml(file.name)}</b></div>
        <div><span>Ready</span><b>${validRows.length} users</b></div>
        <div><span>Skipped</span><b>${missing} incomplete rows</b></div>
      </div>

      <div class="import-role-list">
        ${Object.entries(roleCounts).map(([role, count]) => `
          <span class="pill ${rolePill(role)}">${roleLabel(role)}: ${count}</span>
        `).join('')}
      </div>

      <div class="import-note">
        Required columns: <b>full_name</b>, <b>email</b>, and <b>password</b>. Optional columns: role, phone, unit_bisnis.
      </div>

      <div class="import-preview">
        ${preview}
        ${validRows.length > 5 ? `<div class="row-sub" style="padding-top:8px">+ ${validRows.length - 5} more users</div>` : ''}
      </div>

      <div class="modal-actions">
        <button class="btn btn-ghost" type="button" data-modal-cancel>Cancel</button>
        <button class="btn btn-primary" type="button" data-modal-confirm>Import ${validRows.length} users</button>
      </div>
    </div>
  `;

  document.body.appendChild(el);

  return new Promise(resolve => {
    const esc = (e) => {
      if (e.key === 'Escape') close(false);
    };
    const close = (value) => {
      document.removeEventListener('keydown', esc);
      el.classList.add('closing');
      setTimeout(() => el.remove(), 160);
      resolve(value);
    };
    el.querySelectorAll('[data-modal-cancel]').forEach(btn => btn.addEventListener('click', () => close(false)));
    el.querySelector('[data-modal-confirm]').addEventListener('click', () => close(true));
    el.addEventListener('click', e => { if (e.target === el) close(false); });
    document.addEventListener('keydown', esc);
  });
}

function roleLabel(role) {
  return ROLES.find(r => r.value === role)?.label || role || 'Customer';
}

function rolePill(role) {
  if (role === 'admin' || role === 'management') return 'pill-green';
  if (role === 'hcam' || role === 'team') return 'pill-amber';
  return 'pill-dim';
}

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

function plus() {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
}
