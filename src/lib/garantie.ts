// LE COMPTEUR DE LA GARANTIE 5 DEMANDES.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE CALCUL EST DANS UN FICHIER PUR
// ─────────────────────────────────────────────────────────────────────────
// Les CGV promettent : « C'est le logiciel qui les compte : vous voyez le
// compteur dans vos réglages. » Ce n'est plus une phrase de vente, c'est une
// clause d'un contrat. Un compteur faux serait donc une promesse non tenue,
// au sens propre.
//
// D'où : le calcul ici, sans React, sans Supabase, avec l'heure passée en
// argument. Tout est testable, et les cas limites — la veille de
// l'échéance, le jour même, une horloge en avance — sont vérifiés par
// `garantie.test.ts` au lieu d'être supposés.
//
// AUCUNE MIGRATION N'A ÉTÉ NÉCESSAIRE. `artisans.cree_le` existe depuis la
// migration 0001, et le nombre de demandes se compte dans `demandes`. La
// garantie ne stocke rien : elle se déduit, donc elle ne peut pas se
// désynchroniser de la réalité.

// Extension `.ts` explicite, comme dans le Worker : c'est ce que Node exige
// pour charger ce fichier sous `node --test`, et `allowImportingTsExtensions`
// l'autorise côté TypeScript. Sans elle, le test ne peut pas résoudre le
// module, et le compteur redevient invérifiable.
import { DEMANDES_GARANTIE, JOURS_GARANTIE } from '../config/offre.ts'

const JOUR_MS = 24 * 60 * 60 * 1000

export type Garantie =
  /** On ne sait pas depuis quand le compte existe : `cree_le` est nullable
   *  en base (migration 0001 : `default now()`, sans `not null`). On
   *  n'affiche RIEN plutôt qu'un décompte inventé. */
  | { etat: 'inconnue' }
  /** La garantie court. C'est le seul état qui s'affiche. */
  | { etat: 'en-cours'; recues: number; requises: number; joursRestants: number }
  /** Les 5 demandes sont arrivées : l'artisan paie, la garantie a joué son
   *  rôle. Le compteur disparaît — il n'a plus rien à dire. */
  | { etat: 'atteinte'; recues: number }
  /** 60 jours, moins de 5 demandes : l'artisan peut arrêter sans avoir
   *  payé. Le compteur disparaît aussi ; ce n'est pas à un écran de
   *  réclamer l'exécution d'une clause. */
  | { etat: 'expiree'; recues: number }

/**
 * Où en est la garantie, à un instant donné.
 *
 * @param creeLe        `artisans.cree_le`, tel qu'il sort de la base.
 * @param recues        Nombre de demandes reçues (voir `compterDemandes`).
 * @param maintenant    L'heure courante. Passée en argument POUR POUVOIR
 *                      LA MENTIR dans les tests : un calcul de délai qui
 *                      lit `Date.now()` lui-même n'est pas vérifiable.
 */
export function etatGarantie(creeLe: string | null, recues: number, maintenant: Date): Garantie {
  // L'ORDRE DE CES TROIS TESTS EST LE CONTRAT LUI-MÊME.
  //
  // « Vous ne payez rien avant d'avoir reçu 5 demandes » vient AVANT « si au
  // bout de 60 jours ». Un artisan qui reçoit sa cinquième demande le
  // soixante-et-unième jour a donc atteint la garantie, il ne l'a pas
  // laissée expirer. L'inverse serait plus avantageux pour nous, et c'est
  // exactement pour ça qu'il faut le trancher ici, par écrit.
  if (recues >= DEMANDES_GARANTIE) return { etat: 'atteinte', recues }

  if (creeLe === null || creeLe === '') return { etat: 'inconnue' }
  const depart = new Date(creeLe).getTime()
  // Une date illisible n'est pas une date de départ. `new Date('n''importe
  // quoi')` rend NaN sans lever, et NaN traverse tous les calculs suivants
  // en silence : le compteur afficherait « NaN jours restants ».
  if (Number.isNaN(depart)) return { etat: 'inconnue' }

  const echeance = depart + JOURS_GARANTIE * JOUR_MS
  const restantMs = echeance - maintenant.getTime()
  if (restantMs <= 0) return { etat: 'expiree', recues }

  // `ceil` et non `round` : tant qu'il reste une heure, il reste « 1 jour ».
  // Le compteur n'affiche donc jamais « 0 jour restant » alors que la
  // garantie court encore — ce qui ferait croire à l'artisan qu'il l'a
  // perdue, et le pousserait à arrêter la veille de son droit.
  const joursRestants = Math.ceil(restantMs / JOUR_MS)

  return { etat: 'en-cours', recues, requises: DEMANDES_GARANTIE, joursRestants }
}

/** Le libellé affiché dans les réglages. Séparé du calcul : on change le
 *  français sans toucher aux dates. */
export function libelleGarantie(g: Garantie): string | null {
  if (g.etat !== 'en-cours') return null
  return `${g.recues} sur ${g.requises}`
}
