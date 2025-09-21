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
