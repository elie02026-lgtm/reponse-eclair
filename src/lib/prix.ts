// LE PRIX, À UN SEUL ENDROIT.
//
// Il était écrit dans Offre.tsx. Les CGV doivent annoncer le même chiffre,
// et deux chiffres qui doivent être égaux finissent toujours par ne plus
// l'être — sauf si l'un des deux n'existe pas.
//
// Décision d'Elie, 22 septembre 2026, après comparaison :
//   • Rappli   : 14,90 € HT/mois — capte l'appel manqué, ne trie rien.
//   • LockLead : 49 €/mois.
//   • Marché des relances SMS pour artisans : 15 à 80 €/mois.
//   • Télésecrétariat humain : 80 à 300 €/mois.
//
// 29 € se place au-dessus de Rappli — le tri par gravité réelle est un
// travail que Rappli ne fait pas — et bien en dessous de LockLead, parce
// qu'un produit sans client ni domaine ne se vend pas au prix d'un produit
// installé. Un seul chantier de gravité 3 rapporte entre 180 et 550 € :
// l'abonnement se rembourse en un rappel par an.
//
// Le régime de TVA qui décide si ce nombre est un « HT » ou un prix tout
// court vit dans lib/editeur.ts.
export const PRIX = 29
