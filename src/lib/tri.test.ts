import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trier, graviteEffective, estCorrigee } from './tri.ts'
import type { Demande } from '../types.ts'

// Se lance avec :  node --test

function d(champs: Partial<Demande> & { id: number }): Demande {
  return {
    artisan_id: 'test',
    recue_le: new Date().toISOString(),
    prenom: null,
    email: null,
    telephone: null,
    lieu: null,
    besoin: null,
    urgence_dite: null,
    photo_url: null,
    motif: null,
    gravite: null,
    panier: null,
    distance_min: null,
    statut: 'a_rappeler',
    relance_sms_le: null,
    traite_le: null,
    montant_signe: null,
    gravite_corrigee: null,
    corrigee_le: null,
    cle_action: null,
    ...champs,
  }
}

const ids = (liste: Demande[]) => liste.map((x) => x.id)

test('LA CORRECTION DE L’ARTISAN L’EMPORTE SUR LE MODÈLE', () => {
  // C'est tout l'objet de la migration 0014. Le modèle avait dit 3 ;
  // l'artisan a dit « pas si urgent ». C'est l'artisan qui connaît son
  // métier, et c'est lui qui rappelle.
  assert.equal(graviteEffective(d({ id: 1, gravite: 3, gravite_corrigee: 1 })), 1)
  assert.equal(graviteEffective(d({ id: 2, gravite: 3 })), 3)
  assert.equal(graviteEffective(d({ id: 3 })), null)
})

test('une correction à 0 l’emporte aussi — 0 n’est pas « rien »', () => {
  // PIÈGE DE JAVASCRIPT : avec `||`, un 0 serait tombé sur la valeur du
  // modèle, et « pas une urgence » serait resté classé 3. C'est `??` qui
  // tient, et ce test est là pour que personne ne le remplace.
  assert.equal(graviteEffective(d({ id: 1, gravite: 3, gravite_corrigee: 0 })), 0)
})

test('la valeur d’origine du modèle n’est jamais perdue', () => {
  const x = d({ id: 1, gravite: 3, gravite_corrigee: 0 })
  assert.equal(x.gravite, 3)
  assert.ok(estCorrigee(x))
  assert.ok(!estCorrigee(d({ id: 2, gravite: 3 })))
})

test('le tri suit la gravité corrigée, pas celle du modèle', () => {
  const liste = [
    d({ id: 1, gravite: 3, gravite_corrigee: 0, panier: 900 }), // rabaissée
    d({ id: 2, gravite: 1, gravite_corrigee: 3, panier: 100 }), // relevée
    d({ id: 3, gravite: 2, panier: 500 }),
  ]
  assert.deepEqual(ids(trier(liste)), [2, 3, 1])
})

test('à gravité égale, c’est le panier qui décide — jamais la date', () => {
  const liste = [
    d({ id: 1, gravite: 2, panier: 140 }),
    d({ id: 2, gravite: 2, panier: 450 }),
  ]
  assert.deepEqual(ids(trier(liste)), [2, 1])
})

test('une demande pas encore classée ne passe pas devant une fuite', () => {
  // La classification arrive APRÈS l'écriture de la ligne — mesuré entre
  // dix-sept et vingt secondes en production. Pendant ce temps, `gravite`
  // vaut null.
  assert.deepEqual(ids(trier([d({ id: 1 }), d({ id: 2, gravite: 3 })])), [2, 1])
})

test('trier ne modifie pas le tableau d’origine', () => {
  const liste = [d({ id: 1, gravite: 1 }), d({ id: 2, gravite: 3 })]
  trier(liste)
  assert.deepEqual(ids(liste), [1, 2])
})

test('un tableau vide ne casse rien', () => {
  assert.deepEqual(trier([]), [])
})
