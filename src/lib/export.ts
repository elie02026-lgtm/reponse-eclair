import { supabase } from './supabase'
import { enCsv, nomFichierExport } from './csv'
import type { Demande } from '../types'

// Ce fichier ne fait que deux choses : lire la base, et poser un fichier sur
// le disque de l'artisan. La mise en forme du CSV vit dans csv.ts, qui est
// pur et donc vérifiable sans navigateur.
export async function exporterDemandes(): Promise<{ lignes?: number; erreur?: string }> {
  // Aucun filtre sur artisan_id : la RLS garantit qu'on n'exporte que les
  // siennes. C'est la même protection que pour l'affichage.
  const { data, error } = await supabase
    .from('demandes')
    .select('*')
    .order('recue_le', { ascending: false })

  if (error) return { erreur: `Export impossible : ${error.message}` }

  const demandes = (data ?? []) as Demande[]
  const fichier = new Blob([enCsv(demandes)], { type: 'text/csv;charset=utf-8' })

  const url = URL.createObjectURL(fichier)
  const lien = document.createElement('a')
  lien.href = url
  // Daté à Paris, pas en UTC — voir `nomFichierExport`.
  lien.download = nomFichierExport(new Date())
  lien.click()
  // Libérer l'URL : sans ça, le fichier reste en mémoire tant que l'onglet vit.
  URL.revokeObjectURL(url)

  return { lignes: demandes.length }
}
