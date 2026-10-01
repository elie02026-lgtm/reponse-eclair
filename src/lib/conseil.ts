// LES TROIS QUESTIONS À BOUTONS, ET CE QU'ON RÉPOND ENSUITE.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI DES BOUTONS PLUTÔT QU'UN CHAMP DE TEXTE
// ─────────────────────────────────────────────────────────────────────────
// Le client tape debout dans sa cuisine, sur un téléphone, avec une fuite à
// ses pieds. Chaque caractère qu'on lui demande est une occasion de fermer
// l'onglet. Trois touchers valent mieux que trois phrases — et ils donnent
// une information EXPLOITABLE, là où du texte libre demande un modèle pour
// être compris.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI LA PAGE DE CONFIRMATION NE PEUT PAS ATTENDRE L'IA
// ─────────────────────────────────────────────────────────────────────────
// La classification arrive entre dix-sept et vingt secondes après l'envoi,
// mesuré en production. La page, elle, s'affiche tout de suite. Elle ne peut
// donc compter que sur ces trois réponses — et les règles qui les lisent
// doivent être déterministes, sans aucun modèle. C'est tout l'objet de ce
// fichier : il est pur, et il est testé.
//
// Les TEXTES, eux, sont dans `config/conseils.ts`, pour qu'Elie puisse les
// relire et les corriger sans lire une ligne de code.

import { consignesDe } from '../config/conseils.ts'
import type { Conseil } from '../config/conseils.ts'

/** Trois réponses possibles, et « je ne sais pas » en est une VRAIE.
 *  Sans elle, quelqu'un qui ignore où est son robinet répondrait « non » —
 *  et on lui donnerait un conseil fondé sur une réponse fausse. */
export const OUI_NON_PEUTETRE = ['oui', 'non', 'je-ne-sais-pas'] as const
export const OUI_NON = ['oui', 'non'] as const

export type Reponse = (typeof OUI_NON_PEUTETRE)[number]

/**
 * Les trois questions, dans l'ordre d'affichage.
 *
 * L'ordre n'est pas neutre : « l'eau coule-t-elle » d'abord, parce que c'est
 * la seule qui déclenche un geste utile. Si le client abandonne après la
 * première, on a déjà ce qui compte le plus.
 *
 * Le champ `nom` est AUSSI le nom de la colonne en base et celui du champ
 * envoyé à Make. Un seul mot pour les trois endroits : il n'y a rien à
 * traduire, donc rien à se tromper.
 */
export const QUESTIONS = [
  {
    nom: 'eau_coule',
    texte: 'L’eau coule-t-elle en ce moment ?',
    choix: OUI_NON_PEUTETRE,
  },
  {
    nom: 'arrivee_coupee',
    texte: 'Avez-vous pu couper l’arrivée d’eau ?',
    choix: OUI_NON_PEUTETRE,
  },
  {
    nom: 'chauffage_eau_chaude',
    texte: 'Avez-vous encore du chauffage et de l’eau chaude ?',
    choix: OUI_NON,
  },
] as const

export type NomQuestion = (typeof QUESTIONS)[number]['nom']

/** Ce que le client a touché. `null` = il n'a pas répondu, ce qui est
 *  permis : aucune des trois n'est obligatoire. */
export type Reponses = Record<NomQuestion, Reponse | null>

export const AUCUNE_REPONSE: Reponses = {
  eau_coule: null,
  arrivee_coupee: null,
  chauffage_eau_chaude: null,
}

/** Vrai dès qu'une seule question a été touchée. C'est ce qui rend la
 *  description FACULTATIVE : quelqu'un qui a répondu « l'eau coule, je n'ai
 *  pas coupé » en a dit assez pour être rappelé en premier. */
export function auMoinsUneReponse(r: Reponses): boolean {
  return QUESTIONS.some((q) => r[q.nom] !== null)
}

/** Une réponse reçue de l'extérieur est-elle l'une de celles qu'on propose ?
 *  Le serveur s'en sert pour refuser tout le reste. */
export function reponseValide(nom: NomQuestion, valeur: unknown): valeur is Reponse {
  const question = QUESTIONS.find((q) => q.nom === nom)
  if (!question) return false
  return (question.choix as readonly string[]).includes(valeur as string)
}

/**
 * CE QU'ON AFFICHE AU CLIENT, ET DANS QUEL ORDRE.
 *
 * Trois règles, et rien d'autre. Chacune vient du cahier, mot pour mot.
 *
 * Ce qui n'est PAS ici, et qui est aussi important :
 *   • aucun délai — RÈGLE D'OR, on n'annonce jamais une heure que l'artisan
 *     n'a pas choisie lui-même ;
 *   • aucune consigne gaz ou électricité — elles seront rédigées par Elie
 *     avec des sources vérifiées, l'emplacement est prévu dans
 *     `config/conseils.ts` ;
 *   • aucune estimation de gravité — elle n'existe pas encore au moment où
 *     cette page s'affiche.
 */
export function conseils(reponses: Reponses, metier: string): Conseil[] {
  const consignes = consignesDe(metier)
  const liste: Conseil[] = []

  // L'EAU COULE ET RIEN N'EST COUPÉ. C'est le seul cas où l'on demande un
  // geste, et c'est celui qui garde le client : il repart avec quelque chose
  // à faire, donné par l'artisan.
  //
  // On exige « non » et pas « je-ne-sais-pas », parce que c'est ce que le
  // cahier dit. Quelqu'un qui ne sait pas s'il a coupé mérite peut-être le
  // même conseil — c'est une question ouverte, posée à Elie, pas une
  // décision prise ici en silence.
  if (reponses.eau_coule === 'oui' && reponses.arrivee_coupee === 'non') {
    liste.push(consignes.fuite)
  }

  // PLUS DE CHAUFFAGE OU D'EAU CHAUDE : prise en charge, sans aucune
  // consigne technique. Une chaudière ne se manipule pas sur instruction
  // d'une page web.
  if (reponses.chauffage_eau_chaude === 'non') {
    liste.push(consignes.sansChauffage)
  }

  return liste
}

/**
 * La phrase qui s'affiche TOUJOURS, quelle que soit la situation.
 *
 * Elle nomme l'entreprise deux fois, et ce n'est pas une maladresse : le
 * client vient d'écrire à un inconnu sur une page qu'il ne connaît pas. Lui
 * redire chez qui c'est arrivé est ce qui le rassure le plus.
 *
 * « vient d'être prévenu » est VRAI : l'alerte part dans la foulée. On ne
 * dit pas « va vous rappeler », qui serait un engagement que l'artisan n'a
 * pas pris.
 */
export function accuse(entreprise: string): string {
  return `C’est bien arrivé chez ${entreprise}. ${entreprise} vient d’être prévenu, avec votre description.`
}
