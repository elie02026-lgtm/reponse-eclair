import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pageConfirmation, pageResultat, pageLienIllisible } from './page.ts'
import { reponseDe, LIBELLE_OPERATION } from '../lib/action.ts'

// Se lance avec :  node --test
//
// Ces pages sont servies par le Worker, mais elles ne sont que des chaînes
// de caractères : elles se vérifient donc sans Cloudflare, sans navigateur
// et sans réseau. C'est la raison pour laquelle le gabarit est dans un
// fichier à part du gestionnaire.

const JETON = 'a'.repeat(64)

test('LE BOUTON EST UN FORMULAIRE EN POST, jamais un lien', () => {
  // Tout le mécanisme de protection tient là-dessus. Un antivirus de
  // messagerie suit les liens à la livraison ; il ne soumet pas les
  // formulaires. Si cette page redevenait un `<a href>`, des demandes
  // passeraient en « rappelé » sans que l'artisan ait appelé.
  const page = pageConfirmation('/agir', 42, JETON, 'fait')
  assert.match(page, /<form method="post"/)
  assert.match(page, /<button type="submit"/)
  assert.ok(!/<a [^>]*href="[^"]*op=/.test(page), 'un lien d’action traîne dans la page')
})

test('les trois valeurs repartent en champs cachés', () => {
  const page = pageConfirmation('/agir', 42, JETON, 'pas_urgent')
  assert.match(page, /name="d" value="42"/)
  assert.match(page, new RegExp(`name="j" value="${JETON}"`))
  assert.match(page, /name="op" value="pas_urgent"/)
})

test('LA PAGE NE DIT RIEN DE LA DEMANDE', () => {
  // Exigence du cahier : « jamais de lecture de données par ce lien ». La
  // page ne reçoit d'ailleurs aucune donnée à afficher — ce test garde la
  // signature de la fonction autant que son contenu.
  const page = pageConfirmation('/agir', 42, JETON, 'fait')
  for (const interdit of ['téléphone', 'Téléphone', '+33', '@', 'Marc', 'Paris']) {
    assert.ok(!page.includes(interdit), `« ${interdit} » apparaît`)
  }
})

test('rien n’est enregistré tant que le bouton n’est pas touché, et c’est écrit', () => {
  // L'artisan doit pouvoir ouvrir le lien par curiosité sans rien déclencher.
  assert.match(pageConfirmation('/agir', 1, JETON, 'fait'), /Rien n’a encore été enregistré/)
})

test('le libellé du bouton correspond à l’opération', () => {
  assert.ok(pageConfirmation('/agir', 1, JETON, 'fait').includes(LIBELLE_OPERATION.fait))
  assert.ok(
    pageConfirmation('/agir', 1, JETON, 'pas_urgent').includes(LIBELLE_OPERATION.pas_urgent),
  )
})

test('la page d’action n’est pas indexable', () => {
  // Une page qui porte un jeton dans son adresse n'a rien à faire dans un
  // moteur de recherche.
  assert.match(pageConfirmation('/agir', 1, JETON, 'fait'), /noindex/)
  assert.match(pageResultat(reponseDe('ok')), /noindex/)
})

test('elle se lit sur un téléphone et ne charge rien de l’extérieur', () => {
  const page = pageConfirmation('/agir', 1, JETON, 'fait')
  assert.match(page, /width=device-width/)
  assert.ok(!page.includes('<script'), 'du JavaScript s’est glissé dans la page')
  assert.ok(!/(src|href)="https?:\/\//.test(page), 'la page va chercher une ressource dehors')
})

test('le chemin est échappé, au cas où il cesserait d’être une constante', () => {
  const page = pageConfirmation('/agir"><script>alert(1)</script>', 1, JETON, 'fait')
  assert.ok(!page.includes('<script>alert'), 'injection passée')
  assert.match(page, /&quot;&gt;&lt;script&gt;/)
})

test('la page de résultat montre le message, pas le mot de la base', () => {
  const page = pageResultat(reponseDe('refuse'))
  assert.match(page, /Ce lien n’est plus valable/)
  assert.ok(!page.includes('refuse'), '« refuse » est affiché tel quel')
})

test('une réussite et un échec ne se ressemblent pas', () => {
  assert.match(pageResultat(reponseDe('ok')), /class="ok"/)
  assert.match(pageResultat(reponseDe('expire')), /class="non"/)
})

test('un lien illisible dit la même chose qu’un lien refusé', () => {
  // Sinon on apprendrait à un curieux que son identifiant existe mais que
  // son jeton est faux — ou l'inverse.
  const illisible = pageLienIllisible()
  const refuse = pageResultat(reponseDe('refuse'))
  assert.ok(illisible.includes('Ce lien n’est plus valable'))
  assert.ok(refuse.includes('Ce lien n’est plus valable'))
})

test('toutes les pages proposent une porte de sortie vers l’écran', () => {
  for (const page of [pageResultat(reponseDe('ok')), pageLienIllisible()]) {
    assert.match(page, /href="\/"/)
  }
})

test('les pages restent minuscules', () => {
  // Deux kilo-octets contre les cinq cents de l'application. L'artisan est
  // dans une cave, sur un réseau de chantier. Si ce test tombe, c'est qu'on
  // a commencé à y mettre des choses qui n'y ont pas leur place.
  for (const page of [pageConfirmation('/agir', 1, JETON, 'fait'), pageResultat(reponseDe('ok'))]) {
    assert.ok(page.length < 4096, `${page.length} octets`)
  }
})
