import { supabase } from './supabaseClient'

// Simple wrappers for common CRUD operations with consistent error handling

export async function selectFrom(table, { columns = '*', match = {}, orderBy, ascending = true, limit, single = false } = {}) {
  let query = supabase.from(table).select(columns)
  if (match && Object.keys(match).length > 0) {
    query = query.match(match)
  }
  if (orderBy) {
    query = query.order(orderBy, { ascending })
  }
  if (limit) {
    query = query.limit(limit)
  }
  const { data, error } = single ? await query.single() : await query
  if (error) throw error
  return data
}

export async function insertInto(table, payload) {
  // In Supabase JS v2, call .select() after insert to return inserted rows
  const { data, error } = await supabase.from(table).insert(payload).select()
  if (error) throw error
  return data
}

export async function updateTable(table, match, changes) {
  const { data, error } = await supabase.from(table).update(changes).match(match).select()
  if (error) throw error
  return data
}

export async function deleteFrom(table, match) {
  const { data, error } = await supabase.from(table).delete().match(match).select()
  if (error) throw error
  return data
}

// Auth helpers
export const auth = {
  signUp: (opts) => supabase.auth.signUp(opts),
  signInWithPassword: ({ email, password }) => supabase.auth.signInWithPassword({ email, password }),
  signOut: () => supabase.auth.signOut(),
  onAuthStateChange: (cb) => supabase.auth.onAuthStateChange(cb),
  getSession: () => supabase.auth.getSession(),
}
