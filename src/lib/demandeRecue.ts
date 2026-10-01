// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
// C'est volontaire — ce fichier peut donc être exécuté et vérifié seul.
//
// ─────────────────────────────────────────────────────────────────────────
// LES RÈGLES DE CE QU'ON ACCEPTE, ET POURQUOI ELLES NE SONT PAS DANS LE WORKER
// ─────────────────────────────────────────────────────────────────────────
// Le Worker est une coquille : il lit une requête, appelle ces règles,
// répond. Si la validation vivait dedans, elle serait le seul endroit du
// projet qu'on ne pourrait pas éprouver avec `node --test` — c'est-à-dire
// le seul endroit sans filet, au moment précis où il sert de porte d'entrée.
//
// Ce module est le SEUL à décider de ce qui part chez Make. Tout champ
// inconnu du corps reçu est ignoré, jamais transmis.

import { lireTelephone } from './telephone.ts'
import { QUESTIONS, reponseValide } from './conseil.ts'

/** Ce que le client a coché. Liste blanche : la valeur part telle quelle
 *  vers l'IA de classification, qui la compare à la description. Un texte
 *  libre ici permettrait d'écrire n'importe quoi dans ce que l'artisan
 *  lit — et le formulaire n'offre de toute façon que ces deux choix. */
export const URGENCES = ['Oui, c’est urgent', 'Non, ça peut attendre'] as const

/** Alphabet du code artisan, migration 0007 : ni I, ni L, ni O, ni 0, ni 1,
 *  pour qu'on puisse se le lire au téléphone sans se tromper. */
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/

/** Bornes de longueur. Exportées : le formulaire pose les mêmes en
 *  `maxLength`, pour qu'un vrai client ne se fasse jamais refuser — la
 *  borne serveur ne doit frapper qu'un appelant qui n'est pas le navigateur. */
export const BORNES = {
  besoin: 2000,
  prenom: 60,
  lieu: 120,
  email: 254,
} as const

export type DemandeValide = {
  code: string
  prenom: string
  /** Toujours en +33… : une seule écriture arrive en base. */
  telephone: string
  email: string
  lieu: string
  besoin: string
  // Les trois réponses à boutons (phase 5.1). `null` quand le client n'a
  // pas touché la question — ce qui est permis : aucune n'est obligatoire.
  eau_coule: string | null
  arrivee_coupee: string | null
  chauffage_eau_chaude: string | null
  urgence_dite: string
}

export type Verdict =
  | { etat: 'ok'; demande: DemandeValide }
  | { etat: 'invalide'; champ: string; message: string }

/** Rend toujours une chaîne nettoyée, quoi qu'on reçoive. Un client qui
 *  envoie `{"besoin": 42}` ou `{"besoin": null}` ne doit pas faire tomber
 *  la porte d'entrée : il doit se faire refuser proprement. */
function texte(source: Record<string, unknown>, champ: string): string {
  const v = source[champ]
  return typeof v === 'string' ? v.trim() : ''
}

function invalide(champ: string, message: string): Verdict {
  return { etat: 'invalide', champ, message }
}

/**
 * Valide et normalise un corps de requête reçu sur /api/demande.
 *
 * L'ordre des contrôles suit l'ordre du coût : ici tout est gratuit, mais
 * le code passe en premier parce que c'est lui qui déclenchera, chez
 * l'appelant, la seule vérification qui coûte un aller-retour réseau.
 */
export function validerDemande(brut: unknown): Verdict {
  if (typeof brut !== 'object' || brut === null || Array.isArray(brut)) {
    return invalide('corps', 'Le corps de la requête doit être un objet JSON.')
  }
  const source = brut as Record<string, unknown>

  // ── code ────────────────────────────────────────────────────────────
  // Majuscules et espaces retirés AVANT de juger : un code recopié à la
  // main depuis un SMS arrive en minuscules, ou coupé par un espace que le
  // clavier a inséré tout seul. Refuser ça, c'est perdre le client pour une
  // faute qui n'est pas la sienne.
  const code = texte(source, 'code').replace(/\s+/g, '').toUpperCase()
  if (!CODE.test(code)) {
    return invalide('code', 'Le lien ne porte pas un code d’artisan valable.')
  }

  // ── les trois réponses à boutons (phase 5.1) ────────────────────────
  // Chacune est FACULTATIVE, mais si elle est donnée, elle doit être l'un
  // des libellés proposés. Du texte libre déguisé en réponse à boutons
  // ferait prendre des décisions à `lib/conseil.ts` sur une valeur qu'il ne
  // connaît pas.
  const reponses: Record<string, string | null> = {}
  for (const question of QUESTIONS) {
    const valeur = texte(source, question.nom)
    if (valeur === '') {
      reponses[question.nom] = null
      continue
    }
    if (!reponseValide(question.nom, valeur)) {
      return invalide(question.nom, 'Réponse inattendue à une question.')
    }
    reponses[question.nom] = valeur
  }
  const aRepondu = QUESTIONS.some((q) => reponses[q.nom] !== null)

  // ── besoin ──────────────────────────────────────────────────────────
  // FACULTATIF DEPUIS LA PHASE 5, mais à une condition : qu'au moins une
  // question à boutons ait reçu une réponse. Quelqu'un qui a dit « l'eau
  // coule, je n'ai pas coupé » en a dit assez pour être rappelé en premier,
  // et lui imposer de taper une phrase de plus, debout dans sa cuisine,
  // c'est le perdre.
  //
  // Sans aucune réponse, en revanche, une demande vide n'apprendrait rien à
  // personne : on redemande la description.
  const besoin = texte(source, 'besoin')
  if (besoin === '' && !aRepondu) {
    return invalide('besoin', 'Dites en un mot ce qu’il se passe.')
  }
  if (besoin.length > BORNES.besoin) {
    return invalide('besoin', 'La description est trop longue.')
  }

  // ── téléphone ───────────────────────────────────────────────────────
  // On réutilise `lireTelephone`, qui est déjà éprouvé sur les écritures
  // que produisent de vrais humains (points, espaces, 0033, +33). On
  // transmet sa forme d'appel : une seule écriture arrive en base.
  const lu = lireTelephone(texte(source, 'telephone'))
  if (lu.etat !== 'ok') {
    return invalide('telephone', 'Ce numéro ne ressemble pas à un numéro français.')
  }

  // ── urgence ─────────────────────────────────────────────────────────
  const urgence = texte(source, 'urgence_dite')
  if (!(URGENCES as readonly string[]).includes(urgence)) {
    return invalide('urgence_dite', 'Répondez à la question « c’est urgent ? ».')
  }

  // ── facultatifs ─────────────────────────────────────────────────────
  const prenom = texte(source, 'prenom')
  if (prenom.length > BORNES.prenom) return invalide('prenom', 'Prénom trop long.')

  const lieu = texte(source, 'lieu')
  if (lieu.length > BORNES.lieu) return invalide('lieu', 'Commune trop longue.')

  const email = texte(source, 'email')
  if (email.length > BORNES.email) return invalide('email', 'Adresse trop longue.')
  // Volontairement grossier. Valider une adresse e-mail exactement est un
  // problème sans solution ; le seul verdict fiable est de lui écrire. On
  // écarte ce qui ne peut PAS être une adresse, rien de plus — et le champ
  // est facultatif, donc le vide passe.
  if (email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return invalide('email', 'Cette adresse e-mail n’a pas l’air complète.')
  }

  return {
    etat: 'ok',
    demande: {
      code,
      prenom,
      telephone: lu.appel,
      email,
      lieu,
      besoin,
      eau_coule: reponses.eau_coule ?? null,
      arrivee_coupee: reponses.arrivee_coupee ?? null,
      chauffage_eau_chaude: reponses.chauffage_eau_chaude ?? null,
      urgence_dite: urgence,
    },
  }
}
