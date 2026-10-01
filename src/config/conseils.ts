// CE QU'ON DIT AU CLIENT JUSTE APRÈS QU'IL A ENVOYÉ SA DEMANDE.
//
// ─────────────────────────────────────────────────────────────────────────
// CE FICHIER EST FAIT POUR ÊTRE RELU ET CORRIGÉ SANS TOUCHER AU CODE
// ─────────────────────────────────────────────────────────────────────────
// Ce sont des consignes données à quelqu'un qui a un problème chez lui, au
// nom d'un artisan. Elles engagent l'artisan. Elles doivent donc pouvoir
// être relues, discutées et réécrites par quelqu'un du métier — sans lire
// une ligne de TypeScript.
//
// Les RÈGLES qui décident laquelle s'affiche sont ailleurs, dans
// `lib/conseil.ts`. Elles sont déterministes et testées : aucun modèle,
// aucune estimation. La page de confirmation s'affiche en une fraction de
// seconde, bien avant que l'intelligence artificielle ait fini de classer la
// demande — elle ne peut donc compter que sur les réponses à boutons.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI DONNER UN CONSEIL PLUTÔT QUE DE DIRE « ON VOUS RAPPELLE »
// ─────────────────────────────────────────────────────────────────────────
// Un client qui a une fuite et qui n'a rien d'autre à faire qu'attendre
// appelle le plombier suivant. Il part dans les trois minutes. S'il repart
// avec un geste utile — et que c'est l'artisan qui le lui a donné — il
// reste. C'est le deuxième principe du projet : garder le client jusqu'au
// rappel.
//
// ─────────────────────────────────────────────────────────────────────────
// CE QU'ON NE DIT PAS, ET C'EST VOLONTAIRE
// ─────────────────────────────────────────────────────────────────────────
// AUCUN DÉLAI. Jamais. C'est la RÈGLE D'OR : on n'annonce jamais au client
// un délai que l'artisan n'a pas choisi lui-même. Une promesse non tenue
// fait plus de dégâts qu'un message flou.
//
// AUCUNE CONSIGNE SUR LE GAZ NI SUR L'ÉLECTRICITÉ dans cette version. Elles
// seront rédigées par Elie, avec des sources vérifiées. L'emplacement est
// prévu plus bas, commenté.

import type { Metier } from '../types.ts'

/** Un bloc affiché sur la page de confirmation. `agir` le met en évidence :
 *  c'est une chose à faire maintenant, pas une information. */
export type Conseil = { titre: string; texte: string; agir: boolean }

// ─────────────────────────────────────────────────────────────────────────
// LES TEXTES
// ─────────────────────────────────────────────────────────────────────────

/** L'eau coule, et le client n'a pas coupé l'arrivée.
 *
 *  C'EST LE SEUL CONSEIL QUI DEMANDE D'AGIR. Il est vrai, il est simple, et
 *  il réduit la facture — donc il profite au client ET à l'artisan. Les
 *  trois emplacements cités sont ceux d'un logement français ordinaire ;
 *  « en général » n'est pas une précaution de style, c'est l'exactitude. */
const COUPER_LEAU: Conseil = {
  titre: 'En attendant : coupez l’arrivée d’eau.',
  texte:
    'Le robinet d’arrêt général se trouve en général près du compteur d’eau, sous ' +
    'l’évier de la cuisine ou dans une gaine technique. Tournez-le à fond dans le sens ' +
    'des aiguilles d’une montre. Si vous ne le trouvez pas, ne forcez rien.',
  agir: true,
}

/** Plus de chauffage ou plus d'eau chaude.
 *
 *  AUCUNE CONSIGNE TECHNIQUE ICI, et c'est délibéré. Une panne de chauffage
 *  touche presque toujours une chaudière — gaz, fioul ou électrique — et
 *  envoyer quelqu'un appuyer sur un bouton qu'il ne connaît pas est
 *  exactement ce qu'il ne faut pas faire. On dit ce qui est vrai : c'est
 *  noté, et ça compte. */
const SANS_CHAUFFAGE: Conseil = {
  titre: 'Vous êtes sans chauffage ou sans eau chaude.',
  texte:
    'C’est écrit en toutes lettres sur votre demande. N’ouvrez pas la chaudière et ne ' +
    'touchez à aucun réglage : attendez l’appel.',
  agir: false,
}

// EMPLACEMENT PRÉVU — CONSIGNES GAZ ET ÉLECTRICITÉ.
//
// À rédiger par Elie, avec des sources vérifiées (GRDF, Enedis, INRS).
// Elles ne sont PAS dans cette version, et ce n'est pas un oubli : une
// consigne fausse sur une odeur de gaz peut tuer. Tant qu'elle n'est pas
// écrite et sourcée, il vaut mieux ne rien dire que dire à peu près.
//
// const ODEUR_DE_GAZ: Conseil = { … }
// const COUPURE_ELECTRIQUE: Conseil = { … }

// ─────────────────────────────────────────────────────────────────────────
// QUI DIT QUOI
// ─────────────────────────────────────────────────────────────────────────
// Les trois métiers partagent aujourd'hui les mêmes consignes : une fuite
// d'eau se coupe de la même façon chez un plombier et chez un chauffagiste.
// La table existe quand même, pour que différencier un jour ne demande pas
// de toucher au code — seulement d'écrire un autre texte ici.

export type Consignes = {
  /** L'eau coule et l'arrivée n'est pas coupée. */
  fuite: Conseil
  /** Plus de chauffage, ou plus d'eau chaude. */
  sansChauffage: Conseil
}

const PLOMBERIE: Consignes = { fuite: COUPER_LEAU, sansChauffage: SANS_CHAUFFAGE }

export const CONSIGNES: Record<Metier, Consignes> = {
  plombier: PLOMBERIE,
  chauffagiste: PLOMBERIE,
  'plombier-chauffagiste': PLOMBERIE,
}

/** Le métier d'un artisan vient de la base, et la base impose la liste
 *  (contrainte `artisans_metier_connu`, migration 0015). Mais cette page est
 *  publique et lit ce que l'API lui rend : si une valeur inattendue
 *  arrivait, on retombe sur la plomberie plutôt que de n'afficher aucun
 *  conseil. */
export function consignesDe(metier: string): Consignes {
  return CONSIGNES[metier as Metier] ?? PLOMBERIE
}
