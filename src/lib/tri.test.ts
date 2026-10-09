import { test } from 'node:test'
import assert from 'node:assert/strict'
import { trier, graviteEffective, estCorrigee, plancherReponses } from './tri.ts'
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
    promesse: null,
    promesse_le: null,
    eau_coule: null,
    arrivee_coupee: null,
    chauffage: null,
    eau_chaude: null,
    chauffage_eau_chaude: null,
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

// ─────────────────────────────────────────────────────────────────────────
// LE PLANCHER DE GRAVITÉ (7 octobre 2026)
// ─────────────────────────────────────────────────────────────────────────
// Posé après un défaut MESURÉ : une demande sans description, « l'eau coule
// oui, pas coupée », a été classée gravité 1 par le modèle — le client le
// plus urgent, rangé en dernier. Le prompt a été corrigé et il tient, mais
// un prompt reste une consigne. Ceci est du calcul.


test('L’EAU COULE ET RIEN N’EST COUPÉ : plancher 3, même si le modèle dit 1', () => {
  // Le cas exact du 7 octobre.
  const x = d({ id: 1, gravite: 1, eau_coule: 'oui', arrivee_coupee: 'non' })
  assert.equal(plancherReponses(x), 3)
  assert.equal(graviteEffective(x), 3)
})

test('« je ne sais pas » compte comme « non »', () => {
  const x = d({ id: 1, gravite: 1, eau_coule: 'oui', arrivee_coupee: 'je-ne-sais-pas' })
  assert.equal(graviteEffective(x), 3)
})

test('l’eau coule mais c’est coupé : plancher 2, pas 3', () => {
  const x = d({ id: 1, gravite: 1, eau_coule: 'oui', arrivee_coupee: 'oui' })
  assert.equal(graviteEffective(x), 2)
})

// ─────────────────────────────────────────────────────────────────────────
// LE CHAUFFAGE ET L'EAU CHAUDE, SÉPARÉS (9 octobre 2026)
// ─────────────────────────────────────────────────────────────────────────
// Une seule question les mélangeait, et le plancher était donc plat à 2 :
// un « non » pouvait vouloir dire « plus d'eau chaude », qui est gênant, ou
// « plus de chauffage en janvier », qui est dangereux. Séparées, chacune
// peut dire ce qu'elle vaut.

const JANVIER = '2026-01-15T10:00:00.000Z'
const JUILLET = '2026-07-15T10:00:00.000Z'

test('PLUS DE CHAUFFAGE EN JANVIER : 3', () => {
  const x = d({ id: 1, gravite: 1, chauffage: 'non', recue_le: JANVIER })
  assert.equal(plancherReponses(x), 3)
  assert.equal(graviteEffective(x), 3)
})

test('plus de chauffage en juillet : 2 — c’est gênant, pas dangereux', () => {
  const x = d({ id: 1, gravite: 1, chauffage: 'non', recue_le: JUILLET })
  assert.equal(plancherReponses(x), 2)
})

test('PLUS D’EAU CHAUDE : 2 TOUTE L’ANNÉE, même en janvier', () => {
  // C'est là que la séparation se voit. Avant, ce cas et le précédent
  // étaient le même bouton et ne pouvaient donc valoir que 2 tous les deux.
  assert.equal(plancherReponses(d({ id: 1, eau_chaude: 'non', recue_le: JANVIER })), 2)
  assert.equal(plancherReponses(d({ id: 2, eau_chaude: 'non', recue_le: JUILLET })), 2)
})

test('LA SAISON VIENT DE LA DEMANDE, PAS DE L’HORLOGE', () => {
  // `recue_le` est le moment où le client a écrit. Avec `now()`, une demande
  // de janvier relue en juillet changerait de gravité toute seule — et cette
  // fonction cesserait d'être pure, donc testable.
  const janvier = d({ id: 1, chauffage: 'non', recue_le: JANVIER })
  const juillet = d({ id: 2, chauffage: 'non', recue_le: JUILLET })
  assert.notEqual(plancherReponses(janvier), plancherReponses(juillet))
})

test('les bornes de la période froide : octobre et mars en sont, avril non', () => {
  const p = (iso: string) => plancherReponses(d({ id: 1, chauffage: 'non', recue_le: iso }))
  assert.equal(p('2026-10-01T08:00:00.000Z'), 3, '1er octobre')
  assert.equal(p('2026-03-31T08:00:00.000Z'), 3, '31 mars')
  assert.equal(p('2026-04-01T08:00:00.000Z'), 2, '1er avril')
  assert.equal(p('2026-09-30T08:00:00.000Z'), 2, '30 septembre')
})

test('la saison se lit à l’heure de PARIS, pas à celle de l’appareil', () => {
  // 30 septembre 23 h 30 UTC, c'est le 1er octobre à Paris. Avec
  // `getMonth()` sur un appareil réglé à Londres, ce serait septembre.
  assert.equal(
    plancherReponses(d({ id: 1, chauffage: 'non', recue_le: '2026-09-30T23:30:00.000Z' })),
    3,
  )
})

test('L’ANCIENNE QUESTION FUSIONNÉE VAUT ENCORE 2, le temps que Make suive', () => {
  // Entre la migration 0021 et la modification du module 5, les demandes
  // arrivent avec l'ancienne colonne renseignée et les deux neuves vides.
  // On continue de la lire, à la valeur prudente. À retirer avec la 0022.
  const x = d({ id: 1, gravite: 1, chauffage_eau_chaude: 'non', recue_le: JANVIER })
  assert.equal(plancherReponses(x), 2)
})

test('le modèle, lui, peut monter à 3 — le plancher ne l’en empêche pas', () => {
  // S'il lit « plus aucun chauffage depuis trois jours » dans la
  // description, il a vu ce que le bouton ne dit pas.
  const x = d({ id: 1, gravite: 3, eau_chaude: 'non', recue_le: JUILLET })
  assert.equal(graviteEffective(x), 3)
})

test('LE PLANCHER NE BAISSE JAMAIS RIEN', () => {
  // Si le modèle a lu dans la description quelque chose de plus grave que
  // ce que les boutons disent, c'est le modèle qui gagne. Un plancher qui
  // plafonnerait serait une censure.
  const x = d({ id: 1, gravite: 3, eau_coule: 'oui', arrivee_coupee: 'oui' })
  assert.equal(plancherReponses(x), 2)
  assert.equal(graviteEffective(x), 3)
})

test('L’ARTISAN L’EMPORTE SUR LE PLANCHER', () => {
  // Il connaît son métier, sa ville, et c'est lui qui se déplacera. Dire
  // « pas si urgent » doit rester possible même sur une fuite déclarée.
  const x = d({ id: 1, gravite: 3, gravite_corrigee: 1, eau_coule: 'oui', arrivee_coupee: 'non' })
  assert.equal(graviteEffective(x), 1)
})

// ───────────────────────────────────────────────────────────────────────────
// QUAND PLUSIEURS RÈGLES MORDENT, C'EST LA PLUS GRAVE QUI COMMANDE
//
// Ces cinq tests viennent d'un défaut mesuré sur la demande 71, le 9 octobre
// 2026 : « l'eau coule oui », « coupée oui », « chauffage non ». La fonction
// était une cascade de `return` ; elle rendait 2 et ne regardait jamais le
// chauffage. Le deuxième test est le plus parlant : SANS la fuite, elle
// rendait 3. Ajouter une panne faisait baisser le plancher.
// ───────────────────────────────────────────────────────────────────────────

test('FUITE MAÎTRISÉE + PLUS DE CHAUFFAGE EN JANVIER : 3, pas 2', () => {
  const x = d({
    id: 1,
    eau_coule: 'oui',
    arrivee_coupee: 'oui',
    chauffage: 'non',
    recue_le: JANVIER,
  })
  assert.equal(plancherReponses(x), 3)
})

test('AJOUTER UNE PANNE NE DOIT JAMAIS FAIRE BAISSER LE PLANCHER', () => {
  const sansFuite = d({ id: 1, chauffage: 'non', recue_le: JANVIER })
  const avecFuiteMaitrisee = d({
    id: 2,
    chauffage: 'non',
    recue_le: JANVIER,
    eau_coule: 'oui',
    arrivee_coupee: 'oui',
  })
  const a = plancherReponses(sansFuite)!
  const b = plancherReponses(avecFuiteMaitrisee)!
  assert.ok(b >= a, `ajouter une fuite a fait passer le plancher de ${a} à ${b}`)
})

test('en juillet, les deux mêmes règles donnent 2 : la saison compte encore', () => {
  const x = d({
    id: 1,
    eau_coule: 'oui',
    arrivee_coupee: 'oui',
    chauffage: 'non',
    recue_le: JUILLET,
  })
  assert.equal(plancherReponses(x), 2)
})

test('une fuite NON maîtrisée reste à 3 même si tout le reste va bien', () => {
  const x = d({
    id: 1,
    eau_coule: 'oui',
    arrivee_coupee: 'non',
    chauffage: 'oui',
    eau_chaude: 'oui',
    recue_le: JUILLET,
  })
  assert.equal(plancherReponses(x), 3)
})

test('les quatre pannes à la fois : 3, et une seule fois', () => {
  const x = d({
    id: 1,
    eau_coule: 'oui',
    arrivee_coupee: 'non',
    chauffage: 'non',
    eau_chaude: 'non',
    chauffage_eau_chaude: 'non',
    recue_le: JANVIER,
  })
  assert.equal(plancherReponses(x), 3)
})

test('sans réponse à boutons, il n’y a pas de plancher', () => {
  assert.equal(plancherReponses(d({ id: 1, gravite: 2 })), null)
  assert.equal(graviteEffective(d({ id: 1, gravite: 2 })), 2)
})

test('une demande pas encore classée prend le plancher en attendant', () => {
  // La classification arrive quinze à vingt-cinq secondes après l'écriture
  // de la ligne. Pendant ce temps, une fuite déclarée doit déjà être en tête.
  const x = d({ id: 1, gravite: null, eau_coule: 'oui', arrivee_coupee: 'non' })
  assert.equal(graviteEffective(x), 3)
})

test('LE TRI SUIT LE PLANCHER : la fuite muette passe devant le gros devis', () => {
  // Les trois lignes exactes mesurées en production le 7 octobre.
  const fuiteMuette = d({ id: 1, gravite: 1, panier: 0, eau_coule: 'oui', arrivee_coupee: 'non' })
  const grosDevis = d({ id: 2, gravite: 1, panier: 8000, eau_coule: 'non' })
  assert.deepEqual(
    trier([grosDevis, fuiteMuette]).map((x) => x.id),
    [1, 2],
  )
})
