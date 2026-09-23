// LES SOUS-TRAITANTS ULTÉRIEURS, À UN SEUL ENDROIT.
//
// Deux pages doivent dire exactement la même chose : la politique de
// confidentialité, qui l'annonce aux clients de l'artisan, et le contrat de
// sous-traitance de l'article 28, qui l'engage envers l'artisan. Le jour où
// un service est ajouté ou retiré, l'oublier dans l'une des deux pages
// transforme une information en fausse déclaration contractuelle.
//
// Vérifié : région Supabase eu-west-3 (Paris), zone Make eu1.
//
// TALLY EN EST SORTI LE 23 SEPTEMBRE 2026. Le formulaire est désormais une
// page à nous (`/formulaire`), parce que le lien du SMS doit porter le code
// de l'artisan appelé. Un sous-traitant de moins, et une ligne de moins à
// justifier. Le retirer d'ici le retire des deux pages d'un coup.

export type SousTraitant = {
  nom: string
  role: string
  lieu: string
  /** `true` quand les données sortent de l'Union européenne. */
  horsUe: boolean
}

export const SOUS_TRAITANTS: SousTraitant[] = [
  {
    nom: 'Supabase',
    role: 'Hébergement de la base de données',
    lieu: 'Union européenne (Paris, eu-west-3)',
    horsUe: false,
  },
  {
    nom: 'Cloudflare',
    role: 'Hébergement du site et des pages',
    lieu: 'Réseau mondial, sans stockage',
    horsUe: false,
  },
  {
    nom: 'Make',
    role: 'Automatisation de la chaîne de traitement',
    lieu: 'Union européenne (eu1)',
    horsUe: false,
  },
  {
    nom: 'Google — Gemini',
    role: 'Lecture de la description pour estimer la gravité',
    lieu: 'Hors UE',
    horsUe: true,
  },
  {
    nom: 'Google — Gmail',
    role: 'Envoi des e-mails de réponse et de relance',
    lieu: 'Hors UE',
    horsUe: true,
  },
]

export const SOUS_TRAITANTS_HORS_UE = SOUS_TRAITANTS.filter((s) => s.horsUe)
