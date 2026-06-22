import { supabase } from './supabase.js'
import { renderLogin } from './pages/login.js'
import { renderDashboard } from './pages/dashboard.js'

const {
  data: { session }
} = await supabase.auth.getSession()

if (session) {
  renderDashboard()
} else {
  renderLogin()
}