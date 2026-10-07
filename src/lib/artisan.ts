// LES ÉCRITURES SUR LA FICHE DE L'ARTISAN.
//
// ═════════════════════════════════════════════════════════════════════════
// POURQUOI CE FICHIER EXISTE
// ═════════════════════════════════════════════════════════════════════════
// Même raison que `lib/demandes.ts` : LE PIÈGE DE LA RLS. Modifier une ligne
// qui ne vous appartient pas ne lève AUCUNE erreur — la politique filtre la
// ligne, Postgres en modifie zéro, et répond « tout va bien ». Le seul moyen
// de s'en apercevoir est de compter ce qui revient du `.select()`.
//
// L'écriture des réglages vivait dans `Reglages.tsx`, avec cette précaution
// déjà en place. Elle en sort parce que la règle d'écriture ne doit exister
// qu'à UN endroit — c'est la consigne du projet, et elle valait déjà pour les
// demandes.
//
// La VALIDATION du lien de rendez-vous, elle, est dans `lib/lienRdv.ts`, qui
// n'importe rien : ce fichier-ci parle au réseau, donc `node --test` ne peut
// pas le charger. Une règle qu'on ne peut pas exécuter seule est une règle
// qu'on ne vérifie pas.

import { supabase } from './supabase'
import { lireLienRdv } from './lienRdv'
import type { Artisan } from '../types'

export { lireLienRdv, LIEN_RDV_MAX } from './lienRdv'
export type { Verdict } from './lienRdv'

/**
 * Enregistrer la fiche. Rend la ligne réellement modifiée, ou un message en
 * français.
 *
 * LES COLONNES SONT NOMMÉES UNE À UNE, et c'est volontaire : depuis la
 * migration 0012, l'artisan n'a le droit d'écrire que six colonnes de cette
 * table — sept avec `lien_rdv` (migration 0019). Un `update(artisan)` entier
 * enverrait aussi `code`, `numero_twilio` et `numero_actif`, que Postgres
 * refuserait — et l'artisan lirait « 42501 » en essayant de changer son code
 * postal.
 */
export async function enregistrerReglages(
  artisan: Artisan,
): Promise<{ artisan?: Artisan; erreur?: string }> {
  const lien = lireLienRdv(artisan.lien_rdv)
  if (!lien.ok) return { erreur: lien.message }

  const { data, error } = await supabase
    .from('artisans')
    .update({
      entreprise: artisan.entreprise,
      metier: artisan.metier,
      code_postal: artisan.code_postal,
      zone_minutes: artisan.zone_minutes,
      message_sms: artisan.message_sms,
      lien_rdv: lien.valeur,
    })
    .eq('id', artisan.id)
    .select()

  if (error) return { erreur: `Enregistrement refusé : ${error.message}` }

  // LE PIÈGE DE LA RLS. Zéro ligne modifiée n'est pas une erreur pour
  // Postgres ; c'en est une pour l'artisan, qui croirait avoir enregistré.
  if (!data || data.length === 0) {
    return { erreur: 'Aucune ligne modifiée. La fiche ne vous appartient pas.' }
  }

  return { artisan: data[0] as Artisan }
}
