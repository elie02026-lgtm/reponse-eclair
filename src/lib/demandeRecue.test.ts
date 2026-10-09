import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validerDemande, URGENCES, BORNES } from './demandeRecue.ts'

// Se lance avec :  node --test

/** Un corps valide, dont chaque test ne change qu'une chose. */
function corps(modifications: Record<string, unknown> = {}) {
  return {
    code: 'GYZGYQZU',
    prenom: 'Marc',
    telephone: '06 12 34 56 78',
    email: '',
    lieu: 'Paris 11e',
    besoin: 'Fuite sous l’évier, ça coule depuis ce matin.',
    urgence_dite: URGENCES[0],
    ...modifications,
  }
}

function accepte(modifications: Record<string, unknown> = {}) {
  const v = validerDemande(corps(modifications))
  assert.equal(v.etat, 'ok', `refusé à tort : ${JSON.stringify(v)}`)
  if (v.etat !== 'ok') throw new Error('inatteignable')
  return v.demande
}

function refuse(modifications: Record<string, unknown>, champ: string) {
  const v = validerDemande(corps(modifications))
  assert.equal(v.etat, 'invalide', `accepté à tort : ${JSON.stringify(modifications)}`)
  assert.equal(v.etat === 'invalide' && v.champ, champ)
}

test('un formulaire normalement rempli passe', () => {
  const d = accepte()
  assert.equal(d.code, 'GYZGYQZU')
  assert.equal(d.telephone, '+33612345678')
  assert.equal(d.besoin, 'Fuite sous l’évier, ça coule depuis ce matin.')
})

// ─────────────────────────────────────────────────────────────────────────
// LE CODE ARTISAN
// ─────────────────────────────────────────────────────────────────────────

test('LE CODE EST MIS EN MAJUSCULES ET DÉBARRASSÉ DES ESPACES', () => {
  // Un code recopié à la main depuis un SMS arrive en minuscules, ou coupé
  // par un espace que le clavier a inséré tout seul. Le refuser, c'est
  // perdre le client pour une faute qui n'est pas la sienne.
  for (const ecriture of ['gyzgyqzu', ' GYZGYQZU ', 'GYZG YQZU', 'gYzG yQzU ']) {
    assert.equal(accepte({ code: ecriture }).code, 'GYZGYQZU', ecriture)
  }
})

test('les caractères que l’alphabet exclut sont refusés', () => {
  // Migration 0007 : ni I, ni L, ni O, ni 0, ni 1 — parce qu'on doit
  // pouvoir se lire un code au téléphone sans se tromper.
  for (const mauvais of ['GYZGYQZI', 'GYZGYQZL', 'GYZGYQZO', 'GYZGYQZ0', 'GYZGYQZ1']) {
    refuse({ code: mauvais }, 'code')
  }
})

test('un code trop court ou trop long est refusé', () => {
  refuse({ code: 'GYZGYQZ' }, 'code')
  refuse({ code: 'GYZGYQZUX' }, 'code')
  refuse({ code: '' }, 'code')
})

// ─────────────────────────────────────────────────────────────────────────
// CE QU'UN APPELANT QUI N'EST PAS LE NAVIGATEUR PEUT ENVOYER
// ─────────────────────────────────────────────────────────────────────────
// Cet endpoint est public. Le formulaire envoie des chaînes ; `curl` envoie
// ce qu'il veut. Rien de tout ça ne doit faire tomber la porte d'entrée.

test('un corps qui n’est pas un objet est refusé, pas une exception', () => {
  for (const brut of [null, undefined, 42, 'texte', [], true]) {
    const v = validerDemande(brut)
    assert.equal(v.etat, 'invalide', JSON.stringify(brut))
    assert.equal(v.etat === 'invalide' && v.champ, 'corps')
  }
})

test('un champ qui n’est pas une chaîne est traité comme vide', () => {
  // `{"besoin": 42}` ne doit pas lever : il doit se faire refuser comme un
  // besoin manquant.
  refuse({ besoin: 42 }, 'besoin')
  refuse({ besoin: null }, 'besoin')
  refuse({ code: { toString: 'piege' } }, 'code')
  // Et un facultatif non-chaîne devient simplement vide.
  assert.equal(accepte({ prenom: 1234 }).prenom, '')
})

test('les champs inconnus ne ressortent jamais', () => {
  const d = accepte({ artisan_id: 'autre', statut: 'signe', gravite: 3, montant_signe: -1 })
  assert.deepEqual(Object.keys(d).sort(), [
    'arrivee_coupee', 'besoin', 'chauffage', 'code', 'eau_chaude', 'eau_coule',
    'email', 'lieu', 'prenom', 'telephone', 'urgence_dite',
  ])
})

// ─────────────────────────────────────────────────────────────────────────
// LES BORNES
// ─────────────────────────────────────────────────────────────────────────

test('la description est bornée, et la limite exacte passe', () => {
  assert.equal(accepte({ besoin: 'a'.repeat(BORNES.besoin) }).besoin.length, BORNES.besoin)
  refuse({ besoin: 'a'.repeat(BORNES.besoin + 1) }, 'besoin')
})

test('prénom, commune et e-mail sont bornés eux aussi', () => {
  refuse({ prenom: 'a'.repeat(BORNES.prenom + 1) }, 'prenom')
  refuse({ lieu: 'a'.repeat(BORNES.lieu + 1) }, 'lieu')
  refuse({ email: 'a'.repeat(BORNES.email + 1) }, 'email')
})

test('une description vide ou faite d’espaces est refusée', () => {
  refuse({ besoin: '' }, 'besoin')
  refuse({ besoin: '    ' }, 'besoin')
})

// ─────────────────────────────────────────────────────────────────────────
// LE TÉLÉPHONE ET L'E-MAIL
// ─────────────────────────────────────────────────────────────────────────

test('toutes les écritures d’un numéro arrivent en +33', () => {
  for (const ecriture of ['0612345678', '06.12.34.56.78', '+33 6 12 34 56 78', '0033612345678']) {
    assert.equal(accepte({ telephone: ecriture }).telephone, '+33612345678', ecriture)
  }
})

test('un numéro absent ou illisible est refusé', () => {
  for (const mauvais of ['', 'je rappelle ce soir', '061234567', '+1234']) {
    refuse({ telephone: mauvais }, 'telephone')
  }
})

test('l’e-mail est FACULTATIF, mais pas n’importe quoi', () => {
  assert.equal(accepte({ email: '' }).email, '')
  assert.equal(accepte({ email: 'marc@exemple.fr' }).email, 'marc@exemple.fr')
  refuse({ email: 'marc' }, 'email')
  refuse({ email: 'marc@exemple' }, 'email')
  refuse({ email: 'marc @exemple.fr' }, 'email')
})

// ─────────────────────────────────────────────────────────────────────────
// L'URGENCE
// ─────────────────────────────────────────────────────────────────────────

test('l’urgence est une liste blanche, pas du texte libre', () => {
  for (const u of URGENCES) assert.equal(accepte({ urgence_dite: u }).urgence_dite, u)
  refuse({ urgence_dite: 'URGENT !!!' }, 'urgence_dite')

  // VIDE EST ACCEPTÉ DEPUIS LE 9 OCTOBRE : le formulaire ne présélectionne
  // plus rien, et un client a le droit de ne pas répondre. Ce qui reste
  // interdit, c'est une valeur hors liste.
  assert.equal(accepte({ urgence_dite: '' }).urgence_dite, '')
  // Piège d'apostrophe : le libellé porte une apostrophe COURBE.
  refuse({ urgence_dite: "Oui, c'est urgent" }, 'urgence_dite')
})

// ─────────────────────────────────────────────────────────────────────────
// LES TROIS QUESTIONS À BOUTONS (phase 5.1)
// ─────────────────────────────────────────────────────────────────────────

test('une demande sans aucune réponse ET sans description est refusée', () => {
  // Elle n'apprendrait rien à personne.
  refuse({ besoin: '' }, 'besoin')
})

test('UNE SEULE RÉPONSE REND LA DESCRIPTION FACULTATIVE', () => {
  // C'est le cœur de la phase 5 : quelqu'un qui a dit « l'eau coule, je n'ai
  // pas coupé » en a dit assez pour être rappelé en premier. Lui imposer de
  // taper une phrase de plus, debout dans sa cuisine, c'est le perdre.
  const d = accepte({ besoin: '', eau_coule: 'oui' })
  assert.equal(d.besoin, '')
  assert.equal(d.eau_coule, 'oui')
})

test('chacune des QUATRE suffit à elle seule', () => {
  for (const [champ, valeur] of [
    ['eau_coule', 'non'],
    ['arrivee_coupee', 'je-ne-sais-pas'],
    ['chauffage', 'non'],
    ['eau_chaude', 'non'],
  ]) {
    assert.equal(accepte({ besoin: '', [champ!]: valeur }).besoin, '', champ)
  }
})

test('les réponses non données arrivent à null, pas à vide', () => {
  // `null` et `''` ne disent pas la même chose en base : l'un veut dire
  // « il n'a pas répondu », l'autre serait une réponse vide, qui n'existe pas.
  const d = accepte()
  assert.equal(d.eau_coule, null)
  assert.equal(d.arrivee_coupee, null)
  assert.equal(d.chauffage, null)
  assert.equal(d.eau_chaude, null)
})

test('une réponse inventée est refusée, champ par champ', () => {
  refuse({ eau_coule: 'peut-etre' }, 'eau_coule')
  refuse({ eau_coule: 'OUI' }, 'eau_coule')
  refuse({ arrivee_coupee: 'bien sûr' }, 'arrivee_coupee')
  // « je ne sais pas » n'est proposé pour aucune des deux dernières.
  refuse({ chauffage: 'je-ne-sais-pas' }, 'chauffage')
  refuse({ eau_chaude: 'je-ne-sais-pas' }, 'eau_chaude')
})

test('une réponse qui n’est pas une chaîne est traitée comme absente', () => {
  // `curl` envoie ce qu'il veut. `{"eau_coule": 42}` ne doit pas lever.
  assert.equal(accepte({ eau_coule: 42 }).eau_coule, null)
  assert.equal(accepte({ eau_coule: null }).eau_coule, null)
})

test('une description trop longue reste refusée, même avec des réponses', () => {
  refuse({ besoin: 'a'.repeat(BORNES.besoin + 1), eau_coule: 'oui' }, 'besoin')
})
