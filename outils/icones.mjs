// Génère les icônes PNG sans aucune dépendance : zlib est fourni par Node.
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

const FOND = [0x0f, 0x17, 0x2a]   // #0f172a — la couleur de l'en-tête
const TRAIT = [0xff, 0xff, 0xff]

// L'éclair, dans un repère de 64, tel qu'il est dans favicon.svg.
const ECLAIR = [[36.5,6],[18,35.5],[29.5,35.5],[27.5,58],[46,28.5],[34.5,28.5]]

// Test du rayon : un point est dedans si une demi-droite coupe un nombre
// impair de côtés.
function dedans(px, py, pts) {
  let oui = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j]
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) oui = !oui
  }
  return oui
}

const crcTable = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = -1
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const corps = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(corps))
  return Buffer.concat([len, corps, crc])
}

function icone(taille, fichier) {
  const SS = 4                       // sur-échantillonnage : lisse les bords
  const k = (taille / 64) * 0.86     // ~70 % de la hauteur : zone sûre "maskable"
  // Sommets déjà transformés dans le repère sur-échantillonné.
  const pts = ECLAIR.map(([x, y]) => [
    (taille / 2 + (x - 32) * k) * SS,
    (taille / 2 + (y - 32) * k) * SS,
  ])

  const lignes = []
  for (let y = 0; y < taille; y++) {
    const ligne = Buffer.alloc(1 + taille * 3)   // 1 octet de filtre (0) + RGB
    for (let x = 0; x < taille; x++) {
      let touches = 0
      for (let sy = 0; sy < SS; sy++)
        for (let sx = 0; sx < SS; sx++)
          if (dedans(x * SS + sx + 0.5, y * SS + sy + 0.5, pts)) touches++
      const a = touches / (SS * SS)
      const o = 1 + x * 3
      for (let c = 0; c < 3; c++) ligne[o + c] = Math.round(FOND[c] * (1 - a) + TRAIT[c] * a)
    }
    lignes.push(ligne)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(taille, 0); ihdr.writeUInt32BE(taille, 4)
  ihdr[8] = 8; ihdr[9] = 2                      // 8 bits, couleur vraie (RVB)

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(lignes), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(fichier, png)
  console.log(`${fichier} : ${taille}x${taille}, ${png.length} octets`)
}

icone(192, 'public/icone-192.png')
icone(512, 'public/icone-512.png')
icone(180, 'public/icone-180.png')
