import { supabase } from './supabaseClient'

const DEMO_MODE_KEY = 'ac_demo_mode'
const DEMO_STORE_KEY = 'ac_demo_store'

const DEMO_USER_ID = '11111111-1111-4111-8111-111111111111'
const DEMO_OTHER_ID = '22222222-2222-4222-8222-222222222222'
const DEMO_CONV_ID = '33333333-3333-4333-8333-333333333333'

let demoStoreCache = null

function isDemoMode() {
  try {
    return sessionStorage.getItem(DEMO_MODE_KEY) === 'true'
  } catch {
    return false
  }
}

function demoNowIso(offsetMinutes = 0) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString()
}

function buildDefaultDemoStore() {
  return {
    profiles: [
      {
        id: DEMO_USER_ID,
        email: 'demo@aguacate.chat',
        username: 'Demo',
        avatar_url: 'https://i.pravatar.cc/150?u=demo',
        isOnline: true,
        lastConex: demoNowIso(-5),
        profileInformation: 'Cuenta demo para pruebas',
        push_token: null,
      },
      {
        id: DEMO_OTHER_ID,
        email: 'cliente@aguacate.chat',
        username: 'Cliente',
        avatar_url: 'https://i.pravatar.cc/150?u=cliente',
        isOnline: false,
        lastConex: demoNowIso(-45),
        profileInformation: 'Contacto de ejemplo',
        push_token: null,
      },
    ],
    conversations: [
      {
        id: DEMO_CONV_ID,
        type: 'direct',
        created_at: demoNowIso(-120),
        created_by: DEMO_USER_ID,
        acepted: true,
        blocked: false,
        blocked_by: null,
      },
    ],
    participants: [
      { conversation_id: DEMO_CONV_ID, user_id: DEMO_USER_ID, isTyping: false },
      { conversation_id: DEMO_CONV_ID, user_id: DEMO_OTHER_ID, isTyping: false },
    ],
    messages: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        conversation_id: DEMO_CONV_ID,
        sender_id: DEMO_OTHER_ID,
        content: 'Hola, este es un chat de prueba para la demo.',
        created_at: demoNowIso(-60),
        type: 'text',
        seen: null,
        replyng_to: null,
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        conversation_id: DEMO_CONV_ID,
        sender_id: DEMO_USER_ID,
        content: 'Perfecto. Estoy probando la interfaz sin Supabase.',
        created_at: demoNowIso(-55),
        type: 'text',
        seen: DEMO_OTHER_ID,
        replyng_to: null,
      },
    ],
    clear_chat: [],
    histories: [],
    history_views: [],
  }
}

function loadDemoStore() {
  try {
    const raw = sessionStorage.getItem(DEMO_STORE_KEY)
    if (!raw) return buildDefaultDemoStore()
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return buildDefaultDemoStore()
    return parsed
  } catch {
    return buildDefaultDemoStore()
  }
}

function getDemoStore() {
  if (!demoStoreCache) demoStoreCache = loadDemoStore()
  return demoStoreCache
}

function saveDemoStore(store) {
  demoStoreCache = store
  try {
    sessionStorage.setItem(DEMO_STORE_KEY, JSON.stringify(store))
  } catch {
    // ignore storage errors
  }
}

function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function matchRow(row, match = {}) {
  if (!match || Object.keys(match).length === 0) return true
  return Object.entries(match).every(([key, value]) => row?.[key] === value)
}

function pickColumns(row, columns) {
  if (!columns || columns === '*') return { ...row }
  const cols = columns
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c && !c.includes('(') && !c.includes('!'))
  if (cols.length === 0) return { ...row }
  const out = {}
  for (const c of cols) out[c] = row?.[c]
  return out
}

// Simple wrappers for common CRUD operations with consistent error handling

export async function selectFrom(table, { columns = '*', match = {}, orderBy, ascending = true, limit, single = false } = {}) {
  if (isDemoMode()) {
    const store = getDemoStore()
    const rows = Array.isArray(store[table]) ? store[table] : []
    let result = rows.filter((r) => matchRow(r, match))
    if (orderBy) {
      result = result.slice().sort((a, b) => {
        const av = a?.[orderBy]
        const bv = b?.[orderBy]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        if (av < bv) return ascending ? -1 : 1
        if (av > bv) return ascending ? 1 : -1
        return 0
      })
    }
    if (limit) result = result.slice(0, limit)
    const mapped = result.map((r) => pickColumns(r, columns))
    if (single) return mapped[0] || null
    return mapped
  }
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
  if (isDemoMode()) {
    const store = getDemoStore()
    const rows = Array.isArray(store[table]) ? store[table] : []
    const items = Array.isArray(payload) ? payload : [payload]
    const inserted = items.map((item) => {
      const next = { ...item }
      if (!next.id && ['messages', 'histories', 'history_views', 'conversations'].includes(table)) {
        next.id = generateId()
      }
      if (table === 'messages' && !next.created_at) next.created_at = demoNowIso(0)
      return next
    })
    store[table] = [...rows, ...inserted]
    saveDemoStore(store)
    return inserted
  }
  // In Supabase JS v2, call .select() after insert to return inserted rows
  const { data, error } = await supabase.from(table).insert(payload).select()
  if (error) throw error
  return data
}

export async function updateTable(table, match, changes) {
  if (isDemoMode()) {
    const store = getDemoStore()
    const rows = Array.isArray(store[table]) ? store[table] : []
    const updated = []
    const nextRows = rows.map((r) => {
      if (!matchRow(r, match)) return r
      const next = { ...r, ...changes }
      updated.push(next)
      return next
    })
    store[table] = nextRows
    saveDemoStore(store)
    return updated
  }
  const { data, error } = await supabase.from(table).update(changes).match(match).select()
  if (error) throw error
  return data
}

export async function deleteFrom(table, match) {
  if (isDemoMode()) {
    const store = getDemoStore()
    const rows = Array.isArray(store[table]) ? store[table] : []
    const removed = rows.filter((r) => matchRow(r, match))
    const kept = rows.filter((r) => !matchRow(r, match))
    store[table] = kept
    saveDemoStore(store)
    return removed
  }
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
  if (isDemoMode()) {
    if (!currentUserId || !otherUserId) {
      throw new Error('Faltan IDs de usuario para crear la conversación')
    }
    const store = getDemoStore()
    const conversations = store.conversations || []
    const participants = store.participants || []
    const existing = conversations.find((conv) => {
      if (conv.type !== 'direct') return false
      const ids = participants
        .filter((p) => p.conversation_id === conv.id)
        .map((p) => p.user_id)
      return ids.includes(currentUserId) && ids.includes(otherUserId)
    })
    if (existing) return { id: existing.id, type: 'direct' }
    const convId = generateId()
    const newConv = {
      id: convId,
      type: 'direct',
      created_at: demoNowIso(0),
      created_by: currentUserId,
      acepted: true,
      blocked: false,
      blocked_by: null,
    }
    store.conversations = [...conversations, newConv]
    store.participants = [
      ...participants,
      { conversation_id: convId, user_id: currentUserId, isTyping: false },
      { conversation_id: convId, user_id: otherUserId, isTyping: false },
    ]
    saveDemoStore(store)
    return { id: convId, type: 'direct' }
  }
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
    .insert({ id: convId, type: 'direct', created_by: currentUserId })

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
  if (isDemoMode()) {
    if (!currentUserId) return []
    const store = getDemoStore()
    const conversations = store.conversations || []
    const participants = store.participants || []
    const profiles = store.profiles || []
    const messages = store.messages || []

    const myConvs = conversations.filter((conv) =>
      participants.some((p) => p.conversation_id === conv.id && p.user_id === currentUserId)
    )

    return myConvs.map((conv) => {
      const otherParticipant = participants.find(
        (p) => p.conversation_id === conv.id && p.user_id !== currentUserId
      )
      const otherProfile = profiles.find((p) => p.id === otherParticipant?.user_id) || null
      const last = messages
        .filter((m) => m.conversation_id === conv.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0] || null
      return {
        conversationId: conv.id,
        type: conv.type || 'direct',
        created_at: conv.created_at,
        created_by: conv.created_by,
        acepted: conv.acepted,
        otherUserId: otherParticipant?.user_id || null,
        otherProfile,
        last_message: last
          ? { id: last.id, content: last.content, sender_id: last.sender_id, type: last.type || 'text', seen: last.seen || null }
          : null,
        last_message_at: last?.created_at || conv.created_at,
      }
    }).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
  }
  if (!currentUserId) return []

  // 1) Mis participaciones con datos de conversación
  const { data: myRows, error: myErr } = await supabase
    .from('participants')
    // Incluimos created_by y acepted para identificar solicitudes entrantes
    .select('conversation_id, conversations(id, type, created_at, created_by, acepted)')
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
  .select('id, username, avatar_url, isOnline, lastConex, profileInformation')
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
      .select('id, conversation_id, sender_id, content, created_at, type, seen')
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
      created_by: conv.created_by,
      acepted: conv.acepted, // puede venir null/false
      otherUserId: otherId,
      otherProfile: prof,
      // `seen` stored as a single user id or null in direct conversations
      last_message: last ? { id: last.id, content: last.content, sender_id: last.sender_id, type: last.type || 'text', seen: (typeof last.seen === 'string' ? last.seen : null) } : null,
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
export async function insertMessage({ conversationId, senderId, content, type, replyng_to, reply_to, replyTo }) {
  if (isDemoMode()) {
    if (!conversationId || !senderId || !content?.trim()) {
      throw new Error('Datos de mensaje incompletos')
    }
    const store = getDemoStore()
    const normalizedReply = replyng_to || reply_to || replyTo || null
    const payload = {
      id: generateId(),
      conversation_id: conversationId,
      sender_id: senderId,
      content: content.trim(),
      created_at: demoNowIso(0),
      type: type || 'text',
      seen: null,
      replyng_to: normalizedReply,
    }
    store.messages = [...(store.messages || []), payload]
    saveDemoStore(store)
    return true
  }
  if (!conversationId || !senderId || !content?.trim()) {
    throw new Error('Datos de mensaje incompletos')
  }
  // Normalizar posibles nombres de la propiedad (reply_to solicitado, replyTo camelCase)
  const normalizedReply = replyng_to || reply_to || replyTo || null;
  const payload = {
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
    ...(type ? { type } : {}),
    ...(normalizedReply ? { replyng_to: normalizedReply } : {}),
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
  if (isDemoMode()) {
    if (!conversationId) return []
    const store = getDemoStore()
    let result = (store.messages || []).filter((m) => m.conversation_id === conversationId)
    result = result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    if (limit) result = result.slice(0, limit)
    return result
  }
  if (!conversationId) return []
  let query = supabase
    .from('messages')
  .select('id, sender_id, content, created_at, type, replyng_to')
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
export async function fetchMessagesPage(conversationId, { limit = 30, before = null, afterMessageId = null, afterTimestamp = null } = {}) {
  if (isDemoMode()) {
    if (!conversationId) return { messages: [], hasMore: false, nextCursor: null }
    const store = getDemoStore()
    let rows = (store.messages || [])
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    if (before) rows = rows.filter((m) => new Date(m.created_at) < new Date(before))
    if (afterTimestamp) rows = rows.filter((m) => new Date(m.created_at) > new Date(afterTimestamp))

    const hasMore = rows.length > limit
    let trimmed = hasMore ? rows.slice(0, limit) : rows
    if (afterMessageId && !afterTimestamp) {
      trimmed = trimmed.filter((m) => m.id !== afterMessageId)
    }
    const messages = trimmed.slice().reverse()
    const nextCursor = messages.length > 0 ? messages[0].created_at : before
    return { messages, hasMore, nextCursor }
  }
  if (!conversationId) return { messages: [], hasMore: false, nextCursor: null }
  let query = supabase
    .from('messages')
  .select('id, sender_id, content, type, created_at, seen, replyng_to')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit + 1) // fetch one extra to detect if there are more

  if (before) {
    query = query.lt('created_at', before)
  }
  if (afterTimestamp) {
    query = query.gt('created_at', afterTimestamp)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data || []
  const hasMore = rows.length > limit
  let trimmed = hasMore ? rows.slice(0, limit) : rows

  if (afterMessageId && !afterTimestamp) {
    trimmed = trimmed.filter(m => m.id !== afterMessageId)
  }
  const messages = trimmed.slice().reverse() // ASC for UI
  const nextCursor = messages.length > 0 ? messages[0].created_at : before

  return { messages, hasMore, nextCursor }
}

// Delete a single message (hard delete) so it's removed for all participants.
// Returns true if successful. Relies on RLS so only sender (or authorized) can delete.
export async function deleteMessageById(messageId) {
  if (isDemoMode()) {
    if (!messageId) throw new Error('messageId requerido')
    const store = getDemoStore()
    store.messages = (store.messages || []).filter((m) => m.id !== messageId)
    saveDemoStore(store)
    return true
  }
  if (!messageId) throw new Error('messageId requerido');
  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', messageId);
  if (error) throw error;
  return true;
}

// Upload an audio blob to 'chataudios' bucket and return its public URL
export async function uploadAudioToBucket({ blob, conversationId, userId, mimeType }) {
  if (isDemoMode()) {
    let publicUrl = ''
    try {
      if (blob && typeof URL !== 'undefined') publicUrl = URL.createObjectURL(blob)
    } catch {
      publicUrl = ''
    }
    return { publicUrl: publicUrl || 'https://example.com/demo-audio.ogg', path: 'demo/audio.ogg' }
  }
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

// Upload a video file to 'chatvideos' bucket and return its public URL
// Phase 1 (sin compresión ni thumbnail). Valida tamaño externo antes de llamar.
export async function uploadVideoToBucket({ file, conversationId, userId, bucket = 'chatvideos' }) {
  if (isDemoMode()) {
    let publicUrl = ''
    try {
      if (file && typeof URL !== 'undefined') publicUrl = URL.createObjectURL(file)
    } catch {
      publicUrl = ''
    }
    return { publicUrl: publicUrl || 'https://example.com/demo-video.mp4', path: 'demo/video.mp4' }
  }
  if (!file) throw new Error('No video file provided')
  const bucketName = bucket
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const rand = Math.random().toString(16).slice(2)
  const safeName = (file.name || 'video').replace(/[^a-zA-Z0-9_.-]/g, '_')
  const ext = safeName.includes('.') ? safeName.split('.').pop() : (file.type.split('/')[1] || 'mp4')
  const path = `${userId || 'unknown'}/${conversationId || 'misc'}/${ts}_${rand}.${ext}`

  const { error: uploadErr } = await supabase.storage.from(bucketName).upload(path, file, {
    contentType: file.type || 'video/mp4',
    upsert: false,
  })
  if (uploadErr) {
    console.error('Error subiendo video:', uploadErr)
    throw uploadErr
  }
  const { data: pub } = supabase.storage.from(bucketName).getPublicUrl(path)
  const publicUrl = pub?.publicUrl
  if (!publicUrl) throw new Error('No se pudo obtener URL pública del video')
  return { publicUrl, path }
}

// Mark a message as seen by a single user. For direct conversations only there
// will be at most one viewer, so the `messages.seen` column is treated as a
// single user id (string) or null. This function will set `seen` to the
// provided userId if it isn't already set to that value.
export async function appendUserToMessageSeen(messageId, userId) {
  if (isDemoMode()) {
    if (!messageId || !userId) return { updated: false }
    const store = getDemoStore()
    const msgIndex = (store.messages || []).findIndex((m) => m.id === messageId)
    if (msgIndex === -1) return { updated: false }
    const msg = store.messages[msgIndex]
    if (msg.seen === userId) return { updated: false, seen: msg.seen }
    const updated = { ...msg, seen: userId }
    store.messages[msgIndex] = updated
    saveDemoStore(store)
    return { updated: true, seen: updated.seen }
  }
  if (!messageId || !userId) return { updated: false }
  // 1) Read current seen value
  const { data: row, error: selErr } = await supabase
    .from('messages')
    .select('id, seen')
    .eq('id', messageId)
    .single()
  if (selErr) throw selErr
  const current = row?.seen || null
  // If already marked by the same user, nothing to do
  if (current === userId) {
    return { updated: false, seen: current }
  }
  // 2) Update with single userId
  const { error: updErr, data: updated } = await supabase
    .from('messages')
    .update({ seen: userId })
    .eq('id', messageId)
    .select('id, seen')
  if (updErr) throw updErr
  return { updated: true, seen: updated?.[0]?.seen ?? userId }
}

// Toggle blocked state of a conversation. If conversation blocked is true -> set false (and clear blocked_by), else true (and set blocked_by=userId).
// Returns { id, blocked, blocked_by }
export async function toggleConversationBlocked(conversationId, userId) {
  if (isDemoMode()) {
    if (!conversationId) throw new Error('conversationId requerido')
    const store = getDemoStore()
    const convIndex = (store.conversations || []).findIndex((c) => c.id === conversationId)
    if (convIndex === -1) throw new Error('conversationId no encontrado')
    const conv = store.conversations[convIndex]
    const next = !conv.blocked
    const updated = {
      ...conv,
      blocked: next,
      blocked_by: next ? (userId || null) : null,
    }
    store.conversations[convIndex] = updated
    saveDemoStore(store)
    return updated
  }
  if (!conversationId) throw new Error('conversationId requerido')
  // Read current blocked value (default false if null)
  const { data: conv, error: selErr } = await supabase
    .from('conversations')
    .select('id, blocked, blocked_by')
    .eq('id', conversationId)
    .single()
  if (selErr) throw selErr
  const current = !!conv.blocked
  const next = !current
  const changes = next
    ? { blocked: true, blocked_by: userId || null }
    : { blocked: false, blocked_by: null }
  const { data: updated, error: updErr } = await supabase
    .from('conversations')
    .update(changes)
    .eq('id', conversationId)
    .select('id, blocked, blocked_by')
    .single()
  if (updErr) throw updErr
  return updated
}

// Quick helper to know if a conversation is blocked (returns boolean)
export async function isConversationBlocked(conversationId) {
  if (isDemoMode()) {
    if (!conversationId) return false
    const store = getDemoStore()
    const conv = (store.conversations || []).find((c) => c.id === conversationId)
    return !!conv?.blocked
  }
  if (!conversationId) return false
  const { data, error } = await supabase
    .from('conversations')
    .select('blocked')
    .eq('id', conversationId)
    .single()
  if (error) throw error
  return !!data?.blocked
}

// Registra que un usuario limpió el chat en cierto punto temporal.
// messageId es opcional: si deseas marcar hasta un mensaje específico; si no se pasa, se puede interpretar como "hasta el momento actual".
// Devuelve la fila insertada.
export async function clearChatForUser({ conversationId, userId, messageId = null }) {
  if (isDemoMode()) {
    if (!conversationId || !userId) {
      throw new Error('conversationId y userId requeridos para limpiar chat')
    }
    const store = getDemoStore()
    const convMsgs = (store.messages || [])
      .filter((m) => m.conversation_id === conversationId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const finalMessageId = messageId || convMsgs[0]?.id
    if (!finalMessageId) throw new Error('No hay mensajes en la conversación para registrar limpieza')
    const payload = {
      conversation_id: conversationId,
      user_id: userId,
      message_id: finalMessageId,
      cleared_at: demoNowIso(0),
    }
    const existingIndex = (store.clear_chat || []).findIndex(
      (r) => r.conversation_id === conversationId && r.user_id === userId
    )
    if (existingIndex >= 0) {
      store.clear_chat[existingIndex] = payload
    } else {
      store.clear_chat = [...(store.clear_chat || []), payload]
    }
    saveDemoStore(store)
    return payload
  }
  if (!conversationId || !userId) {
    throw new Error('conversationId y userId requeridos para limpiar chat')
  }
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  if (!uuidRegex.test(conversationId)) {
    console.error('[clearChatForUser] conversationId no es UUID válido:', conversationId)
    throw new Error('conversationId inválido (se esperaba UUID)')
  }
  if (!uuidRegex.test(userId)) {
    console.error('[clearChatForUser] userId no es UUID válido:', userId)
    throw new Error('userId inválido (se esperaba UUID)')
  }
  if (messageId && !uuidRegex.test(messageId)) {
    console.warn('[clearChatForUser] messageId proporcionado no parece UUID, se ignorará y se buscará el último mensaje:', messageId)
    messageId = null
  }
  let finalMessageId = messageId
  if (!finalMessageId) {
    // Buscar último mensaje de la conversación para usarlo como referencia de corte
    const { data: lastMsg, error: lastErr } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lastErr) throw lastErr
    if (!lastMsg?.id) {
      throw new Error('No hay mensajes en la conversación para registrar limpieza')
    }
    finalMessageId = lastMsg.id
  }
  if (!uuidRegex.test(finalMessageId)) {
    console.error('[clearChatForUser] finalMessageId obtenido no es UUID válido:', finalMessageId)
    throw new Error('finalMessageId inválido')
  }
  const payload = {
    conversation_id: conversationId,
    user_id: userId,
    message_id: finalMessageId,
    cleared_at: new Date().toISOString(),
  }
  console.log('[clearChatForUser] Prepared payload:', payload)
  // Verificar existencia previa
  const { data: existing, error: existErr } = await supabase
    .from('clear_chat')
    .select('message_id, cleared_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('cleared_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existErr && existErr.code !== 'PGRST116') throw existErr
  if (existing) {
    // Solo actualizar si el nuevo corte está por delante (más nuevo) del ya registrado
    let shouldUpdate = true
    if (existing.message_id === finalMessageId) {
      shouldUpdate = false
    }
    if (shouldUpdate) {
      const { data: upd, error: updErr } = await supabase
        .from('clear_chat')
        .update({ message_id: finalMessageId, cleared_at: payload.cleared_at })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .select()
        .single()
      if (updErr) throw updErr
      console.log('[clearChatForUser] Updated existing clear_chat record')
      return upd
    } else {
      console.log('[clearChatForUser] Existing clear record already at same message_id; no update performed')
      return { ...existing, message_id: existing.message_id }
    }
  } else {
    const { data, error } = await supabase
      .from('clear_chat')
      .insert(payload)
      .select()
      .single()
    if (error) throw error
    console.log('[clearChatForUser] Inserted new clear_chat record')
    return data
  }
}

// Obtiene el último registro de limpieza para un usuario en una conversación
export async function fetchLastClearChat(conversationId, userId) {
  if (isDemoMode()) {
    if (!conversationId || !userId) return null
    const store = getDemoStore()
    const rows = (store.clear_chat || [])
      .filter((r) => r.conversation_id === conversationId && r.user_id === userId)
      .sort((a, b) => new Date(b.cleared_at) - new Date(a.cleared_at))
    const data = rows[0]
    if (!data) return null
    const msg = (store.messages || []).find((m) => m.id === data.message_id)
    return { ...data, pivot_created_at: msg?.created_at || null }
  }
  if (!conversationId || !userId) return null
  const { data, error } = await supabase
    .from('clear_chat')
    .select('message_id, cleared_at')
    .eq('conversation_id', conversationId)
    .eq('user_id', userId)
    .order('cleared_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') throw error
  if (!data) return null
  let pivotCreatedAt = null
  if (data.message_id) {
    const { data: msgRow, error: msgErr } = await supabase
      .from('messages')
      .select('created_at')
      .eq('id', data.message_id)
      .maybeSingle()
    if (msgErr && msgErr.code !== 'PGRST116') throw msgErr
    pivotCreatedAt = msgRow?.created_at || null
  }
  return { ...data, pivot_created_at: pivotCreatedAt }
}
