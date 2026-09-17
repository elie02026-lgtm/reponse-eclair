import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import Connexion from './Connexion'
import Application from './Application'

// Le portier : session ou pas session.
export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    // 1. Une session existe-t-elle déjà ? (onglet rouvert, page rechargée)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setChargement(false)
    })

    // 2. Puis on écoute les changements : connexion, déconnexion, jeton renouvelé.
    const { data } = supabase.auth.onAuthStateChange((_evenement, nouvelleSession) => {
      setSession(nouvelleSession)
    })

    // 3. On se désabonne quand le composant disparaît, sinon fuite mémoire.
    return () => data.subscription.unsubscribe()
  }, [])

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Chargement…</p>
      </main>
    )
  }

  return session ? <Application session={session} /> : <Connexion />
}
