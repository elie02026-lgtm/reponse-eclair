import PageLegale, { Bloc, BlocEditeur } from './PageLegale'
import { SOUS_TRAITANTS } from './lib/sousTraitants'

// Mentions légales et politique de confidentialité (cahier, étape 8 ;
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
// L'identité de l'éditeur, elle, vit dans lib/editeur.ts et n'existe pas
// encore. Voir le bandeau rouge.
//
// Je ne suis pas juriste. Les faits ci-dessous sont vérifiables ; la
// qualification juridique demande une relecture.

// La durée retenue est celle que recommande la CNIL pour la prospection :
// trois ans à compter du dernier contact. Elle est ÉCRITE ici ; la case D6
// du cahier exige qu'elle soit aussi APPLIQUÉE, ce qui n'est pas encore
// le cas — aucune purge automatique n'existe.
const CONSERVATION_ANS = 3

const DONNEES: [string, string][] = [
  ['Prénom', 'vous identifier quand l’artisan vous rappelle'],
  ['Téléphone', 'vous rappeler'],
  ['E-mail', 'vous confirmer la réception et vous relancer'],
  ['Commune ou code postal', 'situer l’intervention'],
  ['Description de votre besoin', 'estimer l’urgence et préparer la visite'],
  ['Ce que vous avez coché comme urgence', 'la comparer à ce que vous avez décrit'],
]

export default function Confidentialite() {
  return (
    <PageLegale titre="Mentions légales et données personnelles" chemin="/confidentialite">
      <Bloc titre="Éditeur">
        <BlocEditeur />
      </Bloc>

      <Bloc titre="Hébergement">
        <p>
          Base de données : Supabase, dans l’Union européenne (Paris). Site et pages :
          Cloudflare.
        </p>
      </Bloc>

      <Bloc titre="Ce qui est collecté, et pourquoi">
        <p>
          Uniquement ce que vous écrivez vous-même dans le formulaire, après avoir appelé
          un artisan qui n’a pas pu décrocher.
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
          estimer l’urgence de votre demande. Les autres services ci-dessous interviennent
          dans la chaîne de traitement.
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
              {SOUS_TRAITANTS.map((s) => (
                <tr key={s.nom} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{s.nom}</td>
                  <td className="px-3 py-2 text-slate-700">{s.role}</td>
                  <td className="px-3 py-2 text-slate-600">{s.lieu}</td>
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
          Pour tout le reste, écrivez à l’éditeur ci-dessus. Vous pouvez également saisir
          la CNIL.
        </p>
      </Bloc>
    </PageLegale>
  )
}
