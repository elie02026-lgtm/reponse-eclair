// LES LIENS D'ACTION DE L'E-MAIL D'ALERTE.
//
// L'artisan visé par ce produit a 55 ans et ne se connectera pas à un
// logiciel. Il doit pouvoir répondre depuis son courrier : « C'est fait » et
// « Pas si urgent », en touchant un bouton.
//
// Un lien qui agit sans connexion EST une autorisation. Elle est bornée à :
// UNE demande, UNE opération, TRENTE jours, AUCUNE lecture de donnée.
//
// ─────────────────────────────────────────────────────────────────────────
// CE FICHIER EST PUR, ET C'EST CE QUI LE REND VÉRIFIABLE
// ─────────────────────────────────────────────────────────────────────────
// Le Worker s'en sert pour fabriquer les jetons ; Postgres les recalcule de
// son côté, dans `agir_sur_demande` (migration 0014). DEUX IMPLÉMENTATIONS
// DE SHA-256 DOIVENT S'ACCORDER, en TypeScript et en PL/pgSQL. Le test
// d'à côté les compare sur une valeur relevée dans la vraie base : si l'une
// des deux dérive un jour, il tombe.

import { TITRE_CONFIRMATION } from '../config/promesse.ts'

/** Ce qu'on fait d'une demande DÉJÀ TRAITÉE. Ces deux-là ne rendent aucune
 *  donnée : ils passent par `agir_sur_demande` (migration 0014). */
export const OPERATIONS_DEMANDE = ['fait', 'pas_urgent'] as const

/**
 * LES TROIS DÉLAIS DE RAPPEL (phase 5 bis).
 *
 * Séparés des deux autres, et pas par goût du rangement : ils ne vont pas à
 * la même fonction de la base, et surtout ILS LISENT. `promettre_rappel`
 * (migration 0018) rend le numéro du client, parce qu'on ne peut pas
 * prévenir quelqu'un sans savoir où. Les deux ci-dessus, non — et c'est une
 * propriété qu'on garde en ne mélangeant pas les deux portes.
 *
 * Vérifié dans la vraie base : le jeton de « c'est fait » ne promet rien
 * (contrôle C11), et `agir_sur_demande` refuse une opération de promesse
 * (C13). Les deux listes blanches existent aussi en SQL.
 */
export const OPERATIONS_PROMESSE = [
  'promesse_15min',
  'promesse_1h',
  'promesse_fin_de_journee',
] as const

/** Tout ce qu'une adresse `/agir` peut porter. Liste blanche : Postgres a la
 *  même, et refuse tout le reste (`operation_inconnue`). */
export const OPERATIONS = [...OPERATIONS_DEMANDE, ...OPERATIONS_PROMESSE] as const
export type Operation = (typeof OPERATIONS)[number]
export type OperationPromesse = (typeof OPERATIONS_PROMESSE)[number]

export function estOperation(valeur: string): valeur is Operation {
  return (OPERATIONS as readonly string[]).includes(valeur)
}

/** Laquelle des deux fonctions de la base il faut appeler. */
export function estOperationPromesse(valeur: Operation): valeur is OperationPromesse {
  return (OPERATIONS_PROMESSE as readonly string[]).includes(valeur)
}

/** Un jeton est l'empreinte SHA-256 en hexadécimal minuscule : 64 caractères,
 *  rien d'autre. On le vérifie AVANT d'appeler la base — inutile de déranger
 *  Postgres pour une chaîne qui ne peut pas être un jeton. */
const JETON = /^[0-9a-f]{64}$/

export function jetonValide(valeur: string): boolean {
  return JETON.test(valeur)
}

/** L'identifiant de la demande, tel qu'il arrive de l'URL. Entier positif,
 *  sans signe, sans décimale, sans notation exponentielle. `Number('1e3')`
 *  vaut 1000 : c'est le genre de détour qu'on ferme ici. */
export function lireIdDemande(valeur: string): number | null {
  if (!/^[0-9]{1,18}$/.test(valeur)) return null
  const n = Number(valeur)
  return Number.isSafeInteger(n) && n > 0 ? n : null
}

/**
 * Le jeton d'un bouton : sha256(cle_action + ":" + operation).
 *
 * C'EST CE QUI REND UN LIEN INCAPABLE D'EN FAIRE UN AUTRE. Celui qui détient
 * le lien « c'est fait » ne peut pas en déduire celui de « pas si urgent » :
 * il lui faudrait `cle_action`, qui ne quitte jamais la base de données.
 *
 * `crypto.subtle` existe dans les Workers Cloudflare ET dans Node depuis la
 * version 18 — donc ce calcul est testable hors navigateur, ce qui est tout
 * l'intérêt de l'avoir mis ici.
 */
export async function jetonPour(cleAction: string, operation: Operation): Promise<string> {
  const octets = new TextEncoder().encode(`${cleAction}:${operation}`)
  const empreinte = await crypto.subtle.digest('SHA-256', octets)
  return [...new Uint8Array(empreinte)].map((o) => o.toString(16).padStart(2, '0')).join('')
}

/**
 * Une clé d'action : 32 octets tirés au hasard, en hexadécimal.
 *
 * Pourquoi de l'hexadécimal et non du base64url, plus court : cette chaîne
 * traverse Make, une charge utile JSON, une colonne Postgres et une URL. Un
 * alphabet de seize caractères ne peut se faire abîmer par aucun des quatre.
 * On perd vingt-neuf caractères de longueur ; on gagne de ne jamais avoir à
 * chercher pourquoi un lien sur mille ne marche pas.
 */
export function nouvelleCleAction(): string {
  const octets = crypto.getRandomValues(new Uint8Array(32))
  return [...octets].map((o) => o.toString(16).padStart(2, '0')).join('')
}

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ARTISAN LIT À L'ÉCRAN
// ─────────────────────────────────────────────────────────────────────────
// `agir_sur_demande` rend un mot, toujours le même vocabulaire. Il ne doit
// JAMAIS arriver tel quel devant un artisan : « refuse » ne veut rien dire
// pour quelqu'un qui vient de toucher un bouton dans son courrier.
//
// Aucun de ces messages ne révèle quoi que ce soit de la demande. « inconnue »
// et un jeton faux disent la même chose, à dessein : distinguer les deux
// apprendrait à un curieux quels identifiants existent.

export type Reponse = { bon: boolean; titre: string; detail: string }

export const REPONSES: Record<string, Reponse> = {
  ok: {
    bon: true,
    titre: 'C’est noté.',
    detail: 'Vous pouvez fermer cette page.',
  },
  // Phase 5 bis : il a touché deux fois le même délai, à quelques secondes.
  // C'est un SUCCÈS — sa promesse est enregistrée — mais on ne lui propose
  // pas de redire la même chose à son client. Voir `promettre_rappel`.
  inchange: {
    bon: true,
    titre: 'C’est déjà noté.',
    detail: 'Vous venez de le dire. Vous pouvez fermer cette page.',
  },
  expire: {
    bon: false,
    titre: 'Ce lien a expiré.',
    detail: 'Les liens des alertes sont valables trente jours. Ouvrez votre écran pour agir.',
  },
  // Un délai de rappel, lui, ne vaut que 48 h : « je vous rappelle dans
  // 15 minutes » ne veut rien dire trois semaines plus tard.
  expire_promesse: {
    bon: false,
    titre: 'Cette demande est trop ancienne.',
    detail:
      'On ne peut annoncer un rappel que dans les deux jours qui suivent la demande. Ouvrez votre écran pour agir.',
  },
  refuse: {
    bon: false,
    titre: 'Ce lien n’est plus valable.',
    detail: 'Il a peut-être été recopié de travers. Ouvrez votre écran pour agir.',
  },
  inconnue: {
    bon: false,
    titre: 'Ce lien n’est plus valable.',
    detail: 'Il a peut-être été recopié de travers. Ouvrez votre écran pour agir.',
  },
  operation_inconnue: {
    bon: false,
    titre: 'Ce lien n’est plus valable.',
    detail: 'Il a peut-être été recopié de travers. Ouvrez votre écran pour agir.',
  },
}

/** Un résultat que la base ne devrait jamais rendre reste un échec lisible,
 *  pas un écran blanc. */
export const REPONSE_INATTENDUE: Reponse = {
  bon: false,
  titre: 'Ça n’a pas marché.',
  detail: 'Réessayez dans un instant, ou ouvrez votre écran pour agir.',
}

export function reponseDe(resultat: string): Reponse {
  return REPONSES[resultat] ?? REPONSE_INATTENDUE
}

/** Ce que le gros bouton de la page de confirmation annonce. C'est la
 *  SEULE chose que la page dit de la demande — c'est-à-dire rien d'elle. */
export const LIBELLE_OPERATION: Record<Operation, string> = {
  fait: 'Marquer comme rappelé',
  pas_urgent: 'Signaler que ce n’est pas si urgent',
  // Les trois délais sont écrits EN ENTIER, et importés du fichier de textes.
  // C'est la dernière chose que l'artisan lit avant de s'engager : « 15 min »
  // sur le bouton de l'e-mail suffit pour choisir, pas pour promettre.
  promesse_15min: TITRE_CONFIRMATION['15min'],
  promesse_1h: TITRE_CONFIRMATION['1h'],
  promesse_fin_de_journee: TITRE_CONFIRMATION.fin_de_journee,
}
