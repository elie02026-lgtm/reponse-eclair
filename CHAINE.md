# La chaîne Make, et ce qu'on sait d'elle

Les scénarios Make ne sont pas dans ce dépôt : ils vivent chez Make, et
rien ne les versionne. Ce fichier est le seul endroit où leur forme est
écrite. Il est relevé à la main, daté, et il ment dès que quelqu'un touche
un scénario sans le mettre à jour.

**Dernier relevé : 23 septembre 2026, 18 h**, par lecture des blueprints via l'API.

Organisation 8118598, équipe 1989251, zone `eu1`. Forfait **Free** :
1 000 opérations/mois, journaux d'exécution conservés **7 jours**.

---

## 1. « Integration Webhooks » — la capture (id 6318986)

Déclenchée par le webhook `hook.eu1.make.com/zyfgvw5dfi3x1lfgg6k0ttu52qosst5u`,
que **notre page `/formulaire`** appelle. Tally est sorti de la chaîne le
23 septembre : le lien du SMS doit porter le code de l'artisan appelé, et
un Tally ne sait pas rattacher une réponse à un code qu'il ignore.

La charge utile est désormais plate — `{ code, prenom, telephone, email,
lieu, besoin, urgence_dite }` — donc `{{2.prenom}}` et non plus
`{{2.data.fields[1].value}}`.

| # | module | ce qu'il fait |
|---|---|---|
| 2 | `gateway:CustomWebHook` | reçoit le formulaire |
| 15 | `http:ActionSendData` | **GET /artisans?code=eq.{{upper(trim(2.code))}}** — retrouve l'artisan |
| 5 | `http:ActionSendData` | **POST /demandes** — l'enregistrement, avant tout traitement |
| 9 | `gemini-ai` | classe la gravité → `gravite\|motif\|panier` — `onerror: Resume` |
| 8 | `gemini-ai` | rédige l'e-mail de réponse au client — `onerror: Resume` |
| 14 | `builtin:BasicRouter` | sépare ce qui va à l'artisan de ce qui va au client |

**Route 1 — l'artisan.** Aucun filtre à l'entrée : elle part toujours.

| # | module | ce qu'il fait |
|---|---|---|
| 4 | `google-email` | **alerte à l'artisan** |
| 10 | `http:ActionSendData` | PATCH gravité/motif/panier — filtre : le résultat doit contenir `\|` |

**Route 2 — le client.**

| # | module | ce qu'il fait |
|---|---|---|
| 3 | `google-email` | e-mail au client — filtre : l'adresse doit contenir `@` |

`dlq: true`, `maxErrors: 10`. Une exécution complète coûte **8 opérations**
(7 avant l'ajout du module 15).

**Le module 15 demande `application/vnd.pgrst.object+json`, et c'est
délibéré** : un code inconnu rend alors **406** au lieu d'une liste vide.
Le module échoue, l'exécution part en file d'attente, Make prévient. Une
insertion avec un `artisan_id` vide, elle, aurait été un 400 sans rien
garder — et une demande rattachée à personne serait passée inaperçue.

### Ce qui se passe quand l'insertion échoue

Mesuré le 23 septembre 2026 à 17 h 24, panne injectée en base :

1. l'exécution s'arrête au module 5 et prend le **statut 2** — incomplète,
   charge utile conservée (avec `dlq: false`, c'était le statut 3 : rien de
   gardé, et c'est ce qui invalidait le test du 22 septembre) ;
2. **Make envoie un e-mail à Elie dans les trois secondes** —
   « ⚠️ Encountered warnings in scenario Integration Webhooks »,
   reçu à 17 h 24 min 24 s ;
3. `scenarios_replay` rejoue l'exécution et la demande arrive complète en
   base.

Le lead n'est donc pas perdu. Deux réserves, qui ne sont pas techniques :
l'e-mail de Make ne dit pas qu'un client n'a pas été enregistré, et les
journaux d'exécution expirent au bout de **7 jours** — passé ce délai, il
n'y a plus rien à rejouer.

### Le routeur, et pourquoi il fallait en passer par là

**Un filtre n'saute pas son module : il arrête toute la suite de la
branche.** Jusqu'au 23 septembre, les modules 3, 4 et 10 étaient en série
dans cet ordre. Une adresse client sans `@` faisait donc tomber le filtre du
module 3 — et avec lui l'alerte de l'artisan ET l'écriture de la gravité.

Le réordonner en série ne réglait rien : quel que soit l'ordre, le filtre du
premier module aurait emporté les suivants. Deux filtres indépendants
exigent deux routes. D'où le routeur.

**Mesuré avant et après**, même charge utile, adresse volontairement privée
d'arobase :

| | avant | après |
|---|---|---|
| opérations | 4 | 6 |
| alerte à l'artisan | **aucune** | reçue à 17 h 37 min 57 s |
| gravité écrite | **non** | `3 / fuite sous evier / 180 €` |
| e-mail au client | non (correct) | non (correct) |

---

## 2. « Relance quotidienne » (id 6284174)

Planifiée tous les jours à 10 h, **sept jours sur sept** — la règle des
jours ouvrables vit dans la vue, pas ici (migration 0008).

| # | module | ce qu'il fait |
|---|---|---|
| 4 | `http:ActionSendData` | **GET /demandes_a_relancer** + filtre `recue_le=lt.(now-2j)` |
| 11 | `builtin:BasicFeeder` | déroule la liste |
| 5 | `gemini-ai` | rédige la relance — filtre : l'adresse doit contenir `@` |
| 6 | `google-email` | envoie, avec le lien de désinscription portant le jeton |
| 7 | `http:ActionSendData` | PATCH `relance_sms_le = now` |

Elle lit **la vue**, pas la table : c'est ce qui permet de poser des règles
en base sans toucher au blueprint.

---

## 3. « Appel manqué → SMS » (id 7342710)

**Inactif, zéro exécution.** Un webhook et une réponse, rien d'autre.
C'est l'ébauche d'A1/A2, créée le 10 septembre et jamais remplie.

---

## 4. Deux pièges vérifiés, à ne pas réapprendre

**Les tableaux de Make commencent à 1.** Le premier champ du formulaire est
`fields[1]`, pas `fields[0]`. Découvert le 23 septembre en envoyant un
témoin au webhook : tout était décalé d'un cran, le téléphone dans le champ
e-mail et la commune dans le besoin.

**Un rejeu ne vide pas la file des exécutions incomplètes.** Après le rejeu
du témoin C1, `dlqCount` valait toujours 1. La file se purge depuis
l'interface de Make, pas depuis l'API.

**Enregistrer depuis un onglet ouvert depuis le matin pousse le blueprint
périmé.** Le 22 septembre, ça a effacé deux routes `onerror`, quatre
`ifempty`, un filtre et le `dlq`, et coupé la capture cinq minutes.
Recharger l'onglet avant toute édition manuelle.
