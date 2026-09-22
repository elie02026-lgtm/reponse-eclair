import { supabase } from './supabase'
import type { Demande, Statut } from '../types'

// Écrire le nouveau statut d'une demande.
// Renvoie soit la ligne réellement modifiée, soit un message d'erreur en français.
// Les deux écrans (À rappeler, Traitées) partagent cette fonction : la règle
// d'écriture ne doit exister qu'à un seul endroit.
export async function changerStatut(
  demande: Demande,
  nouveau: Statut,
): Promise<{ demande?: Demande; erreur?: string }> {
  const { data, error } = await supabase
    .from('demandes')
    .update({
      statut: nouveau,
      // La demande sort du circuit : on horodate. Si elle y revient, on efface.
      traite_le: nouveau === 'a_rappeler' ? null : new Date().toISOString(),
    })
    .eq('id', demande.id)
    .select()

  if (error) return { erreur: `Modification refusée : ${error.message}` }

  // PIÈGE DE LA RLS : modifier une ligne qui ne vous appartient pas ne lève
  // AUCUNE erreur. La politique filtre la ligne, Postgres en modifie zéro et
  // répond « tout va bien ». Le `.select()` ci-dessus est le seul moyen de
  // s'en apercevoir : on compte ce qui revient réellement.
  if (!data || data.length === 0) {
    return {
      erreur: 'Aucune ligne modifiée. La demande ne vous appartient pas, ou elle a été supprimée.',
    }
  }

  return { demande: data[0] as Demande }
}

// Écrire le montant RÉELLEMENT facturé.
// Séparée de `changerStatut` à dessein : passer une demande en « signé » et
// dire combien elle a rapporté sont deux gestes distincts, faits à deux
// moments différents. Les mêler obligerait l'artisan à connaître son
// montant au moment où il coche, c'est-à-dire souvent avant de l'avoir
// facturé — et il coocherait n'importe quoi pour passer à la suite.
export async function enregistrerMontant(
  demande: Demande,
  montant: number,
): Promise<{ demande?: Demande; erreur?: string }> {
  if (!Number.isInteger(montant) || montant < 0) {
    return { erreur: 'Le montant doit être un nombre entier d’euros, sans centimes.' }
  }

  const { data, error } = await supabase
    .from('demandes')
    .update({ montant_signe: montant })
    .eq('id', demande.id)
    .select()

  if (error) return { erreur: `Enregistrement refusé : ${error.message}` }

  // Même piège de la RLS que ci-dessus : zéro ligne modifiée n'est pas une
  // erreur pour Postgres, seulement pour nous.
  if (!data || data.length === 0) {
    return { erreur: 'Aucune ligne modifiée. La demande ne vous appartient pas.' }
  }

  return { demande: data[0] as Demande }
}
