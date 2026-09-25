import { useState } from 'react'
import { renvoi } from './lib/renvoi'

// L'ÉCRAN DE LA CASE A1 : « en moins de 5 minutes ».
//
// Ce qui prend cinq minutes, ce n'est pas de taper trois codes — c'est de
// trouver lesquels. Les pages d'aide des opérateurs parlent de « renvoi
// inconditionnel », de « déviation d'appel », donnent le code d'un seul des
// trois cas, et ne disent jamais ce qu'on perd en échange. On les donne
// donc ici, composés sur SON numéro, avec le code pour tout défaire.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI UN BOUTON « COPIER » ET PAS UN LIEN `tel:`
// ─────────────────────────────────────────────────────────────────────────
// Un lien `tel:**61*...#` serait un doigt de moins. Mais iOS bloque les
// codes de service composés depuis une page web — c'est une protection,
// pas un bogue : une page piégée pourrait sinon détourner les appels d'un
// visiteur. Le lien marcherait sur Android et échouerait sans un mot sur
// iPhone. Un bouton qui marche une fois sur deux est pire que pas de
// bouton : on copie, on colle dans le clavier, ça marche partout.

export default function RenvoiAppel({ numero }: { numero: string | null }) {
  const r = renvoi(numero)
  const [copie, setCopie] = useState<string | null>(null)
  const [copieImpossible, setCopieImpossible] = useState(false)

  async function copier(code: string) {
    const fait = (await presseGeste(code)) || presseAncienne(code)

    if (!fait) {
      // Les deux voies refusées. Le code est écrit en entier juste à côté :
      // on le dit, et on n'empêche rien.
      setCopieImpossible(true)
      return
    }

    setCopie(code)
    setCopieImpossible(false)
    // On efface le « Copié » : laissé à l'écran, il ferait croire que le
    // deuxième code est copié alors qu'on vient de copier le premier.
    window.setTimeout(() => setCopie((c) => (c === code ? null : c)), 2000)
  }

  // ── Aucun numéro : rien à faire, et surtout rien à laisser espérer ─────
  if (r.etat === 'sans-numero') {
    return (
      <Encadre>
        <Titre>Renvoi d’appel</Titre>
        <p className="mt-2 text-sm text-slate-600">
          Aucun numéro ne vous est encore attribué. Tant qu’il n’y en a pas, il n’y a rien
          à renvoyer : les codes à taper s’afficheront ici dès qu’il apparaîtra.
        </p>
      </Encadre>
    )
  }

  // ── Numéro présent mais illisible : une panne, pas une consigne ────────
  if (r.etat === 'numero-illisible') {
    return (
      <Encadre>
        <Titre>Renvoi d’appel</Titre>
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          Le numéro enregistré sur votre fiche — <code>{r.brut}</code> — n’a pas la forme
          attendue. Nous préférons ne pas vous donner de code plutôt qu’un code faux :
          un renvoi mal composé ne prévient pas, il envoie vos appels dans le vide.
          Signalez-le-nous.
        </p>
      </Encadre>
    )
  }

  return (
    <Encadre>
      <Titre>Renvoi d’appel — les trois codes à taper</Titre>
      <p className="mt-2 text-sm text-slate-600">
        Vous gardez votre numéro. Ces codes disent à votre opérateur d’envoyer vers le{' '}
        <strong>{r.numero}</strong> les appels que vous ne prenez pas. Tapez-les sur votre
        téléphone comme un numéro, puis appelez. Comptez une minute pour les trois.
      </p>

      <ol className="mt-4 space-y-3">
        {r.activer.map((c, i) => (
          <li key={c.cle} className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {i + 1}. {c.cas}
            </div>
            {/* `break-all` : sur un écran de 360 px, un code de vingt signes
                déborderait et le dernier « # » serait coupé — c'est-à-dire
                le caractère sans lequel le code ne part pas. */}
            <div className="mt-1 break-all font-mono text-lg font-semibold text-slate-900">
              {c.code}
            </div>
            <button
              type="button"
              onClick={() => copier(c.code)}
              className="mt-2 w-full rounded-lg bg-white px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
            >
              {copie === c.code ? 'Copié' : 'Copier'}
            </button>
          </li>
        ))}
      </ol>

      {copieImpossible && (
        <p className="mt-2 text-xs text-slate-500">
          La copie n’a pas fonctionné sur ce téléphone. Les codes sont écrits en entier
          ci-dessus : tapez-les directement.
        </p>
      )}

      {/* LA PHRASE QUE PERSONNE NE DIT, ET QUI CHANGE LA DÉCISION. */}
      <div className="mt-4 rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
        <div className="font-semibold">Votre messagerie vocale ne prendra plus ces appels.</div>
        <p className="mt-1">
          Ce n’est pas un effet de bord : chez votre opérateur, la messagerie est
          elle-même un renvoi, posé exactement là. Le nôtre prend sa place. C’est le but —
          un SMS en trois secondes vaut mieux qu’un répondeur que personne n’écoute —
          mais vous devez le savoir avant, pas après.
        </p>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Aparte
          titre="Savoir où vous en êtes"
          code={r.verifier}
          texte="Affiche l’état réel de votre ligne sans rien changer."
        />
        <Aparte
          titre="Tout remettre comme avant"
          code={r.annuler}
          texte="Efface tous les renvois, votre messagerie vocale revient."
        />
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Le délai avant renvoi est réglé sur <strong>{r.delai} secondes</strong>, soit environ
        cinq sonneries. Ces codes sont ceux de la norme GSM : ils sont les mêmes chez
        Orange, SFR, Bouygues et Free.
      </p>
    </Encadre>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// DEUX FAÇONS DE COPIER, PARCE QUE LA MODERNE EST SOUVENT INTERDITE
// ─────────────────────────────────────────────────────────────────────────
// `navigator.clipboard` est la bonne API, et elle est refusée dès que la
// page n'a pas la permission `clipboard-write` : dans une iframe, et dans
// les navigateurs intégrés de Gmail, Messages ou Facebook — c'est-à-dire
// précisément là où l'artisan ouvrira le lien qu'on lui aura envoyé.
// Mesuré le 24 septembre dans le panneau d'aperçu : la promesse est
// rejetée, sans message.
//
// `document.execCommand('copy')` est officiellement obsolète, et marche
// là où l'autre échoue. On garde les deux : la moderne d'abord, l'ancienne
// en filet. Le jour où l'ancienne disparaîtra pour de bon, le message de
// repli est déjà écrit.

async function presseGeste(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte)
    return true
  } catch {
    return false
  }
}

function presseAncienne(texte: string): boolean {
  try {
    const zone = document.createElement('textarea')
    zone.value = texte
    // Hors du champ de vision, mais DANS le document : une sélection sur
    // un élément détaché ne se copie pas. Et `readOnly` empêche le clavier
    // de s'ouvrir sur un téléphone.
    zone.readOnly = true
    zone.style.position = 'fixed'
    zone.style.top = '-1000px'
    document.body.appendChild(zone)
    zone.select()
    zone.setSelectionRange(0, texte.length)
    const fait = document.execCommand('copy')
    document.body.removeChild(zone)
    return fait
  } catch {
    return false
  }
}

function Aparte({ titre, code, texte }: { titre: string; code: string; texte: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{titre}</div>
      <div className="mt-1 font-mono text-base font-semibold text-slate-900">{code}</div>
      <p className="mt-1 text-xs text-slate-600">{texte}</p>
    </div>
  )
}

function Encadre({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">{children}</div>
}

function Titre({ children }: { children: React.ReactNode }) {
  return <div className="font-semibold text-slate-900">{children}</div>
}
