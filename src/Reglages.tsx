import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import type { Artisan } from './types'

// Caractères qui font basculer un SMS en Unicode et divisent la limite
// par plus de deux (160 -> 70). Règle métier, pas une préférence de style.
// é, è, à passent en GSM-7 ; ceux-ci non.
const CARACTERES_COUTEUX = /[êâîôûëïÿœç]/g

function analyserSms(texte: string) {
  const fautifs = [...new Set(texte.match(CARACTERES_COUTEUX) ?? [])]
  const unicode = fautifs.length > 0
  const parSegment = unicode ? 70 : 160
  const segments = texte.length === 0 ? 0 : Math.ceil(texte.length / parSegment)
  return { fautifs, unicode, parSegment, segments }
}

export default function Reglages() {
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    // Pas de filtre sur l'id : la RLS ne renvoie que la fiche de l'artisan connecté.
    supabase
      .from('artisans')
      .select('*')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else if (!data) setErreur("Aucune fiche artisan n'est rattachée à ce compte.")
        else setArtisan(data as Artisan)
        setChargement(false)
      })
  }, [])

  async function enregistrer(e: FormEvent) {
    e.preventDefault()
    if (!artisan) return

    setEnvoi(true)
    setErreur(null)
    setSucces(false)

    const { data, error } = await supabase
      .from('artisans')
      .update({
        entreprise: artisan.entreprise,
        metier: artisan.metier,
        code_postal: artisan.code_postal,
        zone_minutes: artisan.zone_minutes,
        message_sms: artisan.message_sms,
      })
      .eq('id', artisan.id)
      .select()

    setEnvoi(false)

    if (error) {
      setErreur(`Enregistrement refusé : ${error.message}`)
      return
    }
    // Même précaution que pour les demandes : zéro ligne modifiée n'est pas une erreur.
    if (!data || data.length === 0) {
      setErreur('Aucune ligne modifiée. La fiche ne vous appartient pas.')
      return
    }
    setSucces(true)
  }

  function champ<K extends keyof Artisan>(cle: K, valeur: Artisan[K]) {
    setArtisan((a) => (a ? { ...a, [cle]: valeur } : a))
    setSucces(false)
  }

  if (chargement) return <p className="text-slate-500">Chargement…</p>

  if (!artisan) {
    return (
      <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {erreur ?? 'Fiche introuvable.'}
      </p>
    )
  }

  const sms = analyserSms(artisan.message_sms)

  return (
    <form onSubmit={enregistrer} className="space-y-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Réglages</h2>

      <div className="space-y-4 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Entreprise</span>
          <input
            type="text"
            required
            value={artisan.entreprise}
            onChange={(e) => champ('entreprise', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Métier</span>
          <input
            type="text"
            required
            value={artisan.metier}
            onChange={(e) => champ('metier', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            Détermine la grille de gravité appliquée à vos demandes.
          </span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Code postal de départ</span>
            <input
              type="text"
              required
              inputMode="numeric"
              value={artisan.code_postal}
              onChange={(e) => champ('code_postal', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Zone (minutes)</span>
            <input
              type="number"
              min={5}
              max={120}
              value={artisan.zone_minutes ?? 30}
              onChange={(e) => champ('zone_minutes', Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Message SMS envoyé au client</span>
          <textarea
            required
            rows={4}
            value={artisan.message_sms}
            onChange={(e) => champ('message_sms', e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            {artisan.message_sms.length} caractères — {sms.segments} SMS (
            {sms.parSegment} max par SMS)
          </span>
          {sms.unicode && (
            <span className="mt-1 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Les caractères {sms.fautifs.join(' ')} font passer le message en Unicode : la
              limite tombe de 160 à 70 caractères par SMS, et chaque SMS supplémentaire est
              facturé. Remplacez-les (é, è, à ne posent pas ce problème).
            </span>
          )}
        </label>
      </div>

      <div className="space-y-2 rounded-xl bg-slate-100 p-4 text-sm ring-1 ring-slate-200">
        <div className="font-medium text-slate-700">En lecture seule</div>
        <div className="flex justify-between">
          <span className="text-slate-500">Numéro attribué</span>
          <span className="text-slate-700">{artisan.numero_twilio ?? 'aucun'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Renvoi d’appel</span>
          <span className="text-slate-700">
            {artisan.numero_twilio ? 'configuré' : 'non configuré'}
          </span>
        </div>
      </div>

      {erreur && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
      )}
      {succes && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          Réglages enregistrés.
        </p>
      )}

      <button
        type="submit"
        disabled={envoi}
        className="w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {envoi ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  )
}
