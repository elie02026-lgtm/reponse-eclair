// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
// C'est volontaire — ce fichier peut donc être exécuté et vérifié seul.
//
// Le numéro arrive d'un formulaire rempli par un inconnu sur un téléphone,
// souvent d'une seule main, parfois avec le correcteur automatique. On reçoit
// « 06.12.34.56.78 », « +33 6 12 34 56 78 », « 0612345678 » — et aussi
// « 061234567 » (un chiffre manquant) ou « je rappelle ce soir ».
//
// Jusqu'ici le code faisait `{d.telephone && ...}` : un numéro faux passait
// pour un numéro bon, et un numéro absent faisait disparaître le bouton
// « Appeler » sans un mot d'explication. Les deux sont des pannes muettes.

export type Telephone =
  | { etat: 'absent' }
  | { etat: 'invalide'; brut: string }
  | { etat: 'ok'; appel: string; affichage: string }

// Tout ce qu'un humain peut glisser entre les chiffres. Inutile d'y ajouter
// l'espace insécable des claviers de téléphone : `\s` le contient déjà
// (U+00A0 en fait partie). Un test le vérifie, pour qu'on ne le « corrige » pas.
const SEPARATEURS = /[\s.\-()/]/g

export function lireTelephone(brut: string | null | undefined): Telephone {
  if (brut === null || brut === undefined || brut.trim() === '') return { etat: 'absent' }

  const propre = brut.replace(SEPARATEURS, '')

  // Les trois écritures d'un même numéro français. Le premier chiffre national
  // ne peut pas être 0 : « +330612... » est une faute, pas une variante.
  const formes: RegExp[] = [
    /^\+33([1-9]\d{8})$/, // international moderne
    /^0033([1-9]\d{8})$/, // international à l'ancienne
    /^0([1-9]\d{8})$/, // national
  ]

  for (const forme of formes) {
    const trouve = propre.match(forme)
    if (trouve) {
      const neuf = trouve[1]
      return {
        // On appelle TOUJOURS en +33. Un `tel:0612...` échoue depuis une carte
        // SIM étrangère ; le format international marche partout.
        appel: `+33${neuf}`,
        // Mais on AFFICHE en national : c'est ce que l'artisan sait relire.
        affichage: `0${neuf}`.replace(/(\d{2})(?=\d)/g, '$1 ').trim(),
        etat: 'ok',
      }
    }
  }

  // On garde le texte d'origine : l'artisan doit pouvoir le lire et juger
  // lui-même. Le jeter serait perdre la seule trace du prospect.
  return { etat: 'invalide', brut }
}
