# AguacateChat (React + Vite)

## Supabase Setup

1) Copy `.env.example` to `.env.local` and add your credentials:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2) Start the dev server. Env vars with `VITE_` are available to the client.

## Using the Supabase client

- Centralized client: `src/services/supabaseClient.js`
- Simple DB helpers: `src/services/db.js`

Example usage in any component:

```js
import { supabase } from '@/services/supabaseClient' // or '../../services/supabaseClient'
import { selectFrom, insertInto } from '@/services/db'

// Read
const messages = await selectFrom('messages', { columns: '*', orderBy: 'created_at', ascending: true })

// Write
await insertInto('messages', { text: 'Hola', user_id: '...' })
```

Legacy code using `window.supabase` will continue to work.

## Scripts

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run preview` – preview build

## Emoji Picker

Actualmente usamos `emoji-mart@3` (versión clásica) para asegurar compatibilidad estable con React 19.

Características:
- Botón de apertura: ícono de carita en la barra de composición de mensajes.
- Componente reutilizable: `src/EmojiPicker.jsx`.
- Inserción conserva posición del cursor y foco.
- Cierre por clic externo o tecla Escape.
- Tema: se adapta con la prop `dark` (simple toggle de estilos propios + fondo del contenedor).

Uso en otro componente:
```jsx
import EmojiPicker from './EmojiPicker';

<EmojiPicker
	dark={isDarkMode}
	onSelect={(emojiNative) => setDraft(prev => prev + emojiNative)}
	onClose={() => setShow(false)}
	anchorRef={buttonRef}
/>;
```

Notas técnicas:
- Se descartó `@emoji-mart/react` debido a conflictos de import internos (intentaba resolver `emoji-mart` con exports no compatibles bajo React 19 + esbuild).
- Si en el futuro se desea migrar a la versión moderna, se recomienda revisar primero el changelog oficial y compatibilidad con React 19 o superior.

## Notificaciones y Sonidos de Mensajes

La aplicación soporta notificaciones locales para mensajes entrantes en conversaciones que no están actualmente abiertas.

Características:
- Contadores de mensajes no leídos (badge) por conversación.
- Persistencia de contadores en `localStorage` (`aguacatechat_unread_v1`) para conservarlos tras recargar.
- Sonido distinto cuando es el primer mensaje no leído de una conversación (tono ascendente) y doble bip corto para mensajes subsecuentes.
- Uso perezoso de la Web Notification API: se solicita permiso solo al primer evento que requiere mostrar una notificación (cuando la pestaña no está visible o el chat no está abierto).
- Click en la notificación enfoca la ventana y abre la conversación correspondiente.
- No se reproducen sonidos para mensajes enviados por el propio usuario.
- Si la ventana está enfocada y el chat está abierto, no se dispara la notificación nativa ni se incrementa el contador.

Limitaciones y notas:
- Si el usuario bloquea las notificaciones del navegador, simplemente no se mostrarán (no genera errores visibles).
- Los sonidos usan Web Audio API; en algunos navegadores el contexto de audio necesita una interacción previa del usuario para desbloquearse. En caso de que el contexto esté suspendido se intenta `resume()` de forma silenciosa.
- Actualmente los contadores se limpian localmente al abrir la conversación; no se persisten en la base de datos.

Futuras mejoras sugeridas:
- Sincronizar estado de "unread" con el backend para mantener continuidad entre dispositivos.
- Mostrar lista agrupada de notificaciones acumuladas en un panel central.
- Preferencias de usuario para desactivar sonidos o elegir un tema de tonos.
