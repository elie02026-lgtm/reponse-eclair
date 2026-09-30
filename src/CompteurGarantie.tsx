import { useEffect, useState } from 'react'
import { compterDemandes } from './lib/demandes'
import { etatGarantie, libelleGarantie } from './lib/garantie'
import { NOM_GARANTIE } from './config/offre'
import type { Garantie } from './lib/garantie'

// LE COMPTEUR QUE LES CGV PROMETTENT.
//
// Article 5 : « C'est le logiciel qui les compte : vous voyez le compteur
// dans vos réglages. » Cette phrase est dans un contrat, donc cet écran est
// une obligation, pas une décoration.
//
// Trois principes, dans cet ordre :
//
//  1. IL NE MENT PAS. Tant que le comptage n'a pas abouti, il n'affiche
//     rien — ni « 0 sur 5 », ni un squelette qui clignote. Un zéro qu'on n'a
//     pas mesuré est un chiffre faux, et celui-ci engage l'éditeur.
//
//  2. IL DISPARAÎT QUAND IL N'A PLUS RIEN À DIRE. Les cinq demandes
//     atteintes, ou les soixante jours passés : dans les deux cas la
//     garantie est jouée, et un compteur figé sur un écran de réglages
//     devient un reproche ou une fausse promesse.
//
//  3. IL NE RÉCLAME RIEN. Si la garantie a expiré sans les cinq demandes,
//     l'artisan peut arrêter sans avoir payé — mais ce n'est pas à un
//     bandeau de le lui dire au milieu de ses réglages. C'est une
//     conversation, pas une notification.
//
// Le calcul lui-même est dans `lib/garantie.ts`, pur et testé : les bords du
// délai — la veille, l'heure pile, une horloge en avance — y sont vérifiés
// un par un.

export default function CompteurGarantie({ creeLe }: { creeLe: string | null }) {
  // `null` = on ne sait pas encore. Distinct de `{ etat: 'inconnue' }`, qui
  // veut dire « on sait qu'on ne saura pas ».
  const [garantie, setGarantie] = useState<Garantie | null>(null)

  useEffect(() => {
    let vivant = true
    compterDemandes().then(({ total }) => {
      if (!vivant) return
      // Une erreur de comptage laisse l'état à `null` : le compteur ne
      // s'affiche pas du tout. Afficher « 0 sur 5 » parce que la requête a
      // échoué serait annoncer à l'artisan qu'il n'a reçu aucune demande.
      if (total === null) return
      setGarantie(etatGarantie(creeLe, total, new Date()))
    })
    // React 19 en mode strict monte deux fois : sans ce drapeau, la réponse
    // du premier montage écrirait dans un composant démonté.
    return () => {
      vivant = false
    }
  }, [creeLe])

  if (garantie === null || garantie.etat !== 'en-cours') return null

  const libelle = libelleGarantie(garantie)
  // La barre est purement visuelle ; le chiffre à côté reste la source.
  const part = Math.min(100, (garantie.recues / garantie.requises) * 100)

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-slate-900">
          {NOM_GARANTIE} : {libelle}
        </span>
        <span className="text-xs text-slate-500">
          {garantie.joursRestants} jour{garantie.joursRestants > 1 ? 's' : ''} restant
          {garantie.joursRestants > 1 ? 's' : ''}
        </span>
      </div>

      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={garantie.recues}
        aria-valuemin={0}
        aria-valuemax={garantie.requises}
        aria-label={`${NOM_GARANTIE} : ${libelle}`}
      >
        <div className="h-full rounded-full bg-slate-900" style={{ width: `${part}%` }} />
      </div>

      <p className="mt-2 text-xs text-slate-500">
        Vous ne payez rien avant d’avoir reçu {garantie.requises} demandes.
      </p>
    </div>
  )
}
