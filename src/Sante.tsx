import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { anomalies, COLONNES_SANTE } from './lib/sante'
import type { Anomalie, DemandeSante } from './lib/sante'

// LE BANDEAU QUI N'APPARAÎT PAS.
// Quand tout va bien, ce composant ne rend rien du tout : pas de pastille
// verte, pas de « tout est opérationnel ». Un voyant vert permanent, on
// cesse de le voir en trois jours — et le jour où il passe au rouge, on ne
// le voit pas non plus. Ici, voir quelque chose signifie qu'il y a
// quelque chose à voir.
export default function Sante() {
  const [trouvees, setTrouvees] = useState<Anomalie[]>([])

  useEffect(() => {
    // Pas de filtre sur artisan_id : la RLS ne renvoie que ses lignes.
    // On ne demande que les six colonnes que la détection lit vraiment.
    supabase
      .from('demandes')
      .select(COLONNES_SANTE)
      .then(({ data, error }) => {
        // Une panne du diagnostic ne doit PAS masquer l'écran principal.
        // On se tait : mieux vaut un capteur muet qu'une application morte.
        if (error || !data) return
        setTrouvees(anomalies(data as DemandeSante[], new Date()))
      })
  }, [])

  if (trouvees.length === 0) return null

  return (
    <div className="mb-6 space-y-2">
      {trouvees.map((a) => (
        <div
          key={a.cle}
          className={`rounded-xl px-4 py-3 ring-1 ${
            a.niveau === 'rouge'
              ? 'bg-red-50 text-red-800 ring-red-200'
              : 'bg-amber-50 text-amber-800 ring-amber-200'
          }`}
        >
          <div className="text-sm font-semibold">{a.titre}</div>
          <p className="mt-1 text-sm opacity-90">{a.detail}</p>
        </div>
      ))}
    </div>
  )
}
