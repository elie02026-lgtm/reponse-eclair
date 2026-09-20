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

    setDemandes((actuelles) => actuelles.filter((x) => x.id !== d.id))
  }

  // LA SECTION QUE LES TROIS CONCURRENTS N'ONT PAS.
  // Une demande relancée qui est TOUJOURS "à rappeler" est une demande dont
  // le prospect n'a pas donné suite. Chez Rappli, LockLead et Repondeo, ces
  // gens disparaissent de l'écran. Ici on les sort du lot et on les nomme :
  // le système a fait ce qu'il pouvait, à l'artisan de décrocher lui-même.
  // LE PIÈGE DU TRI : en SQL, `order by gravite desc` place les NULL EN TÊTE.
  // Vérifié en base : (3, 1, null, 2) trié en desc donne (null, 3, 2, 1).
  // Donc une demande que l'IA n'a pas su classer passait DEVANT une fuite d'eau
  // notée 3 — silencieusement, sans que rien ne le signale.
  //
  // On ne la fait pas redescendre pour autant : la cacher au fond serait la
  // perdre. On la sort du classement et on dit pourquoi. La machine n'a pas
  // su juger ; elle le déclare au lieu de faire semblant.
  const nonClassees = demandes.filter((d) => d.gravite === null)
  const classees = demandes.filter((d) => d.gravite !== null)
  const sansReponse = classees.filter((d) => d.relance_sms_le !== null)
  const nouvelles = classees.filter((d) => d.relance_sms_le === null)

  const carte = (d: Demande) => (
    <CarteDemande
      key={d.id}
      demande={d}
      occupee={enCours === d.id}
      onChangerStatut={modifier}
    />
  )

  return (
    <>
      {chargement && <p className="text-slate-500">Chargement…</p>}

      {erreur && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
      )}

      {!chargement && demandes.length === 0 && (
        <p className="rounded-lg bg-white px-4 py-6 text-center text-slate-500 ring-1 ring-slate-200">
          Aucune demande à rappeler.
        </p>
      )}

      {nonClassees.length > 0 && (
        <>
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-red-900">
              Non classées — à juger vous-même ({nonClassees.length})
            </h2>
            <p className="mt-1 text-sm text-red-800">
              L’estimation automatique n’a pas abouti sur ces demandes. Elles sont mises
              à part plutôt que rangées au hasard : lisez-les d’abord.
            </p>
          </div>
          <ul className="mb-8 space-y-3">{nonClassees.map(carte)}</ul>
        </>
      )}

      {nouvelles.length > 0 && (
        <>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            À rappeler ({nouvelles.length})
          </h2>
          <ul className="space-y-3">{nouvelles.map(carte)}</ul>
        </>
      )}

      {sansReponse.length > 0 && (
        <>
          <div className="mb-4 mt-8 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
              Sans réponse — à rappeler vous-même ({sansReponse.length})
            </h2>
            <p className="mt-1 text-sm text-amber-800">
              Ces personnes ont été relancées et n’ont pas donné suite. Le système a fait
              ce qu’il pouvait : décrochez.
            </p>
          </div>
          <ul className="space-y-3">{sansReponse.map(carte)}</ul>
        </>
      )}
    </>
  )
}
