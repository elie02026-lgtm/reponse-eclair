import { useState } from 'react'
import { supabase } from './lib/supabase'

// Page PUBLIQUE, atteinte depuis un lien en bas d'une relance.
// Personne n'est connecté ici : le visiteur est un prospect, pas l'artisan.
//
// POURQUOI UN BOUTON ET PAS UNE DÉSINSCRIPTION AU CHARGEMENT.
// Les antivirus et les filtres anti-hameçonnage ouvrent les liens des
// e-mails avant l'humain, pour les inspecter. Si l'arrivée sur la page
// suffisait à désinscrire, la moitié des gens seraient désinscrits sans
// l'avoir demandé — et l'artisan perdrait des prospects sans comprendre.
// Un clic sur la page reste immédiat pour la personne, et invisible pour
// une machine qui se contente de charger l'URL.

type Etat = 'attente' | 'envoi' | 'fait' | 'inconnu' | 'erreur'

export default function Desinscription() {
  // Le jeton est un uuid : ni l'e-mail ni l'id ne circulent dans l'URL.
  // Avec un id numérique, n'importe qui désinscrirait tout le monde en
  // comptant de 1 à 1000.
  const jeton = new URLSearchParams(window.location.search).get('j')
  const [etat, setEtat] = useState<Etat>('attente')
  const [email, setEmail] = useState<string | null>(null)

  async function desinscrire() {
    if (!jeton) return
    setEtat('envoi')

    // La table `oppositions` est fermée à tout le monde. Cette fonction est
    // la seule porte : elle tourne avec les droits de son propriétaire et
    // n'accepte qu'un jeton.
    const { data, error } = await supabase.rpc('se_desinscrire', { p_jeton: jeton })

    if (error) {
      setEtat('erreur')
      return
    }
    // La fonction rend l'e-mail, ou rien si le jeton est inconnu. Elle ne
    // dit jamais « ce jeton n'existe pas » : ça laisserait deviner lesquels
    // existent.
    if (!data) {
      setEtat('inconnu')
      return
    }
    setEmail(data as string)
    setEtat('fait')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {!jeton && (
          <p className="text-slate-700">
            Ce lien est incomplet. Ouvrez-le directement depuis l’e-mail que vous avez reçu.
          </p>
        )}

        {jeton && etat === 'attente' && (
          <>
            <h1 className="text-lg font-semibold text-slate-900">Ne plus recevoir d’e-mails</h1>
            <p className="mt-2 text-sm text-slate-600">
              Un seul clic, et cette adresse ne recevra plus jamais de relance de notre part.
            </p>
            <button
              type="button"
              onClick={desinscrire}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
            >
              Me désinscrire
            </button>
          </>
        )}

        {etat === 'envoi' && <p className="text-slate-500">Enregistrement…</p>}

        {etat === 'fait' && (
          <>
            <h1 className="text-lg font-semibold text-slate-900">C’est fait.</h1>
            <p className="mt-2 text-sm text-slate-600">
              <span className="font-medium text-slate-900">{email}</span> ne recevra plus de
              relance. Vous pouvez fermer cette page.
            </p>
          </>
        )}

        {/* Jeton inconnu ou déjà effacé : on ne distingue pas les deux cas,
            et on ne renvoie surtout pas un message d'échec inquiétant. */}
        {etat === 'inconnu' && (
          <p className="text-slate-700">
            Cette adresse ne recevra plus de relance. Vous pouvez fermer cette page.
          </p>
        )}

        {etat === 'erreur' && (
          <>
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              L’enregistrement n’a pas abouti.
            </p>
            <button
              type="button"
              onClick={desinscrire}
              className="mt-3 w-full rounded-lg px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
            >
              Réessayer
            </button>
          </>
        )}
      </div>
    </main>
  )
}
