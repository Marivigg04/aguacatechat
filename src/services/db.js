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

// Conversations helpers
// Create (or find) a direct conversation between two users and ensure both participants are inserted.
// Returns the conversation row { id, type, created_at }
export async function createOrGetDirectConversation(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId) {
    throw new Error('Faltan IDs de usuario para crear la conversación')
  }
  if (currentUserId === otherUserId) {
    throw new Error('No puedes iniciar un chat directo contigo mismo')
  }

  // 1) Buscar si ya existe una conversación directa con ambos participantes
  const { data: existingRows, error: findErr } = await supabase
    .from('participants')
    .select('conversation_id, user_id, conversations!inner(id, type)')
    .eq('conversations.type', 'direct')
    .in('user_id', [currentUserId, otherUserId])

  if (findErr) throw findErr

  if (existingRows && existingRows.length > 0) {
    // Agrupar por conversación y verificar que estén ambos user_ids
    const byConv = new Map()
    for (const row of existingRows) {
      const key = row.conversation_id
      if (!byConv.has(key)) byConv.set(key, new Set())
      byConv.get(key).add(row.user_id)
    }
    for (const [convId, userSet] of byConv.entries()) {
      if (userSet.has(currentUserId) && userSet.has(otherUserId)) {
        // Ya existe, devolver la conversación encontrada
        return { id: convId, type: 'direct' }
      }
    }
  }

  // 2) Crear conversación directa SIN RETURNING para evitar RLS en SELECT
  const convId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
        return v.toString(16)
      })
  const { error: convErr } = await supabase
    .from('conversations')
    .insert({ id: convId, type: 'direct' })

  if (convErr) throw convErr

  // 3) Insertar participantes
  // 3a) Siempre insertar al usuario actual (suele estar permitido por RLS)
  const { error: selfErr } = await supabase
    .from('participants')
    .insert({ conversation_id: convId, user_id: currentUserId })

  if (selfErr) throw selfErr

  // 3b) Insertar al otro usuario
  const { error: otherErr } = await supabase
    .from('participants')
    .insert({ conversation_id: convId, user_id: otherUserId })

  if (otherErr) throw otherErr

  return { id: convId, type: 'direct' }
}

// List conversations for a user, including the other participant's profile (for direct chats)
export async function fetchUserConversations(currentUserId) {
  if (!currentUserId) return []

  // 1) Mis participaciones con datos de conversación
  const { data: myRows, error: myErr } = await supabase
    .from('participants')
    .select('conversation_id, conversations(id, type, created_at)')
    .eq('user_id', currentUserId)

  if (myErr) throw myErr
  const convIds = Array.from(new Set((myRows || []).map(r => r.conversation_id)))
  if (convIds.length === 0) return []

  // 2) Otros participantes en esas conversaciones
  const { data: others, error: othersErr } = await supabase
    .from('participants')
    .select('conversation_id, user_id')
    .in('conversation_id', convIds)
    .neq('user_id', currentUserId)

  if (othersErr) throw othersErr

  const otherUserIds = Array.from(new Set((others || []).map(o => o.user_id)))

  // 3) Perfiles de los otros usuarios (bulk)
  let profiles = []
  if (otherUserIds.length > 0) {
    const { data: profs, error: profErr } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, isOnline, lastConex')
      .in('id', otherUserIds)
    if (profErr) throw profErr
    profiles = profs || []
  }
  const profileMap = new Map(profiles.map(p => [p.id, p]))

  // 4) Mapear por conversación sus otros participantes
  const byConvOthers = new Map()
  for (const o of (others || [])) {
    const arr = byConvOthers.get(o.conversation_id) || []
    arr.push(o.user_id)
    byConvOthers.set(o.conversation_id, arr)
  }

  // 5) Último mensaje por conversación (bulk)
  const lastByConv = new Map()
  {
    // Traer mensajes de todas las conv en orden descendente y quedarnos con el primero de cada conv
    const { data: msgs, error: msgErr } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, type, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })
      .limit(convIds.length * 20) // margen por si hay convs sin mensajes

    if (msgErr && msgErr.code !== 'PGRST116') { // código de sin resultados no es error crítico
      throw msgErr
    }
    for (const m of (msgs || [])) {
      if (!lastByConv.has(m.conversation_id)) {
        lastByConv.set(m.conversation_id, m)
      }
    }
  }

  // 6) Componer resultado amigable para UI con último mensaje y orden por actividad
  const result = []
  for (const r of (myRows || [])) {
    const convId = r.conversation_id
    const conv = r.conversations || {}
    const otherIds = byConvOthers.get(convId) || []
    const otherId = otherIds[0] || null
    const prof = otherId ? profileMap.get(otherId) : null
    const last = lastByConv.get(convId) || null
    result.push({
      conversationId: convId,
      type: conv.type || 'direct',
      created_at: conv.created_at,
      otherUserId: otherId,
      otherProfile: prof,
  last_message: last ? { id: last.id, content: last.content, sender_id: last.sender_id, type: last.type } : null,
      last_message_at: last?.created_at || conv.created_at,
    })
  }

  // Ordenar por la más reciente primero
  result.sort((a, b) => {
    const ta = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
    const tb = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
    return tb - ta
  })

  return result
}

// Messages helpers
export async function insertMessage({ conversationId, senderId, content, type }) {
  if (!conversationId || !senderId || !content?.trim()) {
    throw new Error('Datos de mensaje incompletos')
  }
  const payload = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
    ...(type ? { type } : {}),
  }
  console.log('Inserting message:', payload);
  const { error } = await supabase.from('messages').insert(payload)
  if (error) {
    console.error('Error inserting message:', error);
    throw error
  }
  console.log('Message inserted successfully');
  return true
}

export async function fetchMessagesByConversation(conversationId, { limit } = {}) {
  if (!conversationId) return []
  let query = supabase
    .from('messages')
    .select('id, sender_id, content, type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

// Cursor-based pagination for messages
// - Returns the latest "limit" messages when before is null
// - When before is provided (ISO date), returns messages older than that timestamp
// Always returns messages sorted ASC (oldest -> newest) for rendering
export async function fetchMessagesPage(conversationId, { limit = 30, before = null } = {}) {
  if (!conversationId) return { messages: [], hasMore: false, nextCursor: null }
  let query = supabase
    .from('messages')
    .select('id, sender_id, content, type, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect if there are more

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data || []
  const hasMore = rows.length > limit
  const trimmed = hasMore ? rows.slice(0, limit) : rows
  const messages = trimmed.slice().reverse() // ASC for UI
  const nextCursor = messages.length > 0 ? messages[0].created_at : before

  return { messages, hasMore, nextCursor }
}

// Upload an audio blob to 'chataudios' bucket and return its public URL
export async function uploadAudioToBucket({ blob, conversationId, userId, mimeType }) {
  if (!blob) throw new Error('No audio blob provided')
  const bucket = 'chataudios'
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const rand = Math.random().toString(16).slice(2)
  const ext = mimeType?.includes('ogg') ? 'ogg' : (mimeType?.includes('webm') ? 'webm' : 'bin')
  const path = `${userId || 'unknown'}/${conversationId || 'misc'}/${ts}_${rand}.${ext}`

  const { error: uploadErr } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: mimeType || 'application/octet-stream',
    upsert: false,
  })
  if (uploadErr) {
    console.error('Error subiendo audio:', uploadErr)
    throw uploadErr
  }

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) throw new Error('No se pudo obtener URL pública del audio')
  return { publicUrl, path }
}
