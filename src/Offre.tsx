import { MENTION_TVA, REGIME_TVA } from './lib/editeur'
import { PRIX } from './lib/prix'

// Page de vente publique (cahier, étape 8 : « Domaine, mentions légales,
// page de vente », et case E3 : « Une page de vente avec un prix affiché »).
//

// Où l'on parle à un humain. Le cahier a tranché : un artisan préfère un
// humain à une IA, et l'appel sert à ça.
const LIEN_RDV = 'https://cal.com/elie-gywz5w/rdv'

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-slate-900">{titre}</h2>
      <div className="mt-3 space-y-3 text-slate-700">{children}</div>
    </section>
  )
}

export default function Offre() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <header>
          <div className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Réponse Éclair
          </div>
          <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900">
            Vos clients cochent tous « urgent ».
            <br />
            Votre logiciel lit ce qu’ils écrivent.
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Une fuite qui coule et une salle de bain à refaire arrivent dans la même boîte,
            avec la même case cochée. Réponse Éclair les remet dans l’ordre où il faut
            rappeler — par gravité réelle, jamais par heure d’arrivée.
          </p>

          <a
            href="/demo"
            className="mt-6 inline-block rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            Voir sur un vrai écran
          </a>
        </header>

        <Bloc titre="Ce qui se passe quand vous ne décrochez pas">
          <ol className="list-inside list-decimal space-y-2">
            <li>Le client reçoit un SMS à votre nom, en quelques secondes.</li>
            <li>Il décrit son problème sur un formulaire, son numéro déjà rempli.</li>
            <li>
              Vous recevez une alerte avec son numéro et son adresse cliquables — et la
              gravité estimée <em>à partir de ce qu’il a écrit</em>, pas de ce qu’il a coché.
            </li>
            <li>S’il ne donne pas suite, il est relancé tout seul, puis signalé.</li>
          </ol>
        </Bloc>

        <Bloc titre="Ce que les autres ne font pas">
          <p>
            Les outils de rappel d’appels manqués existent. Ils rangent vos demandes par
            ordre d’arrivée : le devis de salle de bain de ce matin passe avant la fuite de
            midi.
          </p>
          <p>
            Ici, une machine lit la description et <strong>contredit le client</strong>{' '}
            quand il exagère. L’écart entre les deux est affiché sur chaque demande.
          </p>
          <p>
            Et les gens qui ne répondent jamais ne disparaissent pas de l’écran : ils sont
            rassemblés et nommés — <em>« à rappeler vous-même »</em>. Le logiciel a fait ce
            qu’il pouvait, à vous de décrocher.
          </p>
        </Bloc>

        <Bloc titre="Le prix">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl font-bold text-slate-900">
              {PRIX} €
              <span className="text-lg font-normal text-slate-500">
                {REGIME_TVA === 'assujetti' ? ' HT' : ''} / mois
              </span>
            </div>
            {/* NE PAS ÉCRIRE « HT » EN FRANCHISE EN BASE. « 29 € HT » fait
                calculer 34,80 € à un artisan habitué à ajouter la TVA, et on
                perd l'appel sur un prix qu'on ne facture pas. Seuils vérifiés
                sur service-public : 37 500 € de recettes en prestations de
                services. Voir lib/editeur.ts. */}
            {REGIME_TVA === 'franchise' && (
              <p className="mt-1 text-sm text-slate-500">
                {MENTION_TVA} — c’est le prix que vous payez, il n’y a rien à ajouter.
              </p>
            )}
            <p className="mt-2 text-sm text-slate-600">
              Sans engagement. Tout est compris : le numéro, les SMS, le formulaire, les
              alertes, les relances, l’écran.
            </p>
            <p className="mt-3 text-sm text-slate-600">
              Une intervention d’urgence se facture entre 180 et 550 €. Un seul rappel
              rattrapé dans l’année paie l’abonnement.
            </p>
          </div>
        </Bloc>

        <Bloc titre="Ce qui n’est pas dedans">
          {/* Dire ce qu'on ne fait pas coûte moins cher qu'un client déçu au
              bout de trois semaines. C'est aussi la Partie 7 du cahier. */}
          <ul className="list-inside list-disc space-y-1 text-slate-600">
            <li>Pas de calcul de trajet ni de distance.</li>
            <li>Pas de devis pré-rempli.</li>
            <li>Pas d’agent vocal : c’est vous qui rappelez.</li>
            <li>Pas de paiement en ligne — la facture se fait à la main.</li>
          </ul>
        </Bloc>

        <Bloc titre="Pour commencer">
          <p>
            Un appel de quinze minutes. On regarde vos appels manqués de la semaine
            dernière, et vous voyez tout de suite si ça vous sert.
          </p>
          <a
            href={LIEN_RDV}
            className="inline-block rounded-lg bg-slate-900 px-5 py-3 font-medium text-white hover:bg-slate-800"
          >
            Choisir un créneau
          </a>
        </Bloc>

        {/* Case D2 : « mentions légales et CGV ACCESSIBLES ». /confidentialite
            existait depuis hier et rien ne pointait dessus : on ne pouvait y
            arriver qu'en tapant l'adresse. Ce n'est pas accessible. */}
        <footer className="mt-12 space-y-3 border-t border-slate-200 pt-6 text-sm text-slate-500">
          <p>Réponse Éclair — demandes classées par gravité réelle, pas par ordre d’arrivée.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <a href="/cgv" className="underline hover:text-slate-900">
              Conditions de vente
            </a>
            <a href="/confidentialite" className="underline hover:text-slate-900">
              Mentions légales et données
            </a>
            <a href="/sous-traitance" className="underline hover:text-slate-900">
              Sous-traitance RGPD
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
