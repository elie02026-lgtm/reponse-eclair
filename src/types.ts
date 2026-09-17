// Miroir exact des colonnes des tables (voir supabase/migrations/0001_init.sql).
// Tout ce qui est nullable en base est nullable ici : TypeScript nous forcera
// à traiter les cas vides au lieu de planter à l'affichage.

export type Statut = 'a_rappeler' | 'rappele' | 'devis_envoye' | 'signe' | 'perdu'

// Les libellés affichés à l'artisan. La clé est la valeur RÉELLEMENT stockée
// en base, imposée par la contrainte `check` de la migration.
// Si les deux divergent un jour, Postgres refusera l'écriture — c'est voulu.
export const LIBELLE_STATUT: Record<Statut, string> = {
  a_rappeler: 'À rappeler',
  rappele: 'Rappelé',
  devis_envoye: 'Devis envoyé',
  signe: 'Signé',
  perdu: 'Perdu',
}

export const STATUTS = Object.keys(LIBELLE_STATUT) as Statut[]

export type Artisan = {
  id: string
  entreprise: string
  metier: string
  code_postal: string
  zone_minutes: number | null
  message_sms: string
  numero_twilio: string | null
  cree_le: string | null
}

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
