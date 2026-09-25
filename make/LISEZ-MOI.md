# Les blueprints Make, et ce qui en a été retiré

Les scénarios Make ne sont versionnés nulle part chez Make. Ces fichiers
sont la seule copie de leur structure, et ils servent à revenir en arrière
après une mauvaise sauvegarde — ce qui est déjà arrivé le 22 septembre 2026.

| fichier | scénario | restaurable tel quel ? |
|---|---|---|
| `capture.blueprint.json` | Integration Webhooks (6318986) | **non** — clé retirée |
| `capture.avant-routeur.json` | idem, état du 22 septembre | **non** — clé retirée |
| `appel-manque.blueprint.json` | Appel manqué → SMS (7342710) | **oui** — aucun secret |

## Les deux fichiers de la capture ne sont pas restaurables tels quels

Un blueprint Make contient **la clé de service Supabase en clair**, dans
les en-têtes `apikey` et `Authorization` des modules HTTP. Elle a été
remplacée ici par :

```
CLE_DE_SERVICE_A_REMETTRE_AVANT_RESTAURATION
```

Pour restaurer un de ces deux scénarios, il faut remettre la vraie clé à la
place de ce marqueur — elle se lit dans Supabase, *Project Settings → API*,
jamais ici.

## Pourquoi, et ce qu'on en a tiré

Le 24 septembre 2026, un `git push` a été refusé par le scanner de secrets
de GitHub : la clé de service se trouvait dans un fichier de travail laissé
dans un commit. Le blocage a fait son travail — rien n'est parti — mais la
leçon était plus large que le fichier de travail : **les blueprints
eux-mêmes portaient la clé**, et ils étaient déjà suivis.

Fait depuis : marqueur à la place de la clé dans les deux fichiers,
`.gitignore` qui refuse tout intermédiaire dans `make/`, historique
réécrit, et **clé de service changée**.

État exact au 25 septembre, vérifié et non déduit :

- `git log --all -p | grep -c sb_secret_` → **0**. Rien de ce qui part
  vers GitHub ne contient de clé.
- Les trois anciens commits (`c2c376a`, `6327469`, `4bfc642`) existent
  encore **localement**, hors de toute branche, dans les objets que `git`
  n'a pas encore ramassés. Ils portent l'ANCIENNE clé, qui a été révoquée :
  elle ne donne plus accès à rien. Un `git gc` finira de les effacer.

## La vraie correction est ailleurs : ne pas avoir de secret à cacher

`appel-manque.blueprint.json` ne contient aucun secret, et ce n'est pas un
hasard. Il n'interroge pas `/rest/v1/artisans` avec la clé de service — qui
lit et écrit TOUTE la base en passant outre les politiques RLS — mais une
fonction `artisan_par_numero` qui ne rend que trois champs déjà publics
(migration `0011`). Elle s'appelle avec la clé **publiable**, celle qui est
déjà dans le JavaScript servi à tous les navigateurs.

Un blueprint sans secret se verse ici tel quel, se relit, se compare, se
restaure sans cérémonie. **Ce qui ne contient pas de secret ne peut pas en
perdre.** C'est le modèle à suivre pour la capture, le jour où on y
reviendra.
