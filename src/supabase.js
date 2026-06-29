import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(value) {
  const raw = (value || '').trim().replace(/^['"]|['"]$/g, '')
  if (!raw) return ''

  const dashboardMatch = raw.match(/supabase\.com\/(?:dashboard\/)?project\/([a-z0-9-]+)/i)
  if (dashboardMatch?.[1]) return `https://${dashboardMatch[1]}.supabase.co`

  if (/^[a-z0-9-]+\.supabase\.co(?:\/.*)?$/i.test(raw)) {
    return new URL(`https://${raw}`).origin
  }

  if (/^[a-z0-9]{15,30}$/i.test(raw)) {
    return `https://${raw}.supabase.co`
  }

  try {
    const url = new URL(raw)
    return url.origin
  } catch (_) {
    return raw.replace(/\/+$/, '')
  }
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim().replace(/^['"]|['"]$/g, '')

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variable')
}

export const supabaseConfigInfo = {
  url: supabaseUrl,
  host: (() => {
    try { return new URL(supabaseUrl).host } catch (_) { return supabaseUrl }
  })(),
}

export const supabase = createClient(supabaseUrl, supabaseKey)
