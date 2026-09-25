// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
//
// ─────────────────────────────────────────────────────────────────────────
// LE RENVOI D'APPEL, QUI EST LA PREMIÈRE LIGNE DU CAHIER
// ─────────────────────────────────────────────────────────────────────────
// Case A1 : « L'artisan garde son numéro et active un renvoi sur
// non-réponse en moins de 5 minutes. » Tout tient dans « garde son
// numéro » : on ne lui demande pas de changer de ligne, de prévenir ses
// clients, d'imprimer de nouvelles cartes. Il tape trois codes sur son
// clavier et ses appels non décrochés arrivent chez nous.
//
// Ces codes ne sont pas une invention d'opérateur : ce sont les
// « supplementary service codes » de la norme GSM, les mêmes sur Orange,
// SFR, Bouygues et Free. Trois façons de ne pas décrocher, trois codes :
//
//   61  il sonne et personne ne répond
//   67  la ligne est occupée
//   62  le téléphone est éteint, ou sans réseau
//
// ─────────────────────────────────────────────────────────────────────────
// CE QU'IL FAUT DIRE À L'ARTISAN, ET QU'AUCUNE DOCUMENTATION NE DIT
// ─────────────────────────────────────────────────────────────────────────
// SA MESSAGERIE VOCALE VA DISPARAÎTRE SUR CES TROIS CAS. Pas par accident :
// la messagerie d'un opérateur EST un renvoi conditionnel vers la
// plate-forme vocale. Poser le nôtre à la même place écrase le leur. C'est
// le mécanisme, pas un effet de bord — et c'est même le but : un SMS qui
// arrive en trois secondes vaut mieux qu'un répondeur que personne
// n'écoute. Mais il doit le choisir en le sachant.
//
// `##002#` remet tout comme avant, messagerie comprise. C'est le code à
// donner en même temps que les trois autres : personne n'essaie quelque
// chose qu'il ne sait pas défaire.

/** Le délai avant renvoi, en secondes. Le réseau n'accepte qu'un multiple
 *  de 5, entre 5 et 30. 20 s ≈ cinq sonneries : assez pour décrocher quand
 *  on a les mains libres, assez court pour que l'appelant ne raccroche pas. */
export const DELAI_DEFAUT = 20
const DELAI_MIN = 5
const DELAI_MAX = 30
const DELAI_PAS = 5

/**
 * Ramène un délai à une valeur que le réseau accepte.
 *
 * On corrige au lieu de refuser : la valeur légale est une contrainte de
 * réseau, pas une règle de métier, et l'écran ne propose de toute façon
 * qu'une poignée de choix. Ce qui compte, c'est de ne jamais afficher un
 * code que l'opérateur rejettera en silence.
 */
export function delaiLegal(secondes: number): number {
  if (!Number.isFinite(secondes)) return DELAI_DEFAUT
  const arrondi = Math.round(secondes / DELAI_PAS) * DELAI_PAS
  return Math.min(DELAI_MAX, Math.max(DELAI_MIN, arrondi))
}

export type CodeRenvoi = {
  /** Identifiant stable : clé de liste à l'écran, et repère dans les tests. */
  cle: 'non-reponse' | 'occupe' | 'injoignable'
  /** Ce que l'artisan reconnaît de sa propre journée. */
  cas: string
  /** À taper tel quel, appel compris. */
  code: string
}

export type Renvoi =
  | { etat: 'sans-numero' }
  | { etat: 'numero-illisible'; brut: string }
  | {
      etat: 'ok'
      /** Le numéro tel qu'il est écrit DANS les codes, en forme nationale. */
      numero: string
      delai: number
      activer: CodeRenvoi[]
      /** Ce qui affiche l'état réel de la ligne, sans rien changer. */
      verifier: string
      /** Ce qui remet tout comme avant, messagerie vocale comprise. */
      annuler: string
    }

/**
 * Compose les codes à taper pour renvoyer les appels non décrochés.
 *
 * Le numéro est écrit en forme NATIONALE — « 0756123456 » et non
 * « +33756123456 » — parce que l'artisan tape ces dix chiffres sur un
 * clavier téléphonique, debout, une fois. Le « + » demande un appui long
 * sur le 0, et un caractère qu'on a peiné à saisir est un caractère qu'on
 * saisit mal. Les deux formes marchent sur les quatre réseaux français.
 *
 * Un numéro qu'on ne sait pas relire rend `numero-illisible` plutôt qu'un
 * code approximatif : un code faux ne dit pas qu'il est faux, il renvoie
 * les appels dans le vide. Mieux vaut un écran qui l'avoue.
 */
export function renvoi(
  numeroTwilio: string | null | undefined,
  delaiSecondes: number = DELAI_DEFAUT,
): Renvoi {
  if (numeroTwilio === null || numeroTwilio === undefined || numeroTwilio.trim() === '') {
    return { etat: 'sans-numero' }
  }

  // Volontairement autonome : on n'accepte QUE la forme internationale
  // « +33… », celle que Twilio écrit en base. `lireTelephone` est plus
  // tolérant — c'est ce qu'il faut pour un humain qui tape son numéro,
  // et c'est trop pour un numéro que la machine a écrit elle-même. Ici,
  // une surprise doit se voir.
  const propre = numeroTwilio.replace(/[\s.\-()/]/g, '')
  const trouve = propre.match(/^\+33([1-9]\d{8})$/)
  if (!trouve) return { etat: 'numero-illisible', brut: numeroTwilio }

  const numero = `0${trouve[1]}`
  const delai = delaiLegal(delaiSecondes)

  return {
    etat: 'ok',
    numero,
    delai,
    activer: [
      {
        cle: 'non-reponse',
        cas: 'Il sonne et vous ne décrochez pas',
        // Le « 11 » n'est pas un numéro : c'est le code de service
        // « téléphonie » de la norme, et il est ce qui permet d'ajouter le
        // délai derrière. Sans lui, pas de choix du délai.
        code: `**61*${numero}*11*${delai}#`,
      },
      {
        cle: 'occupe',
        cas: 'Vous êtes déjà en ligne',
        code: `**67*${numero}#`,
      },
      {
        cle: 'injoignable',
        cas: 'Votre téléphone est éteint, ou sans réseau',
        code: `**62*${numero}#`,
      },
    ],
    verifier: '*#61#',
    annuler: '##002#',
  }
}
