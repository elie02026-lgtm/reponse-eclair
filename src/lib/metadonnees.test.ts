import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PAGES, PAR_DEFAUT, NOM_SITE, SITE, metaDe, titreComplet } from './metadonnees.ts'

// Se lance avec :  node --test
//
// `appliquer()` n'est pas testée ici : elle touche le DOM, que `node --test`
// n'a pas, et elle ne contient aucune décision — tout ce qui se décide est
// dans les constantes et les deux fonctions pures ci-dessous. C'est
// exactement pour ça qu'elle a été écrite si vide.

const TOUTES = [...Object.values(PAGES), PAR_DEFAUT]

test('chaque page publique a un titre et une description', () => {
  for (const [chemin, meta] of Object.entries(PAGES)) {
    assert.ok(meta.titre.trim().length > 0, `${chemin} sans titre`)
    assert.ok(meta.description.trim().length > 0, `${chemin} sans description`)
  }
})

test('AUCUN TITRE N’EST RÉPÉTÉ — c’était tout le problème', () => {
  // Avant le 1er octobre 2026, les sept pages s'appelaient « Réponse
  // Éclair ». Dans les favoris d'un prospect, ça fait sept lignes
  // identiques ; dans un onglet, aucun moyen de savoir où l'on est.
  const titres = TOUTES.map((m) => m.titre)
  assert.equal(new Set(titres).size, titres.length, `doublon parmi : ${titres.join(' | ')}`)
})

test('aucune description n’est répétée non plus', () => {
  const descriptions = TOUTES.map((m) => m.description)
  assert.equal(new Set(descriptions).size, descriptions.length)
})

test('les titres tiennent dans ce que Google affiche', () => {
  // Environ 60 caractères, suffixe compris. Au-delà, Google coupe — souvent
  // au milieu d'un mot, et c'est le titre qu'un prospect lit en premier.
  for (const meta of TOUTES) {
    const complet = titreComplet(meta)
    assert.ok(complet.length <= 60, `${complet.length} caractères : ${complet}`)
  }
})

test('les descriptions tiennent dans ce que Google affiche', () => {
  for (const meta of TOUTES) {
    assert.ok(
      meta.description.length <= 160,
      `${meta.description.length} caractères : ${meta.description}`,
    )
  }
})

test('le nom du site vient en DERNIER dans le titre', () => {
  // Dans un onglet rétréci, c'est le début du titre qu'on lit. Sept onglets
  // commençant tous par « Réponse Éclair » seraient sept onglets
  // indiscernables — le problème qu'on vient de corriger.
  const complet = titreComplet(PAGES['/offre']!)
  assert.ok(complet.endsWith(NOM_SITE), complet)
  assert.ok(!complet.startsWith(NOM_SITE), complet)
})

test('aucun titre ne répète déjà le nom du site', () => {
  // Sinon `titreComplet` produirait « Réponse Éclair — Réponse Éclair ».
  for (const meta of TOUTES) {
    assert.ok(!meta.titre.includes(NOM_SITE), meta.titre)
  }
})

test('un chemin inconnu retombe sur l’application, pas sur une page vide', () => {
  assert.deepEqual(metaDe('/reglages'), PAR_DEFAUT)
  assert.deepEqual(metaDe('/'), PAR_DEFAUT)
  assert.deepEqual(metaDe('/n-importe-quoi'), PAR_DEFAUT)
})

test('les cinq pages que le cahier nomme sont bien là', () => {
  // Phase 3.8, mot pour mot : « /offre, /demo, /cgv, /confidentialite,
  // /sous-traitance ». Les deux autres — /formulaire et /desinscription —
  // sont en plus, parce qu'un client les voit aussi.
  for (const chemin of ['/offre', '/demo', '/cgv', '/confidentialite', '/sous-traitance']) {
    assert.ok(chemin in PAGES, `page manquante : ${chemin}`)
  }
})

test('l’adresse du site n’a pas de barre oblique finale', () => {
  // `SITE + chemin` produirait sinon `…workers.dev//offre`, que les robots
  // traitent comme une autre page.
  assert.ok(!SITE.endsWith('/'), SITE)
  assert.ok(SITE.startsWith('https://'), SITE)
})

// ─────────────────────────────────────────────────────────────────────────
// LE TEST QUI RELIE CE FICHIER À main.tsx
// ─────────────────────────────────────────────────────────────────────────
// `main.tsx` est du JSX : `node --test` ne peut pas l'importer. On le lit
// donc COMME UN TEXTE et on en extrait les chemins déclarés. C'est inhabituel,
// et c'est assumé : sans ça, ajouter une page publique sans lui donner de
// titre passerait inaperçu jusqu'à ce qu'un prospect tombe dessus.

test('CHAQUE ROUTE PUBLIQUE DE main.tsx A SON TITRE ICI', async () => {
  const { readFile } = await import('node:fs/promises')
  const source = await readFile(new URL('../main.tsx', import.meta.url), 'utf8')

  // Le bloc `const PUBLIQUES: Record<string, React.ReactElement> = { … }`
  const bloc = source.match(/PUBLIQUES[^=]*=\s*\{([\s\S]*?)\n\}/)
  assert.ok(bloc, 'le tableau PUBLIQUES de main.tsx est introuvable — a-t-il été renommé ?')

  const routes = [...bloc[1]!.matchAll(/'(\/[a-z-]*)'\s*:/g)].map((m) => m[1]!)
  assert.ok(routes.length >= 5, `seulement ${routes.length} routes trouvées : ${routes}`)

  for (const chemin of routes) {
    assert.ok(chemin in PAGES, `${chemin} est servie par main.tsx mais n’a aucun titre`)
  }
  for (const chemin of Object.keys(PAGES)) {
    assert.ok(routes.includes(chemin), `${chemin} a un titre mais n’est servie par personne`)
  }
})
