/// <reference types="vite/client" />

// Typage des variables d'environnement exposées au navigateur.
// Seules celles préfixées VITE_ sont injectées par Vite.
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
