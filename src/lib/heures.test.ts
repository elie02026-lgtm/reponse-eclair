import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import { aParis, estOuvrable, joursFeries, prochainCreneau } from './heures.ts'

// Toutes les dates sont écrites en UTC (le `Z`), et c'est exprès : c'est
// sous cette forme que Postgres et Make les manipulent. Le décalage avec
// Paris — +1 h en hiver, +2 h en été — fait partie de ce qu'on teste.

test('l’heure de Paris est lue correctement, hiver comme été', () => {
  // Hiver : Paris = UTC+1
  const hiver = aParis(new Date('2026-01-15T08:30:00Z'))
  assert.equal(hiver.jour, '2026-01-15')
  assert.equal(hiver.heure, 9)
  assert.equal(hiver.jourSemaine, 4) // jeudi

  // Été : Paris = UTC+2
  const ete = aParis(new Date('2026-07-15T08:30:00Z'))
  assert.equal(ete.jour, '2026-07-15')
  assert.equal(ete.heure, 10)
})

test('minuit à Paris est lu comme 0 h, pas comme 24 h', () => {
  // 22 h UTC en été = minuit à Paris, le lendemain.
  const t = aParis(new Date('2026-07-14T22:00:00Z'))
  assert.equal(t.heure, 0)
  assert.equal(t.jour, '2026-07-15')
})

// ─────────────────────────────────────────────────────────────────────────
// PÂQUES : on valide l'algorithme sur des années dont la réponse est
// publiée, AVANT de lui faire confiance pour les suivantes.
// ─────────────────────────────────────────────────────────────────────────
test('l’algorithme de Pâques retrouve des années connues', () => {
  // Pâques 2000 : dimanche 23 avril → lundi de Pâques le 24.
  assert.ok(joursFeries(2000).has('2000-04-24'))
  // Pâques 2024 : dimanche 31 mars → lundi de Pâques le 1er avril.
  assert.ok(joursFeries(2024).has('2024-04-01'))
  // Pâques 2025 : dimanche 20 avril → lundi de Pâques le 21.
  assert.ok(joursFeries(2025).has('2025-04-21'))
})

test('les quatre fériés mobiles de 2026 découlent de Pâques (5 avril)', () => {
  const f = joursFeries(2026)
  assert.ok(f.has('2026-04-06'), 'lundi de Pâques')
  assert.ok(f.has('2026-05-14'), 'Ascension, 39 jours après')
  assert.ok(f.has('2026-05-25'), 'lundi de Pentecôte, 50 jours après')
})

test('les onze fériés sont là, et rien de plus', () => {
  assert.equal(joursFeries(2026).size, 11)
  assert.ok(joursFeries(2026).has('2026-07-14'))
  assert.ok(joursFeries(2026).has('2026-12-25'))
  // Le Vendredi saint est férié en Alsace-Moselle, pas ailleurs.
  assert.ok(!joursFeries(2026).has('2026-04-03'))
})

// ─────────────────────────────────────────────────────────────────────────
// LA FENÊTRE
// ─────────────────────────────────────────────────────────────────────────
test('les bords de la fenêtre se ferment du bon côté', () => {
  // Jeudi 15 janvier 2026, heure d'hiver : Paris = UTC+1
  assert.equal(estOuvrable(new Date('2026-01-15T07:59:00Z')), false) // 8 h 59
  assert.equal(estOuvrable(new Date('2026-01-15T08:00:00Z')), true) //  9 h 00
  assert.equal(estOuvrable(new Date('2026-01-15T17:59:00Z')), true) // 18 h 59
  assert.equal(estOuvrable(new Date('2026-01-15T18:00:00Z')), false) // 19 h 00
})

test('le samedi est ouvert, le dimanche non', () => {
  // 17 janvier 2026 = samedi, 18 = dimanche.
  assert.equal(estOuvrable(new Date('2026-01-17T13:00:00Z')), true)
  assert.equal(estOuvrable(new Date('2026-01-18T13:00:00Z')), false)
})

test('un jour férié est fermé même en plein milieu de la journée', () => {
  // 14 juillet 2026 tombe un mardi, à 15 h de l’après-midi.
  assert.equal(estOuvrable(new Date('2026-07-14T13:00:00Z')), false)
  // Le lendemain, même heure, ouvre.
  assert.equal(estOuvrable(new Date('2026-07-15T13:00:00Z')), true)
})

// ─────────────────────────────────────────────────────────────────────────
// LE REPORT
// ─────────────────────────────────────────────────────────────────────────
test('un instant déjà ouvrable n’est pas déplacé', () => {
  const t = new Date('2026-01-15T13:00:00Z')
  assert.equal(prochainCreneau(t).getTime(), t.getTime())
})

test('une relance de nuit part le lendemain à 9 h', () => {
  // Jeudi 15 janvier, 23 h à Paris (22 h UTC) → vendredi 16, 9 h de Paris.
  const repris = prochainCreneau(new Date('2026-01-15T22:00:00Z'))
  const t = aParis(repris)
  assert.equal(t.jour, '2026-01-16')
  assert.equal(t.heure, 9)
  assert.equal(t.minute, 0)
})

test('une relance du dimanche part le lundi', () => {
  // Dimanche 18 janvier 2026, 14 h de Paris.
  const t = aParis(prochainCreneau(new Date('2026-01-18T13:00:00Z')))
  assert.equal(t.jour, '2026-01-19')
  assert.equal(t.heure, 9)
})

// LE CAS QUI COMPTE : deux fermetures qui s'enchaînent.
// Le 1er mai 2026 tombe un vendredi. Samedi 2 est ouvert — mais une relance
// prête le vendredi soir doit franchir le férié ET la nuit.
test('un férié suivi d’un samedi ouvert : la relance saute au samedi', () => {
  const t = aParis(prochainCreneau(new Date('2026-05-01T12:00:00Z')))
  assert.equal(t.jour, '2026-05-02')
  assert.equal(t.heure, 9)
})

// Le 25 décembre 2026 tombe un vendredi ; le 26 est un samedi ouvert
// (hors Alsace-Moselle), le 27 un dimanche. Une relance du soir de Noël
// doit tomber le samedi 26, pas le lundi 28.
test('Noël 2026 : la relance repart le samedi 26, pas le lundi', () => {
  const t = aParis(prochainCreneau(new Date('2026-12-25T20:00:00Z')))
  assert.equal(t.jour, '2026-12-26')
  assert.equal(t.heure, 9)
})

test('le report traverse un changement d’heure sans se décaler', () => {
  // L'heure d'été 2026 commence le dimanche 29 mars. Une relance prête le
  // samedi 28 au soir doit repartir le LUNDI 30 à 9 h de Paris — le
  // dimanche est fermé, et ce dimanche-là ne dure que 23 heures.
  const t = aParis(prochainCreneau(new Date('2026-03-28T21:00:00Z')))
  assert.equal(t.jour, '2026-03-30')
  assert.equal(t.heure, 9)
  assert.equal(t.minute, 0)
})

// ─────────────────────────────────────────────────────────────────────────
// LA MIGRATION EST RELUE PAR L'ALGORITHME QUI L'A ÉCRITE.
// ─────────────────────────────────────────────────────────────────────────
// `supabase/migrations/0008_fenetre_de_relance.sql` contient quinze années
// de jours fériés, sorties de `joursFeries()`. Elles ne peuvent pas être
// vérifiées « à l'œil » : personne ne sait de tête quand tombe le lundi de
// Pentecôte 2033.
//
// Ce test relit le fichier et compare, date par date. Il attrape les deux
// accidents possibles : une date corrigée à la main dans le SQL, et une
// modification de l'algorithme qui rendrait le SQL périmé.
test('les jours fériés de la migration 0008 sortent bien de joursFeries()', async () => {
  const sql = await readFile(
    new URL('../../supabase/migrations/0008_fenetre_de_relance.sql', import.meta.url),
    'utf8',
  )

  const insert = sql.slice(sql.indexOf('insert into jours_feries'))
  const dansLeSql = [...insert.matchAll(/\('(\d{4}-\d{2}-\d{2})'\)/g)].map((m) => m[1])

  assert.ok(dansLeSql.length > 0, 'aucune date trouvée — le format du fichier a changé')

  const annees = [...new Set(dansLeSql.map((d) => Number(d.slice(0, 4))))].sort()
  const attendues = annees.flatMap((a) => [...joursFeries(a)]).sort()

  assert.deepEqual([...dansLeSql].sort(), attendues)
  assert.equal(dansLeSql.length, annees.length * 11)
})
