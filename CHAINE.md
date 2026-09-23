# La chaîne Make, et ce qu'on sait d'elle

Les scénarios Make ne sont pas dans ce dépôt : ils vivent chez Make, et
rien ne les versionne. Ce fichier est le seul endroit où leur forme est
écrite. Il est relevé à la main, daté, et il ment dès que quelqu'un touche
un scénario sans le mettre à jour.

**Dernier relevé : 23 septembre 2026**, par lecture des blueprints via l'API.

Organisation 8118598, équipe 1989251, zone `eu1`. Forfait **Free** :
1 000 opérations/mois, journaux d'exécution conservés **7 jours**.

---

## 1. « Integration Webhooks » — la capture (id 6318986)

Déclenchée par le webhook `hook.eu1.make.com/zyfgvw5dfi3x1lfgg6k0ttu52qosst5u`,
que Tally appelle quand quelqu'un envoie le formulaire.

| # | module | ce qu'il fait |
|---|---|---|
| 2 | `gateway:CustomWebHook` | reçoit la réponse Tally |
| 5 | `http:ActionSendData` | **POST /demandes** — l'enregistrement, avant tout traitement |
| 9 | `gemini-ai` | classe la gravité → `gravite\|motif\|panier` — `onerror: Resume` |
| 8 | `gemini-ai` | rédige l'e-mail de réponse au client — `onerror: Resume` |
| 3 | `google-email` | e-mail au client — **filtre : l'adresse doit contenir `@`** |
| 4 | `google-email` | **alerte à l'artisan** |
| 10 | `http:ActionSendData` | PATCH gravité/motif/panier — filtre : le résultat doit contenir `\|` |

`dlq: true`, `maxErrors: 10`. Une exécution complète coûte **7 opérations**.

### ⚠️ DÉFAUT CONNU : un e-mail client invalide supprime l'alerte de l'artisan

Les modules 3, 4 et 10 sont **en série**. Le filtre du module 3 ne saute pas
le module 3 : il arrête toute la suite de la branche. Donc si l'adresse du
client ne contient pas `@` — champ vide, faute de frappe, formulaire qui
change de forme :

- le module 4 ne part pas → **l'artisan ne reçoit aucune alerte** ;
- le module 10 ne part pas → **la gravité n'est jamais écrite**, la demande
  reste dans « Non classées ».

La demande EST en base (module 5 a tourné), donc rien n'est perdu — mais
l'artisan ne l'apprend qu'en ouvrant l'application de lui-même.

**Mesuré le 23 septembre à 17 h 23 et 17 h 25** : deux exécutions avec une
adresse sans `@` coûtent **4 opérations** au lieu de 7. Webhook, insertion,
et les deux appels Gemini. Les trois derniers modules ne tournent pas. La
boîte d'Elie ne contient aucune alerte pour ces deux passages.

**Le correctif** est un réordonnancement : l'alerte à l'artisan (module 4)
doit passer AVANT l'e-mail au client (module 3), ou sur une route séparée.
Il n'a pas été fait : il réécrit le blueprint, et c'est le geste qui a coupé
la capture le 22 septembre. À faire avec Elie devant l'écran, onglet Make
fermé.

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

**Enregistrer depuis un onglet ouvert depuis le matin pousse le blueprint
périmé.** Le 22 septembre, ça a effacé deux routes `onerror`, quatre
`ifempty`, un filtre et le `dlq`, et coupé la capture cinq minutes.
Recharger l'onglet avant toute édition manuelle.
