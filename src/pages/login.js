import { supabase } from '../supabase.js'

export function renderLogin() {
  document.querySelector('#app').innerHTML = `
    <div class="min-h-screen bg-gray-100 flex items-center justify-center">
      <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 class="text-2xl font-bold text-center mb-6 text-blue-600">HCSP-OM</h1>
        <p class="text-center text-gray-500 mb-6">Human Capital Order Management</p>
        
        <input id="email" type="email" placeholder="Email" 
          class="w-full border p-3 rounded mb-3 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        <input id="password" type="password" placeholder="Password" 
          class="w-full border p-3 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"/>
        <button id="loginBtn" 
          class="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700">
          Login
        </button>
        <p id="errorMsg" class="text-red-500 text-sm text-center mt-3 hidden"></p>
      </div>
    </div>
  `

  document.querySelector('#loginBtn').addEventListener('click', async () => {
    const email = document.querySelector('#email').value
    const password = document.querySelector('#password').value
    const errorMsg = document.querySelector('#errorMsg')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      errorMsg.textContent = error.message
      errorMsg.classList.remove('hidden')
    } else {
      window.location.reload()
    }
  })
}