import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// CE QUE VOIT QUELQU'UN QUI VIENT DE S'INSCRIRE.
//
// Le cahier demande (case B5) qu'« une personne qui n'a jamais vu le
// produit y arrive sans mode d'emploi ». Jusqu'ici, un artisan tout neuf
// arrivait sur un écran vide portant « Aucune demande à rappeler » —
// phrase exacte, et parfaitement trompeuse : elle laisse croire que le
// système écoute et qu'il n'y a simplement rien eu.
//
// Or tant qu'aucun numéro n'est attribué, RIEN N'ARRIVERA JAMAIS. L'écran
// disait « rien pour l'instant » alors qu'il fallait dire « rien, et rien
// ne viendra ».
//
// ─────────────────────────────────────────────────────────────────────────
// CE QUI A ÉTÉ RETIRÉ D'ICI LE 1ᵉʳ OCTOBRE 2026, ET POURQUOI
// ─────────────────────────────────────────────────────────────────────────
// Cette page affichait une liste numérotée de trois étapes, un paragraphe
// de vérification, et surtout LES TROIS CODES DE RENVOI EN ENTIER, repris
// du composant `RenvoiAppel`. Un mur de texte sur un écran qui est censé
// dire une seule chose : « il n'y a rien, et voilà pourquoi ».
//
// Les codes n'ont pas disparu : ils vivent dans les Réglages, où ils ont
// toujours été, et où l'artisan les retrouvera quand il en aura besoin. Les
// avoir aux deux endroits, c'était deux textes à tenir d'accord — et le jour
// où ils divergeraient, l'un des deux ferait perdre des appels.
//
// Trois lignes et un bouton. Rien de plus.

type Etat = 'chargement' | 'sans-numero' | 'pret' | 'inconnu'
type Fiche = { numero_twilio: string | null; numero_actif: boolean }

/** Le même habillage pour les trois cas : un titre, une phrase, une sortie.
 *
 *  LE BOUTON EST UN BOUTON, PAS UN LIEN. Les onglets de l'application
 *  vivent dans un `useState`, pas dans l'adresse — un `<a href="/reglages">`
 *  rechargerait tout et retomberait sur l'onglet par défaut, c'est-à-dire
 *  exactement là d'où l'artisan vient de partir. */
function Vide({
  titre,
  children,
  bouton,
}: {
  titre: string
  children: React.ReactNode
  bouton?: { texte: string; action?: () => void }
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">{titre}</h2>
      <p className="mt-2 text-sm text-slate-600">{children}</p>
      {bouton?.action && (
        <button
          type="button"
          onClick={bouton.action}
          className="mt-4 block w-full rounded-lg bg-slate-900 px-4 py-3 text-center font-medium text-white hover:bg-slate-800"
        >
          {bouton.texte}
        </button>
      )}
    </div>
  )
}

export default function PremiersPas({ versReglages }: { versReglages?: () => void }) {
  const [etat, setEtat] = useState<Etat>('chargement')
  const [fiche, setFiche] = useState<Fiche | null>(null)

  useEffect(() => {
    // La RLS ne renvoie que sa propre fiche : pas de filtre à écrire.
    supabase
      .from('artisans')
      .select('numero_twilio, numero_actif')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return setEtat('inconnu')
        const f = data as Fiche
        setFiche(f)
        // « prêt » exige LES DEUX : un numéro, et la preuve qu'il sonne.
        // Ne regarder que le numéro, c'était promettre des appels à
        // quelqu'un qui n'en recevrait jamais.
        setEtat(f.numero_twilio && f.numero_actif ? 'pret' : 'sans-numero')
      })
  }, [])

  if (etat === 'chargement') return null

  // On ne sait pas lire la fiche : on se tait plutôt que d'inventer une
  // consigne. Un mode d'emploi faux est pire qu'une absence de mode d'emploi.
  //
  // CE CAS DOIT PASSER AVANT LE GARDE-FOU SUR `fiche`, puisque c'est
  // précisément celui où la fiche est absente. Je l'avais mis après, et il
  // devenait inatteignable : l'écran serait resté vide au lieu de dire
  // quelque chose.
  if (etat === 'inconnu') {
    return (
      <p className="rounded-lg bg-white px-4 py-6 text-center text-slate-500 ring-1 ring-slate-200">
        Aucune demande à rappeler.
      </p>
    )
  }

  // Passé ce point, la fiche est forcément là — `sans-numero` et `pret` ne
  // sont posés qu'après l'avoir reçue. On le montre au lecteur plutôt que
  // de le lui faire croire avec un `fiche!`.
  if (!fiche) return null

  if (etat === 'sans-numero') {
    return (
      <Vide
        titre="Rien ici — et rien ne viendra encore."
        bouton={{ texte: 'Voir où j’en suis', action: versReglages }}
      >
        Vos appels manqués ne peuvent arriver que renvoyés vers un numéro dédié, et{' '}
        <strong>ce numéro ne vous a pas encore été attribué</strong>. Tant que ce n’est pas
        fait, cet écran restera vide quoi que vous fassiez.
      </Vide>
    )
  }

  // Ce titre disait « Tout est en place ». ON N'EN SAIT RIEN : un numéro
  // attribué ne dit pas que l'opérateur renvoie quoi que ce soit, et le
  // renvoi vit sur le téléphone de l'artisan, pas dans cette base.
  return (
    <Vide
      titre="Rien à rappeler pour l’instant."
      bouton={{ texte: 'Vérifier mon renvoi d’appel', action: versReglages }}
    >
      Vos appels manqués sur le <strong>{fiche.numero_twilio}</strong> arrivent ici tout
      seuls, classés par gravité réelle — à une condition : que votre opérateur les
      renvoie. Cette page ne peut pas le vérifier ; votre téléphone, lui, le sait. Tapez{' '}
      <code className="font-mono font-semibold">*#61#</code>.
    </Vide>
  )
}
