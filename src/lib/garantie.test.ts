import { test } from 'node:test'
import assert from 'node:assert/strict'
import { etatGarantie, libelleGarantie } from './garantie.ts'
import {
  DEMANDES_GARANTIE,
  JOURS_GARANTIE,
  NOM_GARANTIE,
  TEXTE_GARANTIE,
} from '../config/offre.ts'

// Se lance avec :  node --test
//
// CE COMPTEUR EST UNE CLAUSE DE CONTRAT, pas un ornement. Les CGV disent
// « c'est le logiciel qui les compte ». Un compteur faux est donc une
// promesse non tenue, et la RÈGLE D'OR du projet dit qu'une promesse non
// tenue fait plus de dégâts qu'un message flou.

const JOUR = 24 * 60 * 60 * 1000
const CREATION = '2026-09-01T10:00:00.000Z'
const apres = (jours: number, heures = 0) =>
  new Date(new Date(CREATION).getTime() + jours * JOUR + heures * 3_600_000)

// ─────────────────────────────────────────────────────────────────────────
// LE CAS ORDINAIRE
// ─────────────────────────────────────────────────────────────────────────

test('la garantie court : on voit les demandes reçues et les jours restants', () => {
  const g = etatGarantie(CREATION, 3, apres(10))
  assert.equal(g.etat, 'en-cours')
  if (g.etat !== 'en-cours') throw new Error('inatteignable')
  assert.equal(g.recues, 3)
  assert.equal(g.requises, 5)
  assert.equal(g.joursRestants, 50)
  assert.equal(libelleGarantie(g), '3 sur 5')
})

test('zéro demande le premier jour affiche bien 0 sur 5', () => {
  const g = etatGarantie(CREATION, 0, apres(0, 1))
  assert.equal(libelleGarantie(g), '0 sur 5')
})

// ─────────────────────────────────────────────────────────────────────────
// LES DEUX FAÇONS DE SORTIR DE LA GARANTIE
// ─────────────────────────────────────────────────────────────────────────

test('la cinquième demande met fin à la garantie, et le compteur disparaît', () => {
  const g = etatGarantie(CREATION, 5, apres(10))
  assert.equal(g.etat, 'atteinte')
  assert.equal(libelleGarantie(g), null, 'le compteur doit disparaître')
})

test('au-delà de soixante jours avec moins de cinq demandes, la garantie est expirée', () => {
  const g = etatGarantie(CREATION, 4, apres(61))
  assert.equal(g.etat, 'expiree')
  assert.equal(libelleGarantie(g), null, 'le compteur doit disparaître')
})

test('LA CINQUIÈME DEMANDE L’EMPORTE SUR LE DÉLAI, MÊME APRÈS SOIXANTE JOURS', () => {
  // Arbitrage écrit noir sur blanc. Les CGV disent « vous ne payez rien
  // avant d'avoir reçu 5 demandes » AVANT de parler des 60 jours. Un artisan
  // qui reçoit sa cinquième le 61e jour a donc atteint la garantie ; il ne
  // l'a pas laissée expirer. L'interprétation inverse nous serait plus
  // favorable, donc c'est celle qu'il faut empêcher par un test.
  const g = etatGarantie(CREATION, 5, apres(100))
  assert.equal(g.etat, 'atteinte')
})

// ─────────────────────────────────────────────────────────────────────────
// LES BORDS DU DÉLAI — C'EST LÀ QUE LES COMPTEURS MENTENT
// ─────────────────────────────────────────────────────────────────────────

test('à une heure de l’échéance il reste « 1 jour », jamais « 0 »', () => {
  // Afficher « 0 jour restant » pendant que la garantie court encore ferait
  // croire à l'artisan qu'il l'a perdue, et le pousserait à arrêter la
  // veille de son droit.
  const g = etatGarantie(CREATION, 1, apres(59, 23))
  assert.equal(g.etat, 'en-cours')
  if (g.etat !== 'en-cours') throw new Error('inatteignable')
  assert.equal(g.joursRestants, 1)
})

test('à la seconde exacte de l’échéance, la garantie est expirée', () => {
  const g = etatGarantie(CREATION, 1, apres(JOURS_GARANTIE))
  assert.equal(g.etat, 'expiree')
})

test('une seconde avant l’échéance, elle court encore', () => {
  const g = etatGarantie(CREATION, 1, new Date(apres(JOURS_GARANTIE).getTime() - 1000))
  assert.equal(g.etat, 'en-cours')
})

test('le premier jour, il reste bien soixante jours', () => {
  const g = etatGarantie(CREATION, 0, new Date(CREATION))
  assert.equal(g.etat, 'en-cours')
  if (g.etat !== 'en-cours') throw new Error('inatteignable')
  assert.equal(g.joursRestants, JOURS_GARANTIE)
})

// ─────────────────────────────────────────────────────────────────────────
// CE QUI ARRIVE QUAND LA BASE NE DIT PAS TOUT
// ─────────────────────────────────────────────────────────────────────────

test('sans date de création, on n’affiche RIEN plutôt qu’un décompte inventé', () => {
  // `artisans.cree_le` est nullable en base : `default now()`, sans
  // `not null` (migration 0001). Les trois fiches actuelles l'ont, mais le
  // type le permet, donc le code doit le permettre.
  assert.equal(etatGarantie(null, 2, apres(10)).etat, 'inconnue')
  assert.equal(etatGarantie('', 2, apres(10)).etat, 'inconnue')
  assert.equal(libelleGarantie(etatGarantie(null, 2, apres(10))), null)
})

test('une date illisible ne produit pas « NaN jours restants »', () => {
  // `new Date('bonjour')` rend NaN sans lever, et NaN traverse tous les
  // calculs suivants en silence jusqu'à l'écran.
  const g = etatGarantie('bonjour', 2, apres(10))
  assert.equal(g.etat, 'inconnue')
})

test('une horloge en avance ne fait pas apparaître de jours négatifs', () => {
  // Le 28 septembre, l'horloge de la machine était sur Asia/Jerusalem alors
  // qu'Elie est en France : trois bugs de dates en sont sortis. Une date de
  // création dans le futur doit rester lisible.
  const g = etatGarantie(CREATION, 1, new Date(new Date(CREATION).getTime() - 5 * JOUR))
  assert.equal(g.etat, 'en-cours')
  if (g.etat !== 'en-cours') throw new Error('inatteignable')
  assert.ok(g.joursRestants > JOURS_GARANTIE, 'une date future ne doit pas raccourcir le délai')
})

test('cinq demandes sans date de création restent une garantie ATTEINTE', () => {
  // La demande l'emporte : on ne va pas priver un artisan du bénéfice de la
  // clause parce qu'une colonne facultative est vide.
  assert.equal(etatGarantie(null, 5, apres(10)).etat, 'atteinte')
})

// ─────────────────────────────────────────────────────────────────────────
// LE TEXTE ET LES NOMBRES NE DOIVENT PAS DIVERGER
// ─────────────────────────────────────────────────────────────────────────
// `TEXTE_GARANTIE` est de la prose écrite par Elie ; `DEMANDES_GARANTIE` et
// `JOURS_GARANTIE` pilotent le compteur. Rien n'empêche de changer l'un sans
// l'autre — sauf ces deux tests. Le jour où la garantie passe à 3 demandes,
// ils tombent, et on se souvient qu'il y a aussi une phrase à corriger.

test('le texte de la garantie parle bien du même nombre de demandes', () => {
  assert.ok(
    TEXTE_GARANTIE.includes(`${DEMANDES_GARANTIE} demandes`),
    `le texte ne mentionne pas « ${DEMANDES_GARANTIE} demandes » : ${TEXTE_GARANTIE}`,
  )
})

test('le texte de la garantie parle bien du même délai', () => {
  assert.ok(
    TEXTE_GARANTIE.includes(`${JOURS_GARANTIE} jours`),
    `le texte ne mentionne pas « ${JOURS_GARANTIE} jours » : ${TEXTE_GARANTIE}`,
  )
})

test('le nom de la garantie porte le même nombre que le compteur', () => {
  assert.ok(NOM_GARANTIE.includes(String(DEMANDES_GARANTIE)), NOM_GARANTIE)
})

test('le texte promet un compteur dans les réglages — et il existe', () => {
  // Cette phrase est dans les CGV. Si quelqu'un retire le compteur de
  // l'écran sans toucher au texte, le contrat promet un écran qui n'existe
  // plus. Ce test ne peut pas voir React ; il vérifie au moins que la
  // promesse et la fonction qui la tient vivent dans le même dépôt.
  assert.ok(TEXTE_GARANTIE.includes('réglages'))
  assert.equal(typeof libelleGarantie, 'function')
})
