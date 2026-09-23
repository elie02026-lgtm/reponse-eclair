import PageLegale, { Bloc, BlocEditeur } from './PageLegale'
import { SOUS_TRAITANTS, SOUS_TRAITANTS_HORS_UE } from './lib/sousTraitants'

// CONTRAT DE SOUS-TRAITANCE — article 28 du RGPD (cahier, case D4).
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE DOCUMENT N'EST PAS UNE FORMALITÉ.
// ─────────────────────────────────────────────────────────────────────────
// L'artisan est responsable de traitement : ce sont SES clients, et c'est
// lui qui décide de leur écrire. L'éditeur n'est que sous-traitant : il
// exécute. L'article 28 exige que cette relation soit fixée par écrit, et
// il énumère huit engagements précis — ce sont les articles 4 à 11
// ci-dessous, dans l'ordre des alinéas a) à h) du paragraphe 3.
//
// Sans ce contrat, l'artisan est EN INFRACTION, pas l'éditeur. C'est donc
// un argument de vente autant qu'une obligation : ses concurrents ne le
// fournissent pas.
//
// ─────────────────────────────────────────────────────────────────────────
// CE QUI MANQUE ENCORE POUR COCHER D4 : LA SIGNATURE.
// ─────────────────────────────────────────────────────────────────────────
// Le cahier dit « signable par l'artisan ». Un texte qu'on peut lire n'est
// pas un texte qu'on a signé. Il faut une acceptation datée et conservée —
// une colonne sur `artisans` et un écran qui la réclame.
//
// Je ne l'ai pas construite, pour une raison : tant que l'identité de
// l'éditeur est vide (case D1), l'artisan signerait un contrat dont une
// partie n'est pas identifiée. Ça ne vaut rien, et ça vaut moins que rien
// puisque ça donnerait l'impression que c'est fait.
//
// Je ne suis pas juriste. La description technique ci-dessous est vérifiée
// dans le code ; la rédaction contractuelle demande une relecture.

const MAJ = '23 septembre 2026'
const CONSERVATION_ANS = 3

export default function SousTraitance() {
  return (
    <PageLegale titre="Contrat de sous-traitance (RGPD, article 28)" chemin="/sous-traitance">
      <p className="mt-4 text-xs text-slate-500">Dernière mise à jour : {MAJ}.</p>

      <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <strong>Ce contrat n’est pas encore signable.</strong> Il se lit, il ne
        s’accepte pas : aucune acceptation n’est enregistrée aujourd’hui. Tant que
        l’identité de l’éditeur manque, une signature n’engagerait personne.
      </div>

      <Bloc titre="1. Les parties">
        <p>
          <strong>Le responsable de traitement</strong> est l’artisan abonné au service.
          Ce sont ses clients, et c’est lui qui décide de les recontacter.
        </p>
        <p>
          <strong>Le sous-traitant</strong> est l’éditeur du service :
        </p>
        <BlocEditeur />
      </Bloc>

      <Bloc titre="2. Objet, durée, nature du traitement">
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>Objet</strong> — capter les demandes des personnes qui ont appelé
            l’artisan sans obtenir de réponse, les qualifier et les lui présenter.
          </li>
          <li>
            <strong>Durée</strong> — celle de l’abonnement, et elle cesse avec lui.
          </li>
          <li>
            <strong>Nature</strong> — collecte, enregistrement, analyse automatisée du
            texte, envoi de messages, conservation, effacement.
          </li>
          <li>
            <strong>Finalité</strong> — permettre à l’artisan de rappeler les bonnes
            personnes dans le bon ordre.
          </li>
        </ul>
      </Bloc>

      <Bloc titre="3. Données et personnes concernées">
        <p>
          <strong>Personnes concernées</strong> : les particuliers et professionnels qui
          appellent l’artisan et remplissent le formulaire.
        </p>
        <p>
          <strong>Données</strong> : prénom, numéro de téléphone, adresse e-mail, commune
          ou code postal, description écrite du besoin, niveau d’urgence déclaré, et les
          éléments produits par le service (gravité estimée, statut, montant facturé saisi
          par l’artisan).
        </p>
        <p>
          <strong>Aucune donnée sensible n’est demandée.</strong> Le champ de description
          est libre : si une personne y écrit spontanément une information sensible, elle
          est traitée comme le reste du texte et effacée avec lui.
        </p>
      </Bloc>

      <Bloc titre="4. Traiter uniquement sur instruction (art. 28-3 a)">
        <p>
          L’éditeur ne traite les données que pour fournir le service décrit ci-dessus et
          sur instruction de l’artisan. Les réglages du compte — message SMS, zone, métier
          — constituent ces instructions documentées.
        </p>
        <p>
          L’éditeur n’exploite ces données à aucune fin propre : ni prospection, ni
          revente, ni entraînement de modèle, ni statistiques nominatives.
        </p>
      </Bloc>

      <Bloc titre="5. Confidentialité (art. 28-3 b)">
        <p>
          Les personnes autorisées à accéder aux données sont tenues à la confidentialité.
          À ce jour, une seule personne y a accès du côté de l’éditeur.
        </p>
      </Bloc>

      <Bloc titre="6. Sécurité (art. 28-3 c, renvoi à l’art. 32)">
        <ul className="list-inside list-disc space-y-1">
          <li>Chiffrement des échanges entre le navigateur et les serveurs.</li>
          <li>
            <strong>Cloisonnement en base</strong> : chaque ligne porte l’identifiant de
            son artisan, et une règle de sécurité au niveau des lignes empêche de lire
            celles d’un autre. La séparation n’est pas dans l’affichage, elle est dans la
            base — vérifiée en interrogeant directement l’interface de données.
          </li>
          <li>Authentification par mot de passe, sessions révocables.</li>
          <li>
            Sauvegardes assurées par l’hébergeur, dans l’Union européenne.
          </li>
        </ul>
      </Bloc>

      <Bloc titre="7. Sous-traitants ultérieurs (art. 28-3 d)">
        <p>
          L’artisan autorise les sous-traitants ultérieurs listés ci-dessous. Toute
          addition ou remplacement lui est annoncé par e-mail avec un préavis d’un mois,
          pendant lequel il peut s’y opposer en résiliant sans frais.
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
        {/* Le dire franchement : c'est le point qu'un artisan prudent
            regardera, et le cacher se verrait tout de suite. */}
        <p className="mt-2">
          <strong>Transferts hors Union européenne</strong> —{' '}
          {SOUS_TRAITANTS_HORS_UE.map((s) => s.nom).join(' et ')} traitent des données en
          dehors de l’Union. Les descriptions de besoin transitent donc par des services
          américains, encadrés par les clauses contractuelles types de leurs fournisseurs.
        </p>
      </Bloc>

      <Bloc titre="8. Aide à répondre aux personnes (art. 28-3 e)">
        <p>
          Quand une personne exerce ses droits — accès, rectification, effacement,
          opposition — l’éditeur fournit à l’artisan les moyens d’y répondre.
        </p>
        <p>
          Deux d’entre eux ne demandent aucune intervention : le{' '}
          <strong>lien de désinscription</strong> au bas de chaque relance, immédiat et
          conservé même si la demande est effacée ; et l’<strong>export</strong> de toutes
          les demandes, depuis les réglages.
        </p>
      </Bloc>

      <Bloc titre="9. Violations de données (art. 28-3 f, renvoi aux art. 33 et 34)">
        <p>
          L’éditeur avertit l’artisan <strong>sans délai injustifié</strong> après avoir eu
          connaissance d’une violation de données, et lui fournit ce qu’il faut pour
          notifier la CNIL dans les soixante-douze heures : nature de la violation,
          catégories et volume approximatif de données concernées, conséquences probables,
          mesures prises.
        </p>
      </Bloc>

      <Bloc titre="10. Sort des données à la fin (art. 28-3 g)">
        <p>
          L’artisan choisit, et les deux moyens sont dans son écran :{' '}
          <strong>récupérer</strong> ses demandes par l’export, et{' '}
          <strong>effacer</strong> par la résiliation, qui supprime immédiatement le
          compte, la fiche et toutes les demandes, sans copie conservée.
        </p>
        <p>
          <strong>Une exception, et une seule</strong> : les adresses des personnes ayant
          demandé à ne plus être relancées sont conservées. Les effacer ferait disparaître
          leur refus, et les rendrait relançables à nouveau.
        </p>
        <p>
          À défaut de résiliation, les données sont conservées {CONSERVATION_ANS} ans à
          compter du dernier contact.
        </p>
      </Bloc>

      <Bloc titre="11. Démonstration et audit (art. 28-3 h)">
        <p>
          L’éditeur met à disposition de l’artisan les informations nécessaires pour
          démontrer le respect de l’article 28, et se soumet aux audits que l’artisan
          conduit ou fait conduire, moyennant un préavis raisonnable.
        </p>
        <p>
          Le registre des traitements de l’éditeur est tenu conformément à l’article 30-2.
        </p>
      </Bloc>
    </PageLegale>
  )
}
