import { useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import ARappeler from './ARappeler'
import Traitees from './Traitees'
import Reglages from './Reglages'

type Ecran = 'a_rappeler' | 'traitees' | 'reglages'

const ONGLETS: { cle: Ecran; libelle: string }[] = [
  { cle: 'a_rappeler', libelle: 'À rappeler' },
  { cle: 'traitees', libelle: 'Traitées' },
  { cle: 'reglages', libelle: 'Réglages' },
]

export default function Application({ session }: { session: Session }) {
  // Navigation par état, sans bibliothèque de routage : trois écrans ne
  // justifient pas une dépendance de plus. Contrepartie assumée : pas d'URL
  // par écran, donc le bouton Retour du navigateur ne change pas d'onglet.
  const [ecran, setEcran] = useState<Ecran>('a_rappeler')

  return (
    // pb-20 réserve la place de la barre du bas, qui est en position fixe.
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold tracking-tight text-slate-900">Réponse Éclair</h1>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden text-slate-500 sm:inline">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="rounded-lg px-3 py-1 text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100"
          >
            Quitter
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Changer d'onglet démonte l'écran précédent : les données sont
            donc rechargées à chaque passage. C'est voulu — un artisan qui
            revient sur sa liste veut l'état réel, pas un cache. */}
        {ecran === 'a_rappeler' && <ARappeler />}
        {ecran === 'traitees' && <Traitees />}
        {ecran === 'reglages' && <Reglages />}
      </div>

      {/* Barre en bas plutôt qu'en haut : le pouce y arrive sans changer
          la prise du téléphone. Contrainte du cahier, groupe C —
          « testé sur un vrai téléphone, dehors, d'une seule main ». */}
      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl">
          {ONGLETS.map((onglet) => (
            <button
              key={onglet.cle}
              onClick={() => setEcran(onglet.cle)}
              aria-current={ecran === onglet.cle ? 'page' : undefined}
              className={`flex-1 px-2 py-4 text-sm font-medium ${
                ecran === onglet.cle
                  ? 'border-t-2 border-slate-900 text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {onglet.libelle}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
