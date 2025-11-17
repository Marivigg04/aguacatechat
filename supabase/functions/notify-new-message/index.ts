// --- 1. Imports ---
// (deno.json se encarga de encontrar estos paquetes)
import { createClient } from '@supabase/supabase-js'
import admin from 'firebase-admin' // <-- Importación clásica

// --- 2. Tipos (basados en tu esquema) ---
interface MessageRecord {
  id: string
  sender_id: string
  conversation_id: string
  content: string
}

interface ProfileRecord {
  id: string
  push_token: string | null
  username: string | null
}

// --- 3. Inicializar el Admin de Firebase ---
try {
  const serviceAccount = JSON.parse(
    Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')!
  )

  // Usamos admin.app() para acceder al servicio de la app
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount), // Usa admin.credential.cert
    })
  }
} catch (e) {
  console.error('Error al inicializar Firebase Admin:', e.message)
}

// --- 4. La Función Principal ---
Deno.serve(async (req) => {
  try {
    // --- 5. Crear el cliente de Supabase ---
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // --- 6. Obtener los datos del mensaje nuevo ---
    const { record } = await req.json()
    const newMessage = record as MessageRecord
    console.log(`[Función] Nuevo mensaje ID: ${newMessage.id} en conversación ${newMessage.conversation_id}`);

    // --- 7. Buscar los tokens de los destinatarios ---
    const { data: participants, error: membersError } = await supabaseClient
      .from('participants')
      .select('user_id')
      .eq('conversation_id', newMessage.conversation_id)
      .neq('user_id', newMessage.sender_id)
      
    if (membersError) throw membersError
    if (!participants || participants.length === 0) {
      console.log('[Función] No hay otros participantes en la conversación.');
      return new Response(JSON.stringify({ ok: true, message: 'No recipients' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    const recipientIds = participants.map(p => p.user_id)

    // 7b. Obtener los push_tokens de esos participantes
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, push_token, username')
      .in('id', recipientIds)
      
    if (profilesError) throw profilesError
    
    const tokens = profiles
      .filter(p => p.push_token)
      .map(p => p.push_token as string)
      
    if (tokens.length === 0) {
      console.log('[Función] Participantes encontrados, pero ninguno tiene push_token.');
      return new Response(JSON.stringify({ ok: true, message: 'No tokens found' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }
    
    // --- 8. Obtener el nombre del remitente ---
    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('username')
      .eq('id', newMessage.sender_id)
      .single()

    const senderName = senderProfile?.username || 'Alguien'

    // --- 9. Preparar y Enviar la Notificación ---
    console.log(`[Función] Preparando notificación para ${tokens.length} dispositivos...`);
    
    // Usamos el tipo del namespace de admin
    const messagePayload: admin.messaging.MulticastMessage = {
      notification: {
        title: `Nuevo mensaje de ${senderName}`,
        body: newMessage.content.length > 100 ? `${newMessage.content.substring(0, 97)}...` : newMessage.content,
      },
      data: {
        conversation_id: newMessage.conversation_id,
        sender_id: newMessage.sender_id,
      },
      tokens: tokens,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
        }
      },
    }

    // --- ¡LA SOLUCIÓN! ---
    // Volvemos a la forma original de llamar al servicio de messaging
    const messaging = admin.messaging()
    const batchResponse = await messaging.sendEachForMulticast(messagePayload)

    console.log('[Función] ¡Notificaciones enviadas!', `Éxito: ${batchResponse.successCount}, Fallos: ${batchResponse.failureCount}`);
    
    return new Response(JSON.stringify({ ok: true, sent: batchResponse.successCount }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error('Error GRANDE en la función notify-new-message:', err)
    return new Response(String(err?.message || err), { status: 500 })
  }
})