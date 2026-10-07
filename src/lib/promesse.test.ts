import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DELAI_PAR_OPERATION,
  OPERATION_PAR_DELAI,
  lienSms,
  reponsePromesse,
  texteSms,
} from './promesse.ts'
import { OPERATIONS_PROMESSE, jetonPour } from './action.ts'
import { analyserSms } from './sms.ts'
import { LIBELLE_BOUTON, MODELE_SMS, QUAND, TITRE_CONFIRMATION } from '../config/promesse.ts'
import { DELAIS, LIBELLE_DELAI } from '../types.ts'

// Se lance avec :  node --test

// ─────────────────────────────────────────────────────────────────────────
// CE QUE COÛTE LE MESSAGE — LA PARTIE QUI SE PAIE EN ARGENT
// ─────────────────────────────────────────────────────────────────────────
// Un SMS est facturé au segment. Un seul caractère hors du jeu GSM fait
// tomber la capacité de 160 à 70, donc double la facture d'un message de
// cent caractères — sans que rien ne le dise. C'est arrivé une fois sur ce
// projet, avec le `{LIEN}` du message de renvoi.
//
// Ces tests emploient `analyserSms`, LE COMPTEUR DU PRODUIT, et pas une
// règle approchée écrite pour l'occasion. Si le compteur se trompe un jour,
// l'écran des réglages et ces tests se trompent ensemble — ce qui est la
// seule façon de s'en apercevoir.

test('LES TROIS MESSAGES TIENNENT DANS UN SEUL SEGMENT', () => {
  for (const delai of DELAIS) {
    const a = analyserSms(texteSms('Plomberie Martin', delai))
    assert.equal(a.segments, 1, `${delai} : ${a.unites} unités`)
    assert.equal(a.unicode, false, delai)
  }
})

test('AUCUN CARACTÈRE NE FAIT BASCULER EN UNICODE — apostrophe droite comprise', () => {
  for (const delai of DELAIS) {
    assert.deepEqual(analyserSms(texteSms('Plomberie Martin', delai)).fautifs, [], delai)
  }

  // CONTRÔLE NÉGATIF, et il n'est pas décoratif : il prouve que le danger
  // existe et que le compteur le voit. La même phrase avec une apostrophe
  // COURBE — celle que met tout traitement de texte — passe en Unicode.
  const courbe = analyserSms('Bonjour, c’est Plomberie Martin. Je vous rappelle dans 15 minutes.')
  assert.equal(courbe.unicode, true)
  assert.deepEqual(courbe.fautifs, ['’'])
})

test('il reste de la place pour un nom d’entreprise long', () => {
  // Un nom de quarante signes, ce qui est déjà beaucoup :
  // « Plomberie Chauffage Martin et Fils SARL » en fait 39.
  const long = 'Plomberie Chauffage Martin et Fils SARLX'
  assert.equal(long.length, 40)
  for (const delai of DELAIS) {
    assert.equal(analyserSms(texteSms(long, delai)).segments, 1, delai)
  }

  // Et combien il en reste vraiment, pour qu'on le sache sans recompter :
  // le plus long des trois messages, avec un nom vide, laisse cette marge.
  const marges = DELAIS.map((d) => 160 - analyserSms(texteSms('', d)).unites)
  assert.ok(Math.min(...marges) >= 100, `marge minimale : ${Math.min(...marges)}`)
})

test('le modèle ne contient plus aucun repère après remplacement', () => {
  // Un `{ENTREPRISE}` oublié partirait tel quel au client, et coûterait
  // double : les accolades sont dans la table d'échappement GSM.
  for (const delai of DELAIS) {
    const texte = texteSms('Plomberie Martin', delai)
    assert.ok(!texte.includes('{'), texte)
    assert.ok(!texte.includes('}'), texte)
  }
  // Et le modèle, lui, porte bien les deux.
  assert.ok(MODELE_SMS.includes('{ENTREPRISE}'))
  assert.ok(MODELE_SMS.includes('{QUAND}'))
})

// ─────────────────────────────────────────────────────────────────────────
// LES TROIS DÉLAIS, ET LEUR CORRESPONDANCE AVEC LES OPÉRATIONS
// ─────────────────────────────────────────────────────────────────────────

test('chaque délai a une opération, et réciproquement', () => {
  for (const delai of DELAIS) {
    assert.equal(DELAI_PAR_OPERATION[OPERATION_PAR_DELAI[delai]], delai)
  }
  assert.deepEqual(
    DELAIS.map((d) => OPERATION_PAR_DELAI[d]).sort(),
    [...OPERATIONS_PROMESSE].sort(),
  )
})

test('L’ORDRE DES BOUTONS EST DU PLUS COURT AU PLUS LONG', () => {
  // Trois boutons côte à côte sur un téléphone : le pouce va au premier.
  // Si « ce soir » passait devant « 15 min », l'artisan promettrait souvent
  // plus tard qu'il ne le pense.
  assert.deepEqual([...DELAIS], ['15min', '1h', 'fin_de_journee'])
})

test('les libellés des boutons sont courts — ils tiennent à trois de front', () => {
  for (const delai of DELAIS) {
    assert.ok(LIBELLE_BOUTON[delai].length <= 10, `${delai} : ${LIBELLE_BOUTON[delai]}`)
    assert.ok(LIBELLE_DELAI[delai].length > 0, delai)
  }
})

test('LE TITRE DE CONFIRMATION DIT LE DÉLAI EN ENTIER', () => {
  // RÈGLE D'OR : on n'annonce jamais au client un délai que l'artisan n'a pas
  // choisi lui-même. Cette page est le dernier écran avant qu'il s'engage ;
  // « 15 min » suffit pour CHOISIR, pas pour PROMETTRE. Le délai doit donc y
  // être écrit comme le client le lira.
  for (const delai of DELAIS) {
    assert.ok(
      TITRE_CONFIRMATION[delai].includes(QUAND[delai]),
      `${delai} : « ${TITRE_CONFIRMATION[delai]} » ne contient pas « ${QUAND[delai]} »`,
    )
  }
})

// ─────────────────────────────────────────────────────────────────────────
// LE LIEN QUI OUVRE LA MESSAGERIE DU TÉLÉPHONE
// ─────────────────────────────────────────────────────────────────────────

test('le lien porte le numéro en +33 et le texte en entier', () => {
  const texte = texteSms('Plomberie Martin', '15min')
  const lien = lienSms('0612345678', texte)
  assert.ok(lien !== null)
  assert.ok(lien.startsWith('sms:+33612345678?&body='))

  // Ce qui compte vraiment : le texte ressort INTACT de l'encodage.
  const corps = decodeURIComponent(lien.slice('sms:+33612345678?&body='.length))
  assert.equal(corps, texte)
})

test('LE « ? » SUIVI D’UN « & » N’EST PAS UNE FAUTE DE FRAPPE', () => {
  // Android attend `?body=`, iOS a longtemps exigé `&body=`. `?&body=`
  // satisfait les deux. Ce test est là pour qu'on ne le « corrige » pas.
  const lien = lienSms('0612345678', 'bonjour')
  assert.ok(lien !== null)
  assert.ok(lien.includes('?&body='), lien)
})

test('les trois écritures d’un numéro donnent le même lien', () => {
  const texte = 'bonjour'
  const attendu = lienSms('+33612345678', texte)
  assert.equal(lienSms('0612345678', texte), attendu)
  assert.equal(lienSms('0033612345678', texte), attendu)
  assert.equal(lienSms('06 12 34 56 78', texte), attendu)
})

test('UN NUMÉRO ILLISIBLE NE DONNE PAS DE LIEN BANCAL', () => {
  // Un `sms:` cassé ouvre une messagerie VIDE, et l'artisan croit avoir
  // envoyé quelque chose. Panne muette : on rend `null`, et la page dira
  // le numéro en clair pour qu'il écrive lui-même.
  for (const mauvais of ['', '   ', '061234567', '+1234', 'je rappelle ce soir']) {
    assert.equal(lienSms(mauvais, 'bonjour'), null, mauvais)
  }
  assert.equal(lienSms(null, 'bonjour'), null)
})

// ─────────────────────────────────────────────────────────────────────────
// CE QUE L'ARTISAN LIT APRÈS AVOIR TOUCHÉ
// ─────────────────────────────────────────────────────────────────────────

test('QUARANTE-HUIT HEURES, ET LE MESSAGE NE DIT PAS TRENTE JOURS', () => {
  // `promettre_rappel` rend « expire » au bout de deux jours, là où les deux
  // autres boutons en ont trente. Le même mot, deux durées : si la page
  // affichait le message générique, elle mentirait à l'artisan.
  const r = reponsePromesse('expire')
  assert.equal(r.bon, false)
  assert.ok(!r.detail.includes('trente jours'), r.detail)
  assert.ok(r.detail.includes('deux jours'), r.detail)

  // Contrôle négatif : pour les deux autres boutons, c'est bien trente jours
  // qui s'affiche. Les deux messages existent et ne se confondent pas.
  assert.ok(reponsePromesse('refuse').detail.length > 0)
})

test('« c’est déjà noté » est un succès, pas une erreur', () => {
  // Deux touchers sur le même délai : sa promesse EST enregistrée. Lui
  // montrer un écran d'échec lui ferait croire qu'il a raté quelque chose.
  assert.equal(reponsePromesse('inchange').bon, true)
  assert.equal(reponsePromesse('ok').bon, true)
  assert.equal(reponsePromesse('refuse').bon, false)
  assert.equal(reponsePromesse('inconnue').bon, false)
})

test('un mot inattendu de la base reste un écran lisible', () => {
  const r = reponsePromesse('quelque chose de neuf')
  assert.equal(r.bon, false)
  assert.ok(r.titre.length > 0)
})

// ─────────────────────────────────────────────────────────────────────────
// LE JETON — DEUX IMPLÉMENTATIONS DE SHA-256 QUI DOIVENT S'ACCORDER
// ─────────────────────────────────────────────────────────────────────────

test('LE JETON CALCULÉ ICI EST CELUI QUE POSTGRES ATTEND', async () => {
  // Valeur RELEVÉE DANS LA VRAIE BASE le 7 octobre 2026, en transaction
  // annulée (contrôle C12) :
  //
  //   select encode(extensions.digest('cle_de_test_0018:promesse_15min',
  //                                   'sha256'), 'hex');
  //
  // Si le TypeScript et le PL/pgSQL dérivent un jour l'un de l'autre, ce
  // test tombe — et aucun bouton de promesse ne marcherait plus.
  assert.equal(
    await jetonPour('cle_de_test_0018', 'promesse_15min'),
    'fb6492bc20075edc14bae58242e8be026ab04a43cf3c78ff31ca94b82b6d9e32',
  )
})

test('chaque délai a son propre jeton — un lien ne peut pas en faire un autre', async () => {
  const cle = 'cle_de_test_0018'
  const jetons = await Promise.all(OPERATIONS_PROMESSE.map((op) => jetonPour(cle, op)))
  assert.equal(new Set(jetons).size, OPERATIONS_PROMESSE.length)

  // Et aucun ne vaut celui de « c'est fait » : c'est ce qui garantit que le
  // lien de l'un ne peut pas déclencher l'autre. Vérifié aussi dans la base,
  // contrôle C11.
  jetons.push(await jetonPour(cle, 'fait'))
  assert.equal(new Set(jetons).size, OPERATIONS_PROMESSE.length + 1)
})
