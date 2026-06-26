export async function renderDashboard(profile) {
  const container = document.querySelector('#main-content');
  if (!container) return;

  container.innerHTML = `
    <div class="max-w-5xl mx-auto text-left space-y-6">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 !my-0">HCSP-OM Dashboard</h1>
        <p class="text-xs text-gray-500 mt-1">Human Capital Operational Overview Hub</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <span class="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">Name</span>
          <span class="text-base font-bold text-gray-800 block mt-1">${profile?.full_name ?? 'Admin User'}</span>
        </div>
        <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <span class="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">Role Assignment</span>
          <span class="text-base font-bold text-gray-800 block mt-1 uppercase">${profile?.role ?? 'ADMIN'}</span>
        </div>
        <div class="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
          <span class="text-[10px] uppercase tracking-wider font-bold text-gray-400 block">Unit Bisnis</span>
          <span class="text-base font-bold text-gray-800 block mt-1">-</span>
        </div>
      </div>

      <div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <button id="dashViewOrdersBtn" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold transition shadow-sm">
          View Active Orders
        </button>
      </div>
    </div>
  `;

  // Wire up the button element click event handler
  const viewOrdersBtn = document.querySelector('#dashViewOrdersBtn');
  if (viewOrdersBtn) {
    viewOrdersBtn.addEventListener('click', () => {
      if (typeof window.navigateToOrders === 'function') {
        window.navigateToOrders(); // Triggers the sidebar navigation flow cleanly
      }
    });
  }
}