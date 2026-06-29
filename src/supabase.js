import { createClient } from '@supabase/supabase-js'

function normalizeSupabaseUrl(value) {
  const raw = (value || '').trim().replace(/^['"]|['"]$/g, '')
  if (!raw) return ''

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

export const supabase = createClient(supabaseUrl, supabaseKey)
