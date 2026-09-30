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
  // Première serrure, pour que l'artisan lise un français clair. La seconde
  // est en base depuis le 24 septembre — `demandes_montant_signe_positif` —
  // parce que ce test-ci vit dans le navigateur, et que le navigateur n'est
  // pas l'API : avec la clé déjà présente dans la page, un `-5000` passait
  // directement par PostgREST. Mesuré, puis fermé.
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

// ─────────────────────────────────────────────────────────────────────────
// LA PREMIÈRE LECTURE DE CE FICHIER, ET LA SEULE
// ─────────────────────────────────────────────────────────────────────────
// Tout ce qui précède écrit ; ceci lit. C'est ici quand même, parce que le
// nombre qui en sort n'est pas un chiffre d'affichage : c'est celui que les
// CGV promettent de compter. Il ne doit exister qu'à un endroit.

/**
 * Combien de demandes l'artisan connecté a REÇUES, au sens des CGV,
 * article 5 : « un formulaire envoyé par un client avec un numéro de
 * téléphone valide ».
 *
 * Trois choses à savoir sur ce compte :
 *
 *  1. AUCUN FILTRE SUR L'ARTISAN. La RLS ne renvoie que ses lignes. Ajouter
 *     un `.eq('artisan_id', …)` donnerait le même résultat et ferait croire
 *     que c'est ce filtre qui protège — alors que c'est la politique.
 *
 *  2. `head: true` : Postgres compte, et ne renvoie AUCUNE ligne. Un artisan
 *     qui a mille demandes ne télécharge pas mille demandes pour voir
 *     « 5 sur 5 ».
 *
 *  3. `telephone is not null` porte la définition contractuelle. Le Worker
 *     refuse déjà une demande sans numéro lisible (`lib/demandeRecue.ts`),
 *     donc en pratique aucune ligne n'est exclue — mesuré le 30 septembre
 *     2026 : 11 lignes, 11 numéros au format `+33…`. Le filtre est là pour
 *     le jour où quelque chose écrira dans cette table sans passer par la
 *     porte, pas pour corriger le passé.
 *
 * En cas d'erreur on renvoie `null`, jamais `0` : « je ne sais pas » et
 * « aucune » ne sont pas la même chose quand un contrat en dépend. L'écran
 * n'affiche rien plutôt que d'annoncer un zéro qu'il n'a pas mesuré.
 */
export async function compterDemandes(): Promise<{ total: number | null; erreur?: string }> {
  const { count, error } = await supabase
    .from('demandes')
    .select('id', { count: 'exact', head: true })
    .not('telephone', 'is', null)

  if (error) return { total: null, erreur: `Comptage impossible : ${error.message}` }
  if (count === null) return { total: null, erreur: 'Comptage impossible : aucun total rendu.' }

  return { total: count }
}
