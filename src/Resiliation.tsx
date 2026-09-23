import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { confirmationValide, phraseEffacement } from './lib/resiliation'

// RÉSILIER (cahier, case B4 : « résilier et récupérer ses données »).
//
// L'export existait depuis des semaines ; la résiliation, non. Un logiciel
// qu'on ne peut pas quitter est un logiciel qu'on hésite à essayer.
//
// Elie a tranché le 23 septembre : suppression IMMÉDIATE, pas de délai de
// grâce. Trois conséquences pour cet écran :
//
//   1. Il faut DIRE ce qui disparaît, chiffré — « vos 47 demandes », pas
//      « vos données ». Un nombre se comprend ; « vos données » se signe
//      sans lire.
//   2. Il faut demander un geste qu'on ne fait pas par accident : taper le
//      nom de son entreprise. La règle est dans lib/resiliation.ts, testée,
//      et surtout REJOUÉE EN BASE — le bouton grisé n'est qu'une politesse,
//      c'est Postgres qui refuse (voir migration 0005).
//   3. Il faut dire aussi ce qui SURVIT. Cacher que la liste d'opposition
//      reste ferait de cette page un mensonge de plus.

type Fini = { entreprise: string; demandes: number }

export default function Resiliation({ entreprise }: { entreprise: string }) {
  const [ouvert, setOuvert] = useState(false)
  const [saisi, setSaisi] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [fini, setFini] = useState<Fini | null>(null)
  const [combien, setCombien] = useState<number | null>(null)

  // On ne compte qu'à l'ouverture du volet : inutile d'interroger la base
  // pour un bouton que personne n'a touché.
  useEffect(() => {
    if (!ouvert || combien !== null) return
    supabase
      .from('demandes')
      .select('id', { count: 'exact', head: true })
      .then(({ count, error }) => {
        // Un compte indisponible ne doit pas empêcher de résilier : on se
        // rabat sur une phrase sans chiffre plutôt que de bloquer la porte.
        if (!error && count !== null) setCombien(count)
      })
  }, [ouvert, combien])

  async function resilier() {
    setEnvoi(true)
    setErreur(null)

    const { data, error } = await supabase.rpc('resilier', { p_confirmation: saisi })

    if (error) {
      setEnvoi(false)
      setErreur(error.message)
      return
    }

    // ON NE SE DÉCONNECTE PAS ICI. Mesuré : `signOut()` déclenche
    // `onAuthStateChange`, App remet la session à null, et tout l'écran —
    // Réglages compris, donc ce composant — est démonté AVANT d'avoir pu
    // afficher quoi que ce soit. L'artisan cliquait « Supprimer
    // définitivement » et se retrouvait sur l'écran de connexion, sans un
    // mot. Un effacement muet, sur l'action la plus irréversible du produit.
    //
    // La session est donc gardée le temps de dire ce qui s'est passé. Elle
    // ne donne accès à rien : le compte n'existe plus, la RLS ne rend plus
    // une seule ligne. On la ferme au moment où l'artisan s'en va.
    setEnvoi(false)
    setFini(data as Fini)
  }

  async function partir() {
    // En local : demander au serveur de révoquer la session d'un compte
    // supprimé échouerait, et laisserait le jeton mort dans le navigateur.
    await supabase.auth.signOut({ scope: 'local' })
    window.location.href = '/offre'
  }

  // ÉCRAN FINAL. En superposition, parce que l'application derrière n'a plus
  // de compte à afficher : la laisser visible montrerait des erreurs de
  // chargement au lieu d'une confirmation.
  if (fini) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-lg">
          <h2 className="text-lg font-semibold text-slate-900">Compte supprimé.</h2>
          <p className="mt-3 text-sm text-slate-600">
            <strong>{fini.entreprise}</strong> n’existe plus sur nos serveurs.{' '}
            {phraseEffacement(fini.demandes)} Il n’y a rien à annuler : il n’en reste pas
            de copie.
          </p>
          <button
            type="button"
            onClick={partir}
            className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-3 font-medium text-white hover:bg-slate-800"
          >
            Fermer
          </button>
        </div>
      </div>
    )
  }

  if (!ouvert) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        {/* Surtout pas « Quitter » : l'en-tête de l'application porte déjà ce
            mot pour la déconnexion. Deux « Quitter » sur le même écran, dont
            l'un efface tout, c'est un accident qui attend son jour. */}
        <div className="font-medium text-slate-700">Résilier</div>
        <p className="text-sm text-slate-500">
          Vous pouvez partir quand vous voulez. Pensez à télécharger vos demandes avant :
          après, elles n’existent plus nulle part.
        </p>
        <button
          type="button"
          onClick={() => setOuvert(true)}
          className="mt-2 w-full rounded-lg px-4 py-3 font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-50"
        >
          Résilier et supprimer mes données
        </button>
      </div>
    )
  }

  const pret = confirmationValide(saisi, entreprise)

  return (
    <div className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
      <h3 className="font-semibold text-red-900">C’est définitif.</h3>

      <p className="mt-2 text-sm text-red-900">
        En confirmant, vous effacez tout de suite et sans retour :
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-900">
        <li>
          {combien === null
            ? 'toutes vos demandes'
            : combien === 0
              ? 'vos demandes (vous n’en avez aucune)'
              : `vos ${combien} demande${combien > 1 ? 's' : ''}, avec les coordonnées et le chiffre d’affaires qu’elles portent`}
        </li>
        <li>votre fiche : entreprise, métier, zone, message SMS</li>
        <li>votre accès — cette adresse ne pourra plus se connecter</li>
      </ul>

      {/* Le taire ferait de cette page un mensonge de plus. */}
      <p className="mt-3 text-xs text-red-800">
        Une seule chose est conservée : les adresses de vos clients qui ont demandé à ne
        plus être relancés. Sans elles, leur refus disparaîtrait avec le reste, et ils
        redeviendraient relançables. La loi l’exige, et c’est la seule raison.
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-red-900">
          Pour confirmer, tapez <strong>{entreprise}</strong>
        </span>
        <input
          type="text"
          value={saisi}
          onChange={(e) => {
            setSaisi(e.target.value)
            setErreur(null)
          }}
          autoComplete="off"
          autoCapitalize="none"
          className="mt-1 w-full rounded-lg border border-red-300 bg-white px-3 py-2 focus:border-red-600 focus:outline-none"
        />
      </label>

      {erreur && (
        <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-red-800">{erreur}</p>
      )}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setOuvert(false)
            setSaisi('')
            setErreur(null)
          }}
          className="flex-1 rounded-lg bg-white px-4 py-3 font-medium text-slate-700 ring-1 ring-slate-300 hover:bg-slate-100"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={!pret || envoi}
          onClick={resilier}
          className="flex-1 rounded-lg bg-red-700 px-4 py-3 font-medium text-white hover:bg-red-800 disabled:opacity-40"
        >
          {envoi ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
      </div>
    </div>
  )
}
