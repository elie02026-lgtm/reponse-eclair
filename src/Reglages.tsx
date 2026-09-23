import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { exporterDemandes } from './lib/export'
import { analyserSms } from './lib/sms'
import Resiliation from './Resiliation'
import type { Artisan } from './types'

// Le calcul du coût d'un SMS vit dans lib/sms.ts : il est pur, donc testé.
// Il y était faux ici pendant des semaines — « » et ’ doublaient la facture
// sans que rien ne le dise, et {LIEN} coûtait deux caractères invisibles.

export default function Reglages() {
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [succes, setSucces] = useState(false)
  const [chargement, setChargement] = useState(true)
  const [envoi, setEnvoi] = useState(false)
  const [exportEnCours, setExportEnCours] = useState(false)
  const [exportMessage, setExportMessage] = useState<string | null>(null)

  // Le nom TEL QU'IL EST EN BASE, pas tel qu'il est dans le champ.
  // La résiliation demande de taper le nom de l'entreprise, et c'est la base
  // qui vérifie. Si l'artisan a modifié le champ sans enregistrer, l'écran
  // réclamerait un nom que Postgres refuserait : il taperait juste, et se
  // ferait jeter sans comprendre.
  const [entrepriseEnregistree, setEntrepriseEnregistree] = useState('')

  async function exporter() {
    setExportEnCours(true)
    setExportMessage(null)

    const { lignes, erreur } = await exporterDemandes()
    setExportEnCours(false)

    if (erreur) setExportMessage(erreur)
    else if (lignes === 0) setExportMessage('Vous n’avez encore aucune demande à exporter.')
    else setExportMessage(`${lignes} demande${lignes! > 1 ? 's' : ''} téléchargée${lignes! > 1 ? 's' : ''}.`)
  }

  useEffect(() => {
    // Pas de filtre sur l'id : la RLS ne renvoie que la fiche de l'artisan connecté.
    supabase
      .from('artisans')
      .select('*')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else if (!data) setErreur("Aucune fiche artisan n'est rattachée à ce compte.")
        else {
          setArtisan(data as Artisan)
          setEntrepriseEnregistree((data as Artisan).entreprise)
        }
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
    setEntrepriseEnregistree(artisan.entreprise)
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
    <div className="space-y-4">
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
            {sms.unites} caractères facturés — {sms.segments} SMS ({sms.parSegment} max
            par SMS)
          </span>

          {/* Sans {LIEN}, le message invite à décrire son besoin « ici »
              sans donner de « ici ». C'est arrivé sur un vrai compte. */}
          {sms.lienManquant && (
            <span className="mt-1 block rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
              Il manque <strong>{'{LIEN}'}</strong>. Sans lui, le client reçoit un message qui
              lui demande de décrire son besoin, et rien à ouvrir pour le faire.
            </span>
          )}
          {sms.unicode && (
            <span className="mt-1 block rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Les caractères {sms.fautifs.join(' ')} font passer le message en Unicode : la
              limite tombe de 160 à 70 caractères par SMS, et chaque SMS supplémentaire est
              facturé. Remplacez-les — é, è, à ne posent pas ce problème, mais les
              guillemets « » et l’apostrophe courbe ’ si.
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

      {/* Vos données. `type="button"` est indispensable : sans lui, le bouton
          soumettrait le formulaire des réglages au lieu d'exporter. */}
      <div className="space-y-2 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="font-medium text-slate-700">Vos données</div>
        <p className="text-sm text-slate-500">
          Toutes vos demandes, dans un fichier que vous pouvez ouvrir dans un tableur.
          Elles vous appartiennent.
        </p>
        <button
          type="button"
          onClick={exporter}
          disabled={exportEnCours}
          className="w-full rounded-lg px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100 disabled:opacity-50"
        >
          {exportEnCours ? 'Préparation…' : 'Télécharger mes demandes (CSV)'}
        </button>
        {exportMessage && <p className="text-sm text-slate-600">{exportMessage}</p>}
      </div>
    </form>

      {/* Hors du <form> : à l'intérieur, son bouton enverrait les réglages. */}
      <Resiliation entreprise={entrepriseEnregistree} />
    </div>
  )
}
