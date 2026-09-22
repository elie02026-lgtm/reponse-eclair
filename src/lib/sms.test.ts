import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyserSms } from './sms.ts'

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

test('{LIEN} coûte 8 unités, pas 6', () => {
  // Six caractères à l'écran, huit sur la facture : les accolades sont
  // échappées. C'est ce que l'ancien compteur ne voyait pas.
  const a = analyserSms('{LIEN}')
  assert.equal(a.unites, 8)
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

test('le message par défaut du produit tient en un seul SMS', () => {
  const defaut =
    "Bonjour, Plomberie Durand. Je n'ai pas pu répondre. Décrivez votre besoin ici, je vous rappelle vite : {LIEN}"
  const a = analyserSms(defaut)
  assert.equal(a.unicode, false)
  assert.equal(a.segments, 1)
  assert.equal(a.lienManquant, false)
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
