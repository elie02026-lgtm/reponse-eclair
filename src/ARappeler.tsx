import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { changerStatut } from './lib/demandes'
import CarteDemande from './CarteDemande'
import type { Demande, Statut } from './types'

export default function ARappeler() {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [enCours, setEnCours] = useState<number | null>(null)

  useEffect(() => {
    // LA RÈGLE DE TRI, QUI EST LE PRODUIT : gravité d'abord, panier ensuite.
    // Jamais la date — l'ordre chronologique est ce que font les trois concurrents.
    //
    // Le tri est exécuté en base : l'index (artisan_id, statut, gravite desc,
    // panier desc) créé dans la migration est fait exactement pour cette requête.
    //
    // Note : on ne filtre PAS sur artisan_id. Ce n'est pas un oubli.
    // La politique RLS s'en charge en base.
    supabase
      .from('demandes')
      .select('*')
      .eq('statut', 'a_rappeler')
      .order('gravite', { ascending: false })
      .order('panier', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setDemandes(data ?? [])
        setChargement(false)
      })
  }, [])

  async function modifier(d: Demande, nouveau: Statut) {
    setEnCours(d.id)
    setErreur(null)

    const resultat = await changerStatut(d, nouveau)
    setEnCours(null)

    if (resultat.erreur) {
      setErreur(resultat.erreur)
      return
    }

    // Cet écran ne montre que les demandes à rappeler : celle-ci en sort.
    setDemandes((actuelles) => actuelles.filter((x) => x.id !== d.id))
  }

  return (
    <>
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
        À rappeler ({demandes.length})
      </h2>

      {chargement && <p className="text-slate-500">Chargement…</p>}

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
      )}

      {!chargement && demandes.length === 0 && (
        <p className="rounded-lg bg-white px-4 py-6 text-center text-slate-500 ring-1 ring-slate-200">
          Aucune demande à rappeler.
        </p>
      )}

      <ul className="space-y-3">
        {demandes.map((d) => (
          <CarteDemande
            key={d.id}
            demande={d}
            occupee={enCours === d.id}
            onChangerStatut={modifier}
          />
        ))}
      </ul>
    </>
  )
}
