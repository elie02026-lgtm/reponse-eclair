// LA RÈGLE DE CONFIRMATION, ÉCRITE UNE FOIS.
//
// La suppression est irréversible : on demande à l'artisan de taper le nom
// de son entreprise. Cette règle existe à DEUX endroits — ici, pour activer
// le bouton, et dans la fonction `resilier` en base, qui refuse l'appel si
// le texte ne correspond pas.
//
// Ce n'est pas une duplication inutile. Celle de la base est la seule qui
// protège vraiment ; celle-ci évite à l'artisan de découvrir son erreur
// après avoir cliqué sur un bouton rouge. Il faut donc qu'elles disent
// exactement la même chose, et c'est ce que teste ce fichier :
//
//   SQL  : lower(btrim(p_confirmation)) is distinct from lower(btrim(entreprise))
//   ici  : les deux normalisations ci-dessous
//
// Si l'une des deux change, l'autre doit changer le même jour — sinon le
// bouton s'active sur un texte que la base refusera.

/** Même normalisation que `lower(btrim(...))` en SQL. */
function normaliser(texte: string): string {
  // `trim()` de JS retire aussi l'espace insécable ; `btrim()` de Postgres,
  // appelé sans second argument, ne retire que l'espace ordinaire, les
  // tabulations et les retours à la ligne. La différence ne se voit que sur
  // un nom d'entreprise entouré d'insécables — cas impossible à saisir au
  // clavier, et qui rendrait la saisie PLUS permissive ici qu'en base :
  // l'écran accepterait, la base refuserait. L'artisan verrait un message
  // d'erreur, jamais une suppression non voulue. On garde `trim()`.
  return texte.trim().toLowerCase()
}

/**
 * Le texte tapé autorise-t-il la résiliation ?
 *
 * Insensible à la casse : le clavier d'un téléphone met une majuscule tout
 * seul, et le but d'une confirmation est de prouver l'intention, pas de
 * piéger quelqu'un sur une lettre.
 */
export function confirmationValide(saisi: string, entreprise: string): boolean {
  const attendu = normaliser(entreprise)
  // Une entreprise sans nom ne peut pas servir de mot de passe : sans cette
  // garde, une chaîne vide confirmerait la suppression du compte.
  if (attendu === '') return false
  return normaliser(saisi) === attendu
}

/**
 * La phrase de confirmation, après coup.
 *
 * Elle existe ici parce qu'un accord de participe passé se trompe en
 * silence : la première version affichait « Temoin Ecran Deux et 3 demandes
 * ont été effacées », avec un sujet mixte accordé au féminin. Ce n'est pas
 * grave, et c'est exactement pour ça que personne ne l'aurait corrigé — sur
 * le dernier écran que verra un artisan qui s'en va.
 */
export function phraseEffacement(demandes: number): string {
  if (demandes === 0) return 'Il n’y avait aucune demande à effacer.'
  if (demandes === 1) return 'Sa demande a été effacée avec lui.'
  return `Ses ${demandes} demandes ont été effacées avec lui.`
}
