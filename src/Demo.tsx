import CarteDemande from './CarteDemande'
import { LIEN_RDV } from './config/offre'
import { DEMANDES_DEMO, trier } from './lib/demo'

// LA PIÈCE MAÎTRESSE DU DISCOURS COMMERCIAL.
//
// Ce fichier ne contient plus que de l'affichage. Les quatre demandes et la
// règle de tri sont dans `lib/demo.ts`, et `lib/demo.test.ts` vérifie
// mécaniquement que l'ordre par gravité CONTREDIT l'ordre d'arrivée.
//
// Ce déplacement vient d'un bug réel : jusqu'au 30 septembre 2026, les deux
// ordres étaient identiques et la page ne prouvait rien. Personne ne l'avait
// vu, parce que des données dans un fichier JSX ne peuvent pas être testées —
// `node --test` retire les types, il ne compile pas le JSX.
//
// Les boutons Appeler et Itinéraire restent actifs en démonstration : ils ne
// touchent pas la base, et ce sont eux qui montrent qu'on agit en un doigt.
// Les numéros sont dans la plage de fiction de l'ARCEP, aucun téléphone ne
// sonnera. Le menu de statut, lui, est masqué par la prop `demo` — il
// n'écrirait nulle part.

const TRIEES = trier(DEMANDES_DEMO)

export default function Demo() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Ils ont tous coché « urgent »
        </h1>
        <p className="mt-2 text-slate-600">
          Quatre demandes arrivées ce matin. Votre logiciel a lu ce qu’ils ont écrit, et
          les a remises dans l’ordre où il faut rappeler.
        </p>

        {/* LA PHRASE QUI DÉSAMORCE « vous mettez mon plus gros chantier en
            dernier ? ». C'est la première objection d'un patron, et elle est
            légitime : la salle de bain à 4 500 € est en bas, la fuite à 180 €
            est en haut. La réponse tient en deux propositions, et elle est
            vraie — un devis qui attend trois jours reste un devis ; une fuite
            qui attend trois heures devient un dégât des eaux, et le client a
            appelé quelqu'un d'autre depuis longtemps. */}
        <p className="mt-4 rounded-lg bg-white px-4 py-3 font-medium text-slate-900 ring-1 ring-slate-200">
          La salle de bain attendra trois jours sans problème. La fuite, non.
        </p>

        <ul className="mt-6 space-y-3">
          {TRIEES.map((d) => (
            <CarteDemande key={d.id} demande={d} demo />
          ))}
        </ul>

        {/* CE QUI FAIT QUE LA PAGE PROUVE QUELQUE CHOSE.
            Sans cette phrase, le visiteur voit une liste et n'a aucune raison
            de penser qu'un autre outil l'aurait rangée autrement. Les deux
            heures qui se contredisent sont déjà sous ses yeux, dans les
            cartes : il suffit de les lui désigner. */}
        <p className="mt-6 text-sm text-slate-600">
          Regardez les heures. La fuite est arrivée il y a trois heures, le devis il y a
          quatre minutes. Un outil qui range par ordre d’arrivée aurait mis le devis en
          haut, et la fuite en bas.
        </p>

        {/* La page était un cul-de-sac : on la regardait, et c'était fini.
            Deux sorties, la plus engageante en premier. */}
        <div className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Vous voulez le voir sur vos propres appels manqués ?
          </h2>
          <p className="mt-2 text-slate-600">
            Un appel de quinze minutes. On regarde ceux de la semaine dernière ensemble,
            et vous voyez tout de suite si ça vous sert.
          </p>
          <a
            href={LIEN_RDV}
            className="mt-4 inline-block rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            Choisir un créneau
          </a>
          <p className="mt-6 text-sm">
            <a href="/offre" className="text-slate-500 underline hover:text-slate-900">
              Comment ça marche, et combien ça coûte
            </a>
          </p>
        </div>
      </div>
    </main>
  )
}
