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

// ─────────────────────────────────────────────────────────────────────────
// LE MÉTIER — UNE LISTE, PLUS UN CHAMP LIBRE (phase 4.3)
// ─────────────────────────────────────────────────────────────────────────
// Ce champ ne décore pas : il SÉLECTIONNE LA GRILLE DE GRAVITÉ appliquée aux
// demandes. « plombie », « Plombier » ou « plomberie » ne sont pas le même
// mot pour une machine, et une faute de frappe à l'inscription cassait
// silencieusement le classement de toutes les demandes suivantes — sans
// qu'aucun écran ne le dise.
//
// Trois valeurs, parce que la cible commerciale en compte trois. La base
// porte la même liste en contrainte `check` : si l'écran et la base
// divergeaient un jour, Postgres refuserait l'écriture au lieu de laisser
// passer une valeur que personne ne sait classer.
export const METIERS = ['plombier', 'chauffagiste', 'plombier-chauffagiste'] as const
export type Metier = (typeof METIERS)[number]

/** Ce que l'artisan lit. La clé est la valeur RÉELLEMENT stockée, celle que
 *  la contrainte `check` impose — même mécanisme que `LIBELLE_STATUT`. */
export const LIBELLE_METIER: Record<Metier, string> = {
  plombier: 'Plombier',
  chauffagiste: 'Chauffagiste',
  'plombier-chauffagiste': 'Plombier-chauffagiste',
}

// ─────────────────────────────────────────────────────────────────────────
// LE DÉLAI DE RAPPEL QUE L'ARTISAN S'ENGAGE À TENIR (phase 5 bis)
// ─────────────────────────────────────────────────────────────────────────
// Trois valeurs, parce que c'est le nombre qu'un pouce choisit sans
// réfléchir — et parce qu'au-delà, l'artisan lit au lieu de toucher.
//
// CE SONT DES MOTS, PAS DES MINUTES. « Fin de journée » n'est pas une durée :
// l'écrire 420 minutes serait inventer une précision que l'artisan n'a pas
// donnée, et le reste du logiciel s'en servirait comme d'un fait. On garde le
// mot qu'il a touché ; le délai exact, personne ne le connaît.
//
// La base porte la même liste en contrainte `check` (migration 0018) : si
// l'écran et la base divergeaient un jour, Postgres refuserait l'écriture au
// lieu de laisser passer une valeur que personne ne sait afficher.
export const DELAIS = ['15min', '1h', 'fin_de_journee'] as const
export type Delai = (typeof DELAIS)[number]

/** Ce que l'ARTISAN relit sur sa fiche, une fois qu'il s'est engagé. Ce que
 *  le CLIENT lira dans son SMS est ailleurs, dans `config/promesse.ts` : ce
 *  sont deux textes différents, et les mêler ferait qu'en corriger un
 *  changerait l'autre. */
export const LIBELLE_DELAI: Record<Delai, string> = {
  '15min': 'dans 15 min',
  '1h': 'dans une heure',
  fin_de_journee: 'en fin de journée',
}

/** `promesse` arrive du réseau comme une chaîne quelconque. On ne la traite
 *  comme un délai qu'après l'avoir reconnue. */
export function estDelai(valeur: string | null): valeur is Delai {
  return valeur !== null && (DELAIS as readonly string[]).includes(valeur)
}

export type Artisan = {
  id: string
  entreprise: string
  metier: string // l'une des valeurs de METIERS ; la base l'impose
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

  // ─── Migration 0019 : le lien de prise de rendez-vous ───
  //
  // Facultatif, et il le restera. La cible commerciale, ce sont des patrons
  // de cinquante à soixante ans ; beaucoup n'ont pas d'agenda en ligne et
  // n'en auront jamais. `null` veut dire « cet artisan n'en a pas », et les
  // textes envoyés au client prévoient ce cas (`docs/messages-client.md`).
  //
  // IL N'EST JAMAIS PROPOSÉ SUR UNE DEMANDE URGENTE. Prendre rendez-vous
  // pour une fuite qui coule est absurde, et insultant.
  lien_rdv: string | null
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

  // ─── Migration 0017 : les trois réponses à boutons du CLIENT ───
  //
  // `null` = il n'a pas touché la question, ce qui est permis. L'artisan ne
  // peut pas les réécrire : ce sont les mots de son client, pas un jugement
  // à corriger. La base le lui interdit colonne par colonne.
  eau_coule: string | null
  arrivee_coupee: string | null
  // Séparées par la migration 0021 : « plus d'eau chaude » est gênant,
  // « plus de chauffage en janvier » est dangereux. Une seule question ne
  // permettait pas de les distinguer.
  chauffage: string | null
  eau_chaude: string | null
  /** @deprecated L'ancienne question fusionnée. Nulle sur toutes les lignes,
   *  encore postée par Make le temps que le module 5 soit mis à jour.
   *  Disparaîtra avec la migration 0022. */
  chauffage_eau_chaude: string | null

  // ─── Migration 0018 : la promesse de rappel (phase 5 bis) ───
  //
  // Le délai que l'artisan a CHOISI LUI-MÊME en touchant un bouton de son
  // e-mail. `null` tant qu'il ne s'est engagé à rien, et c'est le cas
  // ordinaire : rien d'automatique n'écrit jamais ici. C'est la RÈGLE D'OR
  // du projet — on n'annonce jamais au client un délai que l'artisan n'a pas
  // choisi.
  //
  // `promesse_le` est une date sur LUI, pas sur son client : elle dit qu'il
  // s'est engagé, pas que le message est parti. L'écran écrit donc « vous
  // avez dit », jamais « votre client sait ».
  //
  // Il ne peut pas les réécrire depuis l'application : la 0014 a retiré
  // `update` sur toute la table pour ne rendre que cinq colonnes nommées, et
  // celles-ci n'y sont pas. Seul l'e-mail engage.
  promesse: string | null
  promesse_le: string | null

  // Le secret qui autorise les boutons de l'e-mail d'alerte. L'artisan peut
  // le lire — c'est le sien — mais il ne peut PAS l'écrire : la migration
  // 0014 lui a retiré ce droit colonne par colonne. Il n'apparaît jamais
  // dans l'export : `lib/csv.ts` nomme ses colonnes une à une.
  cle_action: string | null
}
