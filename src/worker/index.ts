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
import type { Gestionnaire } from './types.ts'

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

// AUCUN en-tête CORS, et ce n'est pas un oubli. Le formulaire est servi par
// la même origine, il n'en a pas besoin. Leur absence empêche la page d'un
// autre site d'appeler cet endpoint depuis un navigateur — mais elle
// n'empêche rien à `curl`. Ce n'est donc pas une protection, seulement une
// porte qu'on ne tient pas ouverte sans raison.

const gestionnaire: Gestionnaire = {
  async fetch(requete, env) {
    const url = new URL(requete.url)

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

    // ── 7. Make ─────────────────────────────────────────────────────────
    // Charge utile IDENTIQUE à celle que le formulaire envoyait : le
    // scénario de capture n'a rien à changer, sauf son adresse de webhook.
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
        body: JSON.stringify(demande),
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
