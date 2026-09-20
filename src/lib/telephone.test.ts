import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lireTelephone } from './telephone.ts'

// Se lance avec :  node --test
// Aucune dépendance : Node exécute le TypeScript et fournit le lanceur.

// Un raccourci de lecture : on veut surtout vérifier l'état et le numéro appelé.
function lu(brut: string | null) {
  const t = lireTelephone(brut)
  return t.etat === 'ok' ? `ok ${t.appel} (${t.affichage})` : t.etat
}

test('un champ vide est « absent », pas « invalide »', () => {
  assert.equal(lu(null), 'absent')
  assert.equal(lu(''), 'absent')
  assert.equal(lu('   '), 'absent')
})

test('les trois écritures d’un même numéro donnent le même appel', () => {
  const attendu = 'ok +33612345678 (06 12 34 56 78)'
  assert.equal(lu('0612345678'), attendu)
  assert.equal(lu('+33612345678'), attendu)
  assert.equal(lu('0033612345678'), attendu)
})

test('les séparateurs que tapent les humains sont ignorés', () => {
  const attendu = 'ok +33612345678 (06 12 34 56 78)'
  assert.equal(lu('06 12 34 56 78'), attendu)
  assert.equal(lu('06.12.34.56.78'), attendu)
  assert.equal(lu('06-12-34-56-78'), attendu)
  assert.equal(lu('+33 (0)6 12 34 56 78'.replace('(0)', '')), attendu)
  // Espace insécable : ce que produisent certains claviers de téléphone.
  assert.equal(lu('06 12 34 56 78'), attendu)
})

test('on appelle en +33, jamais en 0 — une SIM étrangère échouerait', () => {
  const t = lireTelephone('06 12 34 56 78')
  assert.equal(t.etat, 'ok')
  if (t.etat === 'ok') assert.ok(t.appel.startsWith('+33'))
})

test('un chiffre en trop ou en moins est invalide, pas « presque bon »', () => {
  assert.equal(lu('061234567'), 'invalide')
  assert.equal(lu('06123456789'), 'invalide')
})

test('le premier chiffre national ne peut pas être 0', () => {
  // « +330612… » est la faute la plus courante : on recolle le 0 au +33.
  assert.equal(lu('+330612345678'), 'invalide')
  assert.equal(lu('0012345678'), 'invalide')
})

test('du texte libre à la place d’un numéro est invalide', () => {
  assert.equal(lu('je rappelle ce soir'), 'invalide')
  assert.equal(lu('06 12 34 56 7A'), 'invalide')
})

test('un numéro invalide garde son texte d’origine, on ne le jette pas', () => {
  const t = lireTelephone('061234567')
  assert.equal(t.etat, 'invalide')
  if (t.etat === 'invalide') assert.equal(t.brut, '061234567')
})

test('les fixes et les numéros spéciaux passent aussi', () => {
  // On ne juge pas l'opérateur : 01 à 09, c'est appelable.
  assert.equal(lu('0491234567'), 'ok +33491234567 (04 91 23 45 67)')
  assert.equal(lu('0912345678'), 'ok +33912345678 (09 12 34 56 78)')
})
