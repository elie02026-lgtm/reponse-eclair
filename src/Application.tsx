import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import ARappeler from './ARappeler'
import Traitees from './Traitees'
import Reglages from './Reglages'
import Onboarding from './Onboarding'
import type { Artisan } from './types'

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

  // Un compte peut exister sans fiche artisan : c'est le cas juste après
  // l'inscription, puisque la confirmation d'e-mail empêche de créer la
  // fiche au moment de l'inscription elle-même.
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    // Pas de filtre sur l'id : la RLS ne renvoie que la fiche du compte connecté.
    supabase
      .from('artisans')
      .select('*')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setArtisan((data as Artisan | null) ?? null)
        setChargement(false)
      })
  }, [])

  if (chargement) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Chargement…</p>
      </main>
    )
  }

  if (erreur) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
      </main>
    )
  }

  // Compte créé mais fiche absente : on la demande avant de montrer quoi que ce soit.
  if (!artisan) {
    return <Onboarding session={session} onCree={setArtisan} />
  }

  return (
    // pb-20 réserve la place de la barre du bas, qui est en position fixe.
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <h1 className="truncate text-lg font-bold tracking-tight text-slate-900">
          {artisan.entreprise}
        </h1>
        <button
          onClick={() => supabase.auth.signOut()}
          className="shrink-0 rounded-lg px-3 py-1 text-sm text-slate-600 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          Quitter
        </button>
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
