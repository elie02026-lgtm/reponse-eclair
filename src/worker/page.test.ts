import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  pageConfirmation,
  pageResultat,
  pageLienIllisible,
  pageResultatPromesse,
} from './page.ts'
import { reponseDe, LIBELLE_OPERATION } from '../lib/action.ts'
import { reponsePromesse } from '../lib/promesse.ts'
import type { Envoi } from '../lib/promesse.ts'

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

// ─────────────────────────────────────────────────────────────────────────
// LA PROMESSE DE RAPPEL (phase 5 bis)
// ─────────────────────────────────────────────────────────────────────────

const ENVOI: Envoi = {
  lien: 'sms:+33612345678?&body=Bonjour',
  texte: "Bonjour, c'est Plomberie Martin. Je vous rappelle dans 15 minutes.",
  numero: '06 12 34 56 78',
  deja: false,
}

test('L’APERÇU DU MESSAGE EST LÀ AVANT QU’IL S’ENGAGE', () => {
  // RÈGLE D'OR : on n'annonce jamais au client un délai que l'artisan n'a pas
  // choisi lui-même. Il doit donc lire la phrase exacte AVANT de toucher.
  const page = pageConfirmation('/agir', 42, JETON, 'promesse_15min')
  assert.match(page, /Je vous rappelle dans 15 minutes/)
  assert.match(page, /Rien n’a encore été enregistré/)
})

test('LA PAGE DE CONFIRMATION D’UNE PROMESSE NE LIT RIEN NON PLUS', () => {
  // C'est la propriété qui protège du « Safe Links » de Microsoft et des
  // antivirus de messagerie : ils OUVRENT les liens à la livraison. Tout ce
  // que cet écran afficherait, un service tiers le lirait avant l'artisan.
  // Le nom de l'entreprise y est donc remplacé par un repère.
  for (const op of ['promesse_15min', 'promesse_1h', 'promesse_fin_de_journee'] as const) {
    const page = pageConfirmation('/agir', 42, JETON, op)
    for (const interdit of ['+33', '@', 'Marc', 'Paris', 'Plomberie']) {
      assert.ok(!page.includes(interdit), `« ${interdit} » apparaît pour ${op}`)
    }
    assert.match(page, /<form method="post"/)
  }
})

test('LA PAGE DE RÉSULTAT DIT QUE RIEN N’EST ENCORE PARTI', () => {
  // La panne muette qu'il faut empêcher : l'artisan referme son écran en
  // croyant son client prévenu, alors qu'il reste un bouton à toucher.
  const page = pageResultatPromesse(reponsePromesse('ok'), ENVOI)
  assert.match(page, /Il reste à le lui envoyer/)
  assert.match(page, /Envoyer à mon client/)
  assert.ok(page.includes('sms:+33612345678'), 'le lien d’envoi manque')

  // Le message exact est montré, à l'échappement près : l'apostrophe sort en
  // `&#39;`. C'est le gabarit qui fait son travail — rien de ce qui vient de
  // la base n'entre dans la page sans passer par `h()`.
  assert.match(page, /Je vous rappelle dans 15 minutes/)
  assert.match(page, /c&#39;est Plomberie Martin/)
})

test('deux touchers de suite : on ne félicite pas deux fois, mais on laisse renvoyer', () => {
  const page = pageResultatPromesse(reponsePromesse('inchange'), { ...ENVOI, deja: true })
  assert.match(page, /Vous venez de le dire/)
  assert.match(page, /renvoyer/)
  assert.ok(page.includes('sms:+33612345678'), 'le lien d’envoi a disparu')
})

test('SUR UN ORDINATEUR, LE BOUTON NE FAIT RIEN — ET LA PAGE LE DIT', () => {
  // MESURÉ LE 8 OCTOBRE 2026, sur l'écran d'Elie. Un lien `sms:` n'a aucun
  // gestionnaire sur un PC : il ne se passe rien. La page, elle, affirmait
  // « votre messagerie s'ouvre » — et l'artisan repartait en croyant son
  // client prévenu. C'est la panne muette que ce projet s'interdit.
  //
  // On ne peut pas détecter le téléphone : cette page n'a AUCUN JavaScript,
  // et c'est ce qui la fait tenir dans deux kilo-octets. On ne devine donc
  // pas — on écrit les deux cas, et l'artisan reconnaît le sien.
  const page = pageResultatPromesse(reponsePromesse('ok'), ENVOI)
  assert.match(page, /Si rien ne s’ouvre/)
  assert.match(page, /ordinateur/)
  // Et le numéro doit être là en clair, pour qu'il puisse recopier.
  assert.ok(page.includes(ENVOI.numero), 'le numéro à recopier n’est pas affiché')
})

test('UN NUMÉRO ILLISIBLE DONNE UNE VOIE DE REPLI, PAS UN BOUTON MORT', () => {
  // Même principe que le bouton « Composer » des Réglages : on n'affiche
  // jamais un bouton qui n'enverrait rien.
  const page = pageResultatPromesse(reponsePromesse('ok'), {
    ...ENVOI,
    lien: null,
    numero: 'je rappelle ce soir',
  })
  assert.ok(!page.includes('class="bouton"'), 'un bouton mort est affiché')
  assert.match(page, /je rappelle ce soir/)
  assert.match(page, /Je vous rappelle dans 15 minutes/)
})

test('un échec de promesse retombe sur l’écran commun, qui ne révèle rien', () => {
  const page = pageResultatPromesse(reponsePromesse('refuse'), null)
  assert.match(page, /Ce lien n’est plus valable/)
  assert.ok(!page.includes('sms:'), 'un lien d’envoi traîne sur un écran d’échec')
})

test('et il ne parle pas de trente jours quand il s’agit de deux', () => {
  const page = pageResultatPromesse(reponsePromesse('expire'), null)
  assert.ok(!page.includes('trente jours'), page)
  assert.match(page, /deux jours/)
})

test('les pages restent minuscules', () => {
  // Deux kilo-octets contre les cinq cents de l'application. L'artisan est
  // dans une cave, sur un réseau de chantier. Si ce test tombe, c'est qu'on
  // a commencé à y mettre des choses qui n'y ont pas leur place.
  for (const page of [pageConfirmation('/agir', 1, JETON, 'fait'), pageResultat(reponseDe('ok'))]) {
    assert.ok(page.length < 4096, `${page.length} octets`)
  }
})
