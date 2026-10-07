// LA PROMESSE DE RAPPEL — PHASE 5 BIS.
//
// L'artisan touche « 15 min » dans son courrier, et son client l'apprend.
// C'est le deuxième principe du projet : garder le client jusqu'au rappel.
// Un client qui attend sans rien savoir appelle le plombier suivant, et il
// part dans les trois minutes.
//
// ─────────────────────────────────────────────────────────────────────────
// CE FICHIER EST PUR, ET C'EST CE QUI LE REND VÉRIFIABLE
// ─────────────────────────────────────────────────────────────────────────
// Il ne connaît ni le réseau, ni Supabase, ni le navigateur. Le Worker s'en
// sert pour composer le message et le lien ; le test d'à côté vérifie, entre
// autres, que chacune des trois phrases tient dans UN SEUL SEGMENT SMS —
// avec le compteur du produit, pas avec une règle approximative.
//
// Les TEXTES sont ailleurs, dans `config/promesse.ts`, pour qu'on puisse les
// réécrire sans lire ce fichier.
//
// ─────────────────────────────────────────────────────────────────────────
// QUI ENVOIE LE MESSAGE, AUJOURD'HUI
// ─────────────────────────────────────────────────────────────────────────
// L'ARTISAN, DEPUIS SON PROPRE TÉLÉPHONE. La page de résultat lui offre un
// lien `sms:` déjà rempli : un toucher, sa messagerie s'ouvre avec le texte
// et le numéro en place, il appuie sur « Envoyer ».
//
// Ce n'est pas un pis-aller en attendant Twilio, ou pas seulement :
//   • le message part de SON numéro, donc le client peut RÉPONDRE ;
//   • il ne coûte rien, et ne dépend d'aucun service tiers ;
//   • son doigt sur « Envoyer » EST l'engagement. La RÈGLE D'OR du projet
//     dit que seul l'artisan s'engage : ici, c'est tenu par le geste.
// Ce qu'il en coûte : deux touchers au lieu d'un, et la base peut enregistrer
// un engagement qu'il n'a finalement pas envoyé — d'où « vous avez dit » sur
// l'écran, et jamais « votre client sait ».
//
// LE JOUR DU NUMÉRO TWILIO, c'est le Worker qui enverra, et ce fichier ne
// changera pas d'une ligne : `texteSms` compose déjà la phrase exacte. Il
// n'y aura qu'un appel de plus à poser dans `worker/index.ts`.

import { MODELE_SMS, QUAND } from '../config/promesse.ts'
import { DELAIS, estDelai } from '../types.ts'
import type { Delai } from '../types.ts'
import { reponseDe } from './action.ts'
import type { OperationPromesse, Reponse } from './action.ts'
import { lireTelephone } from './telephone.ts'

/**
 * Le délai que porte une opération, et l'opération qui porte un délai.
 *
 * Deux tables écrites à la main plutôt qu'un découpage de chaîne. Un
 * `substring(op, 10)` marcherait, et casserait le jour où l'on renommerait
 * une opération — sans qu'aucun test ne le dise, parce qu'il n'y a rien à
 * tester dans un découpage. Ici, TypeScript exige les trois lignes.
 */
export const DELAI_PAR_OPERATION: Record<OperationPromesse, Delai> = {
  promesse_15min: '15min',
  promesse_1h: '1h',
  promesse_fin_de_journee: 'fin_de_journee',
}

export const OPERATION_PAR_DELAI: Record<Delai, OperationPromesse> = {
  '15min': 'promesse_15min',
  '1h': 'promesse_1h',
  fin_de_journee: 'promesse_fin_de_journee',
}

/**
 * Le message, prêt à partir.
 *
 * Le nom de l'entreprise vient de la base, donc d'un champ que l'artisan a
 * tapé lui-même à l'inscription. On ne le nettoie pas : c'est son nom, et le
 * déformer serait pire que de le laisser long. Mais on le COMPTE — voir
 * `segmentsDe` et le test qui dit combien de caractères il lui reste.
 */
export function texteSms(entreprise: string, delai: Delai): string {
  return MODELE_SMS.replace('{ENTREPRISE}', entreprise).replace('{QUAND}', QUAND[delai])
}

/**
 * LE LIEN QUI OUVRE LA MESSAGERIE DU TÉLÉPHONE, DÉJÀ REMPLIE.
 *
 * `sms:` suivi du numéro, puis `?&body=`. LE « ? » SUIVI D'UN « & » N'EST PAS
 * UNE FAUTE DE FRAPPE : c'est la seule forme que les deux familles de
 * téléphones acceptent. Android attend `?body=`, iOS a longtemps exigé
 * `&body=` ; `?&body=` satisfait les deux, et c'est la forme que tout le
 * monde emploie depuis dix ans.
 *
 * On rend `null` plutôt qu'un lien bancal quand le numéro n'est pas lisible —
 * exactement comme `lib/renvoi.ts` refuse de composer un code tronqué. Un
 * lien `sms:` cassé ouvre une messagerie vide, et l'artisan croit avoir
 * envoyé quelque chose. Panne muette, donc interdite.
 *
 * On envoie le numéro en +33 et non en 06… : un `sms:0612…` échoue depuis une
 * carte SIM étrangère, même raison que pour les liens `tel:`.
 *
 * ⚠ CE QUE JE N'AI PAS PU MESURER : le comportement réel sur un téléphone.
 * Un lien `sms:` ne s'ouvre pas dans un navigateur de bureau. La forme est
 * celle de la norme RFC 5724 et de l'usage ; la preuve, elle, demande un
 * vrai Android puis un vrai iPhone.
 */
export function lienSms(telephone: string | null, texte: string): string | null {
  const tel = lireTelephone(telephone)
  if (tel.etat !== 'ok') return null
  return `sms:${tel.appel}?&body=${encodeURIComponent(texte)}`
}

/**
 * CE QU'IL FAUT POUR ENVOYER LE MESSAGE.
 *
 * Composé à partir de ce que rend `promettre_rappel`, donc obtenu
 * UNIQUEMENT après un POST — jamais par un GET, qu'un antivirus de
 * messagerie suivrait à la livraison.
 */
export type Envoi = {
  /** Le lien `sms:` déjà rempli, ou `null` si le numéro n'est pas lisible. */
  lien: string | null
  /** Le message exact, montré en clair : il part au nom de l'artisan. */
  texte: string
  /** Le numéro tel qu'un humain le relit, pour la voie de repli. */
  numero: string
  /** Vrai s'il venait de dire la même chose. On ne le félicite pas deux
   *  fois, mais on lui laisse de quoi renvoyer : il ne sait peut-être pas
   *  si le premier message est parti. */
  deja: boolean
}

/** Ce que la base rend. Tout est facultatif : c'est du JSON reçu du réseau,
 *  et le croire sur parole est la façon ordinaire de planter. */
export type ReponsePromesse = {
  resultat?: unknown
  telephone?: unknown
  entreprise?: unknown
}

/**
 * De la réponse de la base au geste qu'on propose.
 *
 * Rend `null` dès qu'il manque quelque chose : la page retombe alors sur
 * l'écran commun, qui dit ce qui s'est passé sans rien révéler. Mieux vaut
 * un écran sobre qu'un bouton qui n'enverrait rien.
 */
export function envoiDe(operation: OperationPromesse, brut: ReponsePromesse): Envoi | null {
  const resultat = brut.resultat
  if (resultat !== 'ok' && resultat !== 'inchange') return null
  if (typeof brut.entreprise !== 'string' || brut.entreprise === '') return null

  const telephone = typeof brut.telephone === 'string' ? brut.telephone : null
  const texte = texteSms(brut.entreprise, DELAI_PAR_OPERATION[operation])
  const tel = lireTelephone(telephone)

  return {
    lien: lienSms(telephone, texte),
    texte,
    // Trois cas, trois affichages honnêtes. « 06 12 34 56 78 » quand on sait
    // lire, le texte brut quand on ne sait pas — l'artisan jugera mieux que
    // nous — et une phrase quand il n'y a rien du tout.
    numero:
      tel.etat === 'ok' ? tel.affichage : tel.etat === 'invalide' ? tel.brut : 'aucun numéro',
    deja: resultat === 'inchange',
  }
}

/**
 * Ce que l'artisan lit après avoir touché le gros bouton.
 *
 * `promettre_rappel` rend « expire » au bout de QUARANTE-HUIT HEURES, là où
 * les deux autres boutons en ont trente jours. Lui dire « ce lien est
 * valable trente jours » serait donc faux : on traduit le mot en un message
 * qui parle de deux jours.
 */
export function reponsePromesse(resultat: string): Reponse {
  return reponseDe(resultat === 'expire' ? 'expire_promesse' : resultat)
}

/** Les trois délais, dans l'ordre où l'artisan les lit : du plus court au
 *  plus long. L'ordre de `DELAIS` est celui-là, et le test le fige — un
 *  bouton « ce soir » en premier ferait choisir le mauvais. */
export const DELAIS_ORDONNES: readonly Delai[] = DELAIS

export { estDelai }
