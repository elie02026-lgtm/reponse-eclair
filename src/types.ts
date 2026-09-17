// Miroir exact des colonnes de la table `demandes` (voir supabase/migrations/0001_init.sql).
// Tout ce qui est nullable en base est nullable ici : TypeScript nous forcera
// à traiter les cas vides au lieu de planter à l'affichage.

export type Statut = 'a_rappeler' | 'rappele' | 'devis_envoye' | 'signe' | 'perdu'

export type Demande = {
  id: number
  artisan_id: string
  recue_le: string
  prenom: string | null
  email: string | null
  telephone: string | null
  lieu: string | null
  besoin: string | null
  urgence_dite: string | null
  photo_url: string | null
  motif: string | null
  gravite: number | null
  panier: number | null
  distance_min: number | null
  statut: Statut
  relance_sms_le: string | null
  traite_le: string | null
}
