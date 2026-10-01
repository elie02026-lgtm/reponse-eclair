import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import { lireTelephone } from './lib/telephone'
import { lireParametre } from './lib/lien'
import { URGENCES, BORNES } from './lib/demandeRecue'
import { QUESTIONS, AUCUNE_REPONSE, auMoinsUneReponse, conseils, accuse } from './lib/conseil'
import type { Reponses, Reponse, NomQuestion } from './lib/conseil'

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

// NOTRE PORTE, PLUS CELLE DE MAKE.
//
// Cette ligne portait l'URL du webhook Make, en clair, dans le JavaScript
// servi à tout le monde. N'importe qui pouvait donc poster de fausses
// demandes au nom de n'importe quel artisan — le code d'artisan voyage dans
// chaque SMS — et vider les 1 000 opérations mensuelles du forfait gratuit.
//
// Le webhook vit désormais en secret du Worker (`src/worker/index.ts`), qui
// freine, valide et transmet. Il ne reste ici qu'un chemin relatif : même
// origine, donc aucun CORS, et rien à cacher.
const ENVOI = '/api/demande'

/** Ce que le client lit sur les boutons. La valeur ENVOYÉE, elle, est celle
 *  de `lib/conseil.ts` — « je-ne-sais-pas » se stocke mieux qu'une phrase
 *  avec des espaces et des accents. */
const LIBELLE_CHOIX: Record<string, string> = {
  oui: 'Oui',
  non: 'Non',
  'je-ne-sais-pas': 'Je ne sais pas',
}

// La liste blanche vit avec les règles de validation : le serveur refuse
// tout ce qui n'est pas exactement l'un de ces deux libellés, et l'écran
// doit proposer exactement les mêmes. Deux listes auraient fini par diverger.

type Artisan = { entreprise: string; metier: string }
type Etat = 'chargement' | 'inconnu' | 'pret' | 'envoi' | 'envoye'

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
  // AUCUNE DEMANDE PERDUE. L'échec ne remplace plus l'écran : le formulaire
  // reste affiché, tout ce que la personne a tapé est encore là, et elle
  // n'a qu'à toucher « Envoyer » une seconde fois. Un écran de panne qui
  // fait disparaître le texte, c'est un texte qu'on ne réécrit pas.
  const [panne, setPanne] = useState(false)
  // Les trois réponses à boutons (phase 5.1). Aucune n'est obligatoire.
  const [reponses, setReponses] = useState<Reponses>(AUCUNE_REPONSE)

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

  // Toucher deux fois le même bouton l'annule : c'est le seul moyen de
  // revenir en arrière quand on s'est trompé, et aucune des trois questions
  // n'est obligatoire.
  function repondre(nom: NomQuestion, choix: Reponse) {
    setReponses((actuelles) => ({
      ...actuelles,
      [nom]: actuelles[nom] === choix ? null : choix,
    }))
  }

  async function envoyer(e: FormEvent) {
    e.preventDefault()
    setEtat('envoi')
    setPanne(false)

    try {
      const reponse = await fetch(ENVOI, {
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
          // Les trois réponses, sous le nom EXACT qu'attend le serveur et
          // que portera la colonne en base. Un seul mot pour les trois
          // endroits : il n'y a rien à traduire, donc rien à se tromper.
          eau_coule: reponses.eau_coule ?? '',
          arrivee_coupee: reponses.arrivee_coupee ?? '',
          chauffage_eau_chaude: reponses.chauffage_eau_chaude ?? '',
        }),
      })
      if (!reponse.ok) throw new Error(String(reponse.status))
      setEtat('envoye')
    } catch {
      // 400, 429, 502, réseau coupé : pour la personne qui a une fuite, la
      // différence n'a aucun intérêt. On ne lui montre jamais un code, on
      // lui dit ce qu'elle peut faire — réessayer, ou décrocher.
      setPanne(true)
      setEtat('pret')
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

  // ─────────────────────────────────────────────────────────────────────
  // LA PAGE QUI DOIT LUI DONNER UNE RAISON DE NE PAS APPELER AILLEURS
  // ─────────────────────────────────────────────────────────────────────
  // Un client qui vient d'écrire et qui n'a plus rien à faire qu'attendre
  // appelle le plombier suivant. Il part dans les trois minutes.
  //
  // Elle s'affiche IMMÉDIATEMENT : elle ne peut donc pas attendre la
  // classification, qui arrive entre dix-sept et vingt secondes plus tard.
  // Tout ce qu'elle dit vient des trois réponses à boutons, par des règles
  // déterministes — `lib/conseil.ts` — et d'aucun modèle.
  //
  // CE QU'ELLE NE DIT PAS : aucun délai. C'est la RÈGLE D'OR. L'ancienne
  // version disait « Vous serez rappelé » : un engagement que l'artisan
  // n'avait pas pris, au nom de l'artisan.
  if (etat === 'envoye') {
    const blocs = conseils(reponses, artisan?.metier ?? '')
    return (
      <Cadre>
        <h1 className="text-xl font-bold text-slate-900">C’est envoyé.</h1>

        {/* Toujours, quelle que soit la situation. L'entreprise est nommée
            deux fois à dessein : le client vient d'écrire à un inconnu sur
            une page qu'il ne connaît pas. */}
        <p className="mt-3 text-slate-700">{accuse(artisan?.entreprise ?? 'l’artisan')}</p>

        {blocs.map((bloc) => (
          <div
            key={bloc.titre}
            className={`mt-4 rounded-xl px-4 py-3 ring-1 ${
              bloc.agir
                ? 'bg-amber-50 text-amber-900 ring-amber-200'
                : 'bg-slate-50 text-slate-700 ring-slate-200'
            }`}
          >
            <div className="font-semibold">{bloc.titre}</div>
            <p className="mt-1 text-sm">{bloc.texte}</p>
          </div>
        ))}

        {/* La seule chose qu'on puisse promettre sans engager l'artisan :
            qu'il a bien été prévenu, et qu'il a votre numéro. */}
        <p className="mt-4 text-sm text-slate-500">
          Il a votre numéro. Si votre situation s’aggrave, rappelez-le directement.
        </p>
      </Cadre>
    )
  }

  const envoi = etat === 'envoi'
  const aRepondu = auMoinsUneReponse(reponses)

  return (
    <Cadre>
      <p className="text-sm font-medium text-slate-500">Vous avez appelé</p>
      <h1 className="text-xl font-bold text-slate-900">{artisan?.entreprise}</h1>
      <p className="mt-2 text-slate-600">
        Il n’a pas pu décrocher. Dites-lui ce qu’il vous arrive, il vous rappelle.
      </p>

      <form onSubmit={envoyer} className="mt-5 space-y-5">
        {/* ─────────────────────────────────────────────────────────────
            TROIS QUESTIONS, TROIS TOUCHERS, AUCUN CLAVIER (phase 5.1)
            ─────────────────────────────────────────────────────────────
            Elles passent AVANT la description, et ce n'est pas un détail :
            le client tape debout, avec une fuite à ses pieds. S'il
            abandonne après la première, on a déjà ce qui compte le plus —
            et c'est ce qui permet de lui donner un conseil utile à la page
            suivante.

            Grandes zones tactiles, texte de 17 px, contraste franc : la
            cible lit sans lunettes et touche avec un pouce. */}
        {QUESTIONS.map((question) => (
          <fieldset key={question.nom}>
            <legend className="text-base font-medium text-slate-900">{question.texte}</legend>
            <div className="mt-2 flex gap-2">
              {question.choix.map((choix) => {
                const choisi = reponses[question.nom] === choix
                return (
                  <button
                    key={choix}
                    type="button"
                    aria-pressed={choisi}
                    onClick={() => repondre(question.nom, choix)}
                    className={`flex-1 rounded-xl px-2 py-4 text-base font-medium ring-1 ${
                      choisi
                        ? 'bg-slate-900 text-white ring-slate-900'
                        : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {LIBELLE_CHOIX[choix]}
                  </button>
                )
              })}
            </div>
          </fieldset>
        ))}

        {/* LA DESCRIPTION DEVIENT FACULTATIVE dès qu'une question a reçu une
            réponse. Elle reste là — quelqu'un qui veut raconter doit
            pouvoir — mais plus courte, et on le dit. */}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">
            Que se passe-t-il ?{' '}
            {aRepondu && <span className="font-normal text-slate-500">(facultatif)</span>}
          </span>
          {/* `maxLength` reprend EXACTEMENT la borne du serveur
              (`lib/demandeRecue.ts`). Le navigateur empêche donc de dépasser,
              et le refus serveur ne peut plus frapper qu'un appelant qui
              n'est pas un formulaire. Sans ça, quelqu'un qui écrit beaucoup
              se ferait refuser après coup, sans comprendre pourquoi. */}
          {/* `required` suit EXACTEMENT la règle du serveur : facultatif dès
              qu'une question a répondu. Deux règles qui divergeraient
              donneraient un formulaire qui refuse d'être envoyé, ou un
              serveur qui refuse ce que l'écran acceptait. */}
          <textarea
            required={!aRepondu}
            rows={aRepondu ? 2 : 4}
            maxLength={BORNES.besoin}
            value={besoin}
            onChange={(e) => setBesoin(e.target.value)}
            placeholder={
              aRepondu
                ? 'Ajoutez un détail si vous voulez.'
                : 'Par exemple : une fuite sous l’évier, l’eau coule depuis ce matin.'
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base focus:border-slate-900 focus:outline-none"
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
              maxLength={BORNES.prenom}
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
              maxLength={BORNES.lieu}
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
            maxLength={BORNES.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-slate-900 focus:outline-none"
          />
          <span className="text-xs text-slate-500">
            Pour recevoir la confirmation. Sans lui, vous serez rappelé quand même.
          </span>
        </label>

        {panne && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Votre demande n’a pas pu partir. Réessayez, ou rappelez le numéro que vous
            venez de composer.
          </p>
        )}

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
