// Politique de confidentialité et mentions légales (cahier, étape 8 ;
// cases D2 et D3).
//
// ─────────────────────────────────────────────────────────────────────────
// CE QUE JE PEUX ÉCRIRE, ET CE QUE JE NE PEUX PAS.
// ─────────────────────────────────────────────────────────────────────────
// L'inventaire des données et la liste des sous-traitants sont FACTUELS :
// ils décrivent ce que la chaîne fait réellement, vérifié dans le schéma,
// dans les scénarios Make et dans les régions d'hébergement. C'est la
// partie que personne d'autre ne peut écrire sans lire le code.
//
// L'identité de l'éditeur, elle, n'existe pas encore : Elie n'a pas de
// statut juridique (case D1). Tant que ces champs sont nuls, la page
// affiche un avertissement rouge et refuse de se faire passer pour un
// document valable. Une page légale à moitié fausse est pire que pas de
// page du tout.
//
// Je ne suis pas juriste. Les faits ci-dessous sont vérifiables ; la
// qualification juridique et les CGV demandent une relecture.

type Identite = {
  denomination: string | null
  statut: string | null
  siret: string | null
  adresse: string | null
  email: string | null
  directeur: string | null
}

// À REMPLIR le jour de l'immatriculation. Un seul objet, un seul endroit.
const EDITEUR: Identite = {
  denomination: null,
  statut: null,
  siret: null,
  adresse: null,
  email: null,
  directeur: null,
}

const complet = Object.values(EDITEUR).every((v) => v !== null && v !== '')

// La durée retenue est celle que recommande la CNIL pour la prospection :
// trois ans à compter du dernier contact. Elle est ÉCRITE ici ; la case D6
// du cahier exige qu'elle soit aussi APPLIQUÉE, ce qui n'est pas encore
// le cas — aucune purge automatique n'existe.
const CONSERVATION_ANS = 3

// Chaque service qui voit passer une donnée personnelle, et ce qu'il en
// voit. Vérifié : région Supabase eu-west-3 (Paris), zone Make eu1.
const SOUS_TRAITANTS: [string, string, string][] = [
  ['Supabase', 'Hébergement de la base de données', 'Union européenne (Paris, eu-west-3)'],
  ['Cloudflare', 'Hébergement du site et des pages', 'Réseau mondial, sans stockage'],
  ['Make', 'Automatisation de la chaîne de traitement', 'Union européenne (eu1)'],
  ['Google — Gemini', 'Lecture de la description pour estimer la gravité', 'Hors UE'],
  ['Google — Gmail', 'Envoi des e-mails de réponse et de relance', 'Hors UE'],
  ['Tally', 'Formulaire de description du besoin', 'Union européenne'],
]

const DONNEES: [string, string][] = [
  ['Prénom', 'vous identifier quand l’artisan vous rappelle'],
  ['Téléphone', 'vous rappeler'],
  ['E-mail', 'vous confirmer la réception et vous relancer'],
  ['Commune ou code postal', 'situer l’intervention'],
  ['Description de votre besoin', 'estimer l’urgence et préparer la visite'],
  ['Ce que vous avez coché comme urgence', 'la comparer à ce que vous avez décrit'],
]

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-slate-900">{titre}</h2>
      <div className="mt-2 space-y-2 text-sm text-slate-700">{children}</div>
    </section>
  )
}

export default function Confidentialite() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900">
          Mentions légales et données personnelles
        </h1>

        {!complet && (
          <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200">
            <strong>Document incomplet — ne pas diffuser.</strong> L’identité de l’éditeur
            n’est pas renseignée : le projet n’a pas encore de statut juridique. Les
            informations ci-dessous sur le traitement des données sont exactes et
            vérifiées ; l’en-tête légal, lui, manque.
          </div>
        )}

        <Bloc titre="Éditeur">
          {complet ? (
            <ul className="space-y-1">
              <li>{EDITEUR.denomination} — {EDITEUR.statut}</li>
              <li>SIRET {EDITEUR.siret}</li>
              <li>{EDITEUR.adresse}</li>
              <li>Directeur de la publication : {EDITEUR.directeur}</li>
              <li>Contact : {EDITEUR.email}</li>
            </ul>
          ) : (
            <p className="italic text-slate-500">À renseigner après immatriculation.</p>
          )}
        </Bloc>

        <Bloc titre="Hébergement">
          <p>
            Base de données : Supabase, dans l’Union européenne (Paris). Site et pages :
            Cloudflare.
          </p>
        </Bloc>

        <Bloc titre="Ce qui est collecté, et pourquoi">
          <p>
            Uniquement ce que vous écrivez vous-même dans le formulaire, après avoir
            appelé un artisan qui n’a pas pu décrocher.
          </p>
          <ul className="mt-2 space-y-1">
            {DONNEES.map(([quoi, pourquoi]) => (
              <li key={quoi}>
                <strong>{quoi}</strong> — {pourquoi}
              </li>
            ))}
          </ul>
          <p className="mt-2">
            Aucun suivi publicitaire, aucun cookie de mesure d’audience, aucune revente.
          </p>
        </Bloc>

        <Bloc titre="Qui d’autre voit ces données">
          <p>
            La description de votre besoin est lue par un modèle de Google (Gemini) pour
            estimer l’urgence de votre demande. Les autres services ci-dessous
            interviennent dans la chaîne de traitement.
          </p>
          <div className="mt-2 overflow-hidden rounded-lg ring-1 ring-slate-200">
            <table className="w-full bg-white text-left text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Service</th>
                  <th className="px-3 py-2">Rôle</th>
                  <th className="px-3 py-2">Lieu</th>
                </tr>
              </thead>
              <tbody>
                {SOUS_TRAITANTS.map(([nom, role, lieu]) => (
                  <tr key={nom} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{nom}</td>
                    <td className="px-3 py-2 text-slate-700">{role}</td>
                    <td className="px-3 py-2 text-slate-600">{lieu}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Bloc>

        <Bloc titre="Combien de temps">
          <p>
            {CONSERVATION_ANS} ans à compter du dernier contact, conformément à la
            recommandation de la CNIL pour la prospection commerciale.
          </p>
        </Bloc>

        <Bloc titre="Vos droits">
          <p>
            Vous pouvez demander à consulter, corriger ou effacer vos données, et vous
            opposer à leur traitement. Le plus simple et le plus rapide :
          </p>
          <p>
            <strong>Ne plus recevoir de relance</strong> — le lien de désinscription en bas
            de chaque e-mail de relance est immédiat, et l’opposition est conservée même si
            la demande est effacée.
          </p>
          <p>
            Pour tout le reste, écrivez à l’éditeur ci-dessus. Vous pouvez également
            saisir la CNIL.
          </p>
        </Bloc>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
          Réponse Éclair
        </footer>
      </div>
    </main>
  )
}
