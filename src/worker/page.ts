// LA PAGE QUE L'ARTISAN TOUCHE DEPUIS SON COURRIER.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE N'EST PAS UNE PAGE REACT
// ─────────────────────────────────────────────────────────────────────────
// L'application pèse plus de cinq cents kilo-octets de JavaScript. Les
// charger pour afficher UN bouton, à un artisan qui est dans une cave, sur
// un réseau de chantier, entre deux interventions — c'est le faire attendre
// pour rien.
//
// Ces pages font deux kilo-octets, tout compris, et ne contiennent AUCUN
// JavaScript : le bouton est un `<form method="post">`, c'est-à-dire du HTML
// de 1995. Il marche sur tous les téléphones, y compris ceux dont le
// navigateur a dix ans, et même si le JavaScript est coupé.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI DEUX ÉCRANS, ET PAS UN SEUL CLIC
// ─────────────────────────────────────────────────────────────────────────
// Microsoft Defender « Safe Links », plusieurs antivirus et des passerelles
// de messagerie OUVRENT les liens à la livraison, avant que l'humain ne les
// voie. Si le lien agissait sur un simple GET, une demande passerait en
// « rappelé » sans que l'artisan ait appelé, et disparaîtrait de son écran.
// Une panne silencieuse, exactement ce que la RÈGLE D'OR du projet interdit.
//
// Un robot suit les liens ; il ne remplit pas les formulaires. Le GET ne
// fait donc qu'afficher, et seul le POST agit.
//
// ─────────────────────────────────────────────────────────────────────────
// CE QUE CES PAGES NE DISENT JAMAIS
// ─────────────────────────────────────────────────────────────────────────
// Rien de la demande. Ni nom, ni numéro, ni commune, ni description, ni même
// si elle existe. Le lien autorise UNE écriture ; il n'ouvre aucune lecture.

import { LIBELLE_OPERATION, estOperationPromesse } from '../lib/action.ts'
import type { Operation, Reponse } from '../lib/action.ts'
import { DELAI_PAR_OPERATION, texteSms } from '../lib/promesse.ts'
import type { Envoi } from '../lib/promesse.ts'

/**
 * Échappement HTML.
 *
 * Les trois valeurs insérées ici sont déjà validées — chiffres, hexadécimal
 * minuscule, liste blanche — donc rien d'hostile ne peut arriver jusqu'au
 * gabarit. On échappe quand même : le jour où quelqu'un ajoutera un champ
 * sans y penser, la protection sera déjà là. Une sécurité qui dépend de la
 * mémoire de celui qui modifie le fichier n'en est pas une.
 */
function h(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Le même habillage pour les deux écrans. Tout est en ligne : aucune
 *  feuille de style, aucune police, aucune image à aller chercher. */
function document(titre: string, corps: string): string {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${h(titre)} — Réponse Éclair</title>
<style>
  :root { color-scheme: light; }
  body {
    margin: 0; padding: 24px 16px;
    background: #f8fafc; color: #0f172a;
    font: 17px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 32rem; margin: 0 auto; }
  .marque { font-size: 13px; font-weight: 600; letter-spacing: .06em;
            text-transform: uppercase; color: #64748b; }
  h1 { font-size: 26px; line-height: 1.25; margin: 8px 0 12px; }
  p { color: #475569; margin: 0 0 16px; }
  /* 60 px de haut : on vise le pouce d'un homme de cinquante-cinq ans,
     debout, avec des gants ou les mains sales. */
  button {
    display: block; width: 100%; min-height: 60px;
    padding: 16px 20px; margin-top: 8px;
    font: inherit; font-weight: 600; color: #fff;
    background: #0f172a; border: 0; border-radius: 12px; cursor: pointer;
  }
  button:active { background: #334155; }
  /* Le bouton d'envoi est un VRAI lien : il ouvre la messagerie, ce qu'un
     formulaire ne sait pas faire. Vert, pour qu'on ne le confonde pas avec
     le bouton sombre qui vient d'être touché. */
  a.bouton {
    display: block; min-height: 60px; box-sizing: border-box;
    padding: 18px 20px; margin-top: 8px;
    font-weight: 600; color: #fff; text-decoration: none; text-align: center;
    background: #15803d; border-radius: 12px;
  }
  .apercu {
    background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
    padding: 12px 14px; color: #0f172a;
  }
  .ok { color: #166534; }
  .non { color: #9a3412; }
  .pied { margin-top: 28px; font-size: 14px; }
  .pied a { color: #64748b; }
</style>
</head>
<body><main>
<div class="marque">Réponse Éclair</div>
${corps}
</main></body>
</html>`
}

/**
 * Premier écran : un bouton, et rien d'autre.
 *
 * Les trois valeurs repartent en champs cachés. On ne les relit pas depuis
 * l'URL au moment du POST : le navigateur les renvoie, et c'est le serveur
 * qui les revalidera de toute façon.
 */
export function pageConfirmation(
  chemin: string,
  id: number,
  jeton: string,
  operation: Operation,
): string {
  const libelle = LIBELLE_OPERATION[operation]

  // L'APERÇU DU MESSAGE, SANS RIEN LIRE EN BASE.
  //
  // La RÈGLE D'OR du projet veut que l'artisan voie le délai qu'il annonce
  // AVANT de s'engager. Il le voit donc ici, dans la phrase exacte que son
  // client recevra — à un détail près : le nom de l'entreprise est remplacé
  // par un repère.
  //
  // Ce n'est pas de la pudeur, c'est la raison d'être de cet écran. Les
  // antivirus de messagerie OUVRENT les liens à la livraison : tout ce que
  // cette page afficherait, un service tiers le lirait avant l'artisan.
  // Elle ne reçoit donc aucune donnée, et c'est le POST qui en obtient.
  const apercu = estOperationPromesse(operation)
    ? `<p class="apercu">${h(texteSms('[votre entreprise]', DELAI_PAR_OPERATION[operation]))}</p>`
    : ''

  return document(
    libelle,
    `<h1>${h(libelle)}</h1>
${apercu}
<p>Touchez le bouton pour confirmer. Rien n’a encore été enregistré.</p>
<form method="post" action="${h(chemin)}">
  <input type="hidden" name="d" value="${h(String(id))}">
  <input type="hidden" name="j" value="${h(jeton)}">
  <input type="hidden" name="op" value="${h(operation)}">
  <button type="submit">${h(libelle)}</button>
</form>`,
  )
}

/** Second écran : ce qui s'est passé, en une phrase. */
export function pageResultat(reponse: Reponse): string {
  return document(
    reponse.titre,
    `<h1 class="${reponse.bon ? 'ok' : 'non'}">${h(reponse.titre)}</h1>
<p>${h(reponse.detail)}</p>
<p class="pied"><a href="/">Ouvrir mon écran</a></p>`,
  )
}

/**
 * LA PAGE QUI DEMANDE LE DERNIER GESTE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI C'EST L'ARTISAN QUI ENVOIE, ET PAS LE SERVEUR
 * ─────────────────────────────────────────────────────────────────────────
 * Aucun numéro d'envoi n'a été acheté : aujourd'hui, le logiciel n'a
 * matériellement aucun moyen d'écrire à un client. Mais ce n'est pas la
 * seule raison, et peut-être pas la bonne :
 *
 *   • le message part de SON numéro, donc le client peut RÉPONDRE ;
 *   • son doigt sur « Envoyer » EST l'engagement, ce que la RÈGLE D'OR
 *     demande ;
 *   • ça ne coûte rien et ne dépend d'aucun service tiers.
 *
 * Ce qu'il en coûte : un toucher de plus. Et la page doit donc dire très
 * clairement que RIEN N'EST ENCORE PARTI — sans quoi l'artisan referme son
 * téléphone en croyant son client prévenu. C'est exactement la panne muette
 * que ce projet s'interdit.
 */
export function pageResultatPromesse(reponse: Reponse, envoi: Envoi | null): string {
  // Échec, ou numéro introuvable côté base : on retombe sur l'écran commun,
  // qui dit ce qui s'est passé sans rien révéler.
  if (!reponse.bon || envoi === null) return pageResultat(reponse)

  const titre = envoi.deja ? 'Vous venez de le dire.' : 'C’est noté.'
  const invite = envoi.deja
    ? 'Si le message n’est pas parti, vous pouvez le renvoyer.'
    : 'Il reste à le lui envoyer. Touchez le bouton : votre messagerie s’ouvre, le texte est déjà écrit.'

  // La voie de repli, quand le numéro du client n'est pas lisible. Même
  // principe que le bouton « Composer » des Réglages : on n'affiche jamais
  // un bouton qui ne marcherait pas, on donne de quoi faire à la main.
  const geste =
    envoi.lien === null
      ? `<p>Nous n’avons pas pu lire son numéro. Le voici tel qu’il nous est arrivé :
<strong>${h(envoi.numero)}</strong></p>`
      : `<a class="bouton" href="${h(envoi.lien)}">Envoyer à mon client</a>
<p class="pied">Le message partira de votre numéro, et votre client pourra vous répondre.</p>`

  return document(
    titre,
    `<h1 class="ok">${h(titre)}</h1>
<p>${h(invite)}</p>
<p class="apercu">${h(envoi.texte)}</p>
${geste}
<p class="pied"><a href="/">Ouvrir mon écran</a></p>`,
  )
}

/** Quand l'URL elle-même ne tient pas debout : un identifiant qui n'est pas
 *  un nombre, un jeton qui n'est pas une empreinte. On ne dérange pas la
 *  base pour ça, et on dit la même chose que pour un lien refusé. */
export function pageLienIllisible(): string {
  return document(
    'Ce lien n’est plus valable',
    `<h1 class="non">Ce lien n’est plus valable.</h1>
<p>Il a peut-être été recopié de travers. Ouvrez votre écran pour agir.</p>
<p class="pied"><a href="/">Ouvrir mon écran</a></p>`,
  )
}
