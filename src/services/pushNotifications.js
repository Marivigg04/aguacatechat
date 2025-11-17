// Servicio para gestionar el registro y listeners de notificaciones push
// Capacitor sólo entrega push en plataformas nativas (Android/iOS). En web hace fallback silencioso.

import { PushNotifications } from '@capacitor/push-notifications'
import { Capacitor } from '@capacitor/core'
import { supabase } from './supabaseClient'
import { getCurrentUser } from '../context/AuthContext.jsx'

const LS_TOKEN_KEY = 'ac_push_token'

function isNative() {
  return Capacitor?.isNativePlatform?.() || (typeof window !== 'undefined' && !!window?.androidBridge)
}

export async function ensurePushRegistered() {
  if (!isNative()) {
    console.info('[Push] Plataforma web: se omite registro de notificaciones.')
    return
  }

  const user = getCurrentUser()
  if (!user?.id) {
    console.warn('[Push] No hay usuario autenticado aún, se pospone registro.')
    return
  }

  try {
    // 1. Comprobar permisos actuales
    let permStatus = await PushNotifications.checkPermissions()
    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }
    if (permStatus.receive !== 'granted') {
      console.warn('[Push] Permiso denegado o no concedido, abortando registro.')
      return
    }

    // 2. Registrar con FCM/APNS
    await PushNotifications.register()

    // 3. Listeners
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Token obtenido:', token.value)
      const prev = localStorage.getItem(LS_TOKEN_KEY)
      if (prev === token.value) {
        console.log('[Push] Token ya almacenado localmente, omitiendo upsert.')
        return
      }
      localStorage.setItem(LS_TOKEN_KEY, token.value)

      // 4. Guardar en Supabase (tabla profiles - columna push_token)
      try {
        const { error } = await supabase.from('profiles').upsert({ id: user.id, push_token: token.value }, { onConflict: 'id' })
        if (error) {
          // Detectar posible ausencia de columna
          if (/(push_token)/i.test(error.message)) {
            console.warn('[Push] La columna push_token parece no existir en profiles. Crea una: ALTER TABLE public.profiles ADD COLUMN push_token text;')
          } else {
            console.error('[Push] Error guardando token en profiles:', error)
          }
        } else {
          console.log('[Push] Token guardado en profiles correctamente.')
        }
      } catch (e) {
        console.error('[Push] Excepción guardando token:', e)
      }
    })

    PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] Error en registro:', err)
    })

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notificación recibida (foreground):', notification)
      // Aquí podrías emitir un evento interno o usar un state manager para mostrar badges.
    })

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Acción en notificación (tap/background):', action)
      // Ej: navegar a un chat concreto si la notificación trae conversation_id.
      // const conversationId = action?.notification?.data?.conversation_id
    })

  } catch (err) {
    console.error('[Push] Error general en ensurePushRegistered:', err)
  }
}

// Helper para limpiar listeners si hiciera falta en algún momento
export function removePushListeners() {
  try {
    PushNotifications.removeAllListeners()
    console.log('[Push] Listeners de push removidos.')
  } catch (e) {
    console.warn('[Push] No se pudieron remover listeners:', e)
  }
}
