import { test } from 'node:test'
import assert from 'node:assert/strict'
import { DEMANDES_DEMO, trier } from './demo.ts'
import { URGENCES } from './demandeRecue.ts'
import type { Demande } from '../types.ts'

// Se lance avec :  node --test

/** L'ordre d'arrivée, du plus récent au plus ancien : ce qu'un outil qui
 *  trie par date afficherait. On le RECALCULE depuis les dates au lieu de
 *  faire confiance à l'ordre du tableau — sinon on testerait une convention,
 *  pas une donnée. */
function parDateDArrivee(demandes: Demande[]): Demande[] {
  return [...demandes].sort(
    (a, b) => new Date(b.recue_le).getTime() - new Date(a.recue_le).getTime(),
  )
}

const noms = (demandes: Demande[]) => demandes.map((d) => d.motif)

// ─────────────────────────────────────────────────────────────────────────
// LE TEST QUI EXISTE À CAUSE D'UN BUG RÉEL
// ─────────────────────────────────────────────────────────────────────────
// Le 30 septembre 2026, la page /demo affichait quatre demandes reçues à
// 12 min, 1 h, 3 h et 5 h, par gravité décroissante. Les deux ordres étaient
// donc IDENTIQUES : la démonstration ne prouvait rien, et personne ne l'avait
// vu pendant des semaines parce que les données vivaient dans un fichier JSX
// que `node --test` ne peut pas charger.

test('LA DÉMONSTRATION PROUVE QUELQUE CHOSE : les deux ordres se contredisent', () => {
  const parGravite = trier(DEMANDES_DEMO)
  const parDate = parDateDArrivee(DEMANDES_DEMO)

  assert.notDeepEqual(
    noms(parGravite),
    noms(parDate),
    'l’ordre par gravité est identique à l’ordre d’arrivée : la démo ne prouve rien',
  )
})

test('la contradiction est VISIBLE : le premier et le dernier sont échangés', () => {
  // Une contradiction qui ne porterait que sur deux lignes du milieu ne serait
  // pas lisible par un patron qui regarde la page dix secondes. Ce qui frappe,
  // c'est que la plus ANCIENNE demande soit en haut et la plus RÉCENTE en bas.
  const parGravite = trier(DEMANDES_DEMO)
  const parDate = parDateDArrivee(DEMANDES_DEMO)

  assert.equal(parGravite[0]?.id, parDate[parDate.length - 1]?.id)
  assert.equal(parGravite[parGravite.length - 1]?.id, parDate[0]?.id)
})

test('la plus grave est en haut, la moins grave en bas', () => {
  const parGravite = trier(DEMANDES_DEMO)
  const gravites = parGravite.map((d) => d.gravite ?? 0)
  assert.deepEqual(gravites, [...gravites].sort((a, b) => b - a), 'gravités mal ordonnées')
  assert.equal(gravites[0], 3)
  assert.equal(gravites[gravites.length - 1], 1)
})

test('à gravité égale, c’est le panier qui décide — jamais la date', () => {
  const parGravite = trier(DEMANDES_DEMO)
  // Les deux demandes de gravité 2 : l'eau chaude (450 €, il y a 40 min) doit
  // passer avant le WC (140 €, il y a 2 h). C'est le cas le plus subtil, et
  // c'est celui où un tri par date donnerait le même résultat par accident si
  // on inversait les paniers.
  const deux = parGravite.filter((d) => d.gravite === 2)
  assert.equal(deux.length, 2, 'la démo doit garder deux demandes de même gravité')
  assert.equal(deux[0]?.motif, 'panne eau chaude')
  assert.equal(deux[1]?.motif, 'fuite wc')
  const plusRecent = parDateDArrivee(deux)[0]
  assert.equal(plusRecent?.motif, 'panne eau chaude')
})

test('LES QUATRE ONT COCHÉ « URGENT » — sinon l’écart ne se voit pas', () => {
  // C'est l'argument entier du produit : ce que le client coche ne dit rien.
  // Si une seule des quatre avait coché « non », le prospect pourrait croire
  // que le logiciel se contente de lire la case.
  //
  // LE LIBELLÉ EST LU DEPUIS LA LISTE BLANCHE DU FORMULAIRE, pas recopié.
  // Le 1er octobre 2026, la démo affichait « Oui, c'est une urgence » pendant
  // que le vrai formulaire proposait « Oui, c'est urgent » : un prospect qui
  // regardait la démo puis remplissait le formulaire lisait deux phrases
  // différentes pour la même case. Trouvé en envoyant une demande de test,
  // pas en relisant le code. En important `URGENCES`, l'écart ne peut plus
  // revenir — et le jour où Elie reformule la question, la démo suit toute
  // seule.
  for (const d of DEMANDES_DEMO) {
    assert.equal(d.urgence_dite, URGENCES[0], `${d.motif} n’a pas coché urgent`)
  }
})

test('le libellé de la démo existe VRAIMENT dans le formulaire', () => {
  // Contrôle plus large que le précédent : aucune des quatre ne doit porter
  // une phrase que le formulaire n'offre pas. Un `urgence_dite` inventé
  // passerait le test ci-dessus si on changeait `URGENCES[0]` par erreur.
  const offerts: readonly string[] = URGENCES
  for (const d of DEMANDES_DEMO) {
    assert.ok(offerts.includes(d.urgence_dite ?? ''), `libellé inconnu : ${d.urgence_dite}`)
  }
})

test('les numéros restent dans la plage de fiction de l’ARCEP', () => {
  // 06 39 98 xx xx n'est attribué à personne. Un chiffre de travers, et la
  // page de démonstration fait sonner le téléphone d'un inconnu — sur une
  // page publique, autant de fois qu'elle est vue.
  for (const d of DEMANDES_DEMO) {
    assert.match(d.telephone ?? '', /^\+336399[68]\d{4}$/, `${d.motif} : ${d.telephone}`)
  }
})

test('les communes sont en Île-de-France, la cible commerciale', () => {
  // Le 30 septembre, la démo parlait encore de Marseille et d'Aix : la cible
  // avait changé, la page ne le savait pas.
  const ILE_DE_FRANCE = ['Paris 11e', 'Montreuil', 'Vincennes', 'Boulogne-Billancourt']
  for (const d of DEMANDES_DEMO) {
    assert.ok(ILE_DE_FRANCE.includes(d.lieu ?? ''), `commune hors cible : ${d.lieu}`)
  }
})

// ─────────────────────────────────────────────────────────────────────────
// LA RÈGLE DE TRI, ÉPROUVÉE SUR DES CAS FABRIQUÉS
// ─────────────────────────────────────────────────────────────────────────

/** Le strict minimum pour construire une `Demande` de test. */
function fausse(champs: Partial<Demande> & { id: number }): Demande {
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
    ...champs,
  }
}

test('une gravité absente ne remonte pas en tête', () => {
  // `gravite` est nullable en base : la classification arrive APRÈS l'écriture
  // de la ligne (mesuré le 30 septembre : dix-sept secondes). Une demande non
  // encore classée ne doit pas se retrouver au-dessus d'une fuite.
  const trie = trier([fausse({ id: 1, gravite: null }), fausse({ id: 2, gravite: 3 })])
  assert.deepEqual(
    trie.map((d) => d.id),
    [2, 1],
  )
})

test('trier ne modifie pas le tableau d’origine', () => {
  // Si `sort` travaillait sur place, l'ordre d'arrivée — la moitié de la
  // démonstration — disparaîtrait au premier affichage de la page.
  const avant = DEMANDES_DEMO.map((d) => d.id)
  trier(DEMANDES_DEMO)
  assert.deepEqual(
    DEMANDES_DEMO.map((d) => d.id),
    avant,
  )
})
