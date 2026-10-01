// Les constantes de l'offre, à un seul endroit.
//
// Ce fichier existe pour qu'Elie puisse changer le discours commercial sans
// ouvrir un composant. Tout ce qui est ici est LU par la page de vente, par
// les CGV et par l'écran de réglages : aucune de ces trois surfaces ne
// recopie un texte, elles l'importent. Une promesse ne peut donc pas être
// vraie sur la page de vente et fausse dans le contrat.
//
// `lib/prix.ts` a été SUPPRIMÉ le 1ᵉʳ octobre 2026 et son contenu est venu
// ici. Il n'existe donc plus deux endroits où un prix peut vivre.

/** Où l'on parle à un humain. Le cahier a tranché : un artisan préfère un
 *  humain à une IA, et l'appel sert à ça. */
export const LIEN_RDV = 'https://cal.com/elie-gywz5w/rdv'

// ─────────────────────────────────────────────────────────────────────────
// LE PRIX
// ─────────────────────────────────────────────────────────────────────────

/**
 * 79 € par mois. Décision d'Elie, confirmée le 30 septembre 2026.
 *
 * LA RAISON DU PRIX, ET RIEN D'AUTRE :
 *   • un ancrage entre LockLead (49 €) et Repondeo (149 €) ;
 *   • l'installation est faite avec le client, au téléphone. C'est ce que
 *     les deux autres ne font pas, et c'est ce qui se paie.
 *
 * CE QUI A ÉTÉ RETIRÉ, ET POURQUOI. La page affirmait une fourchette de prix
 * d'intervention d'urgence, et en déduisait qu'un seul rappel rattrapé dans
 * l'année payait l'abonnement. La fourchette n'avait aucune source, et le
 * calcul était faux au bas de celle-ci. Consigne d'Elie, mot pour mot :
 * « aucun chiffre sans source, ni sur la page ni dans le code » — y compris
 * dans un commentaire, et y compris pour expliquer qu'on l'a retiré. Il n'y
 * a donc plus AUCUNE phrase de rentabilité chiffrée sur `/offre`, et il ne
 * faut pas en remettre sans une source qu'on puisse citer.
 */
export const PRIX_MENSUEL = 79

/**
 * Combien d'installations par semaine on accepte.
 *
 * RARETÉ RÉELLE, PAS RARETÉ INVENTÉE. Chaque client est installé par
 * téléphone, à la main, en une quinzaine de minutes d'appel. Trois par
 * semaine est ce qu'une personne seule peut tenir — c'est une contrainte
 * vraie, pas un compte à rebours de page de vente. Le jour où ce n'est plus
 * vrai, il faut changer ce nombre ici, pas le laisser mentir.
 */
export const INSTALLATIONS_PAR_SEMAINE = 3

/**
 * L'entreprise est-elle immatriculée ?
 *
 * TANT QUE C'EST `false` :
 *   • on n'affiche PAS « TVA non applicable, article 293 B du CGI » — c'est
 *     une affirmation de régime fiscal, et un régime fiscal suppose une
 *     entreprise ;
 *   • on affiche à la place, près du prix, que les inscriptions ouvrent à
 *     l'immatriculation.
 *
 * On ne cache rien : on dit la vérité, qui est qu'on n'encaisse pas encore.
 * Un artisan qui paie une entreprise non immatriculée a un vrai problème ;
 * mieux vaut qu'il l'apprenne de nous.
 */
export const STATUT_JURIDIQUE_OK = false

// ─────────────────────────────────────────────────────────────────────────
// LA GARANTIE
// ─────────────────────────────────────────────────────────────────────────
// Elle ne répond pas à « et si je change d'avis » — c'est le rôle des
// quatorze jours de rétractation, qui restent à l'article 6 des CGV et se
// cumulent avec celle-ci. Elle répond à la vraie peur du patron :
// « ça ne me rapportera rien ».
//
// C'est pour ça qu'elle est indexée sur des demandes REÇUES, pas sur une
// durée d'essai. Une durée d'essai fait porter le risque à l'artisan ;
// celle-ci le fait porter à l'éditeur.

/** Le nom court, celui qu'on prononce au téléphone. */
export const NOM_GARANTIE = 'Garantie 5 demandes'

/**
 * Le texte exact, écrit par Elie. Les CGV l'affichent MOT POUR MOT depuis
 * cette constante — pas une copie, l'original. C'est la seule façon de
 * garantir que le contrat promette ce que la page de vente promet.
 *
 * Le compteur mentionné à la dernière phrase existe vraiment : voir
 * `lib/garantie.ts` et l'écran Réglages. Ne pas modifier cette phrase sans
 * vérifier que l'écran la tient toujours — le test de `config/offre.test.ts`
 * surveille les nombres, pas le sens.
 */
export const TEXTE_GARANTIE =
  'Vous ne payez rien avant d’avoir reçu 5 demandes de clients. Si au bout de ' +
  '60 jours vous en avez reçu moins de 5, vous arrêtez sans avoir payé un euro. ' +
  'C’est le logiciel qui les compte : vous voyez le compteur dans vos réglages.'

/** Combien de demandes déclenchent la fin de la garantie. */
export const DEMANDES_GARANTIE = 5

/** Combien de jours après la CRÉATION DU COMPTE la garantie court.
 *  `artisans.cree_le` est la date de référence — elle existe depuis la
 *  migration 0001, donc aucune migration n'est nécessaire pour ce compteur. */
export const JOURS_GARANTIE = 60
