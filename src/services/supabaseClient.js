import { createClient } from '@supabase/supabase-js'

// Read Vite environment variables. Define these in your .env/.env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const hasSupabaseEnv = !!supabaseUrl && !!supabaseAnonKey

if (!hasSupabaseEnv) {
  // Provide a friendly warning during development if variables are missing
  // Avoid throwing here so build/dev server can still start and show a clear message
  console.warn('[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to your .env.local')
}

function createMockQuery() {
  const chain = {
    select: async () => ({ data: [], error: null }),
    insert: async () => ({ data: [], error: null }),
    update: async () => ({ data: [], error: null }),
    delete: async () => ({ data: [], error: null }),
    upsert: async () => ({ data: [], error: null }),
    single: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
  }
  const chainable = ['eq', 'neq', 'in', 'order', 'limit', 'gt', 'lt', 'match']
  chainable.forEach((method) => {
    chain[method] = () => chain
  })
  return chain
}

function createMockClient() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signOut: async () => ({ error: null }),
      signUp: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: null }),
      resetPasswordForEmail: async () => ({ data: null, error: null }),
    },
    from: () => createMockQuery(),
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        remove: async () => ({ data: null, error: null }),
        getPublicUrl: (path) => ({ data: { publicUrl: path ? '' : '' }, error: null }),
      }),
    },
    channel: () => ({
      on: () => ({
        on: () => createMockClient().channel(),
        subscribe: () => {},
      }),
      subscribe: () => {},
    }),
    removeChannel: () => {},
  }
}

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createMockClient()

// Optional: expose globally to keep compatibility with legacy code using window.supabase
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.supabase = supabase
}

export default supabase
