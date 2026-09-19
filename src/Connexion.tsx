import { useState, type FormEvent } from 'react'
import { supabase } from './lib/supabase'

// Supabase renvoie ses erreurs en anglais. Un artisan ne doit jamais lire
// « Invalid login credentials ». C'est la case B5 du cahier :
// « une personne qui n'a jamais vu le produit y arrive sans mode d'emploi ».
const MESSAGES: Record<string, string> = {
  'Invalid login credentials': 'E-mail ou mot de passe incorrect.',
  'Email not confirmed':
    "Votre e-mail n'est pas encore confirmé. Ouvrez le lien que nous vous avons envoyé.",
  'User already registered': 'Un compte existe déjà avec cet e-mail.',
  'Password should be at least 6 characters.':
    'Le mot de passe doit faire au moins 6 caractères.',
}

function enFrancais(message: string): string {
  return MESSAGES[message] ?? message
}

export default function Connexion() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const inscription = mode === 'inscription'

  async function soumettre(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)
    setMessage(null)

    if (inscription) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: motDePasse,
      })
      if (error) {
        setErreur(enFrancais(error.message))
      } else if (!data.session) {
        // Confirmation d'e-mail activée : pas de session tant que le lien
        // n'est pas ouvert. C'est le comportement normal de Supabase.
        setMessage(
          'Compte créé. Ouvrez l’e-mail de confirmation que nous venons de vous envoyer, puis revenez vous connecter.',
        )
      }
      // Si une session existe, onAuthStateChange (dans App) prend le relais.
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: motDePasse,
      })
      if (error) setErreur(enFrancais(error.message))
    }

    setEnvoi(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
      <form
        onSubmit={soumettre}
        className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Réponse Éclair</h1>
        <p className="text-sm text-slate-500">
          {inscription
            ? 'Créez votre compte. Deux minutes, pas de carte bancaire.'
            : 'Connectez-vous pour voir vos demandes.'}
        </p>

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
            minLength={6}
            autoComplete={inscription ? 'new-password' : 'current-password'}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-slate-900 focus:outline-none"
          />
          {inscription && (
            <span className="text-xs text-slate-500">6 caractères minimum.</span>
          )}
        </div>

        {erreur && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erreur}</p>
        )}
        {message && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{message}</p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {envoi ? '…' : inscription ? 'Créer mon compte' : 'Se connecter'}
        </button>

        <button
          type="button"
          onClick={() => {
            setMode(inscription ? 'connexion' : 'inscription')
            setErreur(null)
            setMessage(null)
          }}
          className="w-full text-sm text-slate-600 underline hover:text-slate-900"
        >
          {inscription
            ? 'J’ai déjà un compte — me connecter'
            : 'Je n’ai pas encore de compte — en créer un'}
        </button>
      </form>
    </main>
  )
}
