// LE LIEN DE PRISE DE RENDEZ-VOUS DE L'ARTISAN — LA RÈGLE, PURE.
//
// ═════════════════════════════════════════════════════════════════════════
// POURQUOI CETTE RÈGLE EST SEULE DANS SON FICHIER
// ═════════════════════════════════════════════════════════════════════════
// Elle était d'abord dans `lib/artisan.ts`, à côté de l'écriture. Ça n'a pas
// tenu dix minutes : `node --test` a refusé de charger le fichier, parce que
// l'écriture importe le client Supabase, qui lui-même lit des variables
// d'environnement que Node n'a pas.
//
// C'EST LA MÊME LEÇON QUE CELLE DU TRI. La règle de classement vivait dans un
// fichier JSX que `node --test` ne sait pas charger ; elle est sortie dans
// `lib/tri.ts` et elle y a dix-neuf tests. Une règle qu'on ne peut pas
// exécuter seule est une règle qu'on ne vérifie pas.
//
// Ici, la règle ne connaît rien : ni le réseau, ni Supabase, ni le
// navigateur. L'écriture, elle, est dans `lib/artisan.ts`.

/** Ce que l'écran doit afficher quand le lien ne va pas. */
export type Verdict = { ok: true; valeur: string | null } | { ok: false; message: string }

/** Le maximum que la base accepte (contrainte `artisans_lien_rdv_https`,
 *  migration 0019). La même valeur des deux côtés, et un test le dira si
 *  l'une des deux bouge. */
export const LIEN_RDV_MAX = 300

/**
 * LE LIEN DE PRISE DE RENDEZ-VOUS, RELU AVANT D'ÊTRE ENREGISTRÉ.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE CONTRÔLE DOUBLE CELUI DE LA BASE, ET CE N'EST PAS UNE REDONDANCE
 * ─────────────────────────────────────────────────────────────────────────
 * La base refuse déjà tout ce qui ne commence pas par `https://`. Mais elle
 * répond « new row for relation "artisans" violates check constraint
 * "artisans_lien_rdv_https" » — une phrase qu'un patron de cinquante-cinq
 * ans ne doit jamais lire. Ici, il lit ce qui ne va pas.
 *
 * Et une règle de plus que la base n'a pas : L'ESPACE. Un lien collé depuis
 * un e-mail en contient souvent un, au début, à la fin, ou au milieu quand
 * le courrier l'a coupé en deux. `https://cal.com/ martin` passerait la
 * contrainte de la base et ne mènerait nulle part — une panne muette, dans
 * un e-mail parti à un client.
 */
export function lireLienRdv(brut: string | null | undefined): Verdict {
  const propre = (brut ?? '').trim()

  // VIDE EST VALIDE. Le lien est facultatif, et beaucoup d'artisans de la
  // cible n'ont pas d'agenda en ligne. On rend `null` et non `''` : la
  // colonne est nullable, et `''` serait une chaîne qui commence mal.
  if (propre === '') return { ok: true, valeur: null }

  if (/\s/.test(propre)) {
    return { ok: false, message: 'L’adresse ne doit pas contenir d’espace.' }
  }
  if (!propre.startsWith('https://')) {
    return {
      ok: false,
      message: 'L’adresse doit commencer par https:// — recopiez-la depuis votre navigateur.',
    }
  }
  if (propre.length > LIEN_RDV_MAX) {
    return { ok: false, message: `L’adresse est trop longue (${LIEN_RDV_MAX} signes au plus).` }
  }
  // `https://` tout seul passe la contrainte de la base. Pas celle-ci.
  if (propre === 'https://') {
    return { ok: false, message: 'Il manque l’adresse après https://.' }
  }

  return { ok: true, valeur: propre }
}
