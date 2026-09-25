import { test } from 'node:test'
import assert from 'node:assert/strict'
import { enCsv, echappe, COLONNES, nomFichierExport } from './csv.ts'
import type { Demande } from '../types.ts'

// Se lance avec :  node --test
// Aucune dépendance : Node exécute le TypeScript et fournit le lanceur.

function demande(modifications: Partial<Demande> = {}): Demande {
  return {
    id: 1,
    artisan_id: 'test',
    recue_le: '2026-09-20T08:30:00.000Z',
    prenom: 'Marc',
    email: null,
    telephone: '+33612345678',
    lieu: 'Marseille 13001',
    besoin: 'Fuite sous evier',
    urgence_dite: 'Oui',
    photo_url: null,
    motif: 'fuite',
    gravite: 3,
    panier: 180,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
    ...modifications,
  }
}

test('le fichier commence par un BOM, sinon Excel casse les accents', () => {
  assert.ok(enCsv([]).startsWith('﻿'))
})

test('une valeur ordinaire n’est pas entourée de guillemets', () => {
  assert.equal(echappe('Fuite sous evier'), 'Fuite sous evier')
})

test('un point-virgule force les guillemets — sinon il crée une colonne', () => {
  assert.equal(echappe('fuite ; urgent'), '"fuite ; urgent"')
})

test('un guillemet est doublé et la valeur entourée', () => {
  assert.equal(echappe('il dit "urgent"'), '"il dit ""urgent"""')
})

test('un retour à la ligne force les guillemets — sinon il crée une ligne', () => {
  assert.equal(echappe('ligne un\nligne deux'), '"ligne un\nligne deux"')
})

test('le pire cas réel : du texte libre avec les trois pièges à la fois', () => {
  const texte = 'Fuite ; il dit "URGENT"\nRappelez vite'
  const csv = enCsv([demande({ besoin: texte })])
  // La valeur doit apparaître échappée, en un seul champ.
  assert.ok(csv.includes('"Fuite ; il dit ""URGENT""\nRappelez vite"'))
  // Et le texte brut, lui, ne doit PAS apparaître tel quel.
  assert.ok(!csv.includes('Fuite ; il dit "URGENT"\nRappelez vite;'))
})

test('l’en-tête contient toutes les colonnes, dans l’ordre', () => {
  const entete = enCsv([]).replace('﻿', '').split('\r\n')[0]
  assert.equal(entete.split(';').length, COLONNES.length)
  assert.ok(entete.startsWith('Reçue le;Prénom;Téléphone'))
})

test('les champs vides deviennent des colonnes vides, pas "null"', () => {
  const csv = enCsv([demande({ prenom: null, gravite: null, panier: null })])
  assert.ok(!csv.includes('null'))
  assert.ok(!csv.includes('undefined'))
})

test('le statut est écrit en français, pas en valeur SQL', () => {
  const csv = enCsv([demande({ statut: 'devis_envoye' })])
  assert.ok(csv.includes('Devis envoyé'))
  assert.ok(!csv.includes('devis_envoye'))
})

test('chaque ligne a le même nombre de colonnes qu’il y a d’en-têtes', () => {
  // On compte les points-virgules HORS guillemets : c'est l'invariant qui
  // casse quand un échappement est oublié.
  const csv = enCsv([
    demande({ besoin: 'a;b' }),
    demande({ besoin: 'c"d' }),
    demande({ besoin: 'e\nf' }),
  ])
  const corps = csv.replace('﻿', '')

  let dansGuillemets = false
  let separateurs = 0
  let lignes = 1
  for (let i = 0; i < corps.length; i++) {
    const c = corps[i]
    if (c === '"') dansGuillemets = !dansGuillemets
    else if (!dansGuillemets && c === ';') separateurs++
    else if (!dansGuillemets && c === '\n') lignes++
  }
  // 4 lignes de données + en-tête, la dernière étant vide (le fichier finit
  // par un saut de ligne).
  assert.equal(lignes, 5)
  assert.equal(separateurs, 4 * (COLONNES.length - 1))
})

// ─────────────────────────────────────────────────────────────────────────
// L'HEURE ÉCRITE NE DOIT DÉPENDRE D'AUCUNE HORLOGE
// ─────────────────────────────────────────────────────────────────────────
// Ces trois tests seraient passés au vert sur une machine réglée sur Paris
// et au rouge sur une machine réglée ailleurs — c'est-à-dire qu'ils
// n'auraient rien prouvé. Ils fixent maintenant le résultat attendu en
// dur, donc ils disent la même chose partout. Trouvé le 25 septembre 2026
// sur une machine dont l'horloge Windows était sur Asia/Jerusalem.

test('UN CSV PORTE L’HEURE DE PARIS, PAS CELLE DE LA MACHINE', () => {
  // 22 h 30 UTC le 25 septembre = 00 h 30 le 26 à Paris (heure d'été).
  const lignes = enCsv([
    demande({ id: 1, recue_le: '2026-09-25T22:30:00Z' }),
  ]).split('\n')

  assert.match(lignes[1], /26\/09\/2026 00:30/)
  // Le témoin de ce qui était écrit avant, sur cette machine-là :
  assert.doesNotMatch(lignes[1], /01:30/)
})

test('et il le porte aussi en heure d’hiver', () => {
  // 22 h 30 UTC le 15 janvier = 23 h 30 le 15 à Paris (UTC+1).
  const lignes = enCsv([
    demande({ id: 1, recue_le: '2026-01-15T22:30:00Z' }),
  ]).split('\n')
  assert.match(lignes[1], /15\/01\/2026 23:30/)
})

test('le nom du fichier est daté à Paris, pas en UTC', () => {
  // Il portait la date UTC : un export lancé à 00 h 30 le 26 s'appelait
  // « …-25.csv ». Deux exports à une nuit d'écart, le même nom.
  assert.equal(
    nomFichierExport(new Date('2026-09-25T22:30:00Z')),
    'reponse-eclair-demandes-2026-09-26.csv',
  )
  assert.equal(
    nomFichierExport(new Date('2026-09-25T21:30:00Z')),
    'reponse-eclair-demandes-2026-09-25.csv',
  )
})
