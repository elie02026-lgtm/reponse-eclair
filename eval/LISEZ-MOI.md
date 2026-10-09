# Mesurer le classificateur

Le différenciateur du produit, c'est que la gravité estimée **contredit** la
case « urgent » cochée par le client. Il n'a jamais été mesuré : en base,
aucune demande réelle ne contient de contradiction.

Cette évaluation appelle Gemini **directement**, hors Make, avec le même
prompt que le module 9.

## Les quatre fichiers

| Fichier | Rôle |
|---|---|
| `prompt-module9.txt` | **la source de vérité du prompt.** On modifie ici, puis on recopie dans Make. Jamais l'inverse. |
| `prompt-module9-A-COLLER.txt` | le même, avec les variables Make (`{{2.besoin}}`…) au lieu des repères. **Généré, jamais modifié à la main.** C'est ce fichier qu'on colle dans le module 9. |
| `cas.json` | les cas d'examen, écrits par Elie. **Absent pour l'instant.** |
| `evaluer.mjs` | l'évaluateur. `node eval/evaluer.mjs` |

## `prompt-module9.txt` — l'état de ce fichier, et celui de Make

Ce fichier a d'abord été **relevé** dans le blueprint du scénario **6318986**,
module **9**, le 7 octobre 2026 — pas recopié de mémoire. Il a ensuite été
modifié le 9 octobre, quand la question « chauffage et eau chaude » a été
séparée en deux. **Il n'est donc plus identique à ce que contient Make :**
Make porte encore la version à trois questions, jusqu'à ce que le module 9
soit recollé.

Les repères, et la variable Make correspondante :

| Dans Make | Ici |
|---|---|
| `{{2.besoin}}` | `{besoin}` |
| `{{2.urgence_dite}}` | `{urgence_dite}` |
| `{{2.eau_coule}}` | `{eau_coule}` |
| `{{2.arrivee_coupee}}` | `{arrivee_coupee}` |
| `{{2.chauffage}}` | `{chauffage}` |
| `{{2.eau_chaude}}` | `{eau_chaude}` |
| `{{formatDate(now; "D MMMM YYYY")}}` | `{date}` |

**Un seul écart, et il faut le savoir :** Make stocke ce texte avec des fins
de ligne Windows (`\r\n`), ce fichier les a en `\n`. Aucun modèle n'en voit la
différence, mais « mot pour mot » veut dire « mot pour mot », pas « octet pour
octet ».

### Le prompt et le code disent maintenant la même chose

```
chauffage  = non  ->  gravite 3 d'octobre à mars, sinon gravite 2
eau chaude = non  ->  gravite 2, toute l'année
```

C'est aussi ce que fait le plancher du code (`src/lib/tri.ts`). Tant que le
module 9 n'est pas recollé, **l'évaluation mesure un prompt que Make n'a pas
encore** — et c'est voulu : on mesure le texte qu'on a décidé, puis on le
colle une fois qu'il tient.


## `cas.json` — ce que le fichier doit contenir

**Les cas sont écrits par Elie, pas par celui qui code.** C'est tout
l'intérêt : un examen choisi par l'examiné ne mesure rien.

Forme attendue par `evaluer.mjs` — un tableau d'objets :

```json
[
  {
    "id": "c01",
    "besoin": "Fuite sous l'évier, ça coule depuis ce matin",
    "urgence_dite": "Oui, c'est urgent",
    "eau_coule": "oui",
    "arrivee_coupee": "non",
    "chauffage": "oui",
    "eau_chaude": "",
    "date": "2026-01-15",
    "gravites_attendues": [3]
  }
]
```

- **`id`** : court, stable. Il sert d'ancre dans le rapport.
- **`besoin`** : la description. Peut être `""` — c'est permis depuis la
  phase 5, et c'est précisément le cas qui a cassé le 7 octobre.
- **`urgence_dite`** : les libellés EXACTS de la liste blanche du Worker (voir
  ci-dessous), ou `""`.
- **les trois réponses** : `"oui"`, `"non"`, `"je-ne-sais-pas"` ou `""`.
- **`date`** : en `AAAA-MM-JJ`. L'évaluateur la traduit en « 15 janvier 2026 »
  avant de l'envoyer, comme le fait `formatDate` dans Make. **Elle compte** :
  le prompt a une règle saisonnière.
- **`gravites_attendues`** : une LISTE. Un cas franc n'en a qu'une (`[3]`) ;
  un cas discutable peut en accepter deux (`[1, 2]`). Mettre une liste à deux
  valeurs là où la réponse est évidente serait se faciliter l'examen.

### Les libellés de `urgence_dite`

Ce sont ceux que le Worker accepte, et aucun autre — relevés dans
`src/lib/demandeRecue.ts` :

<!-- RELEVÉ AUTOMATIQUEMENT : voir `node eval/evaluer.mjs --libelles` -->

## Lancer

```bash
export GEMINI_API_KEY=...      # jamais dans un fichier du dépôt
node eval/evaluer.mjs
```

Le rapport est écrit dans `eval/resultats-AAAA-MM-JJ.md`, **committé** : il ne
contient aucun secret.

## Ce que le rapport regarde d'abord

Pas les moyennes. **Les erreurs dangereuses** : un cas attendu à 3 qui sort à
1 ou 0. Une seule suffit à rendre le produit dangereux — un client dont le
logement prend l'eau, rangé en bas de la liste. Elles sont listées une par
une, avant tout chiffre global.
