import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Demo from './Demo.tsx'
import Desinscription from './Desinscription.tsx'
import Offre from './Offre.tsx'
import Confidentialite from './Confidentialite.tsx'
import Cgv from './Cgv.tsx'
import Formulaire from './Formulaire.tsx'
import SousTraitance from './SousTraitance.tsx'

// UNE PORTE, PAS UN ARBRE DE ROUTES.
//
// Le produit n'a qu'une page publique (/demo) face à une application
// authentifiée (tout le reste). Décrire ça avec une bibliothèque de routage
// coûterait une dépendance et un refactor pour un `if`.
//
// Le chemin est lu UNE FOIS, au démarrage, et hors de React : aucun hook
// conditionnel, aucune règle des hooks à contourner. Passer d'une page à
// l'autre recharge le document — sans importance pour une page vitrine.
//
// En production, wrangler.jsonc sert index.html pour toute route inconnue
// (`not_found_handling: "single-page-application"`), et en développement
// Vite fait la même chose. /demo fonctionne donc des deux côtés sans
// configuration supplémentaire.
//
// Le jour où il y aura une page de vente, des mentions légales et une
// politique de confidentialité — l'étape 8 — ces quatre lignes seront
// remplacées par un vrai routeur. Elles ne coûtent rien à jeter.
//
// DEUXIÈME PAGE PUBLIQUE : /desinscription, atteinte depuis le lien en bas
// des relances. Elle doit rester accessible sans compte — c'est tout
// l'objet d'un lien de désinscription. Le `if` devient un `switch` ; le
// jour de l'étape 8, on jettera les deux.
// On choisit l'élément, on ne déclare PAS de composant ici : un composant
// défini dans ce fichier casserait le rafraîchissement à chaud de Vite.
// Sept pages publiques : vitrine, démonstration, désinscription, et les
// trois pages juridiques. Le cahier (case D2) les veut « accessibles » :
// elles sont liées depuis le pied de la page de vente et depuis l'une
// l'autre. Une page qu'on ne peut atteindre qu'en tapant son adresse ne
// l'est pas — c'était le cas de /confidentialite jusqu'ici.
// `/` reste l'application — le manifeste déclare `start_url: "/"`, et
// l'icône posée sur l'écran d'accueil d'Elie pointe dessus. Déplacer
// l'application casserait la case E2 déjà acquise. La vitrine prendra la
// racine le jour du vrai domaine, pas avant.
const chemin = window.location.pathname
const PUBLIQUES: Record<string, React.ReactElement> = {
  '/offre': <Offre />,
  '/demo': <Demo />,
  '/desinscription': <Desinscription />,
  '/confidentialite': <Confidentialite />,
  '/cgv': <Cgv />,
  '/sous-traitance': <SousTraitance />,
  // La page que verra le client de l'artisan, et la seule. Elle remplace
  // le Tally : le lien du SMS doit porter le code de l'artisan appelé.
  '/formulaire': <Formulaire />,
}
const page = PUBLIQUES[chemin] ?? <App />

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>)
