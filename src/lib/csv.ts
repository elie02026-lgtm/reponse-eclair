// Extensions explicites : Vite s'en passe, mais Node les exige. Sans elles,
// ce fichier ne pourrait pas être exécuté hors du navigateur — donc pas testé.
import { LIBELLE_STATUT } from '../types.ts'
import { aParis } from './heures.ts'
import type { Demande } from '../types.ts'

// Logique pure : aucune dépendance au réseau, à Supabase ou au navigateur.
// C'est volontaire — ce fichier peut donc être exécuté et vérifié seul.

// ─────────────────────────────────────────────────────────────────────────
// CE FICHIER ÉCRIVAIT L'HEURE DE LA MACHINE QUI L'OUVRE, PAS CELLE DE PARIS
// ─────────────────────────────────────────────────────────────────────────
// Sans `timeZone`, `Intl` rend l'heure du fuseau de l'appareil. Trouvé le
// 25 septembre 2026 par accident : l'horloge Windows d'Elie était réglée
// sur Asia/Jerusalem, une heure devant Paris. Mesuré sur cette machine —
//
//   instant réel        2026-09-25T22:30:00Z   (00 h 30 le 26, à Paris)
//   écrit dans le CSV   26/09/2026 01:30       ← faux d'une heure
//
// Ce n'était pas visible en production : l'artisan lit son propre écran
// avec sa propre horloge, qui est à l'heure de Paris. Mais ce fichier est
// une TRACE : il s'ouvre dans un tableur, s'archive, se transmet à un
// comptable, se relit dans six mois depuis n'importe où. Un horodatage qui
// dépend de l'appareil qui le lit n'est pas une trace.
//
// On fige donc à l'heure de Paris. C'est le seul fuseau qui ait un sens
// ici : les artisans sont tous en France, la vue de relance (migration
// 0008) et les jours fériés y sont déjà tous calés.
const dateFr = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/**
 * Le nom du fichier téléchargé.
 *
 * Il portait `new Date().toISOString().slice(0, 10)`, c'est-à-dire la date
 * UTC. Un export lancé à 00 h 30 le 26 s'appelait donc « …-25.csv » : la
 * veille. Deux exports à une nuit d'écart pouvaient porter le même nom.
 */
export function nomFichierExport(quand: Date): string {
  return `reponse-eclair-demandes-${aParis(quand).jour}.csv`
}

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
