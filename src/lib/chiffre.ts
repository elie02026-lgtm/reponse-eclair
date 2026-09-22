// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
//
// LE CHIFFRE QU'ON MONTRE À UN ARTISAN AU BOUT D'UN MOIS.
//
// Le cahier dit : « Rappli l'estime avec un curseur ; ici il est réel. »
// Il ne l'était pas. L'écran additionnait `panier`, qui vient du prompt de
// classification — « montant typique facturé pour ce type d'intervention ».
// Une estimation d'IA, donc, sur des chantiers signés. C'est déjà mieux
// qu'un curseur qui estime AUSSI la conversion, mais ce n'est pas réel,
// et l'écran affirmait le contraire en gras.
//
// `montant_signe` est ce que l'artisan a facturé, saisi par lui. C'est la
// seule chose qu'on additionne. Ce qui n'a pas de montant n'est pas deviné
// à partir du panier : on le COMPTE et on le dit. Un total juste avec un
// trou avoué vaut mieux qu'un total rond qu'on ne peut pas défendre.

import type { Demande } from '../types.ts'

export type Chiffre = {
  /** Somme des montants réellement saisis, en euros. */
  total: number
  /** Chantiers signés dont l'artisan a saisi le montant. */
  renseignes: number
  /** Chantiers signés sans montant : ils ne sont PAS dans le total. */
  aRenseigner: number
  /** Ce que l'IA avait estimé pour ceux-là — à titre indicatif seulement. */
  estimeManquant: number
}

export function chiffreSigne(
  demandes: Pick<Demande, 'statut' | 'panier' | 'montant_signe'>[],
): Chiffre {
  const signes = demandes.filter((d) => d.statut === 'signe')

  const avec = signes.filter((d) => d.montant_signe !== null)
  const sans = signes.filter((d) => d.montant_signe === null)

  return {
    total: avec.reduce((s, d) => s + (d.montant_signe ?? 0), 0),
    renseignes: avec.length,
    aRenseigner: sans.length,
    estimeManquant: sans.reduce((s, d) => s + (d.panier ?? 0), 0),
  }
}
