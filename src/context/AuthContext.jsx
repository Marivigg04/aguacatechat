import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'

// Keys for sessionStorage to keep data only for the current session
const SESSION_USER_KEY = 'ac_user'
const DEMO_MODE_KEY = 'ac_demo_mode'

const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111'

function loadDemoFlag() {
  try {
    return sessionStorage.getItem(DEMO_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

function saveDemoFlag(flag) {
  try {
    if (flag) sessionStorage.setItem(DEMO_MODE_KEY, 'true')
    else sessionStorage.removeItem(DEMO_MODE_KEY)
  } catch {
    // ignore storage errors
  }
}

function buildDemoUser() {
  return {
    id: DEMO_USER_ID,
    email: 'demo@aguacate.chat',
    username: 'Demo',
    fullName: 'Demo User',
    raw: {
      id: DEMO_USER_ID,
      email: 'demo@aguacate.chat',
      user_metadata: { username: 'Demo', fullName: 'Demo User' },
    },
    isDemo: true,
  }
}

// Shape helper: extract minimal user fields we need across the app
function mapSupabaseUser(user) {
  if (!user) return null
  const meta = user.user_metadata || {}
  return {
    id: user.id || null,
    email: user.email || null,
    username: meta.username || meta.user_name || meta.user || null,
    fullName: meta.fullName || meta.full_name || meta.name || null,
    // Keep the raw supabase user for advanced cases
    raw: user,
    isDemo: false,
  }
}

function loadUserFromStorage() {
  try {
    const raw = sessionStorage.getItem(SESSION_USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveUserToStorage(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_USER_KEY, JSON.stringify(user))
    else sessionStorage.removeItem(SESSION_USER_KEY)
  } catch {
    // ignore storage errors (e.g. quota or disabled)
  }
}

const AuthContext = createContext({
  isAuthenticated: false,
  loading: true,
  isDemo: false,
  session: null,
  user: null, // { id, email, username, fullName, raw }
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(() => loadUserFromStorage())
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(() => loadDemoFlag())

  // Initialize from Supabase session and subscribe to changes
  useEffect(() => {
    let mounted = true
    let settled = false
    let timeoutId = null

    const enableDemoFallback = (reason) => {
      if (!mounted || settled) return
      settled = true
      const demoUser = buildDemoUser()
      setSession(null)
      setUser(demoUser)
      setIsDemo(true)
      saveUserToStorage(demoUser)
      saveDemoFlag(true)
      setLoading(false)
      if (import.meta.env?.DEV) {
        console.warn('[Auth] Demo fallback enabled:', reason)
      }
    }

    const init = async () => {
      setLoading(true)

      if (loadDemoFlag()) {
        const demoUser = buildDemoUser()
        setSession(null)
        setUser(demoUser)
        setIsDemo(true)
        saveUserToStorage(demoUser)
        setLoading(false)
        return
      }

      const supabaseReady = !!import.meta.env?.VITE_SUPABASE_URL && !!import.meta.env?.VITE_SUPABASE_ANON_KEY
      if (!supabaseReady) {
        enableDemoFallback('missing supabase env')
        return
      }

      timeoutId = setTimeout(() => {
        enableDemoFallback('auth timeout')
      }, 2500)

      try {
        const { data, error } = await supabase.auth.getSession()
        if (!mounted || settled) return
        settled = true
        if (timeoutId) clearTimeout(timeoutId)

        if (error) {
          enableDemoFallback(error.message || 'getSession error')
          return
        }

        const sess = data?.session || null
        const mappedUser = mapSupabaseUser(sess?.user)
        setSession(sess)
        setUser(mappedUser)
        saveUserToStorage(mappedUser)
        setLoading(false)
      } catch (e) {
        if (timeoutId) clearTimeout(timeoutId)
        enableDemoFallback(e?.message || 'getSession exception')
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (loadDemoFlag()) return
      const mappedUser = mapSupabaseUser(newSession?.user)
      setSession(newSession)
      setUser(mappedUser)
      saveUserToStorage(mappedUser)
    })

    return () => {
      mounted = false
      if (timeoutId) clearTimeout(timeoutId)
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const signOut = async () => {
    if (isDemo) {
      setSession(null)
      setUser(null)
      setIsDemo(false)
      saveUserToStorage(null)
      saveDemoFlag(false)
      return
    }
    await supabase.auth.signOut()
    // onAuthStateChange will run, but ensure local cleanup too
    setSession(null)
    setUser(null)
    saveUserToStorage(null)
  }

  const value = useMemo(() => ({
    // Consider either an active Supabase session OR a previously stored user
    // to prevent unwanted redirects during initial load/refresh.
    isAuthenticated: !!(session || user),
    loading,
    isDemo,
    session,
    user,
    signOut,
  }), [session, loading, user, isDemo])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Optional helper for non-React modules that need the user data
export function getCurrentUser() {
  return loadUserFromStorage()
}
