// LA RÈGLE DE TRI, À UN SEUL ENDROIT.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE FICHIER EXISTE
// ─────────────────────────────────────────────────────────────────────────
// La règle vivait à DEUX endroits : dans la page de démonstration, en
// JavaScript, et dans les requêtes des écrans réels, en SQL. Deux endroits
// qui doivent dire la même chose finissent toujours par ne plus la dire —
// et ici, la divergence serait la pire possible : la démonstration montrerait
// aux prospects un classement que le produit ne fait pas.
//
// Depuis la migration 0014, l'artisan peut corriger la gravité du modèle.
// Le tri doit donc lire `gravite_corrigee` quand elle existe, `gravite`
// sinon. C'était l'occasion de n'avoir plus qu'une règle.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI EN JAVASCRIPT ET PLUS EN SQL
// ─────────────────────────────────────────────────────────────────────────
// PostgREST ne sait pas trier sur une expression : `order=gravite.desc`
// existe, `order=coalesce(...)` non. Les solutions étaient une colonne
// générée — donc une migration de plus — ou le tri ici. Un artisan a
// quelques dizaines de demandes à rappeler, pas des dizaines de milliers :
// trier quarante lignes dans un navigateur ne coûte rien.
//
// L'index posé par la migration 0014 n'est donc pas utilisé aujourd'hui. Il
// le sera le jour où cet écran paginera, et il ne coûte qu'un peu d'écriture
// en attendant. C'est dit ici pour que personne ne le croie mort.

import type { Demande } from '../types.ts'

/**
 * La gravité qui FAIT FOI.
 *
 * `gravite` est l'estimation du modèle, et on ne l'efface jamais :
 * l'écart entre les deux est la donnée qui dira, dans six mois, si la
 * classification est juste.
 */
export function graviteEffective(d: Demande): number | null {
  return d.gravite_corrigee ?? d.gravite
}

/** Vrai si l'artisan a corrigé le modèle sur cette demande. */
export function estCorrigee(d: Demande): boolean {
  return d.gravite_corrigee !== null
}

/**
 * Gravité décroissante, puis panier décroissant. JAMAIS la date.
 *
 * `sort` modifie le tableau qu'on lui donne : on copie d'abord. Sans ça,
 * l'ordre d'arrivée — qui est la moitié de la démonstration — disparaîtrait
 * au premier appel.
 *
 * Une gravité absente compte pour 0 et reste en bas : la classification
 * arrive APRÈS l'écriture de la ligne (mesuré : dix-sept à vingt secondes).
 * Une demande pas encore classée ne doit pas passer devant une fuite.
 */
export function trier(demandes: Demande[]): Demande[] {
  return [...demandes].sort(
    (a, b) =>
      (graviteEffective(b) ?? 0) - (graviteEffective(a) ?? 0) || (b.panier ?? 0) - (a.panier ?? 0),
  )
}
