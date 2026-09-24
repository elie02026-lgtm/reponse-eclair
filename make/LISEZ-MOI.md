# Les blueprints Make, et ce qui en a été retiré

Les scénarios Make ne sont versionnés nulle part chez Make. Ces fichiers
sont la seule copie de leur structure, et ils servent à revenir en arrière
après une mauvaise sauvegarde — ce qui est déjà arrivé le 22 septembre 2026.

## ⚠️ Ils ne sont pas restaurables tels quels

Un blueprint Make contient **la clé de service Supabase en clair**, dans
les en-têtes `apikey` et `Authorization` des modules HTTP. Elle a été
remplacée ici par :

```
CLE_DE_SERVICE_A_REMETTRE_AVANT_RESTAURATION
```

Pour restaurer un scénario, il faut remettre la vraie clé à la place de ce
marqueur — elle se lit dans Supabase, *Project Settings → API*, jamais ici.

## Pourquoi

Le 24 septembre 2026, un `git push` a été refusé par le scanner de secrets
de GitHub : la clé de service se trouvait dans un fichier de travail que
j'avais laissé dans un commit. Le blocage a fait son travail — rien n'est
parti — mais la leçon est plus large que le fichier de travail : **les
blueprints eux-mêmes portaient la clé**, et ils étaient déjà suivis.

Ce qui a été fait : la clé est remplacée par un marqueur dans les deux
fichiers, et `.gitignore` refuse désormais tout intermédiaire dans `make/`.

Ce qui reste à faire, et qui n'est pas du ressort d'un fichier : la clé
figure encore dans l'HISTORIQUE des commits `c2c376a`, `6327469` et
`4bfc642`. Tant qu'elle y est, le push restera refusé.
