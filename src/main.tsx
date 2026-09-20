import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Demo from './Demo.tsx'

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
const estDemo = window.location.pathname === '/demo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>{estDemo ? <Demo /> : <App />}</StrictMode>,
)
