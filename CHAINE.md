# La chaîne Make, et ce qu'on sait d'elle

Les scénarios Make ne sont pas dans ce dépôt : ils vivent chez Make, et
rien ne les versionne. Ce fichier est le seul endroit où leur forme est
écrite. Il est relevé à la main, daté, et il ment dès que quelqu'un touche
un scénario sans le mettre à jour.

**Dernier relevé : 25 septembre 2026, 12 h**, par lecture des blueprints via l'API.

Organisation 8118598, équipe 1989251, zone `eu1`. Forfait **Free**, relevé
le 25 septembre dans la licence de l'organisation :

| | |
|---|---|
| opérations | **1 000 / mois** (80 consommées au 25 septembre, cycle du 20) |
| **scénarios ACTIFS** | **2. Pas trois.** |
| journaux d'exécution | 7 jours |
| journaux de webhook | 3 jours |
| durée d'exécution | 5 minutes |

**LE PLAFOND DE DEUX SCÉNARIOS ACTIFS EST LE VRAI MUR.** Le produit en
demande trois : la capture, la relance, l'appel manqué. Les deux premiers
occupent les deux places. `scenarios_activate` sur le troisième rend
« Maximum number of active scenarios has been exceeded » — ce n'est pas un
réglage, c'est la licence (`license.scenarios: 2`).

Deux sorties, aucune n'est technique :
1. **Make Core** (~9 €/mois), qui lève le plafond ;
2. **fondre l'appel manqué dans la capture** — un seul webhook, un routeur
   qui distingue les deux charges utiles sur la présence de `CallSid`.
   Gratuit, mais ça couple les deux chaînes les plus importantes, et un
   mauvais enregistrement casserait les deux au lieu d'une.

Rien ne presse : sans numéro Twilio, le troisième scénario ne peut rien
recevoir. La décision se prend le jour de l'achat du numéro.

---

## 1. « Integration Webhooks » — la capture (id 6318986)

Déclenchée par le webhook `hook.eu1.make.com/zyfgvw5dfi3x1lfgg6k0ttu52qosst5u`,
que **notre page `/formulaire`** appelle. Tally est sorti de la chaîne le
23 septembre : le lien du SMS doit porter le code de l'artisan appelé, et
un Tally ne sait pas rattacher une réponse à un code qu'il ignore.

### DEPUIS LE 30 SEPTEMBRE, LE FORMULAIRE N'APPELLE PLUS CE WEBHOOK

Il poste sur **`/api/demande`**, un Worker Cloudflare (`src/worker/`) qui
freine, valide, vérifie que l'artisan existe, puis transmet ici. L'URL du
webhook est un secret du Worker ; elle ne figure plus dans le JavaScript
public. **La charge utile est identique** : le scénario n'a rien eu à
changer.

Éprouvée en production le 30 septembre, de bout en bout :

| | |
|---|---|
| `POST /api/demande` | **200** `{"ok":true}` en **0,25 s** |
| ligne en base | id 43, rattachée à Plomberie Aubagne |
| téléphone | envoyé `06 12 34 56 78`, **stocké `+33612345678`** |
| code envoyé | `pnpz ka4u` — minuscules et espace, accepté |
| le client a coché | « Oui, c'est urgent » |
| l'IA a répondu | **gravité 3**, `fuite chauffe-eau`, 350 €, en **17 s** |
| exécution Make | statut 1, **7 opérations**, 25 s |

Piège relevé au passage : la gravité arrive **après** la réponse HTTP. En
interrogeant la base trop vite on lit `null` et on croit à une panne. Ça
m'est arrivé, et j'ai failli l'écrire.

### LE 7 OCTOBRE, LA CHAÎNE ENTIÈRE A TOURNÉ SANS QU'ON OUVRE LE LOGICIEL

Le scénario reçoit désormais **onze champs** au module 5 — les sept d'avant,
plus `eau_coule`, `arrivee_coupee`, `chauffage_eau_chaude` (phase 5) et
`cle_action` (phase 4). Le module 4 porte le gabarit de
`courriel/alerte-artisan.html`, avec ses deux boutons d'action.

Mesuré de bout en bout, horloge de Paris :

| | |
|---|---|
| 12 h 34 min 43 | la demande arrive — **aucune description tapée** |
| | l'eau coule : oui · arrivée coupée : non |
| | → **gravité 3**, « fuite non maitrisee », 300 € |
| 12 h 37 min 21 | « C'est fait » touché dans Gmail, puis le bouton de la page |
| | → statut **rappelé**, horodaté |
| **2 min 38** | **et le logiciel n'a jamais été ouvert** |

**CE QUE CE TEST A PROUVÉ ET QU'AUCUN AUTRE NE POUVAIT PROUVER : Gmail
réécrit les liens** — il les fait passer par `google.com/url?q=…` pour les
analyser. Le jeton de 64 caractères hexadécimaux survit à cette réécriture.
Tous mes essais précédents utilisaient `curl` sur l'URL brute et ne
touchaient donc pas ce maillon.

### PHASE 5 BIS — LA PROMESSE DE RAPPEL : TROIS LIENS DE PLUS, RIEN D'AUTRE

Depuis le 7 octobre, le Worker envoie **trois jetons supplémentaires** dans
la même charge utile : `jeton_15min`, `jeton_1h`, `jeton_ce_soir`. Ils
dérivent de la même `cle_action`, par le même SHA-256.

**CE QUI NE CHANGE PAS, ET C'EST L'ESSENTIEL :**

- **le module 5 (l'insertion) ne change pas d'un champ.** Les trois jetons ne
  sont stockés nulle part — Postgres les recalcule à chaque clic depuis
  `cle_action`. La table reçoit toujours ses onze champs ;
- **zéro opération de plus.** Une exécution coûte toujours 7 à 8 opérations ;
- **aucun calcul côté Make.** Il recopie trois chaînes de plus.

**CE QU'IL Y A À FAIRE DANS MAKE :** recoller le gabarit du module 4 depuis
`courriel/alerte-artisan-A-COLLER.txt`. C'est tout. Les trois nouveaux
boutons y sont, avec leurs expressions `{{2.jeton_…}}` déjà écrites.

Un test du dépôt (`src/worker/alerte.test.ts`) compare la liste blanche des
opérations, les champs que le Worker pose, et les liens du fichier à coller.
Si les trois divergent, il tombe. **Ce qu'il ne peut pas vérifier : que le
gabarit collé DANS Make est bien celui du dépôt.** Personne ne peut le
prouver d'ici.

**Validité des liens : 48 h pour les trois délais**, contre trente jours pour
« c'est fait » et « pas si urgent ». « Je vous rappelle dans 15 minutes » ne
veut rien dire trois semaines plus tard, et un pouce glisse dans une boîte
mail.

**L'ENVOI DU SMS NE PASSE PAS PAR MAKE.** L'artisan touche un bouton, la page
lui montre le message, et il l'envoie **depuis son propre téléphone** par un
lien `sms:` déjà rempli. Donc : pas de troisième scénario à activer, pas de
numéro Twilio requis, et le message part de son numéro — son client peut
répondre. Le jour où un numéro sera acheté, le Worker pourra envoyer
lui-même, et ce sera un toucher au lieu de deux.

### LE 8 OCTOBRE, LA PROMESSE A TOURNÉ DE BOUT EN BOUT

Mesuré sur l'horloge de Paris, demande 67 :

| | |
|---|---|
| 14 h 30 min 37 | la demande arrive — **aucune description tapée** |
| | l'eau coule : oui · arrivée coupée : non |
| 14 h 30 min 44 | l'alerte dans la boîte — objet **« Urgent — fuite non maitrisee »** |
| 14 h 31 min 02 | gravité **3**, 250 €, écrites en base — 25 s après l'arrivée |
| 14 h 32 min 28 | **« 15 min » touché → promesse enregistrée** |
| **1 min 51** | **et le logiciel n'a jamais été ouvert** |

Les **cinq jetons** de l'e-mail ont été comparés un à un à ce que Postgres
recalcule depuis `cle_action` : identiques. Trois implémentations de SHA-256 —
TypeScript dans le Worker, recopie par Make, PL/pgSQL dans la base — qui
s'accordent sur cinq valeurs.

Et l'objet dit « Urgent » alors que le client n'a rien écrit : c'est déduit de
ses réponses à boutons, sans le modèle.

### LES TROIS PANNES DE CE JOUR-LÀ, ET CE QU'ELLES ONT APPRIS

Entre le collage du gabarit et cette mesure, il a fallu quatre essais. Trois
causes empilées, dont la dernière était la plus bête :

1. **Collage dupliqué.** L'objet contenait l'expression deux fois. D'où la
   règle : `Ctrl+A`, `Suppr`, PUIS `Ctrl+V`.
2. **L'éditeur de Make abîme les chiffres entre guillemets.** `= "3"` est
   devenu `= """")3""""`, deux fois de suite, au même endroit — alors que
   `"oui"`, `"Urgent"` et `"|"` passaient intacts. **Écrire `= 3`, sans
   guillemets.**
3. **`or()` n'existe pas dans Make.** Fonction inventée. Message exact :
   `Failed to map 'subject': Function 'if' finished with error! Function 'or'
   not found!`

**Un module `google-email` qui échoue sur son objet fait tomber tout ce qui le
suit dans sa branche** — ici le module 10, qui écrit la gravité. Le symptôme
(gravité vide) était à trois modules de sa cause.

**OÙ LIRE L'ERREUR :** pas dans l'API. `executions_get-detail` ne rend que
`{"status":"WARNING"}`. Le texte exact est dans **l'e-mail que Make envoie** —
chercher `from:make.com` dans la boîte. C'est la seule source.

**Signature à reconnaître :** *sept opérations au lieu de huit, statut 2*.
Un module de la route 1 a échoué ; croiser avec la boîte mail pour savoir
lequel est passé.

### CE QUE L'ÉCRAN D'ELIE A RÉVÉLÉ, ET QU'AUCUN TEST N'AURAIT TROUVÉ

Il a touché « Envoyer à mon client » **depuis Chrome sur son PC**. Rien ne
s'est passé — comportement normal d'un lien `sms:` hors téléphone. Mais la
page affirmait « votre messagerie s'ouvre », donc il repartait en croyant son
client prévenu, alors qu'en base tout allait bien.

La panne muette dans sa forme la plus traître : **l'enregistrement réussit,
c'est le message qui ne part pas.** La page écrit désormais les deux cas et
donne le numéro à recopier. On ne peut pas détecter le téléphone : cette page
n'a aucun JavaScript, et c'est ce qui la fait tenir en deux kilo-octets.

**Vérifié ensuite sur un vrai téléphone : la messagerie s'ouvre, pré-remplie.**

### LE DÉFAUT QUE CE MÊME TEST A RÉVÉLÉ, DEUX HEURES PLUS TÔT

À 9 h 49, la même demande — sans description — est sortie en **gravité 1,
motif « contenu manquant », panier 0 €**. Le client le plus urgent du
logiciel, rangé en dernier, sans un mot.

Cause : depuis la phase 5 la description est facultative, mais le prompt du
module 9 ne recevait que `besoin` et `urgence_dite`. Il n'avait rien à juger.

Deux correctifs, et il fallait les deux :

1. **le prompt du module 9** reçoit maintenant les trois réponses, et des
   règles explicites pour le cas où la description est vide ;
2. **un plancher de gravité dans le code** (`lib/tri.ts`), qui ne dépend
   d'aucun modèle : l'eau coule et ce n'est pas coupé → au moins 3.

Contrôle négatif passé le même jour : un devis de salle de bain à 8 000 €,
avec « urgent » coché, reste en **gravité 1**. Le prompt discrimine toujours.

### DEPUIS LE 1ᵉʳ OCTOBRE, LE WEBHOOK EXIGE UNE CLÉ

L'adresse `hook.eu1.make.com/zyfgvw…` est dans l'historique git pour
toujours : elle y a été écrite en clair pendant des semaines. On ne l'a donc
pas changée — une adresse déjà publiée le reste. **On l'a rendue inerte.**

Le webhook *Tally lead* porte une clé d'API (trousseau Make, en-tête
`x-make-apikey`), et le Worker l'envoie depuis le secret `MAKE_CLE`.

Éprouvé le 1ᵉʳ octobre, avec les contrôles négatifs d'abord :

| test | résultat |
|---|---|
| l'URL nue, **sans** en-tête | **401 Unauthorized** |
| l'URL avec une **mauvaise** clé | **401** — vraie validation, pas un contrôle de présence |
| `POST /api/demande` (le Worker a la clé) | **200** `{"ok":true}` en **0,34 s** |
| ligne en base | id 44, Plomberie Aubagne, `+33639980042`, Montreuil |
| l'IA a répondu | **gravité 3**, `fuite ballon eau chaude`, 280 €, en **20 s** |

**L'ORDRE DE POSE COMPTE, et il nous a coûté deux allers-retours.** Le Worker
n'envoie l'en-tête que si `MAKE_CLE` existe (`src/worker/index.ts`). Il faut
donc : poser le secret chez Cloudflare → **attendre le déploiement** → puis
seulement exiger la clé côté Make. L'inverse coupe la capture.

Et la panne qu'on a réellement eue n'était ni l'ordre ni le déploiement :
**les deux valeurs différaient**, parce que la clé avait été sélectionnée à la
souris deux fois. De l'extérieur, « clé absente » et « clé fausse » donnent le
même 401 — impossible à distinguer sans les journaux. La parade est de ne
jamais sélectionner la valeur à la main :

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 40 | % {[char]$_}) | Set-Clipboard
```

puis deux `Ctrl+V`, sans rien copier d'autre entre les deux.

Quand le Worker est refusé par Make, `/api/demande` rend
`502 {"erreur":"Service indisponible.","etape":"make"}`, et le Worker
journalise `[/api/demande] echec a l'etape make : reponse 401` dans
l'onglet **Observability** de Cloudflare. C'est à ça que sert `etape`.

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

### LE 25 SEPTEMBRE, CETTE CHAÎNE A SERVI POUR DE VRAI — LA PREMIÈRE FOIS

Fait troublant relevé ce jour-là : **la dernière demande en base datait du
22 septembre à 20 h 27**, et notre formulaire a remplacé Tally le **23**.
Autrement dit, tout ce qui est en base vient de Tally. Le chemin
« vrai formulaire dans un navigateur → webhook → base » n'avait jamais été
parcouru. Les témoins du 23 étaient des charges utiles envoyées à la main
au webhook, pas des soumissions de la page.

Parcouru le 25 septembre, depuis le site déployé, dans un navigateur :

`/formulaire?a=GYZGYQZU&t=+33612345678` → prénom TEMOIN, commune Marseille
13001, e-mail laissé vide, et surtout :

| | |
|---|---|
| ce que le client a coché | **« Oui, c'est urgent »** |
| ce qu'il a écrit | « un devis pour refaire ma salle de bain l'an prochain, rien ne presse » |
| ce que l'IA a répondu | **gravité 1**, motif `devis salle bain`, panier 9 000 € |

**L'IA a contredit le client.** C'est le produit, mesuré en production, pas
dans une maquette. À comparer avec la ligne 8 — « robinet fuite dans toute
la maison » → **gravité 3**. Une fuite passe devant un devis qui se dit
urgent : c'est exactement le tri que décrit la Partie 5 du cahier.

Relevé aussi au passage : le numéro était pré-rempli correctement
(« 06 12 34 56 78 » depuis un lien portant `+33612345678`), la ligne a été
attribuée au bon artisan, et la gravité a été écrite quelques secondes
après l'insertion — donc le routeur du 23 tient. Ligne témoin effacée
ensuite.

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

**Construit le 25 septembre. INACTIF, zéro exécution.** Non par choix :
le forfait ne permet que deux scénarios actifs, et ils sont pris. Voir le
haut de ce fichier. Lire aussi la dernière section de ce chapitre avant de
s'y fier.

Webhook : `https://hook.eu1.make.com/mfs8lxw6lqivrfc9l2hwg79mm9kmuimb`
C'est l'adresse à coller dans Twilio, *Phone Numbers → le numéro → Voice →
A call comes in*, en **HTTP POST**.

| # | module | ce qu'il fait |
|---|---|---|
| 1 | `gateway:CustomWebHook` | reçoit l'appel entrant de Twilio |
| 3 | `http:ActionSendData` | **POST /rpc/artisan_par_numero** avec `p_numero = {{1.To}}` |
| 2 | `gateway:WebhookRespond` | rend le TwiML : `<Say>` au nom de l'entreprise, puis `<Hangup/>` |
| 4 | `twilio:ActionSendMessage` | le SMS : `from = {{1.To}}`, `to = {{1.From}}` |

`dlq: true`, `maxErrors: 10`. Une exécution complète coûte **4 opérations**.

### Le modèle : c'est l'opérateur de l'artisan qui renvoie, pas nous

On ne rappelle pas l'artisan depuis Twilio. Son opérateur envoie vers le
numéro Twilio les appels qu'il n'a pas pris — trois codes GSM, voir
`src/lib/renvoi.ts` et l'écran `src/RenvoiAppel.tsx`. **Tout appel qui
arrive sur ce webhook est donc, par construction, un appel manqué.**

C'est ce qui permet de tenir en quatre opérations. Le modèle inverse — un
`<Dial>` vers son vrai numéro, puis une deuxième requête portant
`DialCallStatus` — en coûterait neuf par appel, sur un forfait de mille.

### Aucun secret dans ce blueprint, et c'est délibéré

Le module 3 n'interroge pas la table avec la clé de service. Il appelle
`artisan_par_numero` (migration `0011`), qui ne rend que `entreprise`,
`message_sms` et `code` — trois champs que le SMS lui-même porte déjà vers
un inconnu à chaque appel. La clé employée est la clé **publiable**, celle
qui est dans le JavaScript de tous les navigateurs.

`Accept: application/vnd.pgrst.object+json`, comme au module 15 de la
capture : un numéro inconnu rend **406**, l'exécution part en file
d'attente, Make écrit à Elie. Mieux vaut un échec bruyant qu'un SMS envoyé
au nom de personne.

### Les deux conversions, et le piège qu'elles désamorcent

**Dans une URL, « + » se lit ESPACE.** Mesuré le 24 septembre, aux deux
bouts de la chaîne :

| | écrit | lu |
|---|---|---|
| lien du SMS | `?t=+33612345678` | ` 33612345678` — numéro abîmé |
| requête PostgREST | `eq.+33939031234` | 0 ligne, 406 |

Trois réponses, toutes en place :

1. le module 4 écrit le numéro en forme nationale —
   `replace(1.From; "+33"; "0")` — donc plus de « + » dans le lien, et
   deux caractères de moins par SMS ;
2. `src/lib/lien.ts` lit la chaîne de requête sans traduire le « + », pour
   qu'un appelant étranger arrive quand même entier ;
3. `numero_canonique` (migration `0011`) ramène `+33…`, `0033…`, `0…` et
   même la forme au « + » mangé à une seule écriture. **Éprouvé en
   transaction annulée : les cinq écritures trouvent la même ligne.**

Le nom de l'entreprise part dans du XML, donc il est échappé à la main —
`&`, `<`, `>` — : Make n'a pas plus de fonction d'échappement XML que JSON,
et « Martin & Fils » casserait le TwiML.

### CE QUI EST MESURÉ, ET CE QUI NE L'EST PAS

**Le module 3 est éprouvé pour de bon**, en HTTP contre la vraie base, avec
la requête exacte qu'il enverra (POST form-urlencoded, clé publiable,
`Accept: …pgrst.object+json`) — migration 0011 appliquée le 25 septembre :

| `p_numero` | réponse |
|---|---|
| `+33939031234` | 200, les trois champs |
| ` 33939031234` (le « + » mangé) | 200, **la même ligne** |
| `0939031234` | 200, la même ligne |
| `0033939031234` | 200, la même ligne |
| `+33999999999`, `bonjour`, vide | 406 — l'échec bruyant voulu |

Témoin négatif : `numero_canonique` appelée par `anon` rend **42501**.

**Mais le scénario, lui, n'a jamais tourné.** Ce qui reste en déduction :

- **l'évaluation des formules par Make** — les `replace` imbriqués, le
  `{LIEN}` littéral entre accolades simples à l'intérieur d'un `{{ }}`.
  C'est le seul vrai inconnu qu'une activation de cinq minutes lèverait ;
- **l'encodage du « + » par le module form-urlencoded de Make** — mais
  `numero_canonique` rattrape les deux cas, et c'est mesuré ci-dessus ;
- **`From` porte-t-il bien l'appelant d'origine ?** Sur un renvoi français,
  l'appelant reste normalement dans `From` et l'artisan passe dans
  `ForwardedFrom`. Si c'était l'inverse, on enverrait le SMS à l'artisan
  lui-même. **C'est la première chose à regarder au premier vrai appel.**
- le délai « moins de 10 secondes » de la case A2.

### Le jour où un numéro sera acheté

1. la migration `0011` est appliquée depuis le 25 septembre ;
2. libérer une place de scénario actif (voir le haut du fichier), puis
   activer celui-ci ;
3. coller l'URL du webhook dans *Voice → A call comes in*, en POST ;
4. renseigner **Primary handler fails** avec un TwiML Bin statique — sans
   lui, un échec du scénario fait entendre au prospect le message d'erreur
   par défaut de Twilio, **en anglais** :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="fr-FR">Bonjour, je ne peux pas repondre dans l'immediat. Rappelez-moi un peu plus tard, ou laissez-moi un message. A tres vite.</Say>
  <Hangup/>
</Response>
```

5. écrire le numéro dans `artisans.numero_twilio` — les codes de renvoi
   s'affichent alors tout seuls dans ses Réglages ;
6. appeler depuis un autre téléphone sans décrocher, et vérifier les quatre
   points de la section précédente.

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
