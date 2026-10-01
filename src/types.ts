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
  // Le numéro a été provisionné ET vérifié PAR NOUS (migration 0012).
  //
  // Un numéro présent dans la colonne d'à côté ne prouve rien : le
  // 28 septembre, trois fiches portaient un numéro qui n'existait chez
  // personne, et l'écran affichait tranquillement les codes de renvoi
  // composés dessus. Composer ces codes, c'est envoyer ses appels manqués
  // dans le vide ET perdre sa messagerie vocale, sans qu'aucun écran ne
  // prévienne — l'opérateur répond « Service activé ».
  //
  // La base refuse `true` sans numéro, et l'artisan ne peut pas l'écrire :
  // ses droits d'écriture sur cette colonne lui ont été retirés.
  numero_actif: boolean
  // Identifiant court porté par le lien du SMS (migration 0007). Public,
  // pas secret : il sert d'adresse, pas de clé.
  code: string
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
  // Montant RÉELLEMENT facturé, saisi par l'artisan. Ne jamais le
  // confondre avec `panier`, qui est l'estimation de l'IA.
  montant_signe: number | null

  // ─── Migration 0014 : agir depuis l'e-mail, et corriger le modèle ───
  //
  // La correction de l'artisan. `gravite` garde TOUJOURS la valeur du
  // modèle : l'écart entre les deux est la donnée qui dira, dans six mois,
  // si la classification est juste. Le tri lit `lib/tri.ts`.
  //
  // La base refuse l'une sans l'autre (contrainte `demandes_correction_datee`)
  // et borne la gravité entre 0 et 3.
  gravite_corrigee: number | null
  corrigee_le: string | null

  // Le secret qui autorise les boutons de l'e-mail d'alerte. L'artisan peut
  // le lire — c'est le sien — mais il ne peut PAS l'écrire : la migration
  // 0014 lui a retiré ce droit colonne par colonne. Il n'apparaît jamais
  // dans l'export : `lib/csv.ts` nomme ses colonnes une à une.
  cle_action: string | null
}
