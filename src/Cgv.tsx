import PageLegale, { Bloc, BlocEditeur } from './PageLegale'
import { MENTION_TVA, REGIME_TVA } from './lib/editeur'
import { PRIX } from './lib/prix'

// CONDITIONS GÉNÉRALES DE VENTE (cahier, case D2 : « mentions légales et
// CGV accessibles »).
//
// ─────────────────────────────────────────────────────────────────────────
// CE TEXTE N'A PAS ÉTÉ RELU PAR UN JURISTE. Je n'en suis pas un.
// ─────────────────────────────────────────────────────────────────────────
// Ce que j'ai fait : décrire exactement ce que le produit fait et ne fait
// pas, pour qu'aucune clause ne promette une chose que le code ne tient
// pas. C'est la partie qu'un juriste ne peut pas écrire sans lire le code,
// et c'est la seule que je revendique.
//
// Deux points méritent une vraie relecture :
//
//  1. LE DROIT DE RÉTRACTATION. Le client est un professionnel, ce qui en
//     principe l'exclut. Mais l'article L221-3 du code de la consommation
//     l'étend aux professionnels employant cinq salariés ou moins lorsque
//     le contrat sort de leur activité principale — ce qui décrit
//     exactement la cible du cahier : des artisans de 1 à 10 salariés
//     achetant un logiciel. La frontière se joue à un salarié près. J'ai
//     choisi de L'ACCORDER À TOUT LE MONDE : c'est plus simple à tenir que
//     de compter les salariés de chaque client, et ça ne coûte rien quand
//     le service se résilie déjà en un clic.
//
//  2. LA CLAUSE SUR L'ESTIMATION DE GRAVITÉ (article 4). C'est celle qui
//     compte vraiment. Le produit contredit le client quand il exagère —
//     c'est son intérêt — donc il peut aussi le contredire à tort. Il faut
//     que ce soit écrit avant qu'un artisan manque une vraie urgence, pas
//     après.

const MAJ = '23 septembre 2026'

export default function Cgv() {
  return (
    <PageLegale titre="Conditions générales de vente" chemin="/cgv">
      <p className="mt-4 text-xs text-slate-500">Dernière mise à jour : {MAJ}.</p>

      <Bloc titre="1. Qui vend">
        <BlocEditeur />
        <p>
          Ci-après « l’éditeur ». Le client est un professionnel du bâtiment qui souscrit
          au service pour les besoins de son activité ; il est ci-après « l’artisan ».
        </p>
      </Bloc>

      <Bloc titre="2. Ce que le service fait">
        <p>Réponse Éclair, pour chaque appel qu’un artisan ne décroche pas :</p>
        <ol className="list-inside list-decimal space-y-1">
          <li>envoie au correspondant un SMS au nom de l’artisan ;</li>
          <li>recueille sa description sur un formulaire ;</li>
          <li>
            en fait lire la description par un modèle d’intelligence artificielle, qui
            propose une estimation de gravité ;
          </li>
          <li>
            alerte l’artisan et affiche la demande sur un écran classé par cette gravité
            estimée, et non par ordre d’arrivée ;
          </li>
          <li>relance le correspondant resté sans réponse, puis cesse et le signale.</li>
        </ol>
      </Bloc>

      <Bloc titre="3. Ce que le service ne fait pas">
        {/* Partie 7 du cahier, retournée vers l'extérieur. Dire ce qu'on ne
            fait pas coûte moins cher qu'un client déçu au bout de trois
            semaines — et vaut mieux qu'une clause d'exclusion découverte le
            jour du litige. */}
        <ul className="list-inside list-disc space-y-1">
          <li>Il ne décroche pas et ne parle pas à la place de l’artisan.</li>
          <li>Il ne calcule ni trajet ni distance.</li>
          <li>Il n’établit pas de devis et n’encaisse aucun paiement.</li>
          <li>Il ne garantit aucun volume de demandes, ni aucun chiffre d’affaires.</li>
        </ul>
      </Bloc>

      <Bloc titre="4. L’estimation de gravité est une aide, pas un diagnostic">
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
          <p>
            La gravité affichée est produite par un modèle automatique à partir du texte
            écrit par le correspondant. <strong>Elle peut être fausse</strong> : un texte
            mal rédigé, incomplet ou trompeur produit une estimation erronée, et le service
            contredit délibérément l’urgence déclarée par le correspondant.
          </p>
          <p className="mt-2">
            Elle ne remplace ni le jugement de l’artisan, ni un appel. L’ordre d’affichage
            est une suggestion de priorité ; la décision de rappeler, et dans quel ordre,
            appartient à l’artisan seul. L’éditeur ne répond pas des conséquences d’une
            intervention retardée ou omise.
          </p>
        </div>
      </Bloc>

      <Bloc titre="5. Prix">
        <p>
          <strong>{PRIX} € par mois</strong>, sans engagement de durée. Sont compris : le
          numéro, les SMS, le formulaire, les alertes, les relances et l’accès à l’écran.
        </p>
        {REGIME_TVA === 'franchise' && (
          <p>
            <strong>{MENTION_TVA}.</strong> L’éditeur relève de la franchise en base : il
            ne facture pas de TVA. Le prix annoncé est donc le prix payé — il n’y a rien à
            y ajouter, et rien à récupérer.
          </p>
        )}
        <p>
          Le prix peut être modifié pour l’avenir, avec un préavis d’un mois annoncé par
          e-mail. Un artisan qui refuse la modification résilie sans frais.
        </p>
      </Bloc>

      <Bloc titre="6. Durée, résiliation, rétractation">
        <p>
          L’abonnement est mensuel et se renouvelle tacitement. Il se résilie à tout moment
          depuis les réglages du compte, rubrique <em>Résilier</em>.
        </p>
        <p>
          <strong>La résiliation est immédiate et destructrice</strong> : le compte, la
          fiche et toutes les demandes sont effacés sur-le-champ, sans période de
          récupération. Un export des demandes est proposé au même endroit, et il faut
          l’avoir fait avant.
        </p>
        <p>
          <strong>Quatorze jours pour changer d’avis.</strong> L’artisan peut se rétracter
          dans les quatorze jours suivant sa souscription et être remboursé du mois entamé.
          Il suffit de l’écrire à l’adresse de l’éditeur.
        </p>
      </Bloc>

      <Bloc titre="7. Ce que l’artisan doit faire de son côté">
        <ul className="list-inside list-disc space-y-1">
          <li>Configurer le renvoi d’appel sur non-réponse depuis son téléphone.</li>
          <li>
            Répondre lui-même aux demandes : le service prévient, il ne remplace pas
            l’artisan.
          </li>
          <li>
            N’utiliser le service que pour son activité, et ne pas s’en servir pour écrire
            à des personnes qui ne l’ont pas appelé.
          </li>
        </ul>
      </Bloc>

      <Bloc titre="8. Disponibilité">
        <p>
          Le service repose sur des fournisseurs tiers : téléphonie, hébergement,
          automatisation, modèle d’intelligence artificielle. Aucun taux de disponibilité
          n’est garanti. En cas d’interruption, les appels manqués ne sont pas rattrapés
          rétroactivement : ils sont perdus pour le service comme ils l’étaient avant lui.
        </p>
      </Bloc>

      <Bloc titre="9. Données personnelles">
        <p>
          Les données des correspondants sont traitées pour le compte de l’artisan. Le
          détail de ce qui est collecté, par qui il transite et combien de temps il est
          conservé figure dans les{' '}
          <a className="underline" href="/confidentialite">
            mentions légales et données personnelles
          </a>
          , et les engagements de l’éditeur en tant que sous-traitant dans le{' '}
          <a className="underline" href="/sous-traitance">
            contrat de sous-traitance
          </a>
          , qui fait partie intégrante des présentes.
        </p>
      </Bloc>

      <Bloc titre="10. Responsabilité">
        <p>
          La responsabilité de l’éditeur, si elle est engagée, est limitée au montant des
          sommes effectivement versées par l’artisan au cours des douze mois précédents.
          Elle ne couvre pas les pertes de chiffre d’affaires, ni les conséquences d’une
          demande mal classée, mal reçue ou non reçue.
        </p>
      </Bloc>

      <Bloc titre="11. Droit applicable">
        <p>
          Droit français. En cas de différend, les parties cherchent une solution amiable
          avant toute action ; à défaut, les tribunaux français sont compétents.
        </p>
      </Bloc>
    </PageLegale>
  )
}
