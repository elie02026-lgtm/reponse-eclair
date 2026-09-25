import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renvoi, delaiLegal, DELAI_DEFAUT } from './renvoi.ts'

// Se lance avec :  node --test

const NUMERO = '+33756123456'

function ok(n: string | null = NUMERO, d?: number) {
  const r = d === undefined ? renvoi(n) : renvoi(n, d)
  assert.equal(r.etat, 'ok', `attendu lisible : ${n}`)
  if (r.etat !== 'ok') throw new Error('inatteignable')
  return r
}

// ─────────────────────────────────────────────────────────────────────────
// LES CODES, CARACTÈRE PAR CARACTÈRE
// ─────────────────────────────────────────────────────────────────────────
// Un code de renvoi faux ne dit jamais qu'il est faux : l'opérateur répond
// « Service activé », et les appels partent ailleurs. On ne peut donc pas
// s'en remettre à l'essai — il faut que le code soit juste à l'écriture.

test('les trois codes, tels que l’artisan doit les taper', () => {
  const r = ok()
  assert.deepEqual(
    r.activer.map((c) => c.code),
    ['**61*0756123456*11*20#', '**67*0756123456#', '**62*0756123456#'],
  )
})

test('les trois façons de ne pas décrocher sont toutes couvertes', () => {
  // Poser 61 seul laisse passer « déjà en ligne » et « téléphone éteint » —
  // deux cas où l'appel part à la messagerie et où le lead est perdu sans
  // qu'aucun écran ne le sache.
  assert.deepEqual(
    ok().activer.map((c) => c.cle),
    ['non-reponse', 'occupe', 'injoignable'],
  )
})

test('le numéro part en forme NATIONALE, pas en +33', () => {
  // Dix chiffres à taper sur un clavier, sans appui long sur le 0.
  const r = ok()
  assert.equal(r.numero, '0756123456')
  for (const c of r.activer) assert.equal(c.code.includes('+'), false)
})

test('le code d’annulation remet tout, messagerie comprise', () => {
  // ##61# n'annulerait qu'un cas sur trois. On donne le code qui efface
  // tous les renvois : c'est celui dont on a besoin quand on a peur.
  assert.equal(ok().annuler, '##002#')
})

test('le code de vérification ne change rien', () => {
  // *#61# interroge, **61* écrit. Un seul caractère les sépare, et c'est
  // celui-là qu'on donne à quelqu'un qui veut juste savoir où il en est.
  const r = ok()
  assert.equal(r.verifier, '*#61#')
  assert.equal(r.verifier.startsWith('*#'), true)
  assert.equal(r.verifier.startsWith('**'), false)
})

// ─────────────────────────────────────────────────────────────────────────
// LE DÉLAI
// ─────────────────────────────────────────────────────────────────────────

test('le délai par défaut est 20 secondes, et il est dans le code', () => {
  assert.equal(DELAI_DEFAUT, 20)
  assert.equal(ok().delai, 20)
  assert.match(ok().activer[0].code, /\*11\*20#$/)
})

test('LE RÉSEAU N’ACCEPTE QU’UN MULTIPLE DE 5, ENTRE 5 ET 30', () => {
  // Hors de cette grille, l'opérateur refuse — ou pire, accepte et ignore.
  assert.equal(delaiLegal(5), 5)
  assert.equal(delaiLegal(30), 30)
  assert.equal(delaiLegal(0), 5) // sous le plancher
  assert.equal(delaiLegal(-10), 5)
  assert.equal(delaiLegal(45), 30) // au-dessus du plafond
  assert.equal(delaiLegal(17), 15) // arrondi au pas de 5
  assert.equal(delaiLegal(18), 20)
  assert.equal(delaiLegal(22.5), 25)
})

test('un délai absurde ne fabrique jamais un code absurde', () => {
  assert.match(ok(NUMERO, 999).activer[0].code, /\*11\*30#$/)
  assert.match(ok(NUMERO, Number.NaN).activer[0].code, /\*11\*20#$/)
  assert.match(ok(NUMERO, Number.POSITIVE_INFINITY).activer[0].code, /\*11\*20#$/)
})

test('tous les délais légaux produisent un code bien formé', () => {
  for (let d = 5; d <= 30; d += 5) {
    assert.equal(renvoi(NUMERO, d).etat, 'ok')
    assert.match(ok(NUMERO, d).activer[0].code, /^\*\*61\*0\d{9}\*11\*\d{1,2}#$/)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// CE QU'ON REFUSE D'AFFICHER
// ─────────────────────────────────────────────────────────────────────────

test('sans numéro attribué, il n’y a rien à taper — et on le dit', () => {
  for (const vide of [null, undefined, '', '   ']) {
    assert.equal(renvoi(vide).etat, 'sans-numero')
  }
})

test('UN NUMÉRO QU’ON NE SAIT PAS RELIRE NE DONNE PAS UN CODE APPROXIMATIF', () => {
  // C'est le cœur du fichier. Un code composé sur un numéro douteux
  // renvoie les appels dans le vide, en annonçant « Service activé ».
  // Un écran qui avoue vaut mieux qu'un renvoi qui ment.
  for (const faux of ['0756123456', '+33 7 56 12 34 56 78', '+1234', 'aucun', '+330612345678']) {
    const r = renvoi(faux)
    assert.equal(r.etat, 'numero-illisible', `${faux} aurait dû être refusé`)
    assert.equal(r.etat === 'numero-illisible' && r.brut, faux)
  }
})

test('on n’accepte QUE la forme que Twilio écrit en base', () => {
  // `lireTelephone` tolère « 0033… » et « 06.12… » : c'est bon pour un
  // humain qui tape, pas pour un numéro écrit par une machine. Ici, une
  // écriture inattendue est une anomalie, pas une variante.
  assert.equal(renvoi('0033756123456').etat, 'numero-illisible')
  assert.equal(renvoi('+33756123456').etat, 'ok')
})

test('les séparateurs que Twilio n’écrit pas sont tout de même tolérés', () => {
  // Au cas où le numéro soit un jour saisi à la main dans la fiche.
  for (const ecriture of ['+33 756 12 34 56', '+33-756-123-456', '+33 (756) 123456']) {
    assert.equal(renvoi(ecriture).etat, 'ok', ecriture)
    assert.equal(ok(ecriture).numero, '0756123456')
  }
})
