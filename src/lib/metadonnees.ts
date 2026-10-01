// LE TITRE ET LA DESCRIPTION DE CHAQUE PAGE PUBLIQUE.
//
// Jusqu'au 1ᵉʳ octobre 2026, les sept pages s'appelaient toutes « Réponse
// Éclair » et partageaient une seule description. Conséquences concrètes :
// dans les favoris et l'historique d'un prospect, quatre lignes identiques ;
// dans un résultat de recherche, une page de vente qui ne dit pas qu'elle
// vend ; et dans un onglet, aucun moyen de savoir où l'on est.
//
// ─────────────────────────────────────────────────────────────────────────
// CE QUE CE FICHIER FAIT, ET CE QU'IL NE FAIT PAS — À LIRE AVANT D'Y CROIRE
// ─────────────────────────────────────────────────────────────────────────
// Les balises sont posées PAR LE NAVIGATEUR, au chargement de la page. Donc :
//
//   ✅ l'onglet, les favoris, l'historique, l'impression  → corrects
//   ✅ Google                                             → correct, il
//      exécute le JavaScript avant d'indexer
//   ❌ l'aperçu d'un lien dans WhatsApp, SMS, LinkedIn, Facebook, Slack
//      → PAS corrects. Ces robots-là lisent le HTML brut et n'exécutent
//        aucun JavaScript. Ils verront le `<title>` d'`index.html`, le même
//        pour toutes les pages.
//
// C'est une vraie limite, et elle compte : si Elie envoie `/offre` par SMS à
// un plombier, l'aperçu affichera le titre générique. La corriger demande que
// le Worker serve lui-même les pages et y injecte les balises — c'est-à-dire
// mettre le Worker sur le chemin de TOUT le site, alors qu'il en est
// délibérément tenu à l'écart (`run_worker_first: ["/api/*"]`). Une panne du
// Worker rendrait alors le site entier inaccessible. C'est un arbitrage à
// prendre en connaissance de cause, pas un oubli.

/** L'adresse du site. À changer le jour du vrai domaine — c'est le seul
 *  endroit où elle est écrite pour les balises. */
export const SITE = 'https://reponse-eclair.elie02026.workers.dev'

export type Meta = {
  /** Le titre de l'onglet. Court : au-delà d'environ 60 caractères, Google
   *  le coupe au milieu d'un mot. */
  titre: string
  /** Deux lignes dans un résultat de recherche. Au-delà d'environ 160
   *  caractères, coupées aussi. */
  description: string
}

/**
 * Une page par chemin. Les chemins sont ceux de `main.tsx` — le test vérifie
 * qu'aucun des deux n'a pris de l'avance sur l'autre.
 *
 * Les titres NE RÉPÈTENT PAS « Réponse Éclair » : le suffixe est ajouté par
 * `titreComplet()`, pour qu'on n'ait pas à y penser à chaque ligne et qu'il
 * soit impossible de l'oublier sur une page.
 */
export const PAGES: Record<string, Meta> = {
  '/offre': {
    titre: 'Vos clients cochent tous « urgent »',
    description:
      'Pour les entreprises de plomberie-chauffage : vos demandes classées par gravité réelle, lue dans ce que le client écrit, jamais par heure d’arrivée.',
  },
  '/demo': {
    titre: 'La démonstration, sur un vrai écran',
    description:
      'Quatre demandes, toutes marquées urgentes par le client. Voyez dans quel ordre il faut vraiment rappeler — et pourquoi ce n’est pas l’ordre d’arrivée.',
  },
  '/cgv': {
    titre: 'Conditions générales de vente',
    description:
      'Prix, garantie, durée, résiliation, rétractation et responsabilité. Ce que le service fait, et ce qu’il ne fait pas.',
  },
  '/confidentialite': {
    titre: 'Mentions légales et données personnelles',
    description:
      'Qui édite le service, quelles données sont collectées, pour combien de temps, et comment les faire effacer.',
  },
  '/sous-traitance': {
    titre: 'Sous-traitance et RGPD',
    description:
      'Les sous-traitants employés pour traiter les demandes, ce que chacun reçoit, et où les données sont hébergées.',
  },
  '/formulaire': {
    titre: 'Décrivez votre problème',
    description:
      'Votre artisan est sur un chantier. Décrivez votre problème ici : les urgences réelles passent en premier.',
  },
  '/desinscription': {
    titre: 'Ne plus recevoir de messages',
    description: 'Se désinscrire des messages de rappel en une fois, sans compte.',
  },
}

/** Ce qu'on affiche quand le chemin n'est pas une page publique : c'est
 *  l'application de l'artisan, qui n'a aucune raison d'être référencée. */
export const PAR_DEFAUT: Meta = {
  titre: 'Vos demandes',
  description: 'L’écran de votre entreprise : vos demandes, classées par gravité réelle.',
}

export const NOM_SITE = 'Réponse Éclair'

export function metaDe(chemin: string): Meta {
  return PAGES[chemin] ?? PAR_DEFAUT
}

/** « Titre — Réponse Éclair ». Le nom du site vient en DERNIER : dans un
 *  onglet rétréci, c'est le début qu'on lit, et sept onglets qui commencent
 *  tous par « Réponse Éclair » sont sept onglets indiscernables. */
export function titreComplet(meta: Meta): string {
  return `${meta.titre} — ${NOM_SITE}`
}

/**
 * Pose les balises sur le document. Seule fonction impure du fichier, et
 * elle ne contient aucune décision : tout ce qui se décide est au-dessus,
 * et se teste.
 */
export function appliquer(document: Document, chemin: string, site = SITE): void {
  const meta = metaDe(chemin)
  const titre = titreComplet(meta)

  document.title = titre

  poser(document, 'name', 'description', meta.description)
  poser(document, 'property', 'og:title', titre)
  poser(document, 'property', 'og:description', meta.description)
  poser(document, 'property', 'og:type', 'website')
  poser(document, 'property', 'og:url', site + chemin)
  poser(document, 'property', 'og:site_name', NOM_SITE)
  poser(document, 'property', 'og:locale', 'fr_FR')
  // `summary` et non `summary_large_image` : il n'y a pas d'image. Annoncer
  // une grande image qu'on ne fournit pas donne une carte vide.
  poser(document, 'name', 'twitter:card', 'summary')
}

/** Met à jour la balise si elle existe, la crée sinon. `index.html` porte
 *  déjà une `description` : on l'écrase, on n'en ajoute pas une seconde —
 *  deux descriptions valent moins que zéro. */
function poser(document: Document, cle: 'name' | 'property', nom: string, valeur: string): void {
  const selecteur = `meta[${cle}="${nom}"]`
  let balise = document.head.querySelector<HTMLMetaElement>(selecteur)
  if (!balise) {
    balise = document.createElement('meta')
    balise.setAttribute(cle, nom)
    document.head.appendChild(balise)
  }
  balise.setAttribute('content', valeur)
}
