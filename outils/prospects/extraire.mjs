// LA LISTE DE PROSPECTION ÎLE-DE-FRANCE.
//
// Se lance avec :  node outils/prospects/extraire.mjs
//
// ═════════════════════════════════════════════════════════════════════════
// CE QUE CE SCRIPT ÉCRIT, ET POURQUOI ÇA NE DOIT PAS PARTIR SUR GITHUB
// ═════════════════════════════════════════════════════════════════════════
// Le fichier de sortie contient des NOMS DE DIRIGEANTS — des personnes
// physiques, nommées. Le dépôt est public. `outils/prospects/sortie/` est
// donc dans `.gitignore`, ajouté AVANT le premier lancement et vérifié avec
// `git check-ignore`.
//
// Ce script ne garde JAMAIS l'année de naissance, que l'annuaire rend
// pourtant pour chaque dirigeant. Elle n'aide à rien pour appeler un
// plombier, et c'est une donnée personnelle de plus à protéger. La règle la
// plus simple pour ne pas laisser fuiter une donnée, c'est de ne pas
// l'écrire.
//
// ═════════════════════════════════════════════════════════════════════════
// LA SOURCE
// ═════════════════════════════════════════════════════════════════════════
// API Recherche d'entreprises (Etalab / DINUM), ouverte, sans clé.
// Elle agrège le répertoire Sirene de l'INSEE.
//
// LIMITE DE DÉBIT DOCUMENTÉE, relevée le 7 octobre 2026 sur la fiche
// officielle data.gouv.fr de l'API :
//
//   « 7 appels / seconde. L'administration s'autorise à baisser cette
//     limite en cas de surcharge des serveurs »
//
// On tourne donc à QUATRE appels par seconde — 250 ms entre deux requêtes.
// Pas par prudence de principe : la phrase dit que la limite peut baisser
// sans préavis, donc viser 7 revient à viser le plafond d'un plafond mobile.
// Un 429 est quand même traité, avec attente croissante, parce qu'une limite
// annoncée et une limite appliquée ne sont pas toujours la même chose.

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const RACINE = 'https://recherche-entreprises.api.gouv.fr/search'

// ─────────────────────────────────────────────────────────────────────────
// LE FILTRE
// ─────────────────────────────────────────────────────────────────────────
// 43.22A — installation d'eau et de gaz en tous locaux
// 43.22B — installation d'équipements thermiques et de climatisation
//
// Les deux, parce que la cible est « plomberie-chauffage » : beaucoup
// d'entreprises sont déclarées sous l'un et font les deux. Un dédoublonnage
// par SIREN rattrape celles qui sortent deux fois.
const NAF = ['43.22A', '43.22B']

// Paris, Hauts-de-Seine, Seine-Saint-Denis, Val-de-Marne.
//
// ⚠ CE FILTRE PORTE SUR LES ÉTABLISSEMENTS, PAS SUR LE SIÈGE. Une entreprise
// dont la direction est à Lyon mais qui a une agence à Paris sort ici. Voir
// `profil()`, qui le marque ligne par ligne.
const DEPARTEMENTS = ['75', '92', '93', '94']
const ZONE = new Set(DEPARTEMENTS)

// Tranches INSEE : 03 = 6 à 9 salariés, 11 = 10 à 19 salariés.
//
// À NOTER, parce que ça ne correspond pas tout à fait à la cible annoncée :
// la cible commerciale est « 5 à 20 salariés », et ces deux tranches
// couvrent 6 à 19. Une entreprise de 5 salariés est en tranche 02 (3 à 5),
// une de 20 en tranche 12 (20 à 49). Le filtre est donc légèrement plus
// étroit que la cible — c'est le découpage de l'INSEE qui l'impose, pas un
// choix.
const TRANCHES = '03,11'

const PAR_PAGE = 25
const PAUSE_MS = 250

// Garde-fou : l'API ne documente pas sa profondeur de pagination, et une
// boucle qui s'emballe sur une API publique gratuite est une faute. Si on
// atteint ce nombre, le script le DIT au lieu de s'arrêter en silence.
const PAGES_MAX = 60

const SORTIE = 'outils/prospects/sortie/prospects_idf.csv'

const dors = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Une page, avec reprise sur 429 et sur panne passagère.
 *
 * On ne relance PAS indéfiniment : trois essais, puis on laisse l'erreur
 * remonter. Un script de prospection qui tourne en boucle contre une API
 * publique est exactement ce qu'il ne faut pas écrire.
 */
async function page(naf, departement, numero) {
  const url = new URL(RACINE)
  url.searchParams.set('activite_principale', naf)
  url.searchParams.set('departement', departement)
  url.searchParams.set('tranche_effectif_salarie', TRANCHES)
  url.searchParams.set('etat_administratif', 'A')
  url.searchParams.set('per_page', String(PAR_PAGE))
  url.searchParams.set('page', String(numero))

  for (let essai = 1; essai <= 3; essai += 1) {
    const r = await fetch(url, { headers: { accept: 'application/json' } })
    if (r.ok) return r.json()

    // 429 : on a touché la limite. 5xx : l'API a hoqueté.
    if (r.status === 429 || r.status >= 500) {
      const attente = 1000 * essai * essai
      console.warn(`  ${r.status} — nouvelle tentative dans ${attente} ms (essai ${essai}/3)`)
      await dors(attente)
      continue
    }
    throw new Error(`${r.status} sur ${url.pathname}${url.search}`)
  }
  throw new Error(`trois échecs de suite sur ${naf} / ${departement} / page ${numero}`)
}

/** Le premier dirigeant qui est une personne physique, sans son âge. */
function contact(entreprise) {
  const liste = Array.isArray(entreprise.dirigeants) ? entreprise.dirigeants : []
  const humain = liste.find(
    (d) => d.type_dirigeant === 'personne physique' || (d.nom && d.prenoms),
  )
  if (!humain) return { nom: '', qualite: '' }

  // `annee_de_naissance` et `date_de_naissance` existent dans la réponse.
  // On ne les lit pas. Ce n'est pas un oubli : voir l'en-tête du fichier.
  const prenom = (humain.prenoms ?? '').trim().split(/\s+/)[0] ?? ''
  const nom = (humain.nom ?? '').trim()
  return {
    nom: [prenom, nom].filter(Boolean).join(' '),
    qualite: (humain.qualite ?? '').trim(),
  }
}

/**
 * « réseau ? » et « RGE ».
 *
 * Plus de trois établissements ouverts, c'est très souvent un réseau de
 * dépannage — pas un patron qui prend ses appels entre deux chantiers, donc
 * pas la cible. On ne les SUPPRIME pas : on les marque, et Elie décide.
 */
function profil(e) {
  const marques = []
  if ((e.nombre_etablissements_ouverts ?? 0) > 3) marques.push('réseau ?')

  // ─── « siège hors zone » : UNE DÉCOUVERTE DU PREMIER LANCEMENT ───
  //
  // Le filtre `departement` de l'API porte sur les ÉTABLISSEMENTS, pas sur
  // le siège. Au premier essai, la liste contenait des sièges en 69, 83, 77
  // et 95 : des entreprises qui ont une agence à Paris et leur direction
  // ailleurs. Mesuré : 175 des 852 lignes.
  //
  // Ce n'est pas une erreur de l'API, c'est une erreur de lecture possible —
  // et la colonne « Ville » afficherait alors une ville où personne ne
  // décroche le téléphone qu'on veut appeler. On ne les retire pas (une
  // agence à Montreuil avec un patron à Bordeaux reste peut-être un
  // prospect), on le DIT.
  //
  // C'est aussi le meilleur indice de réseau qu'on ait : une direction hors
  // Île-de-France avec une agence à Paris, ce n'est pas le patron de
  // cinquante-cinq ans qui prend ses appels entre deux chantiers.
  const dep = (e.siege?.code_postal ?? '').slice(0, 2)
  if (!ZONE.has(dep)) marques.push(dep ? `siège hors zone (${dep})` : 'siège inconnu')

  if (e.complements?.est_rge) marques.push('RGE')
  return marques.join(' + ')
}

const COLONNES = [
  'Prio',
  'Entreprise',
  'Ville',
  'Code postal',
  'Contact',
  'Qualité',
  'Téléphone',
  'Email / site',
  'Profil',
  'Statut',
  'Notes',
  'SIREN',
  'Adresse',
  'NAF',
  'Tranche effectif',
  'Établissements ouverts',
  'RGE',
]

/**
 * Une cellule de CSV.
 *
 * SÉPARATEUR POINT-VIRGULE, et pas virgule. Un Excel en français lit un
 * fichier à virgules comme UNE SEULE colonne, et la liste arriverait
 * illisible. Le point-virgule est la convention fr-FR.
 *
 * On échappe quand même les guillemets et les sauts de ligne : une raison
 * sociale contient parfois une virgule, un guillemet, ou « & ».
 */
function cellule(valeur) {
  const texte = String(valeur ?? '')
  if (/[";\n\r]/.test(texte)) return `"${texte.replaceAll('"', '""')}"`
  return texte
}

function ligne(e) {
  const c = contact(e)
  return [
    '', // Prio — à remplir à la main
    e.nom_complet ?? e.nom_raison_sociale ?? '',
    e.siege?.libelle_commune ?? '',
    e.siege?.code_postal ?? '',
    c.nom,
    c.qualite,
    '', // Téléphone — l'annuaire ne le donne pas
    '', // Email / site — idem
    profil(e),
    'À contacter',
    '', // Notes
    e.siren ?? '',
    e.siege?.adresse ?? '',
    e.activite_principale ?? '',
    e.tranche_effectif_salarie ?? '',
    e.nombre_etablissements_ouverts ?? '',
    e.complements?.est_rge ? 'oui' : '',
  ]
    .map(cellule)
    .join(';')
}

async function main() {
  /** Dédoublonnage par SIREN. Une entreprise peut sortir sur 43.22A ET sur
   *  43.22B ; c'est le SIREN qui dit qu'il s'agit de la même. */
  const parSiren = new Map()
  let appels = 0
  let tronque = false

  for (const naf of NAF) {
    for (const dep of DEPARTEMENTS) {
      let numero = 1
      let total = null
      for (;;) {
        const reponse = await page(naf, dep, numero)
        appels += 1
        if (total === null) {
          total = reponse.total_results ?? 0
          console.log(`${naf} · dép. ${dep} : ${total} résultats`)
        }
        for (const e of reponse.results ?? []) {
          if (e.siren && !parSiren.has(e.siren)) parSiren.set(e.siren, e)
        }
        const pages = reponse.total_pages ?? 1
        if (numero >= pages || (reponse.results ?? []).length === 0) break
        if (numero >= PAGES_MAX) {
          console.warn(`  ⚠ arrêt à la page ${PAGES_MAX} : LISTE TRONQUÉE pour ${naf}/${dep}`)
          tronque = true
          break
        }
        numero += 1
        await dors(PAUSE_MS)
      }
      await dors(PAUSE_MS)
    }
  }

  const tout = [...parSiren.values()].sort((a, b) =>
    (a.siege?.code_postal ?? '').localeCompare(b.siege?.code_postal ?? ''),
  )

  // UTF-8 AVEC BOM. Sans lui, Excel sous Windows lit le fichier en ANSI et
  // « Boulogne-Billancourt » devient « Boulogne-Billancourt » avec des
  // caractères de travers. Trois octets qui évitent une liste illisible.
  const csv = '﻿' + [COLONNES.join(';'), ...tout.map(ligne)].join('\r\n') + '\r\n'
  await mkdir(dirname(SORTIE), { recursive: true })
  await writeFile(SORTIE, csv, 'utf8')

  // ── Le compte rendu ──
  const parDep = new Map()
  const parTranche = new Map()
  let reseaux = 0
  let avecContact = 0
  let rge = 0
  let dansLaZone = 0
  for (const e of tout) {
    const dep = (e.siege?.code_postal ?? '').slice(0, 2)
    if (ZONE.has(dep)) dansLaZone += 1
    parDep.set(dep, (parDep.get(dep) ?? 0) + 1)
    const t = e.tranche_effectif_salarie ?? '?'
    parTranche.set(t, (parTranche.get(t) ?? 0) + 1)
    if ((e.nombre_etablissements_ouverts ?? 0) > 3) reseaux += 1
    if (e.complements?.est_rge) rge += 1
    if (contact(e).nom) avecContact += 1
  }

  console.log(`\n${SORTIE}`)
  console.log(`${appels} appels à l'API, ${tout.length} entreprises après dédoublonnage`)
  console.log(`par département : ${[...parDep].sort().map(([d, n]) => `${d}=${n}`).join('  ')}`)
  console.log(`par tranche     : ${[...parTranche].sort().map(([t, n]) => `${t}=${n}`).join('  ')}`)
  console.log(`siège DANS la zone 75/92/93/94 : ${dansLaZone} / ${tout.length}`)
  console.log(`« réseau ? »    : ${reseaux}`)
  console.log(`RGE             : ${rge}`)
  console.log(`avec un nom de dirigeant : ${avecContact} / ${tout.length}`)
  if (tronque) console.log('\n⚠ AU MOINS UNE LISTE EST TRONQUÉE — voir les avertissements ci-dessus.')
}

await main()
