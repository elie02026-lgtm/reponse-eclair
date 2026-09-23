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
// ne viendra ». La différence entre les deux, c'est un artisan qui attend
// une semaine avant de comprendre qu'il manque une étape.

type Etat = 'chargement' | 'sans-numero' | 'pret' | 'inconnu'

export default function PremiersPas() {
  const [etat, setEtat] = useState<Etat>('chargement')
  const [numero, setNumero] = useState<string | null>(null)

  useEffect(() => {
    // La RLS ne renvoie que sa propre fiche : pas de filtre à écrire.
    supabase
      .from('artisans')
      .select('numero_twilio')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) return setEtat('inconnu')
        setNumero(data.numero_twilio)
        setEtat(data.numero_twilio ? 'pret' : 'sans-numero')
      })
  }, [])

  if (etat === 'chargement') return null

  // On ne sait pas lire la fiche : on se tait plutôt que d'inventer une
  // consigne. Un mode d'emploi faux est pire qu'une absence de mode d'emploi.
  if (etat === 'inconnu') {
    return (
      <p className="rounded-lg bg-white px-4 py-6 text-center text-slate-500 ring-1 ring-slate-200">
        Aucune demande à rappeler.
      </p>
    )
  }

  if (etat === 'sans-numero') {
    return (
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="font-semibold text-slate-900">Rien ici — et rien ne viendra encore.</h2>
        <p className="mt-2 text-sm text-slate-600">
          Vos appels manqués ne peuvent être captés que s’ils sont renvoyés vers un numéro
          dédié. <strong>Ce numéro ne vous a pas encore été attribué</strong>, donc aucun
          appel ne peut arriver jusqu’ici.
        </p>
        <ol className="mt-4 space-y-2 text-sm text-slate-700">
          <li>
            <strong>1.</strong> Un numéro vous est attribué — il apparaîtra dans vos
            Réglages.
          </li>
          <li>
            <strong>2.</strong> Vous activez le renvoi sur non-réponse depuis votre
            téléphone. Vous gardez votre numéro habituel.
          </li>
          <li>
            <strong>3.</strong> Le premier appel manqué arrive ici, tout seul.
          </li>
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Tant que l’étape 1 n’est pas faite, cet écran restera vide, quoi que vous fassiez.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">Tout est en place. Rien à rappeler.</h2>
      <p className="mt-2 text-sm text-slate-600">
        Vos appels manqués sur le <strong>{numero}</strong> arrivent ici automatiquement,
        classés par gravité réelle.
      </p>
      {/* Un artisan neuf ne fait pas confiance à un écran vide. On lui donne
          le moyen de vérifier lui-même, en trente secondes. */}
      <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 ring-1 ring-slate-200">
        <strong>Pour en avoir le cœur net :</strong> appelez votre numéro depuis un autre
        téléphone et ne décrochez pas. Vous devez recevoir un SMS dans les secondes qui
        suivent, et la demande apparaîtra ici dès que la personne aura rempli le formulaire.
      </p>
    </div>
  )
}
