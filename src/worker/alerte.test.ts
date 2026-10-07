import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { OPERATIONS } from '../lib/action.ts'

// Se lance avec :  node --test
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE TEST LIT DES FICHIERS COMME DU TEXTE
// ─────────────────────────────────────────────────────────────────────────
// L'e-mail d'alerte n'est pas composé par ce dépôt : il est COLLÉ À LA MAIN
// dans un module de Make. Entre le code qui fabrique les jetons et le
// gabarit qui les place dans les liens, il n'y a aucun compilateur, aucun
// type, rien.
//
// La panne qu'on redoute est donc silencieuse et complète : j'ajoute une
// opération, j'oublie le gabarit, et le bouton correspondant n'existe pas —
// ou pire, il existe avec un jeton vide, et l'artisan touche un lien qui
// rend « ce lien n'est plus valable » sans qu'on sache pourquoi.
//
// Ces deux tests comparent les trois sources de vérité : la liste blanche
// des opérations, les champs que le Worker envoie à Make, et les liens
// écrits dans le gabarit prêt à coller. Si l'une des trois bouge seule,
// ils tombent.
//
// ⚠ CE QU'ILS NE PROUVENT PAS : que le gabarit collé DANS Make est bien
// celui de ce dépôt. Personne ne peut le prouver d'ici — c'est la limite de
// toute chaîne qui passe par un service tiers. Le fichier `-A-COLLER.txt`
// est là pour que les deux ne puissent différer que par un oubli de copie.

const COLLER = new URL('../../courriel/alerte-artisan-A-COLLER.txt', import.meta.url)
const SOURCE_WORKER = new URL('./index.ts', import.meta.url)

test('CHAQUE OPÉRATION A SON BOUTON DANS L’E-MAIL, ET UN SEUL', async () => {
  const gabarit = await readFile(COLLER, 'utf8')
  for (const op of OPERATIONS) {
    const trouves = gabarit.match(new RegExp(`op=${op}(?![a-z0-9_])`, 'g')) ?? []
    assert.equal(trouves.length, 1, `« op=${op} » apparaît ${trouves.length} fois`)
  }

  // Et réciproquement : aucun lien ne porte une opération que la liste
  // blanche ignore. Un `op=` inventé rendrait « operation_inconnue », et
  // l'artisan toucherait un bouton mort.
  // Le chiffre compte : sans `0-9`, « op=promesse_15min » se lirait
  // « promesse_ » et ce test passerait en ne vérifiant rien.
  const dansLeGabarit = [...gabarit.matchAll(/op=([a-z0-9_]+)/g)].map((m) => m[1])
  assert.deepEqual([...new Set(dansLeGabarit)].sort(), [...OPERATIONS].sort())
})

test('LES JETONS DU GABARIT SONT CEUX QUE LE WORKER ENVOIE', async () => {
  const gabarit = await readFile(COLLER, 'utf8')
  const worker = await readFile(SOURCE_WORKER, 'utf8')

  // Côté Worker : les champs posés dans la charge utile envoyée à Make.
  const envoyes = [...worker.matchAll(/^\s+(jeton_[a-z0-9_]+):/gm)].map((m) => m[1])
  // Côté gabarit : les champs lus dans les liens, sous la forme {{2.jeton_x}}.
  const lus = [...gabarit.matchAll(/\{\{2\.(jeton_[a-z0-9_]+)\}\}/g)].map((m) => m[1])

  assert.equal(envoyes.length, OPERATIONS.length, `le Worker pose ${envoyes.length} jetons`)
  assert.deepEqual([...new Set(lus)].sort(), [...new Set(envoyes)].sort())
})

test('LES TROIS DÉLAIS SONT AU-DESSUS DE « C’EST FAIT »', async () => {
  // L'ordre des gestes : on dit quand on rappelle, PUIS on rappelle, PUIS on
  // coche. Un artisan lit de haut en bas, debout, entre deux interventions —
  // ce qui lui sert MAINTENANT doit venir avant ce qui sert après.
  const gabarit = await readFile(COLLER, 'utf8')
  const dernierDelai = Math.max(
    gabarit.indexOf('op=promesse_15min'),
    gabarit.indexOf('op=promesse_1h'),
    gabarit.indexOf('op=promesse_fin_de_journee'),
  )
  assert.ok(dernierDelai > 0, 'aucun délai dans le gabarit')
  assert.ok(dernierDelai < gabarit.indexOf('op=fait'), '« c’est fait » passe devant les délais')
})

test('le gros bouton « Appeler » reste le premier geste de l’e-mail', async () => {
  // Le produit ne dit pas « promettez » : il dit « appelez ». Les délais sont
  // la porte de sortie quand on ne peut pas, pas le chemin ordinaire.
  const gabarit = await readFile(COLLER, 'utf8')
  assert.ok(
    gabarit.indexOf('href="tel:') < gabarit.indexOf('op=promesse_15min'),
    'un bouton de promesse passe devant « Appeler »',
  )
})
