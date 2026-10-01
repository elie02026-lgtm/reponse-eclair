import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  OPERATIONS,
  estOperation,
  jetonValide,
  lireIdDemande,
  jetonPour,
  nouvelleCleAction,
  reponseDe,
  REPONSE_INATTENDUE,
  LIBELLE_OPERATION,
} from './action.ts'

// Se lance avec :  node --test

// ─────────────────────────────────────────────────────────────────────────
// LE TEST QUI COMPTE : DEUX SHA-256 DOIVENT S'ACCORDER
// ─────────────────────────────────────────────────────────────────────────
// Le Worker fabrique les jetons en TypeScript (`crypto.subtle`), Postgres
// les recalcule en PL/pgSQL (`extensions.digest`). Si les deux divergent,
// AUCUN lien d'e-mail ne marche — et l'erreur rendue est « refuse », donc
// indiscernable d'une attaque. C'est le genre de panne qu'on met une
// journée à comprendre.
//
// Les empreintes ci-dessous ont été RELEVÉES DANS LA VRAIE BASE le
// 1ᵉʳ octobre 2026, avec :
//     select encode(extensions.digest('CLE-TEMOIN-0014:fait','sha256'),'hex');
// Ce ne sont donc pas des valeurs que j'ai calculées moi-même puis
// comparées à moi-même : elles viennent de l'autre implémentation.

const MESURES: [string, string, string][] = [
  ['CLE-TEMOIN-0014', 'fait', 'ce34d7627b7967ff8c2103c5a84da6fe77008d335a5ca5c86f370df0e63e9c8f'],
  ['CLE-TEMOIN-0014', 'pas_urgent', 'e3667977f7c9f2587f55d37cec62e196f86ac5bce3c22e10129392213a0d8c5e'],
  // Avec des accents : Postgres encode en UTF-8, `TextEncoder` aussi. Si
  // l'un des deux passait en latin-1 un jour, ce cas-ci le dirait.
  ['clé-é', 'fait', '639eef8e9deae8ae156ba0e35aea24b810ae9c97409503912ae5701e1f6b1d24'],
]

test('LE JETON CALCULÉ ICI EST CELUI QUE POSTGRES ATTEND', async () => {
  for (const [cle, op, attendu] of MESURES) {
    const obtenu = await jetonPour(cle, op as 'fait')
    assert.equal(obtenu, attendu, `${cle}:${op}`)
  }
})

test('les deux boutons d’une même demande ont des jetons DIFFÉRENTS', async () => {
  // C'est toute l'exigence « une seule opération par lien ». Si les deux
  // étaient égaux, le lien « c'est fait » servirait à corriger la gravité.
  const cle = nouvelleCleAction()
  const a = await jetonPour(cle, 'fait')
  const b = await jetonPour(cle, 'pas_urgent')
  assert.notEqual(a, b)
})

test('deux demandes n’ont jamais la même clé', () => {
  const vues = new Set<string>()
  for (let i = 0; i < 500; i++) vues.add(nouvelleCleAction())
  assert.equal(vues.size, 500)
})

test('une clé fait 64 caractères hexadécimaux, soit 32 octets', () => {
  const cle = nouvelleCleAction()
  assert.match(cle, /^[0-9a-f]{64}$/)
})

test('un jeton fait 64 caractères hexadécimaux minuscules', async () => {
  assert.ok(jetonValide(await jetonPour(nouvelleCleAction(), 'fait')))
})

// ─────────────────────────────────────────────────────────────────────────
// CE QU'UN INCONNU PEUT METTRE DANS L'URL
// ─────────────────────────────────────────────────────────────────────────
// Cette adresse est publique et agit sans connexion. Tout ce qui n'est pas
// exactement conforme doit être refusé AVANT d'atteindre la base.

test('un jeton qui n’en est pas un est refusé sans déranger Postgres', () => {
  for (const mauvais of [
    '',
    'abc',
    'A'.repeat(64), // majuscules : l'empreinte est en minuscules
    'g'.repeat(64), // g n'est pas hexadécimal
    '0'.repeat(63),
    '0'.repeat(65),
    "0'; drop table demandes; --",
  ]) {
    assert.equal(jetonValide(mauvais), false, mauvais)
  }
})

test('l’identifiant n’accepte que des entiers positifs écrits en chiffres', () => {
  assert.equal(lireIdDemande('42'), 42)
  assert.equal(lireIdDemande('1'), 1)
  for (const mauvais of [
    '0', // aucune demande n'a l'identifiant 0
    '-1',
    '1.5',
    '1e3', // PIÈGE : Number('1e3') vaut 1000
    ' 42',
    '42 ',
    '0x2a',
    '',
    'douze',
    '99999999999999999999', // au-delà de l'entier sûr
  ]) {
    assert.equal(lireIdDemande(mauvais), null, mauvais)
  }
})

test('l’opération est une liste blanche, pas du texte libre', () => {
  for (const op of OPERATIONS) assert.ok(estOperation(op))
  for (const mauvais of ['supprimer', 'FAIT', 'fait ', '', 'signe']) {
    assert.equal(estOperation(mauvais), false, mauvais)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ARTISAN LIT
// ─────────────────────────────────────────────────────────────────────────

test('aucun mot de la base n’arrive tel quel devant l’artisan', () => {
  for (const brut of ['ok', 'refuse', 'expire', 'inconnue', 'operation_inconnue']) {
    const r = reponseDe(brut)
    assert.ok(r.titre.length > 0)
    assert.ok(!r.titre.includes(brut), `« ${brut} » apparaît tel quel`)
  }
})

test('un résultat inattendu reste un message lisible, pas un écran blanc', () => {
  assert.deepEqual(reponseDe('zzz'), REPONSE_INATTENDUE)
  assert.equal(reponseDe('zzz').bon, false)
})

test('seule la réussite est annoncée comme une réussite', () => {
  assert.equal(reponseDe('ok').bon, true)
  for (const echec of ['refuse', 'expire', 'inconnue', 'operation_inconnue', 'zzz']) {
    assert.equal(reponseDe(echec).bon, false, echec)
  }
})

test('UN JETON FAUX ET UNE DEMANDE INCONNUE DISENT LA MÊME CHOSE', () => {
  // Distinguer les deux apprendrait à un curieux quels identifiants
  // existent. C'est la seule raison pour laquelle ces deux messages sont
  // identiques — ce n'est pas une négligence de rédaction.
  assert.deepEqual(reponseDe('refuse'), reponseDe('inconnue'))
})

test('chaque opération a un libellé de bouton', () => {
  for (const op of OPERATIONS) {
    assert.ok(LIBELLE_OPERATION[op].length > 0, op)
  }
})
