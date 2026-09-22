import { test } from 'node:test'
import assert from 'node:assert/strict'
import { chiffreSigne } from './chiffre.ts'
import type { Demande } from '../types.ts'

// Se lance avec :  node --test

type Ligne = Pick<Demande, 'statut' | 'panier' | 'montant_signe'>

const l = (statut: Demande['statut'], panier: number | null, montant: number | null): Ligne => ({
  statut,
  panier,
  montant_signe: montant,
})

test('le total n’additionne que les montants saisis', () => {
  const c = chiffreSigne([l('signe', 4500, 3800), l('signe', 180, 210)])
  assert.equal(c.total, 4010)
  assert.equal(c.renseignes, 2)
  assert.equal(c.aRenseigner, 0)
})

test('un chantier sans montant n’est PAS remplacé par l’estimation', () => {
  // Le cœur de la correction : additionner le panier redonnerait un chiffre
  // rond et indéfendable. On préfère un trou avoué.
  const c = chiffreSigne([l('signe', 4500, null)])
  assert.equal(c.total, 0)
  assert.equal(c.aRenseigner, 1)
  assert.equal(c.estimeManquant, 4500)
})

test('les deux cas cohabitent sans se contaminer', () => {
  const c = chiffreSigne([l('signe', 4500, 3800), l('signe', 180, null), l('signe', 900, null)])
  assert.equal(c.total, 3800)
  assert.equal(c.renseignes, 1)
  assert.equal(c.aRenseigner, 2)
  assert.equal(c.estimeManquant, 1080)
})

test('seuls les chantiers SIGNÉS comptent', () => {
  // Témoin dans l'autre sens : un devis envoyé à 10 000 € n'est pas un
  // chiffre d'affaires, même avec un montant saisi.
  const c = chiffreSigne([
    l('devis_envoye', 10000, 10000),
    l('perdu', 8000, 8000),
    l('rappele', 500, 500),
    l('a_rappeler', 300, 300),
    l('signe', 200, 250),
  ])
  assert.equal(c.total, 250)
  assert.equal(c.renseignes, 1)
})

test('une liste vide donne zéro, pas NaN', () => {
  const c = chiffreSigne([])
  assert.equal(c.total, 0)
  assert.equal(c.renseignes, 0)
  assert.equal(c.aRenseigner, 0)
  assert.equal(c.estimeManquant, 0)
})

test('un montant de zéro est un montant saisi, pas un montant manquant', () => {
  // Un chantier signé puis offert, ou annulé sans frais. Zéro est une
  // réponse ; `null` est une absence de réponse. Les confondre gonflerait
  // le nombre de chantiers « à renseigner » sans raison.
  const c = chiffreSigne([l('signe', 4500, 0)])
  assert.equal(c.total, 0)
  assert.equal(c.renseignes, 1)
  assert.equal(c.aRenseigner, 0)
})

test('un chantier signé sans panier ni montant ne casse rien', () => {
  const c = chiffreSigne([l('signe', null, null)])
  assert.equal(c.total, 0)
  assert.equal(c.aRenseigner, 1)
  assert.equal(c.estimeManquant, 0)
})
