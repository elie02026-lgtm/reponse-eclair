import { createClient } from '@supabase/supabase-js'

// Le client Supabase, partagé par toute l'app.
// Les valeurs viennent de .env.local (jamais committé) — voir .env.example.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    "Config Supabase absente : copie .env.example en .env.local et remplis " +
      'VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (Supabase > Project Settings > API).',
  )
}

// La clé "anon" est publique par conception : le navigateur s'en sert.
// Sa sûreté repose ENTIÈREMENT sur les politiques RLS définies en base.
export const supabase = createClient(url, anonKey)
