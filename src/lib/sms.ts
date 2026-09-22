// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
//
// CE QUE COÛTE UN SMS, POUR DE VRAI.
//
// Un SMS n'est pas facturé au caractère mais au segment, et la taille d'un
// segment dépend de l'alphabet employé. La norme s'appelle GSM 03.38.
//
//   • Tous les caractères du jeu de base  → 160 par segment (153 si le
//     message est découpé, 7 bits servant à recoller les morceaux).
//   • Un seul caractère hors de ce jeu    → tout bascule en UCS-2, et la
//     limite tombe à 70 (67 si découpé).
//
// La version précédente de ce calcul cherchait neuf caractères accentués
// et appliquait 160 ou 70. Elle se trompait dans trois cas, tous fréquents
// en français :
//
//   1. « » ’ … – œ  ne sont PAS dans le jeu de base. Le message passait
//      donc en UCS-2 sans que rien ne le dise, et l'écran annonçait 160
//      caractères là où il n'y en avait que 70. Un guillemet français
//      double la facture.
//   2. { } [ ] ~ ^ \ | €  sont dans une table d'échappement : ils ne font
//      pas basculer en UCS-2, mais comptent DOUBLE. Or le message par
//      défaut contient {LIEN} — deux caractères facturés jamais comptés.
//   3. Au-delà d'un segment, la capacité n'est plus 160 ni 70 mais 153 et
//      67. Un message de 300 caractères coûte 3 segments, pas 2.

// Jeu de base GSM 03.38. L'ordre n'a aucune importance, l'appartenance si.
const BASE = new Set(
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
    '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà',
)

// Table d'échappement : ces caractères passent en GSM-7, mais chacun
// occupe la place de deux.
const ECHAPPES = new Set('^{}\\[~]|€')

export type AnalyseSms = {
  unicode: boolean
  /** Les caractères qui font basculer en UCS-2, sans doublon. */
  fautifs: string[]
  /** Ce qui est réellement facturé, échappements comptés double. */
  unites: number
  segments: number
  parSegment: number
  /** Le message ne contient pas {LIEN} : le client n'aura aucun lien. */
  lienManquant: boolean
}

export function analyserSms(texte: string): AnalyseSms {
  const fautifs: string[] = []
  let unites = 0

  // On parcourt par point de code, pas par unité UTF-16 : sinon un emoji
  // serait vu comme deux caractères inconnus au lieu d'un.
  for (const c of texte) {
    if (BASE.has(c)) unites += 1
    else if (ECHAPPES.has(c)) unites += 2
    else if (!fautifs.includes(c)) fautifs.push(c)
  }

  const unicode = fautifs.length > 0

  // En UCS-2, on facture les unités UTF-16 : un emoji hors du plan de base
  // en occupe deux. `texte.length` les compte déjà ainsi.
  if (unicode) unites = texte.length

  const parSegment = unicode ? 70 : 160
  const parSegmentDecoupe = unicode ? 67 : 153

  const segments =
    unites === 0 ? 0 : unites <= parSegment ? 1 : Math.ceil(unites / parSegmentDecoupe)

  return {
    unicode,
    fautifs,
    unites,
    segments,
    // Ce qu'on affiche à l'artisan : la limite qui s'applique RÉELLEMENT
    // à son message, pas celle du cas à un seul segment.
    parSegment: segments > 1 ? parSegmentDecoupe : parSegment,
    lienManquant: !texte.includes('{LIEN}'),
  }
}
