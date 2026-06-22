import { supabase } from '../supabase.js'
import { renderOrders } from './order.js'

export async function renderDashboard() {
  try {
    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      document.querySelector('#app').innerHTML = `
        <div class="p-8">
          <h1>No user found</h1>
        </div>
      `
      return
    }

    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    document.querySelector('#app').innerHTML = `
      <div class="min-h-screen bg-gray-100 p-8">

        <div class="bg-white p-6 rounded-lg shadow">

          <h1 class="text-3xl font-bold text-blue-600 mb-6">
            HCSP-OM Dashboard
          </h1>

          <div class="space-y-2">
            <p>
              <strong>Email:</strong>
              ${user.email}
            </p>

            <p>
              <strong>Role:</strong>
              ${profile?.role ?? '-'}
            </p>

            <p>
              <strong>Name:</strong>
              ${profile?.full_name ?? '-'}
            </p>
          </div>

          <div class="mt-6 flex gap-3">

            <button
              id="ordersBtn"
              class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Orders
            </button>

            <button
              id="logoutBtn"
              class="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>

          </div>

        </div>

      </div>
    `

    document
      .querySelector('#ordersBtn')
      .addEventListener('click', () => {
        renderOrders()
      })

    document
      .querySelector('#logoutBtn')
      .addEventListener('click', async () => {
        await supabase.auth.signOut()
        location.reload()
      })

  } catch (err) {
    console.error(err)

    document.querySelector('#app').innerHTML = `
      <div class="p-8 text-red-500">
        ${err.message}
      </div>
    `
  }
}