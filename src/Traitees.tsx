import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { changerStatut, enregistrerMontant } from './lib/demandes'
import { chiffreSigne } from './lib/chiffre'
import CarteDemande from './CarteDemande'
import type { Demande, Statut } from './types'

const euros = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

export default function Traitees() {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState<number | null>(null)

  useEffect(() => {
    // Ici, et ici seulement, l'ordre chronologique a du sens : c'est un historique.
    // `nullsFirst: false` place en fin de liste les lignes sans date de traitement.
    supabase
      .from('demandes')
      .select('*')
      .neq('statut', 'a_rappeler')
      .order('traite_le', { ascending: false, nullsFirst: false })
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setDemandes(data ?? [])
        setChargement(false)
      })
  }, [])

  // LE CHIFFRE À MONTRER À UN ARTISAN AU BOUT D'UN MOIS.
  // Il additionnait `panier`, l'estimation de l'IA, tout en affirmant en
  // dessous « chiffre réel, pas une estimation ». Il additionne désormais les
  // montants saisis par l'artisan, et AVOUE ce qui manque. Le calcul vit
  // dans lib/chiffre.ts : il est pur, donc testé.
  const chiffre = chiffreSigne(demandes)

  async function saisirMontant(d: Demande, montant: number) {
    setEnCours(d.id)
    setErreur(null)

    const resultat = await enregistrerMontant(d, montant)
    setEnCours(null)

    if (resultat.erreur) {
      setErreur(resultat.erreur)
      return
    }
    if (resultat.demande) {
      setDemandes((actuelles) =>
        actuelles.map((x) => (x.id === d.id ? resultat.demande! : x)),
      )
    }
  }

  async function modifier(d: Demande, nouveau: Statut) {
    setEnCours(d.id)
    setErreur(null)

    const resultat = await changerStatut(d, nouveau)
    setEnCours(null)

    if (resultat.erreur) {
      setErreur(resultat.erreur)
      return
    }

    if (nouveau === 'a_rappeler') {
      // Elle repart dans le circuit : elle quitte cet écran.
      // C'est ce qui rend un mauvais appui rattrapable.
      setDemandes((actuelles) => actuelles.filter((x) => x.id !== d.id))
    } else if (resultat.demande) {
      // Elle reste ici, avec son nouveau statut.
      setDemandes((actuelles) =>
        actuelles.map((x) => (x.id === d.id ? resultat.demande! : x)),
      )
    }
  }

  return (
    <>
      <div className="mb-4 rounded-xl bg-slate-900 px-4 py-4 text-white">
        <div className="text-xs uppercase tracking-wide text-slate-400">
          Chantiers signés
        </div>
        <div className="text-3xl font-bold">{euros.format(chiffre.total)}</div>
        <div className="text-sm text-slate-400">
          {chiffre.renseignes} chantier{chiffre.renseignes > 1 ? 's' : ''} — montants que
          vous avez saisis, pas une estimation
        </div>
        {chiffre.aRenseigner > 0 && (
          <div className="mt-2 rounded-lg bg-amber-500/20 px-3 py-2 text-sm text-amber-200">
            {chiffre.aRenseigner} chantier{chiffre.aRenseigner > 1 ? 's signés' : ' signé'} sans
            montant, {chiffre.aRenseigner > 1 ? 'absents' : 'absent'} du total. L’IA
            {chiffre.aRenseigner > 1 ? ' les' : ' l’'}estimait à {euros.format(chiffre.estimeManquant)}
            {' '}— saisissez le vrai montant sur la carte.
          </div>
        )}
      </div>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        Traitées ({demandes.length})
      </h2>

      {chargement && <p className="text-slate-500">Chargement…</p>}

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
      )}

      {!chargement && demandes.length === 0 && (
        <p className="rounded-lg bg-white px-4 py-6 text-center text-slate-500 ring-1 ring-slate-200">
          Aucune demande traitée pour l’instant.
        </p>
      )}

      <ul className="space-y-3">
        {demandes.map((d) => (
          <CarteDemande
            key={d.id}
            demande={d}
            occupee={enCours === d.id}
            onChangerStatut={modifier}
            onEnregistrerMontant={saisirMontant}
          />
        ))}
      </ul>
    </>
  )
}
