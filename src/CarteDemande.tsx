import { LIBELLE_STATUT, STATUTS } from './types'
import type { Demande, Statut } from './types'

// Depuis combien de temps la demande attend, en français lisible.
function tempsEcoule(iso: string): string {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (minutes < 1) return 'à l’instant'
  if (minutes < 60) return `il y a ${minutes} min`
  const heures = Math.floor(minutes / 60)
  if (heures < 24) return `il y a ${heures} h`
  return `il y a ${Math.floor(heures / 24)} j`
}

const dateCourte = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

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

export default function CarteDemande({
  demande: d,
  occupee,
  onChangerStatut,
}: {
  demande: Demande
  occupee: boolean
  onChangerStatut: (demande: Demande, nouveau: Statut) => void
}) {
  return (
    <li
      className={`rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 ${
        occupee ? 'opacity-50' : ''
      }`}
    >
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
            className="flex-1 rounded-lg bg-slate-900 px-3 py-3 text-center text-sm font-medium text-white hover:bg-slate-800"
          >
            Appeler
          </a>
        )}
        {d.lieu && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(d.lieu)}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg px-3 py-3 text-center text-sm font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
          >
            Itinéraire
          </a>
        )}
      </div>

      <label className="mt-2 block">
        <span className="sr-only">Statut de la demande</span>
        <select
          value={d.statut}
          disabled={occupee}
          onChange={(e) => onChangerStatut(d, e.target.value as Statut)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 disabled:opacity-50"
        >
          {STATUTS.map((s) => (
            <option key={s} value={s}>
              {LIBELLE_STATUT[s]}
            </option>
          ))}
        </select>
      </label>

      {d.traite_le && (
        <p className="mt-2 text-xs text-slate-400">
          Traité le {dateCourte.format(new Date(d.traite_le))}
        </p>
      )}
    </li>
  )
}
