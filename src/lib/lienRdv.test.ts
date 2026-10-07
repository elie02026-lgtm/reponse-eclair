import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIEN_RDV_MAX, lireLienRdv } from './lienRdv.ts'

// Se lance avec :  node --test
//
// `enregistrerReglages` n'est pas testée ici : elle parle à Supabase, donc au
// réseau. C'est `lireLienRdv` qui porte les règles, et c'est pour ça qu'elle
// est séparée — une validation dans un fichier `.tsx` ne se teste pas,
// `node --test` ne sait pas charger du JSX.

test('VIDE EST VALIDE — le lien est facultatif', () => {
  // Beaucoup d'artisans de la cible n'ont pas d'agenda en ligne et n'en
  // auront jamais. Exiger ce champ les exclurait de l'inscription.
  for (const rien of ['', '   ', null, undefined]) {
    const v = lireLienRdv(rien)
    assert.ok(v.ok, String(rien))
    assert.equal(v.valeur, null, `« ${rien} » doit donner null, pas une chaîne vide`)
  }
})

test('un vrai lien passe, et il est débarrassé de ses espaces de bord', () => {
  const v = lireLienRdv('  https://cal.com/elie-gywz5w/rdv  ')
  assert.ok(v.ok)
  assert.equal(v.valeur, 'https://cal.com/elie-gywz5w/rdv')
})

test('http:// EST REFUSÉ, et le message dit quoi faire', () => {
  // Ce lien part dans un e-mail à un inconnu qui vient de donner son numéro.
  // Du http, c'est une page en clair sur un réseau qu'il ne choisit pas.
  const v = lireLienRdv('http://cal.com/plombier')
  assert.ok(!v.ok)
  assert.match(v.message, /https:\/\//)
  // Le message ne doit PAS être le jargon de Postgres.
  assert.ok(!v.message.includes('constraint'), v.message)
  assert.ok(!v.message.includes('violates'), v.message)
})

test('L’ESPACE EST REFUSÉ — c’est la faute la plus fréquente', () => {
  // Un lien collé depuis un e-mail en contient souvent un : le courrier l'a
  // coupé en deux. `https://cal.com/ martin` passerait la contrainte de la
  // base et ne mènerait NULLE PART — une panne muette, dans un message déjà
  // parti au client.
  const v = lireLienRdv('https://cal.com/ martin')
  assert.ok(!v.ok)
  assert.match(v.message, /espace/)
})

test('« https:// » tout seul est refusé ici, là où la base l’accepte', () => {
  // La contrainte SQL ne regarde que le début et la longueur : huit signes
  // qui commencent bien par https:// lui suffisent. L'écran, lui, voit qu'il
  // n'y a pas d'adresse derrière.
  const v = lireLienRdv('https://')
  assert.ok(!v.ok)
  assert.match(v.message, /manque/)
})

test('LA LONGUEUR MAXIMALE EST LA MÊME QUE CELLE DE LA BASE', () => {
  // 300, contrainte `artisans_lien_rdv_https` (migration 0019). Si l'une des
  // deux bouge sans l'autre, l'artisan lirait le jargon de Postgres.
  assert.equal(LIEN_RDV_MAX, 300)

  const pile = 'https://' + 'x'.repeat(LIEN_RDV_MAX - 8)
  assert.equal(pile.length, LIEN_RDV_MAX)
  assert.ok(lireLienRdv(pile).ok, 'exactement 300 doit passer')

  const unDeTrop = pile + 'x'
  const v = lireLienRdv(unDeTrop)
  assert.ok(!v.ok)
  assert.match(v.message, /300/)
})

test('un lien de n’importe quel service passe — on n’impose pas cal.com', () => {
  for (const bon of [
    'https://calendly.com/martin-plomberie/30min',
    'https://cal.com/plomberie-martin',
    'https://plomberie-martin.fr/prendre-rendez-vous',
  ]) {
    assert.ok(lireLienRdv(bon).ok, bon)
  }
})
