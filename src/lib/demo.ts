// LES DONNÉES DE LA PAGE DE DÉMONSTRATION, ET LA RÈGLE DE TRI.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE FICHIER EXISTE, ALORS QUE TOUT ÉTAIT DANS Demo.tsx
// ─────────────────────────────────────────────────────────────────────────
// Le 30 septembre 2026, on a découvert que la page /demo ne démontrait rien :
// les quatre demandes arrivaient à 12 min, 1 h, 3 h et 5 h, par gravité
// décroissante. L'ordre par gravité était donc EXACTEMENT l'ordre du plus
// récent au plus ancien — un concurrent qui trie par date d'arrivée aurait
// affiché la même liste, dans le même ordre.
//
// Le bug était invisible parce qu'il vivait dans un fichier JSX, que
// `node --test` ne peut pas charger : Node retire les types, il ne compile
// pas le JSX. Donc AUCUN test ne pouvait le voir.
//
// D'où ce fichier. Les données et la règle de tri sont ici, en TypeScript
// pur ; `Demo.tsx` ne garde que l'affichage. Le test d'à côté vérifie
// mécaniquement que les deux ordres se contredisent. Si quelqu'un remet un
// jour des heures « bien rangées », le test tombe avant la démonstration
// devant un prospect.

import type { Demande } from '../types'

/** Une date relative, recalculée à chaque chargement. La démo ne vieillit
 *  donc jamais : elle dira toujours « il y a 3 h », pas « il y a 8 mois ». */
function ilYA(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

/**
 * Les quatre demandes, DANS L'ORDRE D'ARRIVÉE, du plus récent au plus ancien.
 *
 * Autrement dit : ce que les autres outils affichent. `trier()` donne ce que
 * nous affichons. La différence entre les deux EST le produit.
 *
 *   arrivée (un concurrent)         gravité (nous)
 *   ──────────────────────────      ──────────────────────────
 *   1. devis salle de bain   4 min  1. fuite sous l'évier   3 h
 *   2. plus d'eau chaude    40 min  2. plus d'eau chaude   40 min
 *   3. le WC fuit            2 h    3. le WC fuit           2 h
 *   4. fuite sous l'évier    3 h    4. devis salle de bain  4 min
 *
 * Le premier et le dernier sont échangés : c'est ÇA que le visiteur doit
 * voir. Les deux du milieu ont la même gravité, donc c'est le panier qui les
 * sépare — 450 € contre 140 € — et là encore, ce n'est pas la date.
 *
 * Le type est `Demande`, exactement celui des vraies lignes. C'est
 * volontaire : si le schéma de la base change un jour, TypeScript cassera
 * ICI, et la page de démonstration ne pourra pas se mettre à mentir en
 * silence pendant qu'on montre autre chose aux prospects.
 *
 * Les numéros appartiennent à la plage 06 39 98 xx xx, réservée par l'ARCEP
 * à la fiction : aucun vrai téléphone ne sonnera jamais.
 *
 * Les communes sont en Île-de-France : c'est la cible commerciale.
 */
export const DEMANDES_DEMO: Demande[] = [
  {
    id: 1,
    artisan_id: 'demo',
    recue_le: ilYA(4),
    prenom: 'Sophie',
    email: null,
    telephone: '+33639984408',
    lieu: 'Boulogne-Billancourt',
    besoin: 'Je voudrais un devis pour refaire ma salle de bain',
    urgence_dite: 'Oui, c’est urgent',
    photo_url: null,
    motif: 'devis salle de bain',
    gravite: 1,
    panier: 4500,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
    montant_signe: null,
    gravite_corrigee: null,
    corrigee_le: null,
    cle_action: null,
    eau_coule: null,
    arrivee_coupee: null,
    chauffage_eau_chaude: null,
  },
  {
    id: 2,
    artisan_id: 'demo',
    recue_le: ilYA(40),
    prenom: 'Karim',
    email: null,
    telephone: '+33639980755',
    lieu: 'Montreuil',
    besoin: 'Plus d’eau chaude depuis hier soir',
    urgence_dite: 'Oui, c’est urgent',
    photo_url: null,
    motif: 'panne eau chaude',
    gravite: 2,
    panier: 450,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
    montant_signe: null,
    gravite_corrigee: null,
    corrigee_le: null,
    cle_action: null,
    eau_coule: 'non',
    arrivee_coupee: null,
    chauffage_eau_chaude: 'non',
  },
  {
    id: 3,
    artisan_id: 'demo',
    recue_le: ilYA(120),
    prenom: 'Nadia',
    email: null,
    telephone: '+33639986312',
    lieu: 'Vincennes',
    besoin: 'Le WC fuit un peu à la base',
    urgence_dite: 'Oui, c’est urgent',
    photo_url: null,
    motif: 'fuite wc',
    gravite: 2,
    panier: 140,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
    montant_signe: null,
    gravite_corrigee: null,
    corrigee_le: null,
    cle_action: null,
    eau_coule: null,
    arrivee_coupee: null,
    chauffage_eau_chaude: null,
  },
  {
    id: 4,
    artisan_id: 'demo',
    recue_le: ilYA(180),
    prenom: 'Marc',
    email: null,
    telephone: '+33639982140',
    lieu: 'Paris 11e',
    besoin: 'Fuite sous l’évier, ça coule depuis ce matin',
    urgence_dite: 'Oui, c’est urgent',
    photo_url: null,
    motif: 'fuite sous evier',
    gravite: 3,
    panier: 180,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
    montant_signe: null,
    gravite_corrigee: null,
    corrigee_le: null,
    cle_action: null,
    // Ce que Marc a répondu aux trois questions. C'est ce qui justifie la
    // gravité 3 : l'eau coule ENCORE et rien n'est coupé. Un visiteur doit
    // voir que le classement ne sort pas d'un chapeau.
    eau_coule: 'oui',
    arrivee_coupee: 'non',
    chauffage_eau_chaude: null,
  },
]

// LE TRI N'EST PLUS ICI. Il vit dans `lib/tri.ts`, et c'est le MÊME que
// celui des écrans réels — c'était tout l'objet du déplacement, le
// 1ᵉʳ octobre 2026 : une démonstration qui trierait autrement que le produit
// montrerait aux prospects un classement qui n'existe pas.
export { trier } from './tri.ts'
