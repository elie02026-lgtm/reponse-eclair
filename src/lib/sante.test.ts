import { test } from 'node:test'
import assert from 'node:assert/strict'
import { anomalies } from './sante.ts'
import type { Demande } from '../types.ts'

// Se lance avec :  node --test

const MAINTENANT = new Date('2026-09-22T20:00:00.000Z')

function ilYA(jours: number): string {
  return new Date(MAINTENANT.getTime() - jours * 24 * 60 * 60 * 1000).toISOString()
}

function demande(modifications: Partial<Demande> = {}): Demande {
  return {
    id: 1,
    artisan_id: 'test',
    recue_le: ilYA(0),
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

const cles = (d: Demande[]) => anomalies(d, MAINTENANT).map((a) => a.cle).sort()

test('une base saine ne signale rien — le silence vaut « tout va bien »', () => {
  assert.deepEqual(cles([demande()]), [])
})

test('une base vide ne signale rien non plus', () => {
  assert.deepEqual(cles([]), [])
})

test('une relance jamais partie après trois jours est une panne', () => {
  const d = demande({ email: 'client@example.com', recue_le: ilYA(4), relance_sms_le: null })
  assert.deepEqual(cles([d]), ['relance'])
})

test('la même, relancée, ne signale rien', () => {
  const d = demande({ email: 'client@example.com', recue_le: ilYA(4), relance_sms_le: ilYA(2) })
  assert.deepEqual(cles([d]), [])
})

test('sans e-mail, il n’y a rien à relancer : pas d’anomalie', () => {
  // Le témoin inverse du test précédent : c'est l'e-mail qui déclenche,
  // pas l'ancienneté seule.
  const d = demande({ email: null, recue_le: ilYA(9), telephone: '+33612345678' })
  assert.ok(!cles([d]).includes('relance'))
})

test('deux jours ne suffisent pas — la relance a encore le droit de partir', () => {
  const d = demande({ email: 'client@example.com', recue_le: ilYA(2), relance_sms_le: null })
  assert.ok(!cles([d]).includes('relance'))
})

test('une demande déjà traitée ne compte pas, même vieille et non relancée', () => {
  const d = demande({
    email: 'client@example.com',
    recue_le: ilYA(30),
    relance_sms_le: null,
    statut: 'signe',
  })
  // On n'exige PAS une liste vide : trente jours sans rien recevoir déclenche
  // légitimement le silence. Ce test ne porte que sur la relance.
  assert.ok(!cles([d]).includes('relance'))
  assert.deepEqual(cles([d]), ['silence'])
})

test('un numéro absent ou illisible est signalé', () => {
  assert.deepEqual(cles([demande({ telephone: null })]), ['telephone'])
  assert.deepEqual(cles([demande({ telephone: '06 12 34' })]), ['telephone'])
})

test('le compte des injoignables est exact, et les ids sont donnés', () => {
  const liste = [
    demande({ id: 1, telephone: null }),
    demande({ id: 2, telephone: '+33612345678' }),
    demande({ id: 3, telephone: 'je rappelle ce soir' }),
  ]
  const a = anomalies(liste, MAINTENANT).find((x) => x.cle === 'telephone')
  assert.ok(a)
  assert.deepEqual(a.ids, [1, 3])
  assert.match(a.titre, /^2 demandes/)
})

test('plus rien depuis huit jours : le silence est signalé', () => {
  assert.deepEqual(cles([demande({ recue_le: ilYA(8), statut: 'signe' })]), ['silence'])
})

test('six jours de calme ne sont pas une panne', () => {
  assert.deepEqual(cles([demande({ recue_le: ilYA(6), statut: 'signe' })]), [])
})

test('c’est la demande la PLUS RÉCENTE qui compte, pas la plus ancienne', () => {
  const liste = [
    demande({ id: 1, recue_le: ilYA(40), statut: 'signe' }),
    demande({ id: 2, recue_le: ilYA(1), statut: 'signe' }),
  ]
  assert.deepEqual(cles(liste), [])
})

test('plusieurs pannes à la fois sont toutes rendues', () => {
  const liste = [
    demande({ id: 1, recue_le: ilYA(10), email: 'client@example.com', telephone: null }),
  ]
  assert.deepEqual(cles(liste), ['relance', 'silence', 'telephone'])
})

test('une panne rouge est bien de niveau rouge', () => {
  const d = demande({ email: 'client@example.com', recue_le: ilYA(4) })
  assert.equal(anomalies([d], MAINTENANT)[0].niveau, 'rouge')
})
