// Les constantes de l'offre, à un seul endroit.
//
// Ce fichier existe pour qu'Elie puisse changer le discours commercial sans
// ouvrir un composant. Tout ce qui est ici est LU par la page de vente, par
// les CGV et par l'écran de réglages : aucune de ces trois surfaces ne
// recopie un texte, elles l'importent. Une promesse ne peut donc pas être
// vraie sur la page de vente et fausse dans le contrat.
//
// Le prix vit encore dans `lib/prix.ts`, où les CGV le lisent déjà. Il
// viendra ici en phase 3, en un seul mouvement, pour qu'il n'y ait jamais
// deux sources.

/** Où l'on parle à un humain. Le cahier a tranché : un artisan préfère un
 *  humain à une IA, et l'appel sert à ça. */
export const LIEN_RDV = 'https://cal.com/elie-gywz5w/rdv'

// ─────────────────────────────────────────────────────────────────────────
// LA GARANTIE
// ─────────────────────────────────────────────────────────────────────────
// Elle ne répond pas à « et si je change d'avis » — c'est le rôle des
// quatorze jours de rétractation, qui restent à l'article 6 des CGV et se
// cumulent avec celle-ci. Elle répond à la vraie peur du patron :
// « ça ne me rapportera rien ».
//
// C'est pour ça qu'elle est indexée sur des demandes REÇUES, pas sur une
// durée d'essai. Une durée d'essai fait porter le risque à l'artisan ;
// celle-ci le fait porter à l'éditeur.

/** Le nom court, celui qu'on prononce au téléphone. */
export const NOM_GARANTIE = 'Garantie 5 demandes'

/**
 * Le texte exact, écrit par Elie. Les CGV l'affichent MOT POUR MOT depuis
 * cette constante — pas une copie, l'original. C'est la seule façon de
 * garantir que le contrat promette ce que la page de vente promet.
 *
 * Le compteur mentionné à la dernière phrase existe vraiment : voir
 * `lib/garantie.ts` et l'écran Réglages. Ne pas modifier cette phrase sans
 * vérifier que l'écran la tient toujours — le test de `config/offre.test.ts`
 * surveille les nombres, pas le sens.
 */
export const TEXTE_GARANTIE =
  'Vous ne payez rien avant d’avoir reçu 5 demandes de clients. Si au bout de ' +
  '60 jours vous en avez reçu moins de 5, vous arrêtez sans avoir payé un euro. ' +
  'C’est le logiciel qui les compte : vous voyez le compteur dans vos réglages.'

/** Combien de demandes déclenchent la fin de la garantie. */
export const DEMANDES_GARANTIE = 5

/** Combien de jours après la CRÉATION DU COMPTE la garantie court.
 *  `artisans.cree_le` est la date de référence — elle existe depuis la
 *  migration 0001, donc aucune migration n'est nécessaire pour ce compteur. */
export const JOURS_GARANTIE = 60
