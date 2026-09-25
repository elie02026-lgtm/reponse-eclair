// QUI ÉDITE CE SERVICE — UN SEUL ENDROIT, TROIS PAGES.
//
// Les mentions légales, les CGV et le contrat de sous-traitance réclament
// tous la même identité. Elle était écrite dans Confidentialite.tsx ; à
// trois pages, la recopier garantissait qu'une seule serait à jour.
//
// Tant que ces champs sont nuls, les trois pages affichent un bandeau rouge
// et refusent de se faire passer pour des documents valables. C'est la case
// D1 du cahier — « statut juridique permettant de facturer » — et elle ne
// se résout pas en écrivant du code : elle se résout en s'immatriculant.
//
// Je ne suis pas juriste. Les faits techniques de ces pages (données
// collectées, sous-traitants, régions d'hébergement, durées) sont vérifiés
// dans le schéma et dans les scénarios. Les qualifications juridiques et la
// rédaction contractuelle demandent une relecture par quelqu'un dont c'est
// le métier.

// CE QUE LA LOI EXIGE, ET OÙ ELLE L'EXIGE.
//
// Pour un site édité à titre professionnel par une PERSONNE PHYSIQUE —
// ce que sera une entreprise individuelle — il faut publier : nom, prénoms,
// DOMICILE, NUMÉRO DE TÉLÉPHONE, et le numéro d'inscription au RCS ou au
// répertoire des métiers. Plus le numéro de TVA intracommunautaire quand
// on y est assujetti — ici non, voir `REGIME_TVA` plus bas.
//
// La référence a changé le 21 mai 2024 : la loi SREN (n° 2024-449) a
// déplacé cette liste de l'article 6, III de la LCEN vers son **article
// 1-1, I**. Citer « article 6 III » aujourd'hui, c'est citer un texte qui
// n'existe plus — d'où cette note, pour qu'on ne le recopie pas d'un
// modèle trouvé en ligne.
//
// LE TÉLÉPHONE MANQUAIT ICI. Je l'avais oublié en écrivant les trois
// pages : sans lui, les mentions légales auraient été incomplètes le jour
// même de leur mise en ligne.
export type Identite = {
  denomination: string | null
  statut: string | null
  siret: string | null
  adresse: string | null
  telephone: string | null
  email: string | null
  directeur: string | null
}

// À REMPLIR le jour de l'immatriculation, ici et nulle part ailleurs.
//
// `adresse` DEVIENDRA PUBLIQUE, et c'est irréversible au sens où on ne
// reprend pas ce qui a été indexé. Une domiciliation au domicile fait
// paraître ce domicile sur ces trois pages. On peut masquer l'adresse du
// répertoire Sirene (insee.fr, droit d'opposition de l'article R123-232-1
// du code de commerce), mais PAS des mentions légales du site : la loi les
// impose. Le seul moyen de publier une autre adresse est d'en avoir une
// autre — société de domiciliation, ~20 à 30 € par mois.
export const EDITEUR: Identite = {
  denomination: null,
  statut: null,
  siret: null,
  adresse: null,
  telephone: null,
  email: null,
  directeur: null,
}

export const IDENTITE_COMPLETE = Object.values(EDITEUR).every(
  (v) => v !== null && v !== '',
)

// ─────────────────────────────────────────────────────────────────────────
// LE RÉGIME DE TVA, QUI CHANGE CE QUE LA PAGE DE VENTE A LE DROIT D'AFFICHER
// ─────────────────────────────────────────────────────────────────────────
// Une micro-entreprise qui démarre relève de la franchise en base : elle ne
// facture pas de TVA, et chaque facture DOIT porter la mention ci-dessous.
// Seuils vérifiés sur entreprendre.service-public.gouv.fr (page à jour au
// 1er janvier 2026) : 37 500 € de chiffre d'affaires pour les prestations
// de services, tolérance jusqu'à 41 250 €.
//
// Conséquence concrète, et c'est pour ça que cette constante existe :
// afficher « 29 € HT » laisse entendre qu'il faudra ajouter 20 % — soit
// 34,80 €. En franchise, le client paie 29 €, point. Un prix annoncé plus
// bas qu'il n'est vraiment se pardonne ; plus haut, on perd l'appel.
export const REGIME_TVA: 'franchise' | 'assujetti' = 'franchise'

export const MENTION_TVA = 'TVA non applicable, article 293 B du CGI'

/** Le seuil au-delà duquel il faudra repasser cette constante à `assujetti`. */
export const SEUIL_FRANCHISE_SERVICES = 37_500
