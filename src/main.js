import { supabase } from './supabase.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderOrders } from './pages/order.js';

async function initApp() {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    renderLogin();
    return;
  }

  // Fetch profile to get roles and full names
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', session.user.id)
    .single();

  // 1. Inject permanent layout shell layout once
  document.querySelector('#app').innerHTML = `
    <div class="min-h-screen flex flex-col bg-gray-100 text-gray-800">
      <header class="bg-blue-600 text-white h-16 flex items-center justify-between px-6 shadow-md z-10">
        <div class="flex items-center gap-4">
          <span class="text-xl font-bold tracking-wider">HCSP-OM</span>
          <span class="text-xs bg-blue-700 px-2.5 py-1 rounded border border-blue-500/30 uppercase font-semibold">
            ${profile?.role ?? 'User'} Portal
          </span>
        </div>
        <div class="flex items-center gap-4 text-sm">
          <span class="hidden sm:inline font-medium text-blue-100">${profile?.full_name ?? session.user.email}</span>
          <button id="globalLogoutBtn" class="bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded text-xs font-semibold transition">
            Logout
          </button>
        </div>
      </header>

      <div class="flex flex-1">
        <aside class="w-64 bg-slate-900 text-slate-400 flex flex-col justify-between border-r border-slate-800 shadow-xl">
          <nav id="sidebarNav" class="p-4 space-y-1">
            <button id="navDashboard" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition text-left bg-slate-800 text-white">
              📊 Dashboard
            </button>
            <button id="navOrders" class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition text-left hover:bg-slate-800 hover:text-white">
              📦 Action Orders
            </button>
          </nav>
          <div class="p-4 border-t border-slate-800 text-center text-[10px] tracking-wider text-slate-600 font-mono">
            HCSP-OM CORE
          </div>
        </aside>

        <main id="main-content" class="flex-1 p-8 overflow-y-auto"></main>
      </div>
    </div>
  `;

  // Helper to toggle active UI highlights on the sidebar buttons
  function setUIActive(activeBtnId) {
    const buttons = document.querySelectorAll('#sidebarNav button');
    buttons.forEach(btn => {
      if (btn.id === activeBtnId) {
        btn.classList.add('bg-slate-800', 'text-white');
        btn.classList.remove('hover:bg-slate-800', 'hover:text-white');
      } else {
        btn.classList.remove('bg-slate-800', 'text-white');
        btn.classList.add('hover:bg-slate-800', 'hover:text-white');
      }
    });
  }

  // 2. Bind navigation listeners immediately after elements exist in DOM
  const dashboardBtn = document.querySelector('#navDashboard');
  const ordersBtn = document.querySelector('#navOrders');
  const logoutBtn = document.querySelector('#globalLogoutBtn');

  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      console.log('Routing to Dashboard...');
      setUIActive('navDashboard');
      renderDashboard(profile);
    });
  }

  if (ordersBtn) {
    ordersBtn.addEventListener('click', () => {
      console.log('Routing to Orders...');
      setUIActive('navOrders');
      renderOrders(profile);
    });
  }
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  }

  // 3. Define global quick-link routing jump hook
  window.navigateToOrders = () => {
    if (ordersBtn) ordersBtn.click();
  };

  // 4. Initial default boot state execution
  renderDashboard(profile);
}

initApp();