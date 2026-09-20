import CarteDemande from './CarteDemande'
import type { Demande } from './types'

// Une date relative, recalculée à chaque affichage. La démo ne vieillit donc
// jamais : elle dira toujours « il y a 12 min », pas « il y a 8 mois ».
function ilYA(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

// Quatre demandes fictives, typées `Demande` — exactement le type des vraies.
// C'est volontaire : si le schéma de la base change un jour, TypeScript
// cassera ICI, et la page de démonstration ne pourra pas se mettre à mentir
// en silence pendant qu'on montre autre chose aux prospects.
//
// Les numéros appartiennent à la plage 06 39 98 xx xx, réservée par l'ARCEP
// à la fiction : aucun vrai téléphone ne sonnera jamais.
//
// L'ORDRE D'ARRIVÉE EST L'INVERSE DE L'ORDRE D'AFFICHAGE, et c'est exprès.
// Sophie a écrit il y a 5 h, Marc il y a 12 min. Un outil qui trie par date
// d'arrivée — c'est-à-dire les trois concurrents — mettrait Sophie en haut.
const DEMANDES: Demande[] = [
  {
    id: 1,
    artisan_id: 'demo',
    recue_le: ilYA(12),
    prenom: 'Marc',
    email: null,
    telephone: '+33639982140',
    lieu: 'Marseille 13001',
    besoin: 'Fuite sous l’évier, ça coule depuis ce matin',
    urgence_dite: 'Oui, c’est une urgence',
    photo_url: null,
    motif: 'fuite sous evier',
    gravite: 3,
    panier: 180,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
  },
  {
    id: 2,
    artisan_id: 'demo',
    recue_le: ilYA(62),
    prenom: 'Karim',
    email: null,
    telephone: '+33639980755',
    lieu: 'Marseille 13005',
    besoin: 'Plus d’eau chaude depuis hier soir',
    urgence_dite: 'Oui, c’est une urgence',
    photo_url: null,
    motif: 'panne eau chaude',
    gravite: 2,
    panier: 450,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
  },
  {
    id: 3,
    artisan_id: 'demo',
    recue_le: ilYA(185),
    prenom: 'Nadia',
    email: null,
    telephone: '+33639986312',
    lieu: 'Aubagne',
    besoin: 'Le WC fuit un peu à la base',
    urgence_dite: 'Oui, c’est une urgence',
    photo_url: null,
    motif: 'fuite wc',
    gravite: 2,
    panier: 140,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
  },
  {
    id: 4,
    artisan_id: 'demo',
    recue_le: ilYA(303),
    prenom: 'Sophie',
    email: null,
    telephone: '+33639984408',
    lieu: 'Aix-en-Provence',
    besoin: 'Je voudrais un devis pour refaire ma salle de bain',
    urgence_dite: 'Oui, c’est une urgence',
    photo_url: null,
    motif: 'devis salle de bain',
    gravite: 1,
    panier: 4500,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
  },
]

// LA MÊME RÈGLE QUE L'ÉCRAN RÉEL : gravité décroissante, puis panier
// décroissant. Jamais la date.
//
// Sur le vrai écran ce tri est fait par Postgres (`order by gravite desc,
// panier desc`), parce que l'index est là et qu'il y aura un jour des
// milliers de lignes. Ici il n'y en a que quatre et aucune base : on
// applique la même règle en JavaScript. C'est la seule duplication de la
// page, et elle est volontaire — une démo qui interrogerait la base ne
// serait plus une démo.
const TRIEES = [...DEMANDES].sort(
  (a, b) => (b.gravite ?? 0) - (a.gravite ?? 0) || (b.panier ?? 0) - (a.panier ?? 0),
)

export default function Demo() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Ils ont tous coché « urgent »
        </h1>
        <p className="mt-2 text-slate-600">
          Quatre demandes reçues ce matin. Votre logiciel les a lues et remises dans
          l’ordre où il faut rappeler.
        </p>

        <ul className="mt-8 space-y-3">
          {TRIEES.map((d) => (
            <CarteDemande key={d.id} demande={d} demo />
          ))}
        </ul>
      </div>
    </main>
  )
}
