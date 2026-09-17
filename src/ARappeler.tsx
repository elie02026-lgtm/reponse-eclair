import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import type { Demande } from './types'

// Depuis combien de temps la demande attend, en français lisible.
function tempsEcoule(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  return `il y a ${Math.floor(heures / 24)} j`
}

const STYLE_GRAVITE: Record<number, string> = {
  3: 'bg-red-50 text-red-800 ring-red-200',
  2: 'bg-amber-50 text-amber-800 ring-amber-200',
  1: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const SENS_GRAVITE: Record<number, string> = {
  3: 'Dégât en cours ou danger',
  2: 'Panne gênante, sans danger',
  1: 'Projet, pas pressé',
}

export default function ARappeler({ session }: { session: Session }) {
  const [demandes, setDemandes] = useState<Demande[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  useEffect(() => {
    // LA RÈGLE DE TRI, QUI EST LE PRODUIT : gravité d'abord, panier ensuite.
    // Jamais la date — l'ordre chronologique est ce que font les trois concurrents.
    //
    // Le tri est exécuté en base, pas en JavaScript : l'index
    // (artisan_id, statut, gravite desc, panier desc) créé dans la migration
    // est fait exactement pour cette requête.
    //
    // Note : on ne filtre PAS sur artisan_id. Ce n'est pas un oubli.
    // La politique RLS s'en charge en base : même en demandant tout,
    // Postgres ne renvoie que les lignes de l'artisan connecté.
    supabase
      .from('demandes')
      .select('*')
      .eq('statut', 'a_rappeler')
      .order('gravite', { ascending: false })
      .order('panier', { ascending: false })
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setDemandes(data ?? [])
        setChargement(false)
      })
  }, [])

  return (
    <main className="min-h-screen bg-slate-50">
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
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          À rappeler ({demandes.length})
        </h2>

        {chargement && <p className="text-slate-500">Chargement…</p>}

        {erreur && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>
        )}

        {!chargement && !erreur && demandes.length === 0 && (
          <p className="rounded-lg bg-white px-4 py-6 text-center text-slate-500 ring-1 ring-slate-200">
            Aucune demande à rappeler.
          </p>
        )}

        <ul className="space-y-3">
          {demandes.map((d) => (
            <li key={d.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{d.prenom ?? 'Sans nom'}</span>
                <span className="text-sm text-slate-500">{tempsEcoule(d.recue_le)}</span>
              </div>

              {d.lieu && <p className="text-sm text-slate-500">{d.lieu}</p>}
              {d.besoin && <p className="mt-2 text-slate-700">{d.besoin}</p>}

              {/* L'écart entre ces deux encadrés EST la démonstration du produit :
                  ce que la machine a estimé, face à ce que le client avait coché. */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div
                  className={`rounded-lg px-3 py-2 ring-1 ${
                    STYLE_GRAVITE[d.gravite ?? 0] ?? 'bg-slate-100 text-slate-600 ring-slate-200'
                  }`}
                >
                  <div className="font-semibold">Gravité estimée : {d.gravite ?? '?'}/3</div>
                  <div className="opacity-80">{SENS_GRAVITE[d.gravite ?? 0] ?? 'non classée'}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2 text-slate-600 ring-1 ring-slate-200">
                  <div className="font-semibold">Le client a coché</div>
                  <div className="opacity-80">{d.urgence_dite ?? '—'}</div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                {d.telephone && (
                  <a
                    href={`tel:${d.telephone}`}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Appeler
                  </a>
                )}
                {d.lieu && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.lieu)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
                  >
                    Itinéraire
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
