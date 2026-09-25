import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lireParametre } from './lien.ts'
import { lireTelephone } from './telephone.ts'

// Se lance avec :  node --test

// ─────────────────────────────────────────────────────────────────────────
// LE BUG, ET SON TÉMOIN
// ─────────────────────────────────────────────────────────────────────────

test('LE « + » SURVIT — c’est toute la raison d’être de ce fichier', () => {
  assert.equal(lireParametre('?t=+33612345678', 't'), '+33612345678')
})

test('et `URLSearchParams`, elle, l’aurait transformé en espace', () => {
  // Témoin inverse : si ce test tombait un jour, c'est que la plateforme
  // a changé d'avis et que `lien.ts` n'a plus de raison d'exister.
  assert.equal(new URLSearchParams('?t=+33612345678').get('t'), ' 33612345678')
})

test('un numéro passé en clair reste lisible par `lireTelephone`', () => {
  // Le vrai enjeu : pas la chaîne rendue, mais le champ pré-rempli.
  for (const ecriture of ['+33612345678', '%2B33612345678', '0612345678']) {
    const lu = lireTelephone(lireParametre(`?a=GYZGYQZU&t=${ecriture}`, 't'))
    assert.equal(lu.etat, 'ok', `${ecriture} aurait dû être lisible`)
    assert.equal(lu.etat === 'ok' && lu.affichage, '06 12 34 56 78')
  }
})

test('sans ce module, deux de ces trois écritures étaient cassées', () => {
  // La mesure de ce qu'on répare, pour qu'on ne « simplifie » pas le
  // module en revenant à URLSearchParams.
  const casses = ['+33612345678', '%2B33612345678', '0612345678'].filter(
    (e) => lireTelephone(new URLSearchParams(`?t=${e}`).get('t')).etat !== 'ok',
  )
  assert.deepEqual(casses, ['+33612345678'])
})

// ─────────────────────────────────────────────────────────────────────────
// CE QU'UNE PAGE PUBLIQUE REÇOIT VRAIMENT
// ─────────────────────────────────────────────────────────────────────────

test('un paramètre absent rend une chaîne vide, pas `undefined`', () => {
  assert.equal(lireParametre('?a=GYZGYQZU', 't'), '')
  assert.equal(lireParametre('', 't'), '')
  assert.equal(lireParametre('?', 't'), '')
})

test('un paramètre présent mais vide rend aussi une chaîne vide', () => {
  assert.equal(lireParametre('?t=&a=GYZGYQZU', 't'), '')
  assert.equal(lireParametre('?t&a=GYZGYQZU', 't'), '')
})

test('le « ? » de tête est facultatif', () => {
  assert.equal(lireParametre('a=GYZGYQZU', 'a'), 'GYZGYQZU')
  assert.equal(lireParametre('?a=GYZGYQZU', 'a'), 'GYZGYQZU')
})

test('un nom de paramètre n’est pas un préfixe : « t » ne lit pas « tel »', () => {
  assert.equal(lireParametre('?tel=0612345678', 't'), '')
  assert.equal(lireParametre('?at=x&a=bon', 'a'), 'bon')
})

test('UNE SÉQUENCE %% ABSURDE NE DOIT PAS BLANCHIR LA PAGE', () => {
  // `decodeURIComponent('%zz')` lève. Cette page est ouverte à tous : une
  // adresse tronquée par une messagerie ne doit pas faire un écran blanc.
  assert.equal(lireParametre('?t=%zz', 't'), '%zz')
  assert.equal(lireParametre('?t=100%', 't'), '100%')

  // Et « %E9 », qui EST une séquence bien formée — mais en latin-1, pas en
  // UTF-8, où « é » s'écrit « %C3%A9 ». `decodeURIComponent` lève donc,
  // et on rend le texte d'origine. J'avais écrit ici que ça donnait « é » :
  // c'était faux, et c'est le test qui l'a dit.
  assert.equal(lireParametre('?t=%E9', 't'), '%E9')
  assert.equal(lireParametre('?t=%C3%A9', 't'), 'é')
})

test('les espaces écrits %20 restent des espaces', () => {
  assert.equal(lireParametre('?t=06%2012%2034', 't'), '06 12 34')
})

test('un doublon : la première valeur gagne, comme URLSearchParams', () => {
  assert.equal(lireParametre('?t=premier&t=second', 't'), 'premier')
})

test('un « = » dans la valeur n’est pas coupé en deux', () => {
  assert.equal(lireParametre('?q=a=b', 'q'), 'a=b')
})

test('une clé elle-même encodée est retrouvée', () => {
  assert.equal(lireParametre('?%61=trouve', 'a'), 'trouve')
})
