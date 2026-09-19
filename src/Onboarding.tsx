import { useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Artisan } from './types'

// Le message par défaut, tenu en GSM-7 : 1 seul SMS, pas de caractère
// qui ferait basculer en Unicode (ê â î ô û ë ï, ç minuscule).
function smsParDefaut(entreprise: string): string {
  const nom = entreprise.trim() || 'votre artisan'
  return `Bonjour, ${nom}. Je n'ai pas pu répondre. Décrivez votre besoin ici, je vous rappelle vite : {LIEN}`
}

export default function Onboarding({
  session,
  onCree,
}: {
  session: Session
  onCree: (artisan: Artisan) => void
}) {
  const [entreprise, setEntreprise] = useState('')
  const [metier, setMetier] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [zone, setZone] = useState(30)
  const [sms, setSms] = useState('')
  const [smsModifie, setSmsModifie] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  // Tant que l'artisan n'a pas touché au message, il suit le nom de l'entreprise.
  const messageSms = smsModifie ? sms : smsParDefaut(entreprise)

  async function creer(e: FormEvent) {
    e.preventDefault()
    setEnvoi(true)
    setErreur(null)

    // L'id DOIT être celui de l'utilisateur connecté : c'est ce qu'exige la
    // politique RLS « un artisan ne crée que sa propre fiche » (id = auth.uid()).
    const { data, error } = await supabase
      .from('artisans')
      .insert({
        id: session.user.id,
        entreprise: entreprise.trim(),
        metier: metier.trim().toLowerCase(),
        code_postal: codePostal.trim(),
        zone_minutes: zone,
        message_sms: messageSms,
      })
      .select()

    setEnvoi(false)

    if (error) {
      setErreur(`Création impossible : ${error.message}`)
      return
    }
    if (!data || data.length === 0) {
      setErreur('Aucune fiche créée. Réessayez, ou déconnectez-vous et reconnectez-vous.')
      return
    }

    onCree(data[0] as Artisan)
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <form onSubmit={creer} className="mx-auto max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Bienvenue sur Réponse Éclair
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Encore une étape : dites-nous qui vous êtes. Vous pourrez tout modifier
            ensuite dans les réglages.
          </p>
        </div>

        <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Nom de votre entreprise</span>
            <input
              type="text"
              required
              autoFocus
              placeholder="Plomberie Martin"
              value={entreprise}
              onChange={(e) => setEntreprise(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
            <span className="text-xs text-slate-500">
              C’est ce nom que vos clients verront dans le SMS.
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Votre métier</span>
            <input
              type="text"
              required
              placeholder="plombier"
              value={metier}
              onChange={(e) => setMetier(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
            <span className="text-xs text-slate-500">
              Il détermine comment vos demandes sont classées par gravité.
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Code postal</span>
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="13001"
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Zone (minutes)</span>
              <input
                type="number"
                min={5}
                max={120}
                value={zone}
                onChange={(e) => setZone(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">
              Message envoyé à ceux que vous n’avez pas pu prendre
            </span>
            <textarea
              rows={4}
              required
              value={messageSms}
              onChange={(e) => {
                setSmsModifie(true)
                setSms(e.target.value)
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
            />
            <span className="text-xs text-slate-500">
              {messageSms.length} caractères. <code>{'{LIEN}'}</code> sera remplacé par le
              lien vers votre formulaire.
            </span>
          </label>
        </div>

        {erreur && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
        )}

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {envoi ? 'Création…' : 'Commencer'}
        </button>

        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="w-full text-sm text-slate-500 underline hover:text-slate-800"
        >
          Se déconnecter
        </button>
      </form>
    </main>
  )
}
