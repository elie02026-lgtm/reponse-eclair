// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI ON NE SE SERT PAS DE `URLSearchParams`
// ─────────────────────────────────────────────────────────────────────────
// Parce qu'elle traduit « + » en espace. C'est sa mission : elle applique
// la règle des FORMULAIRES HTML (`application/x-www-form-urlencoded`), où
// l'espace s'écrit « + ». Mais notre lien de SMS n'est pas un formulaire,
// c'est une adresse — et un numéro international commence par « + ».
//
// Mesuré le 24 septembre 2026, avant le premier vrai appel :
//
//   new URLSearchParams('?t=+33612345678').get('t')  →  ' 33612345678'
//
// Le formulaire se pré-remplissait donc avec « 33612345678 » précédé d'un
// espace : `lireTelephone` le déclare invalide, et le client d'un artisan
// aurait trouvé son propre numéro abîmé dans le champ, à réparer à la
// main, une fuite d'eau aux pieds. La case A3 du cahier dit « son numéro
// déjà pré-rempli » : elle était fausse dès la première seconde où la
// chaîne aurait marché.
//
// On lit donc la chaîne de requête soi-même. Une seule différence avec
// `URLSearchParams`, et c'est toute la question : « + » reste « + ».

/**
 * Décode un morceau d'URL sans jamais lever d'exception.
 *
 * `decodeURIComponent` lève sur une séquence `%` incomplète ou absurde —
 * « %zz », « 100% » — et cette page est publique : n'importe qui peut lui
 * envoyer n'importe quoi. Une adresse bizarre ne doit pas faire un écran
 * blanc, elle doit faire un champ à corriger.
 */
function decoder(morceau: string): string {
  try {
    return decodeURIComponent(morceau)
  } catch {
    return morceau
  }
}

/**
 * Lit un paramètre de la chaîne de requête, « + » compris.
 *
 * Rend '' quand le paramètre est absent ou vide : pour `a` comme pour `t`,
 * les deux cas se traitent pareil (lien invalide, champ à remplir), et
 * distinguer l'un de l'autre n'apporterait qu'un `null` à gérer partout.
 *
 * En cas de doublon — `?t=1&t=2` — c'est la PREMIÈRE valeur qui gagne,
 * comme `URLSearchParams.get`.
 */
export function lireParametre(recherche: string, cle: string): string {
  const requete = recherche.startsWith('?') ? recherche.slice(1) : recherche

  for (const morceau of requete.split('&')) {
    if (morceau === '') continue

    const egal = morceau.indexOf('=')
    const nom = egal === -1 ? morceau : morceau.slice(0, egal)
    if (decoder(nom) !== cle) continue

    return egal === -1 ? '' : decoder(morceau.slice(egal + 1))
  }

  return ''
}
