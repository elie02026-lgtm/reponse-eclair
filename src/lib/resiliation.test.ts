import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { confirmationValide, phraseEffacement } from './resiliation.ts'

test('le nom exact confirme', () => {
  assert.equal(confirmationValide('Plomberie Test', 'Plomberie Test'), true)
})

test('la casse ne compte pas — le clavier du téléphone met une majuscule seul', () => {
  assert.equal(confirmationValide('plomberie test', 'Plomberie Test'), true)
  assert.equal(confirmationValide('PLOMBERIE TEST', 'Plomberie Test'), true)
})

test('les espaces de bord ne comptent pas', () => {
  assert.equal(confirmationValide('  Plomberie Test  ', 'Plomberie Test'), true)
  assert.equal(confirmationValide('Plomberie Test', '  Plomberie Test'), true)
})

test('un nom approchant ne confirme pas', () => {
  assert.equal(confirmationValide('Plomberie', 'Plomberie Test'), false)
  assert.equal(confirmationValide('Plomberie  Test', 'Plomberie Test'), false) // double espace intérieur
  assert.equal(confirmationValide('Plomberie Tes', 'Plomberie Test'), false)
})

test('le champ vide ne confirme jamais', () => {
  assert.equal(confirmationValide('', 'Plomberie Test'), false)
  assert.equal(confirmationValide('   ', 'Plomberie Test'), false)
})

// LE CAS QUI COMPTE VRAIMENT.
// Sans la garde sur `attendu`, une fiche dont le nom d'entreprise est vide
// ferait que « ne rien taper » confirme la suppression définitive.
test('une entreprise sans nom ne peut pas être confirmée par le vide', () => {
  assert.equal(confirmationValide('', ''), false)
  assert.equal(confirmationValide('   ', '   '), false)
})

test('les accents doivent être tapés — on ne normalise pas au-delà de la casse', () => {
  assert.equal(confirmationValide('plomberie eclair', 'Plomberie Éclair'), false)
  assert.equal(confirmationValide('plomberie éclair', 'Plomberie Éclair'), true)
})

test('la phrase d’effacement s’accorde, y compris à zéro et à un', () => {
  assert.equal(phraseEffacement(0), 'Il n’y avait aucune demande à effacer.')
  assert.equal(phraseEffacement(1), 'Sa demande a été effacée avec lui.')
  assert.equal(phraseEffacement(3), 'Ses 3 demandes ont été effacées avec lui.')
})
