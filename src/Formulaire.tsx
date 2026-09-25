import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { lireTelephone } from './lib/telephone'
import { lireParametre } from './lib/lien'

// LE FORMULAIRE. C'est la seule page que verra le client de l'artisan.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI IL REMPLACE TALLY
// ─────────────────────────────────────────────────────────────────────────
// Tally marchait — pour UN artisan. Le lien du SMS doit porter le code de
// celui qu'on a appelé, et un formulaire Tally ne sait pas rattacher une
// réponse à un code qu'il ne connaît pas. Décision d'Elie, 23 septembre :
// un formulaire à nous.
//
// Trois gains par-dessus le marché : un sous-traitant de moins sur la page
// de confidentialité, un lien plus court dans un SMS facturé au caractère,
// et la maîtrise de ce qui est demandé — c'est-à-dire du peu qui est
// demandé.
//
// ─────────────────────────────────────────────────────────────────────────
// CE QU'ON NE DEMANDE PAS
// ─────────────────────────────────────────────────────────────────────────
// Quelqu'un qui vient d'avoir une fuite ne remplit pas huit champs sur un
// téléphone, debout dans sa cuisine. Un seul champ est obligatoire : ce
// qu'il lui arrive. Le téléphone arrive déjà rempli — c'est celui avec
// lequel il vient d'appeler. L'e-mail est FACULTATIF : à terme on répondra
// par SMS, et exiger une adresse ferait perdre ceux qui n'en ont pas sous
// la main.

// Le webhook de la chaîne de capture. Publique par nature : n'importe qui
// peut y poster, comme n'importe qui pouvait poster dans le Tally. Ce qui
// protège, c'est qu'il faut un code d'artisan valide pour que la demande
// arrive quelque part — sinon elle finit en orpheline (migration 0009).
const WEBHOOK = 'https://hook.eu1.make.com/zyfgvw5dfi3x1lfgg6k0ttu52qosst5u'

const URGENCES = ['Oui, c’est urgent', 'Non, ça peut attendre'] as const

type Artisan = { entreprise: string; metier: string }
type Etat = 'chargement' | 'inconnu' | 'pret' | 'envoi' | 'envoye' | 'panne'

export default function Formulaire() {
  // PAS `URLSearchParams` : elle traduit « + » en espace, et le numéro
  // qu'on pré-remplit commence par « + ». Voir `lib/lien.ts`, qui porte la
  // mesure et le témoin.
  const recherche = window.location.search
  const code = lireParametre(recherche, 'a')

  // L'absence de code se sait AVANT le premier rendu : inutile d'afficher
  // un chargement pour une requête qu'on ne fera pas. (Et oxlint refuse à
  // juste titre un setState synchrone dans un effet.)
  const [etat, setEtat] = useState<Etat>(code ? 'chargement' : 'inconnu')
  const [artisan, setArtisan] = useState<Artisan | null>(null)

  const [prenom, setPrenom] = useState('')
  // Pré-rempli avec le numéro porté par le lien, remis en forme lisible.
  // `lireTelephone` sert déjà à ça côté artisan : même code, même résultat.
  const [telephone, setTelephone] = useState(() => {
    const brut = lireParametre(recherche, 't')
    const lu = lireTelephone(brut)
    return lu.etat === 'ok' ? lu.affichage : brut
  })
  const [email, setEmail] = useState('')
  const [lieu, setLieu] = useState('')
  const [besoin, setBesoin] = useState('')
  const [urgence, setUrgence] = useState<string>(URGENCES[0])

  useEffect(() => {
    if (!code) return
    supabase
      .rpc('artisan_public', { p_code: code })
      .then(({ data, error }) => {
        const trouve = (data as Artisan[] | null)?.[0]
        if (error || !trouve) return setEtat('inconnu')
        setArtisan(trouve)
        setEtat('pret')
      })
  }, [code])

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setEtat('envoi')

    try {
      const reponse = await fetch(WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          prenom: prenom.trim(),
          telephone: telephone.trim(),
          email: email.trim(),
          lieu: lieu.trim(),
          besoin: besoin.trim(),
          urgence_dite: urgence,
        }),
      })
      if (!reponse.ok) throw new Error(String(reponse.status))
      setEtat('envoye')
    } catch {
      // On ne dit pas « réessayez » sans dire comment faire autrement : la
      // personne a un téléphone dans la main et un artisan à joindre.
      setEtat('panne')
    }
  }

  if (etat === 'chargement') {
    return <Cadre>{null}</Cadre>
  }

  // LIEN SANS CODE, OU CODE INCONNU.
  // Ne pas afficher un formulaire anonyme : une personne qui ne sait pas à
  // qui elle écrit n'écrit pas, et si elle écrit, on ne saura pas à qui
  // remettre sa demande.
  if (etat === 'inconnu') {
    return (
      <Cadre>
        <h1 className="text-xl font-bold text-slate-900">Ce lien n’est plus valable.</h1>
        <p className="mt-3 text-slate-600">
          Il manque une information dans l’adresse, ou elle a été coupée en chemin.
          Rappelez directement l’artisan que vous avez essayé de joindre — c’est le plus
          rapide.
        </p>
      </Cadre>
    )
  }

  if (etat === 'envoye') {
    return (
      <Cadre>
        <h1 className="text-xl font-bold text-slate-900">C’est envoyé.</h1>
        <p className="mt-3 text-slate-600">
          {artisan?.entreprise} a reçu votre demande avec votre numéro. Vous serez
          rappelé.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          Si c’est une urgence et que personne ne vous rappelle, rappelez directement.
        </p>
      </Cadre>
    )
  }

  if (etat === 'panne') {
    return (
      <Cadre>
        <h1 className="text-xl font-bold text-slate-900">L’envoi n’a pas abouti.</h1>
        <p className="mt-3 text-slate-600">
          Votre demande n’est pas partie. Le plus sûr maintenant est de rappeler
          {artisan ? ` ${artisan.entreprise}` : ' l’artisan'} directement.
        </p>
        <button
          type="button"
          onClick={() => setEtat('pret')}
          className="mt-4 w-full rounded-lg px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          Revenir au formulaire
        </button>
      </Cadre>
    )
  }

  const envoi = etat === 'envoi'

  return (
    <Cadre>
      <p className="text-sm font-medium text-slate-500">Vous avez appelé</p>
      <h1 className="text-xl font-bold text-slate-900">{artisan?.entreprise}</h1>
      <p className="mt-2 text-slate-600">
        Il n’a pas pu décrocher. Dites-lui ce qu’il vous arrive, il vous rappelle.
      </p>

      <form onSubmit={envoyer} className="mt-5 space-y-4">
        {/* Le seul champ obligatoire, et il est en premier. */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Que se passe-t-il ?</span>
          <textarea
            required
            rows={4}
            autoFocus
            value={besoin}
            onChange={(e) => setBesoin(e.target.value)}
            placeholder="Par exemple : une fuite sous l’évier, l’eau coule depuis ce matin."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-slate-700">C’est urgent ?</legend>
          {URGENCES.map((u) => (
            <label key={u} className="flex items-center gap-3 rounded-lg px-1 py-1">
              <input
                type="radio"
                name="urgence"
                value={u}
                checked={urgence === u}
                onChange={() => setUrgence(u)}
                className="h-5 w-5"
              />
              <span className="text-slate-700">{u}</span>
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Votre prénom</span>
            <input
              type="text"
              autoComplete="given-name"
              value={prenom}
              onChange={(e) => setPrenom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Commune</span>
            <input
              type="text"
              autoComplete="address-level2"
              value={lieu}
              onChange={(e) => setLieu(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Votre numéro</span>
          <input
            type="tel"
            required
            inputMode="tel"
            autoComplete="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            Votre e-mail <span className="font-normal text-slate-400">— facultatif</span>
          </span>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            Pour recevoir la confirmation. Sans lui, vous serez rappelé quand même.
          </span>
        </label>

        <button
          type="submit"
          disabled={envoi}
          className="w-full rounded-lg bg-slate-900 px-4 py-4 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {envoi ? 'Envoi…' : 'Envoyer'}
        </button>

        <p className="text-xs text-slate-500">
          Vos informations servent uniquement à vous rappeler.{' '}
          <a href="/confidentialite" className="underline">
            Ce qu’on en fait
          </a>
          .
        </p>
      </form>
    </Cadre>
  )
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto w-full max-w-md rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        {children}
      </div>
    </main>
  )
}
