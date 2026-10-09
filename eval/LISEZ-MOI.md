# Mesurer le classificateur

Le différenciateur du produit, c'est que la gravité estimée **contredit** la
case « urgent » cochée par le client.

**Il arrive, et c'est mesuré.** Sur les douze demandes classées de la base, au
9 octobre 2026 : **quatre fois** le client a coché « urgence » et la machine a
rendu moins de 3 — **trois fois elle a rendu 1**, sur des devis de salle de
bain. Et **deux fois** l'inverse : rien de coché, gravité 3.

Ce qui n'a jamais été mesuré, c'est s'il a RAISON de contredire. Douze lignes
sans réponse attendue ne le disent pas : personne n'a écrit, à l'avance, ce
que chacune aurait dû donner. C'est l'objet de `cas.json`.

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
modifié deux fois le 9 octobre, et **recollé dans Make les deux fois** : les
quatre questions à 16 h 16, la phrase de départage à 17 h 15. Les deux sont
identiques, relu dans le blueprint et non supposé.

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

**Les fins de ligne :** Make a longtemps stocké ce texte avec des fins de
ligne Windows (`\r\n`). Depuis le collage du 9 octobre il porte des `\n`,
comme ce fichier. Aucun modèle n'en voit la différence — mais « mot pour
mot » veut dire « mot pour mot », pas « octet pour octet », et c'est le genre
d'écart qui fait douter d'une mesure six mois plus tard.

### Quand deux règles mordent, la plus grave gagne

Le 9 octobre, la demande 71 a mordu sur deux règles à la fois — fuite
maîtrisée (2) et plus de chauffage en octobre (3). Le prompt ne disait pas
laquelle l'emporte ; le modèle a retenu 3, et rien ne garantissait qu'il
recommence. Le code, lui, retenait 2 : sa cascade sortait sur la première
règle. **Les deux ont été corrigés le même jour**, et le prompt porte
désormais :

```
Si PLUSIEURS de ces règles s'appliquent, retiens la gravité la PLUS ÉLEVÉE,
et le motif de la règle qui l'a donnée.
```

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
`src/lib/demandeRecue.ts`. `node eval/evaluer.mjs --libelles` les affiche,
sans clé et sans réseau :

```
« Oui, c’est urgent »
« Non, ça peut attendre »
« »                        (il n’a pas répondu)
```

**L’apostrophe est COURBE (U+2019), pas droite.** Le code la porte ainsi ; une
apostrophe droite déclenche un avertissement, parce que le formulaire
n’aurait jamais pu produire ce libellé — le cas porterait alors sur une
situation impossible.

## Lancer

```bash
node eval/evaluer.mjs --libelles   # les valeurs acceptées. Ni clé ni réseau.
node eval/evaluer.mjs --verifier   # relit cas.json. Ni clé ni réseau.

export GEMINI_API_KEY=...          # jamais dans un fichier du dépôt
node eval/evaluer.mjs              # la mesure, 3 essais par cas
```

**Écrivez les cas, puis `--verifier`, autant de fois qu’il faut.** On ne dépense
un appel que le jour où le fichier tient debout.

`--verifier` ne juge pas les cas : il les DÉCRIT. Il compte notamment ceux qui
portent la contradiction — le client coche urgent, on attend moins de 3 —
parce que c’est elle, le produit. Un examen où elle n’apparaît que deux fois sur
vingt mesure un classificateur quelconque, pas Réponse Éclair.

Le rapport est écrit dans `eval/resultats-AAAA-MM-JJ.md`, **committé** : il ne
contient aucun secret.

## Ce que le rapport regarde d'abord

Pas les moyennes. **Les erreurs dangereuses** : un cas attendu à 3 qui sort à
1 ou 0. Une seule suffit à rendre le produit dangereux — un client dont le
logement prend l'eau, rangé en bas de la liste. Elles sont listées une par
une, avant tout chiffre global.
