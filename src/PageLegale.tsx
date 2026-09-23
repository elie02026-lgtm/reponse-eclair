import { EDITEUR, IDENTITE_COMPLETE } from './lib/editeur'

// LA CARCASSE COMMUNE AUX TROIS PAGES JURIDIQUES.
//
// Mentions légales, CGV et contrat de sous-traitance partagent la même
// mise en page, le même bandeau d'incomplétude et les mêmes liens entre
// elles. Le cahier (case D2) demande qu'elles soient « accessibles » : une
// page qu'on ne peut atteindre qu'en tapant son adresse ne l'est pas.

const PAGES: [string, string][] = [
  ['/confidentialite', 'Mentions légales et données'],
  ['/cgv', 'Conditions de vente'],
  ['/sous-traitance', 'Sous-traitance RGPD'],
]

/** Le bandeau rouge, tant qu'Elie n'a pas de statut juridique (case D1). */
export function BandeauIncomplet() {
  if (IDENTITE_COMPLETE) return null
  return (
    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
      <strong>Document incomplet — ne pas diffuser.</strong> L’identité de l’éditeur n’est
      pas renseignée : le projet n’a pas encore de statut juridique. Ce qui est décrit ici
      du fonctionnement du service est exact et vérifié ; l’en-tête légal, lui, manque.
    </div>
  )
}

/** L'identité, ou l'aveu qu'elle n'existe pas. Jamais un texte inventé. */
export function BlocEditeur() {
  if (!IDENTITE_COMPLETE) {
    return <p className="italic text-slate-500">À renseigner après immatriculation.</p>
  }
  return (
    <ul className="space-y-1">
      <li>
        {EDITEUR.denomination} — {EDITEUR.statut}
      </li>
      <li>SIRET {EDITEUR.siret}</li>
      <li>{EDITEUR.adresse}</li>
      <li>Directeur de la publication : {EDITEUR.directeur}</li>
      <li>Contact : {EDITEUR.email}</li>
    </ul>
  )
}

export function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{titre}</h2>
      <div className="mt-2 space-y-2 text-sm text-slate-700">{children}</div>
    </section>
  )
}

export default function PageLegale({
  titre,
  chemin,
  children,
}: {
  titre: string
  /** Pour ne pas se proposer un lien vers soi-même. */
  chemin: string
  children: React.ReactNode
}) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <a href="/offre" className="text-sm text-slate-500 underline hover:text-slate-900">
          Réponse Éclair
        </a>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">{titre}</h1>

        <BandeauIncomplet />

        {children}

        <footer className="mt-10 flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-4 text-xs text-slate-500">
          {PAGES.filter(([c]) => c !== chemin).map(([c, nom]) => (
            <a key={c} href={c} className="underline hover:text-slate-900">
              {nom}
            </a>
          ))}
        </footer>
      </div>
    </main>
  )
}
