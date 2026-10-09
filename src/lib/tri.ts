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
 * LE PLANCHER DE GRAVITÉ, DÉDUIT DES RÉPONSES DU CLIENT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI IL EXISTE : UN DÉFAUT MESURÉ, PAS UNE PRÉCAUTION
 * ─────────────────────────────────────────────────────────────────────────
 * Le 7 octobre 2026, une demande réelle est arrivée avec « l'eau coule :
 * oui », « arrivée coupée : non », et AUCUNE description — ce qui est
 * permis depuis la phase 5. Le modèle, qui ne recevait que la description,
 * n'avait rien à juger : il a rendu **gravité 1, motif « contenu
 * manquant », panier 0 €**.
 *
 * Autrement dit : le client le plus urgent du logiciel, rangé en dernier.
 * Silencieusement. Personne ne l'aurait su avant qu'un vrai plombier perde
 * un vrai chantier.
 *
 * Le prompt a été corrigé et il tient — vérifié deux fois, avec un contrôle
 * négatif propre (un devis de salle de bain à 8 000 € reste en gravité 1).
 * Mais un prompt reste une CONSIGNE : rien ne garantit qu'un modèle la
 * suivra toujours, et personne ne s'en apercevrait. Ce plancher, lui, est
 * du calcul. Il ne dépend d'aucun modèle, d'aucun réseau, d'aucun service.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QU'IL NE FAIT PAS
 * ─────────────────────────────────────────────────────────────────────────
 * Il prend LA PLUS GRAVE des règles qui s'appliquent, jamais la première
 * rencontrée — voir le commentaire dans le corps, qui porte la mesure.
 *
 * Il ne BAISSE jamais rien. Si le modèle a vu dans la description quelque
 * chose de plus grave que ce que les boutons disent, c'est le modèle qui
 * gagne. Un plancher qui plafonnerait serait une censure.
 *
 * Il ne touche pas non plus à `gravite` en base : la réponse brute du
 * modèle est conservée, comme toujours. L'écart entre les trois — modèle,
 * plancher, correction de l'artisan — est ce qui permettra de juger si la
 * classification vaut quelque chose.
 *
 * LIMITE CONNUE : l'e-mail d'alerte est composé par Make à partir de la
 * seule réponse du modèle. Dans le cas rare où le plancher corrigerait le
 * modèle, l'e-mail annoncerait une gravité plus basse que l'écran. L'écran
 * fait foi. Le jour où ça gênera, il faudra que Make lise la colonne plutôt
 * que sa propre variable.
 */
export function plancherReponses(d: Demande): number | null {
  // ON LES COLLECTE TOUTES, PUIS ON PREND LA PLUS GRAVE.
  //
  // Jusqu'au 9 octobre 2026, cette fonction était une CASCADE : le premier
  // `if` qui mordait sortait par un `return`, et les suivants n'étaient
  // jamais lus. Ce n'était donc pas un plancher, c'était un premier-arrivé.
  //
  // Le défaut a été mesuré sur une demande réelle, la 71 : « l'eau coule
  // oui », « arrivée coupée oui », « chauffage non », un 9 octobre. Deux
  // règles mordaient — fuite maîtrisée à 2, chauffage en période froide à 3
  // — et la cascade rendait 2. Retirer la fuite rendait 3. AJOUTER UNE
  // PANNE FAISAIT BAISSER LE PLANCHER : absurde, et dangereux le jour où le
  // modèle se trompe, c'est-à-dire le seul jour où ce plancher sert.
  //
  // Un plancher est un minimum garanti. Quand plusieurs faits rapportés le
  // justifient, c'est le plus grave qui commande.
  const planchers: number[] = []

  // L'EAU QUI COULE. Une fuite non maîtrisée abîme un logement à chaque
  // minute ; c'est le cas où l'on sait, sans lire une ligne de description,
  // qu'il faut y aller.
  if (d.eau_coule === 'oui') {
    // « Je ne sais pas » compte comme « non » : celui qui ignore s'il a
    // coupé n'a, en pratique, pas coupé. Même arbitrage que pour le conseil
    // affiché au client (`lib/conseil.ts`).
    const coupee = d.arrivee_coupee === 'oui'
    planchers.push(coupee ? 2 : 3)
  }

  // PLUS DE CHAUFFAGE : 3 EN PÉRIODE FROIDE, 2 LE RESTE DE L'ANNÉE.
  //
  // Ce plancher était plat à 2 jusqu'au 9 octobre 2026, et le commentaire
  // d'alors disait pourquoi : « Avez-vous encore du chauffage ET de l'eau
  // chaude ? » mélangeait une panne gênante et une panne dangereuse, donc le
  // bouton ne pouvait pas justifier une gravité 3. Les deux questions sont
  // séparées (migration 0021) : il redevient saisonnier, pour le seul
  // chauffage.
  //
  // LA DATE VIENT DE LA DEMANDE, PAS DE L'HORLOGE. `recue_le` est le moment
  // où le client a écrit ; `now()` serait le moment où quelqu'un regarde
  // l'écran. Avec `now()`, une demande de janvier relue en juillet
  // changerait de gravité toute seule — et cette fonction cesserait d'être
  // pure, donc testable.
  if (d.chauffage === 'non') planchers.push(estPeriodeFroide(d.recue_le) ? 3 : 2)

  // PLUS D'EAU CHAUDE : 2, toute l'année. C'est gênant, ce n'est pas un
  // danger, et aucune saison n'y change rien.
  if (d.eau_chaude === 'non') planchers.push(2)

  // L'ANCIENNE QUESTION FUSIONNÉE, le temps que la colonne disparaisse.
  //
  // Make n'écrit plus `chauffage_eau_chaude` depuis le 9 octobre, mais les
  // lignes d'avant la portent encore. On continue de la lire, à 2 — la
  // valeur prudente, la seule que le bouton fusionné prouvait. À retirer
  // avec la migration 0022.
  if (d.chauffage_eau_chaude === 'non') planchers.push(2)

  // Pas une seule réponse exploitable : pas de plancher. `null` et non 0 —
  // 0 serait un plancher, et il écraserait une gravité 1 légitime.
  if (planchers.length === 0) return null

  return Math.max(...planchers)
}

/**
 * Octobre à mars inclus, à l'heure de Paris.
 *
 * `Intl` et non `getMonth()` : l'appareil de l'artisan peut être réglé sur
 * un autre fuseau, et une demande du 1ᵉʳ octobre à 00 h 30 ne doit pas être
 * lue comme une demande de septembre parce que le téléphone est à Londres.
 * Même précaution que `dateCourte` dans `CarteDemande.tsx`.
 */
export function estPeriodeFroide(recueLe: string): boolean {
  const mois = Number(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'numeric' }).format(
      new Date(recueLe),
    ),
  )
  return mois >= 10 || mois <= 3
}

/**
 * La gravité qui FAIT FOI.
 *
 * TROIS AVIS, DANS CET ORDRE :
 *
 *  1. L'ARTISAN, s'il s'est prononcé. Il connaît son métier, il connaît sa
 *     ville, et c'est lui qui se déplacera. Rien ne le contredit — surtout
 *     pas un plancher calculé.
 *  2. Sinon, le plus élevé entre l'estimation du modèle et le plancher
 *     déduit des réponses du client.
 *
 * `gravite` est l'estimation brute du modèle, et on ne l'efface jamais :
 * l'écart entre les avis est la donnée qui dira, dans six mois, si la
 * classification est juste.
 */
export function graviteEffective(d: Demande): number | null {
  // L'artisan a tranché : on ne le corrige pas.
  if (d.gravite_corrigee !== null) return d.gravite_corrigee

  const plancher = plancherReponses(d)
  if (plancher === null) return d.gravite
  if (d.gravite === null) return plancher
  return Math.max(d.gravite, plancher)
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
