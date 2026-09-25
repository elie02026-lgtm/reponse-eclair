import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserSms, LIEN_EXEMPLE } from './sms.ts'

// Se lance avec :  node --test

test('un message simple tient en un segment de 160', () => {
  const a = analyserSms('Bonjour, je vous rappelle vite.')
  assert.equal(a.unicode, false)
  assert.equal(a.segments, 1)
  assert.equal(a.parSegment, 160)
  assert.deepEqual(a.fautifs, [])
})

test('é è à ù ç majuscule sont dans le jeu de base : pas d’Unicode', () => {
  // Ce sont les accents que le français emploie le plus. Les signaler
  // comme coûteux ferait réécrire des messages parfaitement valables.
  const a = analyserSms('Réponse Éclair : à très vite, où que vous soyez, Ça marche')
  assert.equal(a.unicode, false, `fautifs à tort : ${a.fautifs.join(' ')}`)
})

test('ê â î ô û ë ï ÿ œ ç font basculer en UCS-2', () => {
  for (const c of 'êâîôûëïÿœç') {
    const a = analyserSms(`test ${c}`)
    assert.equal(a.unicode, true, `${c} aurait dû être signalé`)
    assert.deepEqual(a.fautifs, [c])
  }
})

test('LE PIÈGE FRANÇAIS : guillemets et apostrophe typographiques', () => {
  // « » et ’ sont ce que produit un correcteur automatique, un traitement
  // de texte, ou un copier-coller depuis le web. Aucun n'est dans le jeu
  // GSM. Chacun, seul, divise la capacité du message par plus de deux.
  for (const c of '«»’…–—“”') {
    const a = analyserSms(`il a dit ${c} bonjour`)
    assert.equal(a.unicode, true, `${c} aurait dû faire basculer en UCS-2`)
    assert.equal(a.parSegment, 70)
  }
})

test('l’apostrophe droite, elle, ne coûte rien', () => {
  // Le témoin inverse du test précédent : ' et ’ se ressemblent à l'écran
  // et n'ont pas le même prix.
  const a = analyserSms("je n'ai pas pu répondre")
  assert.equal(a.unicode, false)
})

test('{ } [ ] ~ ^ \\ | € comptent double sans passer en Unicode', () => {
  for (const c of '{}[]~^\\|€') {
    const a = analyserSms(c)
    assert.equal(a.unicode, false, `${c} ne devrait PAS forcer l’Unicode`)
    assert.equal(a.unites, 2, `${c} devrait compter pour 2`)
  }
})

// Ce test disait « {LIEN} coûte 8 unités, pas 6 » : six caractères à
// l'écran, huit sur la facture, parce que les accolades sont échappées.
// C'était vrai de la CHAÎNE {LIEN}, et faux du lien réel — les accolades
// ne partent jamais, elles sont remplacées. Corrigé le 24 septembre.
// L'échappement des accolades reste vérifié par le test des caractères
// de la table d'échappement, un peu plus haut.
test('{LIEN} ne coûte pas ses accolades, mais l’adresse entière', () => {
  const a = analyserSms('{LIEN}')
  assert.equal(a.unites, LIEN_EXEMPLE.length)
  assert.notEqual(a.unites, 8)
})

test('au-delà d’un segment, la capacité tombe à 153, pas 160', () => {
  assert.equal(analyserSms('a'.repeat(160)).segments, 1)
  assert.equal(analyserSms('a'.repeat(161)).segments, 2) // 161 / 153 -> 2
  assert.equal(analyserSms('a'.repeat(306)).segments, 2) // 306 / 153 -> 2 pile
  assert.equal(analyserSms('a'.repeat(307)).segments, 3) // et non 2
  assert.equal(analyserSms('a'.repeat(200)).parSegment, 153)
})

test('en UCS-2, la capacité tombe à 67 au-delà du premier segment', () => {
  assert.equal(analyserSms('œ' + 'a'.repeat(69)).segments, 1) // 70 pile
  assert.equal(analyserSms('œ' + 'a'.repeat(70)).segments, 2) // 71 -> 2
  assert.equal(analyserSms('œ' + 'a'.repeat(70)).parSegment, 67)
})

test('un message vide ne coûte aucun segment', () => {
  assert.equal(analyserSms('').segments, 0)
})

// Ce test affirmait « le message par défaut tient en un seul SMS ». Il
// tenait dans le compteur, pas dans la facture : le lien n'était pas
// compté. Le message reste en GSM-7 — ça, c'était juste — mais il coûte
// deux segments. Voir plus bas « le message par défaut coûte DEUX SMS ».
test('le message par défaut reste en GSM-7, et porte bien son lien', () => {
  const defaut =
    "Bonjour, Plomberie Durand. Je n'ai pas pu répondre. Décrivez votre besoin ici, je vous rappelle vite : {LIEN}"
  const a = analyserSms(defaut)
  assert.equal(a.unicode, false)
  assert.equal(a.lienManquant, false)
  assert.equal(a.segments, 2)
})

test('un message sans {LIEN} est signalé — le client n’aurait rien à ouvrir', () => {
  const ampute = "Bonjour. Je n'ai pas pu répondre. Décrivez votre besoin ici."
  assert.equal(analyserSms(ampute).lienManquant, true)
})

test('un emoji compte pour deux unités UTF-16', () => {
  const a = analyserSms('🔧')
  assert.equal(a.unicode, true)
  assert.equal(a.unites, 2)
  // Et il n'est compté qu'une fois dans la liste des fautifs.
  assert.deepEqual(a.fautifs, ['🔧'])
})

// ─────────────────────────────────────────────────────────────────────────
// {LIEN} COÛTE CE QU'IL COÛTERA, PAS CE QU'IL AFFICHE.
// ─────────────────────────────────────────────────────────────────────────
// Le compteur lisait {LIEN} comme six caractères. Au moment de l'envoi,
// c'est une adresse de quatre-vingts. Le message par défaut semblait tenir
// en un SMS ; il en coûte deux. C'est la plus chère des erreurs de ce
// fichier, parce qu'elle ne se voit qu'à la facture.

test('{LIEN} est compté comme l’adresse qui le remplacera', () => {
  const sans = analyserSms('Bonjour')
  const avec = analyserSms('Bonjour{LIEN}')

  assert.equal(sans.unites, 7)
  assert.equal(avec.unites, 7 + LIEN_EXEMPLE.length)
  assert.equal(avec.longueurLien, LIEN_EXEMPLE.length)
})

test('le lien ne fait jamais basculer un message en Unicode', () => {
  // Toutes les lettres de l'adresse sont dans le jeu GSM de base. Si un
  // jour l'origine contient un accent, ce test tombera — et c'est le but.
  const a = analyserSms('{LIEN}')
  assert.equal(a.unicode, false)
  assert.deepEqual(a.fautifs, [])
})

test('le message par défaut coûte DEUX SMS, pas un', () => {
  // Apostrophe DROITE, comme dans la vraie fiche en base : elle appartient
  // au jeu GSM de base, donc le message reste en GSM-7.
  const message =
    "Bonjour, Plomberie Test. Je n'ai pas pu répondre. " +
    'Décrivez votre besoin ici, je vous rappelle vite : {LIEN}'

  const a = analyserSms(message)
  assert.equal(a.unicode, false)
  // 180 depuis le 24 septembre, et non plus 182 : le lien porte le numéro
  // en forme nationale (« 0612345678 », dix signes) au lieu de la forme
  // internationale (« +33612345678 », douze) — voir `LIEN_EXEMPLE`.
  assert.equal(a.unites, 180)
  assert.equal(a.segments, 2)
})

// ─────────────────────────────────────────────────────────────────────────
// LE LIEN NE DOIT PLUS JAMAIS CONTENIR DE « + ».
// ─────────────────────────────────────────────────────────────────────────
// Dans une adresse, « + » se lit ESPACE. Le formulaire arrivait donc
// pré-rempli avec un numéro abîmé. `lib/lien.ts` le répare à la lecture,
// mais la vraie correction est de ne plus en écrire. Ce test est la
// serrure : quelqu'un qui « rétablit » la forme internationale le casse.
test('l’adresse substituée ne contient aucun « + »', () => {
  assert.equal(LIEN_EXEMPLE.includes('+'), false)
  assert.match(LIEN_EXEMPLE, /&t=0[1-9]\d{8}$/)
})

// LES DEUX ERREURS SE CUMULENT, ET C'EST LÀ QUE ÇA FAIT MAL.
// Le même message avec une apostrophe COURBE bascule en Unicode : la
// capacité tombe de 153 à 67, et les 182 unités deviennent trois SMS.
test('une apostrophe courbe fait passer le même message à TROIS SMS', () => {
  const message =
    'Bonjour, Plomberie Test. Je n’ai pas pu répondre. ' +
    'Décrivez votre besoin ici, je vous rappelle vite : {LIEN}'

  const a = analyserSms(message)
  assert.equal(a.unicode, true)
  assert.deepEqual(a.fautifs, ['’'])
  assert.equal(a.segments, 3)
})

test('un message sans {LIEN} est signalé, et le lien ne lui est pas compté', () => {
  const a = analyserSms('Bonjour, je vous rappelle.')
  assert.equal(a.lienManquant, true)
  assert.equal(a.unites, 26)
})
