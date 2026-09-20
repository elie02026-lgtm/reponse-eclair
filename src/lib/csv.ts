// Extensions explicites : Vite s'en passe, mais Node les exige. Sans elles,
// ce fichier ne pourrait pas être exécuté hors du navigateur — donc pas testé.
import { LIBELLE_STATUT } from '../types.ts'
import type { Demande } from '../types.ts'

// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
// C'est volontaire — ce fichier peut donc être exécuté et vérifié seul.

const dateFr = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function quand(iso: string | null): string {
  return iso ? dateFr.format(new Date(iso)) : ''
}

// Ordre et libellés des colonnes. C'est ce que l'artisan ouvrira dans son
// tableur : les en-têtes sont en français, pas les noms SQL.
export const COLONNES: [string, (d: Demande) => string][] = [
  ['Reçue le', (d) => quand(d.recue_le)],
  ['Prénom', (d) => d.prenom ?? ''],
  ['Téléphone', (d) => d.telephone ?? ''],
  ['E-mail', (d) => d.email ?? ''],
  ['Lieu', (d) => d.lieu ?? ''],
  ['Besoin', (d) => d.besoin ?? ''],
  ['Ce que le client a coché', (d) => d.urgence_dite ?? ''],
  ['Gravité estimée', (d) => (d.gravite === null ? '' : String(d.gravite))],
  ['Motif', (d) => d.motif ?? ''],
  ['Panier estimé (€)', (d) => (d.panier === null ? '' : String(d.panier))],
  ['Statut', (d) => LIBELLE_STATUT[d.statut]],
  ['Relancée le', (d) => quand(d.relance_sms_le)],
  ['Traitée le', (d) => quand(d.traite_le)],
]

// Une valeur contenant un point-virgule, un guillemet ou un retour à la ligne
// doit être entourée de guillemets, et ses guillemets doublés (RFC 4180).
// Le champ « besoin » est du texte libre écrit par un inconnu : il contiendra
// tôt ou tard les trois. Sans cet échappement, une seule demande mal tournée
// décale toutes les colonnes du fichier.
export function echappe(valeur: string): string {
  return /[";\n\r]/.test(valeur) ? `"${valeur.replace(/"/g, '""')}"` : valeur
}

export function enCsv(demandes: Demande[]): string {
  const lignes = [
    COLONNES.map(([titre]) => echappe(titre)).join(';'),
    ...demandes.map((d) => COLONNES.map(([, lire]) => echappe(lire(d))).join(';')),
  ]
  // Point-virgule comme séparateur et BOM en tête : c'est ce qu'attend Excel
  // en configuration française. Sans le BOM, les accents sortent illisibles.
  return '﻿' + lignes.join('\r\n') + '\r\n'
}
