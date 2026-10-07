// CE QU'ON DIT AU CLIENT QUAND L'ARTISAN S'ENGAGE À LE RAPPELER.
//
// ─────────────────────────────────────────────────────────────────────────
// CE FICHIER EST FAIT POUR ÊTRE RELU ET CORRIGÉ SANS TOUCHER AU CODE
// ─────────────────────────────────────────────────────────────────────────
// Ce message part au nom de l'artisan, à quelqu'un qui a un problème chez
// lui. Il l'engage. Il doit donc pouvoir être relu, discuté et réécrit par
// quelqu'un du métier — sans lire une ligne de TypeScript.
//
// Les RÈGLES, elles, sont dans `lib/promesse.ts`, et elles sont testées.
//
// ─────────────────────────────────────────────────────────────────────────
// ⚠ DEUX PIÈGES À CONNAÎTRE AVANT DE RÉÉCRIRE CES PHRASES
// ─────────────────────────────────────────────────────────────────────────
// 1. L'APOSTROPHE COURBE ’ DOUBLE LA FACTURE. Un SMS est facturé au segment,
//    et un seul caractère hors du jeu GSM fait tomber la capacité de 160 à
//    70 caractères. Sont hors du jeu : ’ « » … – œ. Sont dedans : les
//    accents é è à ù, et l'apostrophe DROITE '.
//    C'est `lib/sms.ts` qui compte, et un test refuse tout texte qui
//    dépasserait un segment. Si tu réécris et qu'un test tombe en parlant de
//    segments, c'est ça.
//
// 2. AUCUN DÉLAI QUE L'ARTISAN N'A PAS TOUCHÉ. C'est la RÈGLE D'OR du
//    projet. Ces trois phrases sont les SEULES du logiciel qui annoncent une
//    heure au client, et chacune n'est écrite que parce qu'un doigt s'est
//    posé sur elle. Ne pas y ajouter de « au plus tard », ni de « dans la
//    journée » dans une autre phrase du produit.

import type { Delai } from '../types.ts'

// ─────────────────────────────────────────────────────────────────────────
// CE QUE LE CLIENT LIT DANS SON SMS
// ─────────────────────────────────────────────────────────────────────────
// Au présent, et à la première personne : c'est l'artisan qui parle, pas un
// logiciel. « Vous serez rappelé » est une tournure d'administration ; « je
// vous rappelle » est une promesse d'homme.
export const QUAND: Record<Delai, string> = {
  '15min': 'dans 15 minutes',
  '1h': 'dans une heure',
  fin_de_journee: 'en fin de journée',
}

/**
 * Le message, en entier.
 *
 * `{ENTREPRISE}` et `{QUAND}` sont remplacés au moment de l'envoi. Les
 * accolades sont volontairement les mêmes que celles du `{LIEN}` du message
 * de renvoi d'appel : c'est la convention du projet pour « ici, une valeur
 * sera glissée ».
 *
 * PAS DE LIEN DEDANS, et c'est délibéré. Un lien coûte quatre-vingts
 * caractères — la moitié d'un segment — et le client n'a rien à faire : il
 * attend un appel. Le seul geste utile, on le lui a déjà donné sur la page
 * de confirmation du formulaire (`config/conseils.ts`).
 *
 * PAS DE PRÉNOM non plus. Il faudrait que la base le rende au Worker, donc
 * qu'un lien d'action puisse lire un prénom. Ça ne valait pas ce qu'on
 * gagnerait.
 */
export const MODELE_SMS = "Bonjour, c'est {ENTREPRISE}. Je vous rappelle {QUAND}."

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ARTISAN LIT SUR LES BOUTONS DE SON E-MAIL
// ─────────────────────────────────────────────────────────────────────────
// Court, parce qu'ils sont trois côte à côte sur un écran de téléphone, lus
// debout sur un chantier. « 15 min » et pas « dans quinze minutes ».
export const LIBELLE_BOUTON: Record<Delai, string> = {
  '15min': '15 min',
  '1h': '1 heure',
  fin_de_journee: 'Ce soir',
}

/** Le titre de la page de confirmation, avant qu'il ne touche le gros
 *  bouton. Il doit contenir le délai EN ENTIER : c'est la dernière chose
 *  qu'il lit avant de s'engager. */
export const TITRE_CONFIRMATION: Record<Delai, string> = {
  '15min': 'Dire que vous rappelez dans 15 minutes',
  '1h': 'Dire que vous rappelez dans une heure',
  fin_de_journee: 'Dire que vous rappelez en fin de journée',
}

/** La phrase du bloc, dans l'e-mail, au-dessus des trois boutons. */
export const INVITATION =
  'Vous ne pouvez pas appeler tout de suite ? Dites-lui quand vous le rappelez.'
