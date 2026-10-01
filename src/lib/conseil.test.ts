import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  QUESTIONS,
  AUCUNE_REPONSE,
  auMoinsUneReponse,
  reponseValide,
  conseils,
  accuse,
} from './conseil.ts'
import { CONSIGNES, consignesDe } from '../config/conseils.ts'
import { METIERS } from '../types.ts'
import type { Reponses } from './conseil.ts'

// Se lance avec :  node --test

const r = (modifications: Partial<Reponses> = {}): Reponses => ({
  ...AUCUNE_REPONSE,
  ...modifications,
})

const titres = (metier = 'plombier') => (reponses: Reponses) =>
  conseils(reponses, metier).map((c) => c.titre)

// ─────────────────────────────────────────────────────────────────────────
// LA RÈGLE QUI GARDE LE CLIENT
// ─────────────────────────────────────────────────────────────────────────

test('L’EAU COULE ET RIEN N’EST COUPÉ : on dit où est le robinet', () => {
  // C'est le seul conseil qui demande d'agir, et c'est celui qui empêche le
  // client d'appeler le plombier suivant : il repart avec un geste utile,
  // donné par l'artisan.
  const liste = conseils(r({ eau_coule: 'oui', arrivee_coupee: 'non' }), 'plombier')
  assert.equal(liste.length, 1)
  assert.equal(liste[0]?.agir, true)
  assert.match(liste[0]!.texte, /robinet d’arrêt général/)
})

test('si l’arrivée est déjà coupée, on ne lui redit pas de la couper', () => {
  assert.deepEqual(titres()(r({ eau_coule: 'oui', arrivee_coupee: 'oui' })), [])
})

test('si l’eau ne coule pas, aucun conseil de coupure', () => {
  assert.deepEqual(titres()(r({ eau_coule: 'non', arrivee_coupee: 'non' })), [])
})

test('« JE NE SAIS PAS » SUR LA COUPURE DÉCLENCHE LE CONSEIL', () => {
  // Arbitrage d'Elie, 1er octobre 2026, contre la lettre du cahier : celui
  // qui ignore s'il a coupé l'arrivée est précisément celui à qui il faut
  // dire où est le robinet. Le conseil ne peut pas nuire ; le refuser peut
  // coûter un parquet.
  const liste = conseils(r({ eau_coule: 'oui', arrivee_coupee: 'je-ne-sais-pas' }), 'plombier')
  assert.equal(liste.length, 1)
  assert.equal(liste[0]?.agir, true)
})

test('mais si l’eau ne coule PEUT-ÊTRE pas, on ne conseille rien', () => {
  // Le doute sur la coupure justifie le conseil ; le doute sur la fuite,
  // non. On ne fait pas courir quelqu'un vers son compteur pour une fuite
  // dont il n'est pas sûr.
  assert.deepEqual(titres()(r({ eau_coule: 'je-ne-sais-pas', arrivee_coupee: 'non' })), [])
})

test('une question non touchée ne déclenche rien', () => {
  // `null` n'est pas « je ne sais pas » : il n'a pas répondu, on ne décide
  // pas à sa place.
  assert.deepEqual(titres()(r({ eau_coule: 'oui' })), [])
})

test('sans aucune réponse, on ne conseille rien', () => {
  assert.deepEqual(titres()(AUCUNE_REPONSE), [])
})

// ─────────────────────────────────────────────────────────────────────────
// LE CHAUFFAGE
// ─────────────────────────────────────────────────────────────────────────

test('plus de chauffage : prise en charge, et AUCUNE consigne technique', () => {
  const liste = conseils(r({ chauffage_eau_chaude: 'non' }), 'plombier')
  assert.equal(liste.length, 1)
  assert.equal(liste[0]?.agir, false, 'ce bloc ne doit pas demander d’agir')
  // Une chaudière ne se manipule pas sur instruction d'une page web.
  assert.match(liste[0]!.texte, /N’ouvrez pas la chaudière/)
})

test('les deux situations à la fois donnent les deux blocs, la fuite d’abord', () => {
  const liste = titres()(
    r({ eau_coule: 'oui', arrivee_coupee: 'non', chauffage_eau_chaude: 'non' }),
  )
  assert.equal(liste.length, 2)
  assert.match(liste[0]!, /coupez l’arrivée d’eau/i)
})

// ─────────────────────────────────────────────────────────────────────────
// CE QU'ON NE DIT JAMAIS
// ─────────────────────────────────────────────────────────────────────────

test('AUCUN CONSEIL N’ANNONCE DE DÉLAI — c’est la RÈGLE D’OR', () => {
  // « on n'annonce JAMAIS au client un délai que l'artisan n'a pas choisi
  // lui-même. Une promesse non tenue fait plus de dégâts qu'un message
  // flou. » Ce test lit tous les textes du fichier de configuration, pas
  // seulement ceux qu'une règle affiche aujourd'hui.
  const interdits =
    /\b(minute|heure|demain|aujourd|rapidement|sous peu|vite|délai|bientôt|immédiatement)/i
  for (const consignes of Object.values(CONSIGNES)) {
    for (const c of Object.values(consignes)) {
      assert.ok(!interdits.test(c.titre), `délai dans un titre : ${c.titre}`)
      assert.ok(!interdits.test(c.texte), `délai dans un texte : ${c.texte}`)
    }
  }
})

test('AUCUNE CONSIGNE SUR LE GAZ NI L’ÉLECTRICITÉ dans cette version', () => {
  // Elles seront rédigées par Elie avec des sources vérifiées. Une consigne
  // fausse sur une odeur de gaz peut tuer : tant qu'elle n'est pas sourcée,
  // mieux vaut ne rien dire. Si quelqu'un en ajoute une sans prévenir, ce
  // test tombe.
  const interdits = /\b(gaz|électriqu|disjoncteur|compteur électrique|GRDF|Enedis)/i
  for (const consignes of Object.values(CONSIGNES)) {
    for (const c of Object.values(consignes)) {
      assert.ok(!interdits.test(c.titre + ' ' + c.texte), `gaz ou électricité : ${c.titre}`)
    }
  }
})

test('l’accusé nomme l’entreprise et ne promet pas de rappel', () => {
  const texte = accuse('Plomberie Aubagne')
  assert.match(texte, /Plomberie Aubagne/)
  // « vient d'être prévenu » est vrai. « va vous rappeler » serait un
  // engagement que l'artisan n'a pas pris.
  assert.ok(!/rappel/i.test(texte), texte)
})

// ─────────────────────────────────────────────────────────────────────────
// LES QUESTIONS ELLES-MÊMES
// ─────────────────────────────────────────────────────────────────────────

test('les trois questions existent, dans l’ordre du cahier', () => {
  assert.deepEqual(
    QUESTIONS.map((q) => q.nom),
    ['eau_coule', 'arrivee_coupee', 'chauffage_eau_chaude'],
  )
})

test('la troisième question n’a que deux réponses', () => {
  // « Avez-vous encore du chauffage et de l'eau chaude ? » — on le sait ou
  // on ne le sait pas, il n'y a pas de doute possible.
  assert.deepEqual(QUESTIONS[2].choix, ['oui', 'non'])
  assert.deepEqual(QUESTIONS[0].choix, ['oui', 'non', 'je-ne-sais-pas'])
})

test('une réponse inventée est refusée', () => {
  assert.ok(reponseValide('eau_coule', 'oui'))
  assert.ok(reponseValide('eau_coule', 'je-ne-sais-pas'))
  // « je ne sais pas » n'existe pas pour la troisième question.
  assert.equal(reponseValide('chauffage_eau_chaude', 'je-ne-sais-pas'), false)
  for (const mauvais of ['OUI', 'peut-etre', '', null, 42, {}]) {
    assert.equal(reponseValide('eau_coule', mauvais), false, String(mauvais))
  }
})

test('UNE SEULE RÉPONSE SUFFIT À RENDRE LA DESCRIPTION FACULTATIVE', () => {
  assert.equal(auMoinsUneReponse(AUCUNE_REPONSE), false)
  for (const q of QUESTIONS) {
    assert.ok(auMoinsUneReponse(r({ [q.nom]: 'non' })), q.nom)
  }
})

test('les trois métiers ont des consignes, et le métier inconnu retombe dessus', () => {
  for (const m of METIERS) {
    assert.ok(consignesDe(m).fuite.texte.length > 0, m)
  }
  assert.deepEqual(consignesDe('electricien'), consignesDe('plombier'))
})
