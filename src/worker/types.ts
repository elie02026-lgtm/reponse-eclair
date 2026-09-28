// Les types du Worker, ÉCRITS À LA MAIN.
//
// L'alternative était `@cloudflare/workers-types`. On l'a écartée : wrangler
// n'est ni dans `package.json` ni dans `node_modules` — le déploiement passe
// par l'intégration Git de Cloudflare, qui fournit le sien. Installer un
// paquet entier pour trois formes qu'on peut lire en dix secondes allait
// contre la règle « je dois pouvoir réécrire seul ce qui est écrit ici ».
//
// Chaque forme ci-dessous vient de la documentation, citée en regard. Si
// Cloudflare la change un jour, c'est ici qu'il faudra revenir — et la
// source est dans le fichier, pas dans la mémoire de quelqu'un.
//
// `Request`, `Response` et `URL` ne sont pas redéfinis : ils viennent de la
// bibliothèque DOM, déjà activée dans `tsconfig.app.json`, et leur forme est
// la même dans un Worker pour ce qu'on en fait.

/**
 * Limiteur de débit.
 * developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 *
 *   const { success } = await env.MON_LIMITEUR.limit({ key: "…" })
 *
 * À savoir, et c'est écrit noir sur blanc dans cette page : le compte est
 * LOCAL au centre de données qui exécute le Worker, et l'API est
 * « permissive, eventually consistent, and intentionally designed to not be
 * used as an accurate accounting system ». Ce n'est pas un compteur, c'est
 * un frein.
 */
export type Limiteur = {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

/**
 * Ce que `wrangler.jsonc` injecte à l'exécution.
 * developers.cloudflare.com/workers/configuration/environment-variables/
 *
 * `vars` est en clair dans le fichier de configuration et dans le dépôt.
 * Les secrets, eux, sont posés par `wrangler secret put` ou le tableau de
 * bord : ils n'existent ni dans le dépôt ni dans le paquet déployé.
 */
export type Env = {
  /** SECRET — l'URL du webhook de capture chez Make. */
  MAKE_WEBHOOK_CAPTURE: string

  /** var — publique, déjà dans le JavaScript servi aux navigateurs. */
  SUPABASE_URL: string
  /** var — la clé PUBLIABLE, publique par conception. Jamais la clé de
   *  service : ce Worker n'a besoin de lire que trois champs publics, par
   *  la fonction `artisan_public`. */
  SUPABASE_CLE_PUBLIABLE: string

  DEBIT_IP: Limiteur
  DEBIT_CODE: Limiteur
  DEBIT_GLOBAL: Limiteur
}

/**
 * Le gestionnaire exporté par défaut.
 * developers.cloudflare.com/workers/runtime-apis/handlers/fetch/
 *
 * La vraie signature reçoit un troisième argument, `ctx: ExecutionContext`,
 * qui sert à prolonger le travail après la réponse (`ctx.waitUntil`). On ne
 * s'en sert pas, donc on ne le déclare pas : un type qu'on n'emploie pas est
 * un type qu'on entretient pour rien.
 */
export type Gestionnaire = {
  fetch(requete: Request, env: Env): Promise<Response>
}
