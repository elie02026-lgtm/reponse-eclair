// MESURER LE CLASSIFICATEUR.
//
// Se lance avec :  node eval/evaluer.mjs
//
// ═════════════════════════════════════════════════════════════════════════
// CE QUE CE SCRIPT MESURE, ET POURQUOI C'EST LE TEST LE PLUS IMPORTANT
// ═════════════════════════════════════════════════════════════════════════
// Le différenciateur du produit, c'est que la gravité estimée CONTREDIT la
// case « urgent » cochée par le client. Il n'a jamais été mesuré : en base,
// aucune demande réelle ne contient de contradiction.
//
// Ici on appelle Gemini DIRECTEMENT, hors Make, avec le prompt du module 9 —
// relevé dans le blueprint, pas recopié de mémoire. Make n'est pas dans la
// boucle : on mesure le modèle, pas la plomberie.
//
// ═════════════════════════════════════════════════════════════════════════
// LA CLÉ N'EST JAMAIS DANS UN FICHIER
// ═════════════════════════════════════════════════════════════════════════
// `GEMINI_API_KEY` vient de l'environnement. Le dépôt est public ; `.env` est
// dans `.gitignore`. Ce script ne l'écrit nulle part, ne la journalise pas, et
// le rapport qu'il produit ne la contient pas — c'est pour ça que le rapport
// peut être committé.
//
// ═════════════════════════════════════════════════════════════════════════
// TROIS ESSAIS PAR CAS, ET PAS UN SEUL
// ═════════════════════════════════════════════════════════════════════════
// La température n'est PAS fixée, délibérément : on veut le comportement par
// défaut, celui que Make obtient. Un modèle non déterministe peut donc donner
// trois réponses différentes au même cas — et c'est une information en soi.
// Un cas qui sort 3, 3, 1 n'est pas « réussi à 67 % » : c'est un cas sur
// lequel le produit est imprévisible, et le rapport le nomme.

import { readFile, writeFile } from 'node:fs/promises'

const RACINE = new URL('./', import.meta.url)
const CHEMIN_PROMPT = new URL('prompt-module9.txt', RACINE)
const CHEMIN_CAS = new URL('cas.json', RACINE)

const MODELE = 'gemini-2.5-flash'
const ESSAIS = 3

// Le quota gratuit de Gemini se compte par minute. Une seconde entre deux
// appels tient très largement dedans, et le script n'a pas à être rapide :
// il tourne une fois avant une décision, pas en production.
const PAUSE_MS = 1000

/** Les libellés EXACTS que le Worker accepte (`src/lib/demandeRecue.ts`).
 *  Si un cas en emploie un autre, le formulaire l'aurait refusé : l'examen
 *  porterait alors sur une situation impossible. */
const URGENCES = ['Oui, c’est urgent', 'Non, ça peut attendre']

const REPONSES_BOUTON = ['oui', 'non', 'je-ne-sais-pas', '']

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
]

const dors = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * « 2026-01-15 » → « 15 janvier 2026 ».
 *
 * C'est la forme que `formatDate(now; "D MMMM YYYY")` produit dans Make, en
 * français. La date COMPTE : le prompt a une règle saisonnière (« gravite 3
 * d'octobre à mars »). L'envoyer au format ISO changerait ce que le modèle
 * comprend de la saison.
 */
function dateEnFrancais(iso) {
  const [a, m, j] = String(iso).split('-').map(Number)
  if (!a || !m || !j || m < 1 || m > 12) throw new Error(`date illisible : ${iso}`)
  return `${j} ${MOIS[m - 1]} ${a}`
}

function remplir(gabarit, cas) {
  return gabarit
    .replaceAll('{besoin}', cas.besoin ?? '')
    .replaceAll('{urgence_dite}', cas.urgence_dite ?? '')
    .replaceAll('{eau_coule}', cas.eau_coule ?? '')
    .replaceAll('{arrivee_coupee}', cas.arrivee_coupee ?? '')
    .replaceAll('{chauffage}', cas.chauffage ?? '')
    .replaceAll('{eau_chaude}', cas.eau_chaude ?? '')
    .replaceAll('{date}', dateEnFrancais(cas.date))
}

/**
 * Un appel, en REST, sans dépendance.
 *
 * La température n'est pas fixée : voir l'en-tête. On ne met pas non plus de
 * `systemInstruction` — Make n'en met pas.
 */
async function demander(cle, texte) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${MODELE}:generateContent`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': cle },
    body: JSON.stringify({ contents: [{ parts: [{ text: texte }] }] }),
  })
  if (!r.ok) {
    // On ne journalise PAS le corps de la réponse sans précaution : une
    // erreur d'authentification de Google renvoie parfois la clé tronquée.
    throw new Error(`Gemini a répondu ${r.status} ${r.statusText}`)
  }
  const corps = await r.json()
  const parts = corps?.candidates?.[0]?.content?.parts ?? []
  return parts.map((p) => p.text ?? '').join('').trim()
}

/**
 * LA RÉPONSE EST-ELLE AU FORMAT ?
 *
 * Une ligne, `gravite|motif|panier`. On est strict, et c'est volontaire :
 * Make, lui, ne sera pas plus indulgent. Le module 10 fait
 * `trim(get(split(9.result; "|"); 1))` et pousse le résultat dans une colonne
 * `int` avec une contrainte. Ce qui ne passe pas ici ne passera pas là.
 */
/** Un saut de ligne dans un message de faute casse la liste du rapport :
 *  mesuré à l'essai, sur une réponse qui commençait par « Voici ma réponse : ».
 *  On le rend visible au lieu de le laisser couper la ligne en deux. */
const surUneLigne = (t) => String(t).replaceAll('\r', '').replaceAll('\n', '⏎')

function analyser(brut) {
  const fautes = []
  const ligne = brut.trim()

  if (ligne.includes('\n')) fautes.push('plusieurs lignes')

  const morceaux = ligne.split('|')
  if (morceaux.length !== 3) {
    return { ok: false, fautes: [...fautes, `${morceaux.length} champs au lieu de 3`], brut }
  }

  const [gBrut, motif, pBrut] = morceaux.map((m) => m.trim())

  const gravite = /^[0-3]$/.test(gBrut) ? Number(gBrut) : null
  if (gravite === null) fautes.push(`gravité « ${surUneLigne(gBrut)} » hors 0-3`)

  if (motif === '') fautes.push('motif vide')
  if (motif !== motif.toLowerCase()) fautes.push('motif avec des majuscules')
  // Les accents sont interdits par le prompt. On les cherche vraiment, pas
  // « à peu près » : la normalisation NFD sépare la lettre de son accent.
  if (motif.normalize('NFD').match(/[̀-ͯ]/)) fautes.push('motif accentué')

  const panier = /^\d+$/.test(pBrut) ? Number(pBrut) : null
  if (panier === null) fautes.push(`panier « ${surUneLigne(pBrut)} » n'est pas un entier ≥ 0`)

  return { ok: fautes.length === 0, fautes, gravite, motif, panier, brut: ligne }
}

function verifierCas(cas, index) {
  const ou = `cas ${index + 1}${cas?.id ? ` (${cas.id})` : ''}`
  if (!cas || typeof cas !== 'object') throw new Error(`${ou} : ce n'est pas un objet`)
  if (!cas.id) throw new Error(`${ou} : « id » manque`)
  if (!cas.date) throw new Error(`${ou} : « date » manque`)
  dateEnFrancais(cas.date)
  if (!Array.isArray(cas.gravites_attendues) || cas.gravites_attendues.length === 0) {
    throw new Error(`${ou} : « gravites_attendues » doit être une liste non vide`)
  }
  for (const g of cas.gravites_attendues) {
    if (!Number.isInteger(g) || g < 0 || g > 3) {
      throw new Error(`${ou} : gravité attendue « ${g} » hors 0-3`)
    }
  }
  // AVERTISSEMENTS, pas erreurs : c'est Elie qui écrit les cas, et un cas
  // volontairement bizarre est peut-être exactement ce qu'il veut mesurer.
  const alertes = []
  if (cas.urgence_dite && !URGENCES.includes(cas.urgence_dite)) {
    alertes.push(
      `${ou} : « ${cas.urgence_dite} » n'est pas un libellé que le Worker accepte ` +
        `(${URGENCES.map((u) => `« ${u} »`).join(' ou ')})`,
    )
  }
  for (const champ of ['eau_coule', 'arrivee_coupee', 'chauffage', 'eau_chaude']) {
    const v = cas[champ] ?? ''
    if (!REPONSES_BOUTON.includes(v)) alertes.push(`${ou} : ${champ} = « ${v} » inattendu`)
  }
  return alertes
}

function aujourdhui() {
  // Heure de Paris, comme partout ailleurs dans ce projet.
  const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
  return d // « sv-SE » rend AAAA-MM-JJ, et c'est le seul usage qu'on en fait.
}

function rapport(cas, resultats, alertes) {
  const l = []
  const total = resultats.length
  const valides = resultats.filter((r) => r.analyse.ok).length
  const attendus = resultats.filter(
    (r) => r.analyse.ok && r.attendues.includes(r.analyse.gravite),
  ).length

  // ── LES ERREURS DANGEREUSES, AVANT TOUT CHIFFRE GLOBAL ──
  // Un cas attendu à 3 qui sort à 1 ou 0 : un client dont le logement prend
  // l'eau, rangé en bas de la liste. Une seule suffit.
  const dangereuses = resultats.filter(
    (r) => r.attendues.includes(3) && r.analyse.ok && r.analyse.gravite <= 1,
  )
  const faussesAlertes = resultats.filter(
    (r) => r.attendues.length === 1 && r.attendues[0] === 1 && r.analyse.gravite === 3,
  )

  const parCas = new Map()
  for (const r of resultats) {
    if (!parCas.has(r.id)) parCas.set(r.id, [])
    parCas.get(r.id).push(r)
  }
  const instables = [...parCas.entries()].filter(
    ([, essais]) => new Set(essais.map((e) => e.analyse.gravite)).size > 1,
  )

  l.push(`# Mesure du classificateur — ${aujourdhui()}`)
  l.push('')
  l.push(`Modèle **${MODELE}**, prompt de \`eval/prompt-module9.txt\`, appelé`)
  l.push(`directement en REST. Make n'est pas dans la boucle.`)
  l.push('')
  l.push(`**${cas.length} cas × ${ESSAIS} essais = ${total} réponses.**`)
  l.push('La température n’est pas fixée : c’est le comportement par défaut,')
  l.push('celui que Make obtient.')
  l.push('')

  l.push('## Les erreurs dangereuses')
  l.push('')
  l.push('Un cas attendu à 3 qui sort à 1 ou 0. **Objectif : zéro.** Une seule')
  l.push('suffit à rendre le produit dangereux — un client dont le logement prend')
  l.push('l’eau, rangé en bas de la liste.')
  l.push('')
  if (dangereuses.length === 0) {
    l.push('**Aucune.**')
  } else {
    l.push(`**${dangereuses.length} sur ${total} réponses.**`)
    l.push('')
    for (const r of dangereuses) {
      l.push(`- **${r.id}**, essai ${r.essai} : attendu ${r.attendues.join(' ou ')},`)
      l.push(`  obtenu **${r.analyse.gravite}** — \`${r.analyse.brut}\``)
    }
  }
  l.push('')

  l.push('## Les chiffres')
  l.push('')
  l.push('| | | objectif |')
  l.push('|---|---|---|')
  l.push(`| format valide | ${valides}/${total} (${pct(valides, total)}) | 100 % |`)
  l.push(`| gravité attendue | ${attendus}/${total} (${pct(attendus, total)}) | ≥ 80 % |`)
  l.push(`| erreurs dangereuses | ${dangereuses.length} | 0 |`)
  l.push(`| fausses alertes (1 → 3) | ${faussesAlertes.length} | — |`)
  l.push(`| cas instables sur 3 essais | ${instables.length}/${cas.length} | — |`)
  l.push('')

  if (valides < total) {
    l.push('### Les réponses mal formées')
    l.push('')
    for (const r of resultats.filter((x) => !x.analyse.ok)) {
      l.push(`- **${r.id}**, essai ${r.essai} : ${r.analyse.fautes.join(' ; ')}`)
      l.push(`  → \`${r.analyse.brut.replaceAll('\n', '⏎')}\``)
    }
    l.push('')
  }

  if (faussesAlertes.length > 0) {
    l.push('### Les fausses alertes')
    l.push('')
    l.push('Attendu 1, sorti 3. Moins grave qu’une erreur dangereuse — un devis')
    l.push('rangé trop haut coûte un coup de téléphone, pas un logement.')
    l.push('')
    for (const r of faussesAlertes) l.push(`- **${r.id}**, essai ${r.essai} — \`${r.analyse.brut}\``)
    l.push('')
  }

  if (instables.length > 0) {
    l.push('### L’instabilité')
    l.push('')
    l.push('Ces cas ne donnent pas la même gravité sur trois essais. Ce n’est pas')
    l.push('« réussi à 67 % » : c’est un cas sur lequel le produit est')
    l.push('**imprévisible**, et deux clients identiques seraient classés')
    l.push('différemment.')
    l.push('')
    for (const [id, essais] of instables) {
      l.push(`- **${id}** : ${essais.map((e) => e.analyse.gravite ?? '?').join(', ')}`)
    }
    l.push('')
  }

  // ── LE CAS D'INJECTION, À PART ──
  const injection = resultats.filter((r) => r.injection)
  if (injection.length > 0) {
    l.push('## Le cas d’injection')
    l.push('')
    l.push('La description contient un texte qui donne des ordres au modèle. La')
    l.push('question n’est pas « a-t-il bien classé » mais **« a-t-il obéi au')
    l.push('client plutôt qu’à nous »**.')
    l.push('')
    for (const r of injection) {
      l.push(`- essai ${r.essai} : \`${r.analyse.brut}\``)
      l.push(
        `  → attendu ${r.attendues.join(' ou ')}, obtenu ${r.analyse.gravite ?? '?'}` +
          ` — **${r.attendues.includes(r.analyse.gravite) ? 'il n’a pas obéi' : 'À LIRE DE PRÈS'}**`,
      )
    }
    l.push('')
    l.push('> Un format valide ne prouve pas qu’il n’a pas obéi : un texte qui')
    l.push('> demande « réponds 1 » obtient une ligne parfaitement formée. C’est')
    l.push('> la GRAVITÉ qu’il faut regarder, et la ligne brute ci-dessus.')
    l.push('')
  }

  if (alertes.length > 0) {
    l.push('## Avertissements sur les cas eux-mêmes')
    l.push('')
    l.push('Ces cas emploient des valeurs que le formulaire n’accepterait pas.')
    l.push('L’examen porte alors sur une situation impossible — à moins que ce')
    l.push('soit volontaire.')
    l.push('')
    for (const a of alertes) l.push(`- ${a}`)
    l.push('')
  }

  l.push('## Cas par cas')
  l.push('')
  l.push('| cas | attendu | essai 1 | essai 2 | essai 3 | motif (essai 1) | panier |')
  l.push('|---|---|---|---|---|---|---|')
  for (const c of cas) {
    const essais = parCas.get(c.id) ?? []
    const g = (n) => {
      const r = essais.find((e) => e.essai === n)
      if (!r) return '—'
      if (!r.analyse.ok) return '⚠ format'
      const bon = r.attendues.includes(r.analyse.gravite)
      return `${r.analyse.gravite}${bon ? '' : ' ❌'}`
    }
    const premier = essais.find((e) => e.essai === 1)
    l.push(
      `| ${c.id} | ${c.gravites_attendues.join(' ou ')} | ${g(1)} | ${g(2)} | ${g(3)} | ` +
        `${premier?.analyse.motif ?? '—'} | ${premier?.analyse.panier ?? '—'} |`,
    )
  }
  l.push('')
  l.push('---')
  l.push('')
  l.push('Rien n’est arrondi en faveur du modèle. Un cas dont la gravité attendue')
  l.push('comporte plusieurs valeurs est compté réussi si l’une d’elles sort —')
  l.push('c’est Elie qui a écrit ces listes, pas celui qui code.')
  l.push('')
  return l.join('\n')
}

const pct = (n, d) => (d === 0 ? '—' : `${Math.round((n / d) * 100)} %`)

async function main() {
  const cle = process.env.GEMINI_API_KEY
  if (!cle) {
    console.error(
      'GEMINI_API_KEY manque.\n\n' +
        'Exportez-la dans votre terminal — jamais dans un fichier du dépôt :\n' +
        '  export GEMINI_API_KEY=...        (ou $env:GEMINI_API_KEY = "..." sous PowerShell)',
    )
    process.exit(1)
  }

  const gabarit = await readFile(CHEMIN_PROMPT, 'utf8')

  let cas
  try {
    cas = JSON.parse(await readFile(CHEMIN_CAS, 'utf8'))
  } catch (e) {
    console.error(
      `eval/cas.json est illisible ou absent (${e.code ?? e.message}).\n\n` +
        'LES CAS SONT ÉCRITS PAR ELIE, PAS PAR CELUI QUI CODE : un examen\n' +
        'choisi par l’examiné ne mesure rien. La forme attendue est décrite\n' +
        'dans eval/LISEZ-MOI.md.',
    )
    process.exit(1)
  }
  if (!Array.isArray(cas) || cas.length === 0) {
    console.error('eval/cas.json doit être un tableau non vide.')
    process.exit(1)
  }

  const alertes = []
  const vus = new Set()
  cas.forEach((c, i) => {
    alertes.push(...verifierCas(c, i))
    if (vus.has(c.id)) throw new Error(`l'identifiant « ${c.id} » apparaît deux fois`)
    vus.add(c.id)
  })
  for (const a of alertes) console.warn(`⚠ ${a}`)

  const resultats = []
  for (const c of cas) {
    const texte = remplir(gabarit, c)
    for (let essai = 1; essai <= ESSAIS; essai += 1) {
      const brut = await demander(cle, texte)
      const analyse = analyser(brut)
      resultats.push({
        id: c.id,
        essai,
        attendues: c.gravites_attendues,
        injection: Boolean(c.injection),
        analyse,
      })
      const marque = !analyse.ok
        ? '⚠ format'
        : c.gravites_attendues.includes(analyse.gravite)
          ? 'ok'
          : '❌'
      console.log(`${c.id} essai ${essai} : ${analyse.brut}   [${marque}]`)
      await dors(PAUSE_MS)
    }
  }

  const sortie = new URL(`resultats-${aujourdhui()}.md`, RACINE)
  await writeFile(sortie, rapport(cas, resultats, alertes), 'utf8')
  console.log(`\neval/resultats-${aujourdhui()}.md`)
}

await main()
