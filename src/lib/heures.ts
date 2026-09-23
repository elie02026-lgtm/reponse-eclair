// QUAND ON A LE DROIT D'ÉCRIRE À QUELQU'UN.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE FICHIER EXISTE
// ─────────────────────────────────────────────────────────────────────────
// Les réseaux mobiles français bloquent les SMS marketing le dimanche,
// après 22 h et les jours fériés : le message est mis en file et part le
// lendemain (Twilio, « Limitations on sending SMS from French mobile
// numbers »). Le SMS qui répond à un appel manqué est transactionnel et
// passe ; la RELANCE à J+2, elle, est discutable.
//
// Elie a tranché le 23 septembre : on la contraint. Son argument est le bon
// et il n'est pas juridique — « aucun des deux ne fera l'effort, c'est trop
// tard de toute façon, et au contraire ça promet le respect des clients ».
// Une relance qui arrive un dimanche à 23 h ne rapporte rien et coûte
// l'image de l'artisan.
//
// ─────────────────────────────────────────────────────────────────────────
// LA FENÊTRE RETENUE : lundi–samedi, 9 h–19 h, heure de Paris, hors fériés.
// ─────────────────────────────────────────────────────────────────────────
// Le samedi est ouvert : pour un plombier et pour son client, c'est un jour
// de travail. Le dimanche non. La fenêtre est PLUS ÉTROITE que ce que les
// opérateurs bloquent (ils tolèrent jusqu'à 22 h) : on ne cherche pas le
// bord du permis, on cherche l'heure où un artisan écrirait lui-même.
//
// Si cette fenêtre doit changer, elle change ICI et nulle part ailleurs.

export const DEBUT_HEURE = 9
export const FIN_HEURE = 19

const PARIS = 'Europe/Paris'

// `Intl` connaît les changements d'heure, et il est dans Node comme dans le
// navigateur. Une bibliothèque de fuseaux coûterait une dépendance pour
// faire moins bien.
const FORMAT_PARIS = new Intl.DateTimeFormat('fr-FR', {
  timeZone: PARIS,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  weekday: 'short',
  hour12: false,
})

export type InstantParis = {
  /** 'AAAA-MM-JJ' à Paris. */
  jour: string
  annee: number
  /** 0 = dimanche, 1 = lundi, … 6 = samedi. Comme `Date.getDay()`. */
  jourSemaine: number
  heure: number
  minute: number
}

const JOURS: Record<string, number> = {
  dim: 0,
  lun: 1,
  mar: 2,
  mer: 3,
  jeu: 4,
  ven: 5,
  sam: 6,
}

/** Décompose un instant dans l'heure de Paris, changements d'heure compris. */
export function aParis(quand: Date): InstantParis {
  const p: Record<string, string> = {}
  for (const { type, value } of FORMAT_PARIS.formatToParts(quand)) p[type] = value

  // `Intl` rend « 24 » pour minuit dans certaines implémentations : on le
  // ramène à 0. Sans ça, minuit passerait pour une heure de l'après-midi
  // suivante et se retrouverait hors fenêtre par accident — ce qui donne le
  // bon résultat pour la mauvaise raison, donc un piège.
  const heure = Number(p.hour) % 24

  return {
    jour: `${p.year}-${p.month}-${p.day}`,
    annee: Number(p.year),
    jourSemaine: JOURS[p.weekday.slice(0, 3).toLowerCase().replace('.', '')] ?? -1,
    heure,
    minute: Number(p.minute),
  }
}

// ─────────────────────────────────────────────────────────────────────────
// PÂQUES, ET LES QUATRE JOURS QUI EN DÉPENDENT
// ─────────────────────────────────────────────────────────────────────────
// Quatre des onze fériés français ne sont pas à date fixe : lundi de
// Pâques, Ascension (39 jours après Pâques), lundi de Pentecôte (50 jours).
// Les coder en dur pour trois ans, c'est écrire une bombe à retardement qui
// explose un jeudi de mai 2029 sans que personne ne comprenne pourquoi.
//
// Algorithme de Meeus/Jones/Butcher (calendrier grégorien). Vérifié dans
// les tests sur des années dont la date de Pâques est connue et publiée —
// 2000, 2024, 2025 — avant d'être utilisé pour calculer les suivantes.
function paques(annee: number): Date {
  const a = annee % 19
  const b = Math.floor(annee / 100)
  const c = annee % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31) // 3 = mars, 4 = avril
  const jour = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(annee, mois - 1, jour))
}

function jjmm(d: Date): string {
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const j = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${m}-${j}`
}

function plus(d: Date, jours: number): Date {
  return new Date(d.getTime() + jours * 86_400_000)
}

const cacheFeries = new Map<number, Set<string>>()

/**
 * Les onze jours fériés français d'une année, en 'AAAA-MM-JJ'.
 *
 * Alsace-Moselle en a deux de plus (Vendredi saint, 26 décembre). Ils ne
 * sont pas ici : la cible du cahier est « 40 minutes autour de Marseille ».
 * Le jour où un artisan s'inscrit depuis Strasbourg, ce commentaire dira
 * quoi ajouter.
 */
export function joursFeries(annee: number): Set<string> {
  const connu = cacheFeries.get(annee)
  if (connu) return connu

  const p = paques(annee)
  const feries = new Set([
    `${annee}-01-01`, // Jour de l'an
    jjmm(plus(p, 1)), // Lundi de Pâques
    `${annee}-05-01`, // Fête du Travail
    `${annee}-05-08`, // Victoire 1945
    jjmm(plus(p, 39)), // Ascension
    jjmm(plus(p, 50)), // Lundi de Pentecôte
    `${annee}-07-14`, // Fête nationale
    `${annee}-08-15`, // Assomption
    `${annee}-11-01`, // Toussaint
    `${annee}-11-11`, // Armistice 1918
    `${annee}-12-25`, // Noël
  ])
  cacheFeries.set(annee, feries)
  return feries
}

/** Peut-on écrire à quelqu'un à cet instant ? */
export function estOuvrable(quand: Date): boolean {
  const t = aParis(quand)
  if (t.jourSemaine === 0) return false
  if (joursFeries(t.annee).has(t.jour)) return false
  return t.heure >= DEBUT_HEURE && t.heure < FIN_HEURE
}

/**
 * Le premier instant ouvrable à partir de `quand` — `quand` lui-même s'il
 * l'est déjà.
 *
 * Avance d'un quart d'heure à la fois plutôt que de calculer le prochain
 * créneau par arithmétique de dates. C'est plus lent et c'est voulu : le
 * calcul « à la main » doit gérer les changements d'heure, les fériés qui
 * s'enchaînent et le passage d'une année à l'autre, et c'est là qu'on se
 * trompe. Ici, au pire, on itère quelques centaines de fois — sur un envoi
 * de relance, ça ne se mesure pas.
 *
 * La borne existe pour qu'un bug ne devienne jamais une boucle infinie :
 * quinze jours d'affilée sans un seul créneau ouvrable est impossible en
 * France, et si ça arrivait, mieux vaut rendre une date fausse qu'un
 * serveur bloqué.
 */
export function prochainCreneau(quand: Date): Date {
  const QUART = 15 * 60_000
  const MAX = (15 * 24 * 60) / 15 // quinze jours de quarts d'heure

  let t = new Date(quand.getTime())
  for (let i = 0; i < MAX; i++) {
    if (estOuvrable(t)) return t
    t = new Date(t.getTime() + QUART)
  }
  return t
}
