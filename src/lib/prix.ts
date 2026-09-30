// LE PRIX, À UN SEUL ENDROIT.
//
// Il était écrit dans Offre.tsx. Les CGV doivent annoncer le même chiffre,
// et deux chiffres qui doivent être égaux finissent toujours par ne plus
// l'être — sauf si l'un des deux n'existe pas.
//
// Décision d'Elie, confirmée le 30 septembre 2026 : 79 € par mois.
//
// LA RAISON DU PRIX, ET RIEN D'AUTRE :
//   • un ancrage entre LockLead (49 €) et Repondeo (149 €) ;
//   • l'installation est faite avec le client, au téléphone. C'est ce que
//     les deux autres ne font pas, et c'est ce qui se paie.
//
// CE QUI A ÉTÉ RETIRÉ D'ICI, ET POURQUOI. Ce commentaire portait
// « un seul chantier de gravité 3 rapporte entre 180 et 550 € : l'abonnement
// se rembourse en un rappel par an ». Cette fourchette n'avait aucune
// source, et le calcul était faux au bas de la fourchette. Consigne d'Elie,
// mot pour mot : « aucun chiffre sans source, ni sur la page ni dans le
// code ». Un chiffre inventé dans un commentaire finit toujours par
// ressortir sur une page de vente.
//
// Le régime de TVA qui décide si ce nombre est un « HT » ou un prix tout
// court vit dans lib/editeur.ts.
//
// À FAIRE EN PHASE 3 : cette constante rejoint `config/offre.ts` sous le nom
// `PRIX_MENSUEL`, pour qu'il n'y ait qu'un seul fichier de discours
// commercial. Le déplacement se fait en un mouvement, pas en laissant deux
// sources cohabiter.
export const PRIX = 79
