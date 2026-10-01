import { MENTION_TVA, REGIME_TVA } from './lib/editeur'
import {
  INSTALLATIONS_PAR_SEMAINE,
  LIEN_RDV,
  NOM_GARANTIE,
  PRIX_MENSUEL,
  STATUT_JURIDIQUE_OK,
  TEXTE_GARANTIE,
} from './config/offre'

// Page de vente publique (cahier, étape 8 : « Domaine, mentions légales,
// page de vente », et case E3 : « Une page de vente avec un prix affiché »).
//
// ─────────────────────────────────────────────────────────────────────────
// RÈGLE DE CETTE PAGE : ON N'ANNONCE QUE CE QUI EXISTE
// ─────────────────────────────────────────────────────────────────────────
// Consigne d'Elie, mot pour mot : « N'annonce que ce qui existe réellement
// dans le code. Si une fonction n'est pas terminée, ne la mets pas dans la
// page. » Et : « aucun chiffre sans source, ni sur la page ni dans le code ».
//
// Deux phrases ont été retirées le 1ᵉʳ octobre 2026 pour cette raison :
//
//  • « Ils rangent vos demandes par ordre d'arrivée » — inexact. Au moins un
//    concurrent annonce un tri par urgence. Le vrai reproche est ailleurs, et
//    il est pire : ils trient sur la case que le client a cochée.
//
//  • une fourchette de prix d'intervention d'urgence, dont on déduisait
//    qu'un seul rappel rattrapé payait l'année — la fourchette n'avait
//    aucune source, et le calcul était faux à son extrémité basse. Les
//    chiffres eux-mêmes ne sont pas recopiés ici : la consigne vaut aussi
//    pour les commentaires.
//
// Et trois promesses ont été écartées de la section « Vous n'avez rien à
// faire » parce que le code ne les tient PAS ENCORE. Voir le commentaire de
// cette section : il dit laquelle revient avec quelle phase.

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
          {/* LA CIBLE, DITE AVANT LE TITRE.
              Un patron de plomberie-chauffage doit savoir en une seconde que
              cette page lui parle à lui. Une page qui s'adresse à « tous les
              artisans » ne s'adresse à personne. */}
          <div className="mt-1 text-sm text-slate-500">
            Pour les entreprises de plomberie-chauffage
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
          {/* PHRASE CORRIGÉE LE 1ᵉʳ OCTOBRE. L'ancienne disait « ils rangent
              vos demandes par ordre d'arrivée » : c'est faux, au moins un
              concurrent annonce un tri par urgence. Le vrai reproche est plus
              précis et plus dur : ils trient sur la case, et la case ment. */}
          <p>
            Les outils de rappel d’appels manqués existent. Ils rangent vos demandes selon
            la case que le client a cochée. Il coche toujours urgent.
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

        {/* ─────────────────────────────────────────────────────────────────
            LE CŒUR DE L'OFFRE, pour un patron de 55 ans qui n'ouvrira jamais
            un logiciel.
            ─────────────────────────────────────────────────────────────────
            CE QUI A ÉTÉ ÉCARTÉ, ET QUAND LE REMETTRE. Elie avait écrit cinq
            points ; trois sont partis parce que le code ne les tient pas
            encore, et une page de vente qui promet ce qui n'existe pas est
            une dette qu'un client vient réclamer au bout de trois semaines.

             • « avec un bouton pour appeler et un bouton "c'est fait" »
               dans l'e-mail → revient avec la PHASE 4.1 (liens d'action
               signés, utilisables sans connexion). L'alerte existe déjà et
               porte bien le numéro et l'adresse cliquables (module 4 de la
               chaîne Make) : c'est ce qui reste écrit ci-dessous.

             • « il répond en touchant des boutons » → revient avec la
               PHASE 5.1 (les trois questions à boutons). Le numéro déjà
               rempli, lui, existe depuis le 28 septembre — `lib/lien.ts` lit
               le paramètre `t` du lien du SMS.

             • « il reçoit un premier conseil utile, et d'un seul toucher vous
               lui dites quand vous le rappelez » → revient avec les PHASES
               5.3 et 5 bis. C'est le point le plus vendeur des cinq, et c'est
               précisément pour ça qu'il ne faut pas l'écrire avant l'heure.
            ───────────────────────────────────────────────────────────────── */}
        <Bloc titre="Vous n’avez rien à faire">
          <ul className="space-y-3">
            <li>
              <strong>On installe tout avec vous, au téléphone, en dix minutes.</strong>{' '}
              Vous tapez un code, on reste en ligne jusqu’à ce que ça marche.
            </li>
            <li>
              <strong>Vous n’avez pas d’application à ouvrir.</strong> Chaque demande
              arrive par e-mail, déjà classée, avec le numéro et l’adresse cliquables.
            </li>
            <li>
              <strong>Votre client n’a presque rien à taper.</strong> Son numéro est déjà
              rempli quand il ouvre le formulaire : il lui reste à décrire son problème.
            </li>
            <li>
              <strong>Pour revenir en arrière : un code, dix secondes.</strong> Vous le
              composez sur votre téléphone, et tout redevient exactement comme avant.
            </li>
          </ul>
        </Bloc>

        {/* LA GARANTIE AVANT LE PRIX, et c'est délibéré.
            La peur d'un patron n'est pas « combien ça coûte », c'est « est-ce
            que ça va me rapporter quelque chose ». On répond à ça d'abord, et
            le prix se lit ensuite sans la même crispation.
            Le texte vient de `config/offre.ts`, et les CGV affichent la MÊME
            constante : la page de vente ne peut pas promettre autre chose que
            le contrat. */}
        <Bloc titre={NOM_GARANTIE}>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-slate-800">{TEXTE_GARANTIE}</p>
            <p className="mt-3 text-sm text-slate-500">
              Elle s’ajoute au droit de rétractation de quatorze jours prévu par les{' '}
              <a href="/cgv" className="underline hover:text-slate-900">
                conditions de vente
              </a>
              , elle ne le remplace pas.
            </p>
          </div>
        </Bloc>

        <Bloc titre="Le prix">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <div className="text-3xl font-bold text-slate-900">
              {PRIX_MENSUEL} €
              <span className="text-lg font-normal text-slate-500">
                {REGIME_TVA === 'assujetti' ? ' HT' : ''} / mois
              </span>
            </div>

            {/* NE PAS ÉCRIRE « HT » EN FRANCHISE EN BASE. « 79 € HT » fait
                calculer 94,80 € à un artisan habitué à ajouter la TVA, et on
                perd l'appel sur un prix qu'on ne facture pas.

                ET NE PAS AFFIRMER UN RÉGIME FISCAL SANS ENTREPRISE. Tant que
                `STATUT_JURIDIQUE_OK` est `false`, la mention « TVA non
                applicable, article 293 B du CGI » disparaît : un régime
                fiscal suppose une immatriculation. On dit la vérité à la
                place, qui est qu'on n'encaisse pas encore. */}
            {STATUT_JURIDIQUE_OK ? (
              REGIME_TVA === 'franchise' && (
                <p className="mt-1 text-sm text-slate-500">
                  {MENTION_TVA} — c’est le prix que vous payez, il n’y a rien à ajouter.
                </p>
              )
            ) : (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-amber-200">
                Ouverture des inscriptions à l’immatriculation — en attendant, on s’appelle.
              </p>
            )}

            <p className="mt-3 text-sm text-slate-600">
              Sans engagement. Tout est compris : le numéro, les SMS, le formulaire, les
              alertes, les relances, l’écran.
            </p>
          </div>
        </Bloc>

        {/* RARETÉ RÉELLE. Pas un compte à rebours, pas un « plus que 2
            places » qui se remet à 10 chaque nuit : une contrainte vraie,
            celle d'une personne seule qui installe à la main. Le nombre vient
            de `config/offre.ts` — le jour où ce n'est plus vrai, on le change
            là, et la phrase suit. */}
        <Bloc titre="Trois installations par semaine, pas plus">
          <p>
            Nous installons nous-mêmes chaque client, par téléphone.{' '}
            {INSTALLATIONS_PAR_SEMAINE} installations par semaine, pas plus.
          </p>
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
