import { createClient } from '@supabase/supabase-js'

// Read Vite environment variables. Define these in your .env/.env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Provide a friendly warning during development if variables are missing
  // Avoid throwing here so build/dev server can still start and show a clear message
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to your .env.local')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

// Optional: expose globally to keep compatibility with legacy code using window.supabase
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.supabase = supabase
}

export default supabase
