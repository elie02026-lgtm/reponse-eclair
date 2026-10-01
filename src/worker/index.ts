// LA PORTE D'ENTRÉE DES DEMANDES.
//
// ─────────────────────────────────────────────────────────────────────────
// POURQUOI CE FICHIER EXISTE
// ─────────────────────────────────────────────────────────────────────────
// Jusqu'au 28 septembre 2026, `Formulaire.tsx` postait directement sur
// l'URL du webhook Make, écrite en clair dans le JavaScript public.
// N'importe qui pouvait donc envoyer de fausses demandes au nom de
// n'importe quel artisan — le code d'artisan voyage dans chaque SMS — et
// vider les 1 000 opérations mensuelles du forfait gratuit.
//
// Ce Worker s'interpose. Il ne fait que quatre choses : freiner, vérifier
// la forme, vérifier que l'artisan existe, transmettre. Les RÈGLES, elles,
// vivent dans `lib/demandeRecue.ts`, qui est pur et testé — un Worker ne
// s'exécute pas sous `node --test`.
//
// ─────────────────────────────────────────────────────────────────────────
// CE QU'IL NE VOIT PAS, ET C'EST VOULU
// ─────────────────────────────────────────────────────────────────────────
// `run_worker_first: ["/api/*"]` dans `wrangler.jsonc` : tout le reste du
// site est servi par la couche des assets, repli page-unique compris. Ce
// fichier n'a donc AUCUN code de service de fichiers, et une erreur ici ne
// peut pas empêcher l'application de s'afficher.
//
// Mesuré le 28 septembre avec `wrangler dev` : sans cette ligne, le Worker
// reçoit AUSSI `/reglages` et `/formulaire`, et le repli page-unique ne
// s'applique plus. C'est l'inverse de ce que j'avais d'abord annoncé.

import { validerDemande } from '../lib/demandeRecue.ts'
import {
  estOperation,
  jetonPour,
  jetonValide,
  lireIdDemande,
  nouvelleCleAction,
  reponseDe,
} from '../lib/action.ts'
import { pageConfirmation, pageLienIllisible, pageResultat } from './page.ts'
import type { Gestionnaire } from './types.ts'

/** Le chemin des boutons de l'e-mail d'alerte. Déclaré dans
 *  `wrangler.jsonc` sous `run_worker_first` : sans ça, la couche des
 *  fichiers statiques le servirait et le Worker ne le verrait jamais. */
const CHEMIN_ACTION = '/agir'

/** 8 Ko. Une description de 2 000 caractères et six champs courts tiennent
 *  très largement dedans ; au-delà, c'est qu'on n'est plus un formulaire. */
const TAILLE_MAX = 8 * 1024

/** Make peut être lent ou muet. On ne laisse pas le client attendre
 *  indéfiniment : il a une fuite d'eau, pas du temps. */
const DELAI_MAKE_MS = 10_000

/**
 * Un 502 qui dit OÙ ça a cassé.
 *
 * Le 30 septembre, la production a rendu « Service indisponible » et il a
 * été impossible de savoir, depuis l'extérieur, si c'était Supabase, Make,
 * ou un secret manquant. Trois pannes très différentes derrière un seul
 * message. `etape` les sépare — en un mot, sans rien révéler que la page de
 * confidentialité ne dise déjà.
 *
 * Le `console.error` va dans les journaux du Worker : c'est là qu'on
 * regarde, sans ouvrir Make. Aucune donnée personnelle n'y passe, jamais.
 */
function panne(etape: 'base' | 'make', detail: string): Response {
  console.error(`[/api/demande] echec a l'etape ${etape} : ${detail}`)
  return json(502, { erreur: 'Service indisponible.', etape })
}

function json(statut: number, corps: Record<string, unknown>): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

/** Une page HTML. `no-store` parce qu'un lien d'action ne doit être gardé
 *  ni par le navigateur, ni par un cache intermédiaire : il porte un jeton. */
function html(statut: number, corps: string): Response {
  return new Response(corps, {
    status: statut,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      // Le jeton est dans l'URL. Sans ceci, il partirait en `Referer` vers
      // le premier site externe que l'artisan ouvrirait depuis cette page.
      'referrer-policy': 'no-referrer',
    },
  })
}

/**
 * Appelle `agir_sur_demande` (migration 0014) et rend le mot qu'elle
 * retourne. La fonction est `security definer` et n'est accordée qu'à
 * `anon` : la clé publiable suffit, et le Worker n'a aucun droit sur la
 * table `demandes` — vérifié le 1ᵉʳ octobre, contrôles D1 et D2.
 */
async function agir(
  env: { SUPABASE_URL: string; SUPABASE_CLE_PUBLIABLE: string },
  id: number,
  jeton: string,
  operation: string,
): Promise<string> {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/agir_sur_demande`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_CLE_PUBLIABLE,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ p_id: id, p_jeton: jeton, p_operation: operation }),
    signal: AbortSignal.timeout(DELAI_MAKE_MS),
  })
  if (!r.ok) {
    console.error(`[${CHEMIN_ACTION}] base en erreur : ${r.status}`)
    return 'panne'
  }
  // La fonction rend un `text`, que PostgREST encode en JSON : `"ok"`.
  const mot: unknown = await r.json()
  return typeof mot === 'string' ? mot : 'panne'
}

// AUCUN en-tête CORS, et ce n'est pas un oubli. Le formulaire est servi par
// la même origine, il n'en a pas besoin. Leur absence empêche la page d'un
// autre site d'appeler cet endpoint depuis un navigateur — mais elle
// n'empêche rien à `curl`. Ce n'est donc pas une protection, seulement une
// porte qu'on ne tient pas ouverte sans raison.

const gestionnaire: Gestionnaire = {
  async fetch(requete, env) {
    const url = new URL(requete.url)

    // ── LES BOUTONS DE L'E-MAIL D'ALERTE ────────────────────────────────
    // GET n'affiche que le bouton ; seul POST agit. Un antivirus de
    // messagerie suit les liens, il ne remplit pas les formulaires — voir
    // le long commentaire de `page.ts`.
    if (url.pathname === CHEMIN_ACTION) {
      if (requete.method === 'GET') {
        const id = lireIdDemande(url.searchParams.get('d') ?? '')
        const jeton = url.searchParams.get('j') ?? ''
        const op = url.searchParams.get('op') ?? ''
        if (id === null || !jetonValide(jeton) || !estOperation(op)) {
          return html(400, pageLienIllisible())
        }
        return html(200, pageConfirmation(CHEMIN_ACTION, id, jeton, op))
      }

      if (requete.method === 'POST') {
        // Le frein par adresse s'applique ICI AUSSI. Sans lui, cette porte
        // serait un oracle : on pourrait essayer des jetons en boucle.
        // Dix par minute contre 2^256 possibilités, l'affaire est close.
        const ip = requete.headers.get('CF-Connecting-IP') ?? 'inconnue'
        if (!(await env.DEBIT_IP.limit({ key: ip }))?.success) {
          return html(429, pageResultat(reponseDe('panne')))
        }

        const formulaire = await requete.formData()
        const id = lireIdDemande(String(formulaire.get('d') ?? ''))
        const jeton = String(formulaire.get('j') ?? '')
        const op = String(formulaire.get('op') ?? '')
        if (id === null || !jetonValide(jeton) || !estOperation(op)) {
          return html(400, pageLienIllisible())
        }

        const mot = await agir(env, id, jeton, op)
        return html(mot === 'ok' ? 200 : 400, pageResultat(reponseDe(mot)))
      }

      return html(405, pageLienIllisible())
    }

    if (url.pathname !== '/api/demande') return json(404, { erreur: 'Inconnu.' })
    if (requete.method !== 'POST') return json(405, { erreur: 'Méthode refusée.' })

    // ── 1. La taille, avant même de lire ────────────────────────────────
    const annonce = Number(requete.headers.get('content-length') ?? '0')
    if (annonce > TAILLE_MAX) return json(413, { erreur: 'Envoi trop gros.' })

    // ── 2 et 3. Les freins qui ne demandent RIEN ────────────────────────
    // Ni lecture du corps, ni réseau : c'est ce qui doit arriver en premier
    // quand quelqu'un frappe fort.
    //
    // `CF-Connecting-IP` est le seul en-tête d'adresse auquel on puisse se
    // fier : il est écrit par Cloudflare, pas par le client. `X-Forwarded-For`
    // se falsifie en une ligne.
    const ip = requete.headers.get('CF-Connecting-IP') ?? 'inconnue'
    if (!(await env.DEBIT_IP.limit({ key: ip }))?.success) {
      return json(429, { erreur: 'Trop de demandes. Réessayez dans une minute.' })
    }
    if (!(await env.DEBIT_GLOBAL.limit({ key: 'tout' }))?.success) {
      return json(429, { erreur: 'Trop de demandes. Réessayez dans une minute.' })
    }

    // ── 4. La forme, en pur calcul ──────────────────────────────────────
    const texte = await requete.text()
    // On revérifie APRÈS lecture : `content-length` est déclaratif, donc
    // l'annonce peut mentir. C'est la longueur reçue qui compte.
    if (texte.length > TAILLE_MAX) return json(413, { erreur: 'Envoi trop gros.' })

    let brut: unknown
    try {
      brut = JSON.parse(texte)
    } catch {
      return json(400, { erreur: 'Corps illisible.' })
    }

    const verdict = validerDemande(brut)
    if (verdict.etat !== 'ok') {
      return json(400, { erreur: verdict.message, champ: verdict.champ })
    }
    const demande = verdict.demande

    // ── 5. Le frein par artisan ─────────────────────────────────────────
    // Il ne peut venir qu'ici : il faut avoir lu le code pour s'en servir.
    // C'est celui qui borne les dégâts quand l'attaquant change d'adresse
    // mais garde le même code — et le code, il l'a par le SMS.
    if (!(await env.DEBIT_CODE.limit({ key: demande.code }))?.success) {
      return json(429, { erreur: 'Trop de demandes. Réessayez dans une minute.' })
    }

    // ── 6. L'artisan existe-t-il ? Premier appel réseau, donc en dernier ─
    // `artisan_public` est `security definer` : la clé PUBLIABLE suffit,
    // aucune clé de service n'entre dans ce Worker.
    // `Accept: …pgrst.object+json` fait rendre 406 sur un code inconnu, au
    // lieu d'une liste vide — l'échec est bruyant, comme au module 15 de la
    // chaîne de capture.
    let connu: boolean
    try {
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/artisan_public`, {
        method: 'POST',
        headers: {
          apikey: env.SUPABASE_CLE_PUBLIABLE,
          accept: 'application/vnd.pgrst.object+json',
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ p_code: demande.code }),
        signal: AbortSignal.timeout(DELAI_MAKE_MS),
      })
      connu = r.ok
    } catch (e) {
      // La base n'a pas répondu. Ce n'est PAS la faute du client : on rend
      // 502, et le formulaire lui dira de réessayer ou de rappeler.
      return panne('base', String(e))
    }
    if (!connu) return json(400, { erreur: 'Ce lien n’est plus valable.', champ: 'code' })

    // ── 7. LES CLÉS DES BOUTONS DE L'E-MAIL ─────────────────────────────
    // Fabriquées ICI, au dernier moment, et pour une seule raison : c'est le
    // seul endroit de la chaîne où l'on peut tirer de l'aléa sans mettre un
    // secret dans Make. Make ne calcule rien — il recopie trois chaînes.
    //
    // `cle_action` est enregistrée en base (module 5 du scénario).
    // Les deux jetons ne sont stockés NULLE PART : ils partent dans
    // l'e-mail, et Postgres les recalcule à chaque clic depuis `cle_action`.
    //
    // Celui qui détient un lien ne peut pas en déduire l'autre : il lui
    // faudrait `cle_action`, qui ne quitte jamais la base.
    const cleAction = nouvelleCleAction()
    const avecCles = {
      ...demande,
      cle_action: cleAction,
      jeton_fait: await jetonPour(cleAction, 'fait'),
      jeton_pas_urgent: await jetonPour(cleAction, 'pas_urgent'),
    }

    // ── 8. Make ─────────────────────────────────────────────────────────
    // Trois champs de plus qu'avant, et rien d'autre de changé. Le scénario
    // doit enregistrer `cle_action` et poser les deux jetons dans les liens
    // de l'e-mail ; tant qu'il ne le fait pas, ces champs sont ignorés sans
    // dommage — la capture continue de marcher exactement comme avant.
    try {
      const r = await fetch(env.MAKE_WEBHOOK_CAPTURE, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          // Envoyée dès que le secret existe, même si Make ne l'exige pas
          // encore. Voir le commentaire de `MAKE_CLE` : c'est ce qui permet
          // d'activer la clé côté Make sans casser la capture entre-temps.
          //
          // Une fois la clé exigée, l'URL du webhook peut fuir sans
          // conséquence — et c'est la vraie raison de préférer ça à un
          // changement d'adresse : l'ancienne URL est dans l'historique git,
          // donc publique pour toujours.
          ...(env.MAKE_CLE ? { 'x-make-apikey': env.MAKE_CLE } : {}),
        },
        body: JSON.stringify(avecCles),
        signal: AbortSignal.timeout(DELAI_MAKE_MS),
      })
      if (!r.ok) return panne('make', `reponse ${r.status}`)
    } catch (e) {
      // Cas le plus probable en pratique : le secret MAKE_WEBHOOK_CAPTURE
      // n'est pas posé, donc `fetch(undefined)` lève. Le message le dira.
      return panne('make', String(e))
    }

    // On ne journalise rien : ni téléphone, ni e-mail, ni description. Les
    // journaux de Cloudflare ne sont pas le bon endroit pour les données
    // d'un prospect, et la politique de confidentialité ne les mentionne pas.
    return json(200, { ok: true })
  },
}

export default gestionnaire
