import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

// Connexion par e-mail + mot de passe, deleguee a Supabase Auth.
// On n'ecrit PAS notre propre systeme d'authentification (cahier, Partie 3).
export default function Connexion() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function seConnecter(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    })

    // En cas de succes, on ne fait rien ici : onAuthStateChange (dans App)
    // detecte la nouvelle session et rebascule l'affichage.
    if (error) setErreur(error.message)
    setEnvoi(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={seConnecter}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Réponse Éclair
        </h1>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="mdp" className="block text-sm font-medium text-slate-700">
            Mot de passe
          </label>
          <input
            id="mdp"
            type="password"
            required
            autoComplete="current-password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none"
          />
        </div>

        {erreur && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {envoi ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </main>
  )
}
