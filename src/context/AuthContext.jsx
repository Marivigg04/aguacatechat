import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabaseClient'

// Keys for sessionStorage to keep data only for the current session
const SESSION_USER_KEY = 'ac_user'

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
  session: null,
  user: null, // { id, email, username, fullName, raw }
  signOut: async () => {},
})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(() => loadUserFromStorage())
  const [loading, setLoading] = useState(true)

  // Initialize from Supabase session and subscribe to changes
  useEffect(() => {
    let mounted = true

    const init = async () => {
      setLoading(true)
      const { data } = await supabase.auth.getSession()
      if (!mounted) return

      const sess = data?.session || null
      const mappedUser = mapSupabaseUser(sess?.user)
      setSession(sess)
      setUser(mappedUser)
      saveUserToStorage(mappedUser)
      setLoading(false)
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      const mappedUser = mapSupabaseUser(newSession?.user)
      setSession(newSession)
      setUser(mappedUser)
      saveUserToStorage(mappedUser)
    })

    return () => {
      mounted = false
      sub?.subscription?.unsubscribe?.()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    // onAuthStateChange will run, but ensure local cleanup too
    setSession(null)
    setUser(null)
    saveUserToStorage(null)
  }

  const value = useMemo(() => ({
    isAuthenticated: !!session,
    loading,
    session,
    user,
    signOut,
  }), [session, loading, user])

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
