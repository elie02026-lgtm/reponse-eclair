# Les messages envoyés au client

**Source de vérité des textes de l'e-mail au client et de l'objet de l'alerte
à l'artisan.** On modifie ici, puis on recopie dans Make. Jamais l'inverse.

---

## Pourquoi des textes fixes, et plus un modèle qui rédige

Aujourd'hui, le module 9 laisse Gemini écrire librement l'e-mail du client.
Trois conséquences mesurées en lisant le blueprint le 7 octobre :

1. **le prompt contient en dur le lien cal.com et le portable personnel
   d'Elie.** Avec un vrai client, ses clients en urgence appelleraient Elie
   et prendraient rendez-vous dans l'agenda d'Elie ;
2. **pour une fuite qui coule, il invite à « choisir un créneau »** et parle
   au nom de l'artisan (« je suis disponible »). C'est la RÈGLE D'OR du
   projet qui tombe : *on n'annonce jamais au client ce que l'artisan n'a pas
   choisi lui-même* ;
3. **les deux objets disent « demande de devis »**, même pour une fuite.

Un texte fixe n'a aucune de ces trois faiblesses, et il a une qualité que la
rédaction libre ne peut pas avoir : **on sait d'avance ce qu'il dit.** Un
modèle qui rédige un e-mail au nom d'un artisan est un modèle qui, un jour
sur mille, promet quelque chose. Ces mille-là sont des clients.

**Le modèle garde son vrai travail : classer.** Gravité, motif, panier. Il ne
parle plus au client.

---

## Ce qu'aucun de ces textes ne contient, jamais

| Interdit | Pourquoi |
|---|---|
| **un délai** | « on vous rappelle sous 2 h » n'a pas été choisi par l'artisan. Le délai, c'est la phase 5 bis : trois boutons dans son e-mail, et c'est lui qui touche. |
| **un numéro de téléphone** | aucun n'est le bon. Ni celui d'Elie, ni même celui de l'artisan sans qu'il l'ait demandé. |
| **« je »** | ces messages ne sont pas écrits par l'artisan. Ils sont signés de son entreprise et parlent de lui à la troisième personne. |
| **le mot « devis »** dans une urgence | un client qui a une fuite ne demande pas un devis. |
| **un lien de rendez-vous dans une urgence** | prendre rendez-vous pour une fuite qui coule est absurde, et insultant. |

---

## Quel texte, dans quel cas

**UNE DEMANDE EST URGENTE SI :**

```
gravité = 3   OU   (l'eau coule = oui   ET   arrivée coupée ≠ oui)
```

**La deuxième moitié de cette règle n'est pas une précaution : c'est une
réparation.** Le 7 octobre, une vraie demande — l'eau coule, rien n'est
coupé, aucune description tapée — a été classée **gravité 1** par le modèle.
Avec la seule gravité du modèle, ce client aurait reçu un lien de prise de
rendez-vous pendant que son logement prenait l'eau.

C'est le même plancher que celui de `src/lib/tri.ts`, qui décide de l'ordre
des demandes à l'écran. Les deux doivent dire la même chose, sinon l'écran et
l'e-mail se contrediront.

> **Pourquoi « ≠ oui » et pas « = non » :** parce que « je ne sais pas »
> compte comme « non ». Celui qui ignore s'il a coupé n'a, en pratique, pas
> coupé. Même arbitrage que sur la page de confirmation du formulaire
> (`src/lib/conseil.ts`) — et c'est volontairement plus large que la consigne
> d'origine, qui disait « = non ». Une consigne de sécurité qui s'applique à
> moins de monde qu'ailleurs dans le produit est un piège.

| Cas | Texte | Lien de rendez-vous |
|---|---|---|
| urgent (règle ci-dessus) | **A** | non |
| non urgent, l'artisan a un `lien_rdv` | **B** | oui |
| non urgent, pas de `lien_rdv` | **C** | non |
| le modèle n'a rien rendu d'exploitable | **D** | non |

Le **conseil de couper l'eau** s'ajoute au texte A quand, et seulement quand,
`eau_coule = oui` et `arrivee_coupee ≠ oui`.

---

## Objet de l'e-mail au client

Le même dans les quatre cas :

```
Votre demande est arrivée chez {entreprise}
```

Il est vrai dans tous les cas, il ne promet rien, et il nomme l'artisan —
c'est de lui que le client attend un appel, pas de nous.

---

## Texte A — demande urgente

```
Bonjour,

Votre demande est bien arrivée chez {entreprise}.

Elle a été signalée comme urgente et placée en haut de la liste
des appels à passer. {entreprise} a été prévenu.

Vous serez rappelé par {entreprise}.

{entreprise}
```

### Le bloc à ajouter si l'eau coule et que l'arrivée n'est pas coupée

À insérer juste après « {entreprise} a été prévenu. » — le texte est repris
mot pour mot de la page de confirmation du formulaire
(`src/config/conseils.ts`, constante `COUPER_LEAU`) :

```
En attendant : coupez l’arrivée d’eau.

Le robinet d’arrêt général se trouve en général près du compteur d’eau,
sous l’évier de la cuisine ou dans une gaine technique. Tournez-le à fond
dans le sens des aiguilles d’une montre. Si vous ne le trouvez pas, ne
forcez rien.
```

> « Vous serez rappelé » ne dit pas quand, et c'est tout l'exercice. La
> tournure passive est ici un choix : « {entreprise} vous rappellera » serait
> une promesse prise à sa place.

---

## Texte B — demande non urgente, l'artisan a un lien de rendez-vous

```
Bonjour,

Votre demande est bien arrivée chez {entreprise}, avec ce que vous
avez décrit. {entreprise} a été prévenu et vous rappellera.

Si vous préférez choisir vous-même un moment pour qu'il passe :
{lien_rdv}

{entreprise}
```

> La phrase du lien commence par **« si vous préférez »**. Le rendez-vous est
> une commodité offerte, pas la marche à suivre : un client qui ne clique pas
> ne doit pas avoir l'impression d'avoir mal fait.

---

## Texte C — demande non urgente, pas de lien de rendez-vous

```
Bonjour,

Votre demande est bien arrivée chez {entreprise}, avec ce que vous
avez décrit. {entreprise} a été prévenu et vous rappellera.

{entreprise}
```

C'est le texte B sans sa phrase du milieu. Deux textes et non un seul avec un
trou : un e-mail où il reste une ligne vide, ou pire un « : » suivi de rien,
se voit immédiatement.

---

## Texte D — le modèle n'a rien rendu d'exploitable

```
Bonjour,

Votre demande est bien arrivée chez {entreprise}.

Elle figure dans la liste des appels à passer. {entreprise} a été
prévenu et vous rappellera.

{entreprise}
```

> **Il ne dit RIEN de la gravité, ni dans un sens ni dans l'autre.** Ne pas
> savoir classer une demande n'autorise ni à rassurer, ni à alarmer. Pas de
> lien de rendez-vous non plus : on ne proposerait pas un créneau à quelqu'un
> dont on ne sait pas s'il a une fuite.
>
> Ce cas n'est pas théorique. La classification est arrivée **nulle** une fois
> sur onze demandes réelles, et le 7 octobre elle a rendu « contenu manquant »
> sur la demande la plus urgente du logiciel.

---

## Objet de l'ALERTE à l'artisan

C'est la ligne qu'il lit sur son écran de verrouillage, debout sur un
chantier. Elle doit dire **ce que c'est** et **où**, dans cet ordre.

| Cas | Objet |
|---|---|
| urgent | `Urgent — {motif} — {lieu}` |
| gravité 2 | `À rappeler — {motif} — {lieu}` |
| gravité 1 | `Demande — {motif} — {lieu}` |
| non classée | `Nouvelle demande — {lieu}` |

Exemples réels, tirés des demandes en base :

```
Urgent — fuite non maitrisee — Paris 11e
Demande — devis salle de bain — Boulogne-Billancourt
Nouvelle demande — Montreuil
```

> **Le motif n'a pas d'accents, et il ne faut pas les remettre.** Le prompt du
> module 9 impose « minuscules sans accent », et un objet d'e-mail qui
> reproduit la sortie du modèle telle quelle est un objet qu'on peut
> comparer à ce qu'il y a en base. « fuite non maitrisee » est moins joli que
> « fuite non maîtrisée » ; c'est surtout exactement ce que le logiciel a
> écrit.
>
> **Et le mot « devis » n'apparaît que si le modèle l'a mis dans le motif** —
> donc, par construction, jamais sur une urgence.

---

## Annexe — les formules Make, prêtes à coller

Les trois morceaux de la réponse du module 9 (même découpage que l'e-mail
d'alerte actuel) :

```
GRAVITE  →  {{trim(get(split(9.result; "|"); 1))}}
MOTIF    →  {{trim(get(split(9.result; "|"); 2))}}
PANIER   →  {{trim(get(split(9.result; "|"); 3))}}
```

**Est-ce urgent ?** — à recopier tel quel dans un `if()` :

```
or(trim(get(split(9.result; "|"); 1)) = "3";
   and(2.eau_coule = "oui"; 2.arrivee_coupee != "oui"))
```

**Est-ce classé ?** — vrai seulement si la réponse a bien la forme attendue :

```
and(length(9.result) > 0; indexOf(9.result; "|") > 0)
```

**Le choix du texte, en une expression :**

```
{{if(not(and(length(9.result) > 0; indexOf(9.result; "|") > 0));
     TEXTE_D;
     if(or(trim(get(split(9.result; "|"); 1)) = "3";
           and(2.eau_coule = "oui"; 2.arrivee_coupee != "oui"));
        TEXTE_A;
        if(length(ifempty(15.lien_rdv; "")) > 0; TEXTE_B; TEXTE_C)))}}
```

`15.` est le module qui lit la fiche de l'artisan par son code — voir la
partie A4. S'il porte un autre numéro dans ton scénario, c'est le seul
endroit à changer.

**Le conseil de couper l'eau**, à insérer dans le texte A :

```
{{if(and(2.eau_coule = "oui"; 2.arrivee_coupee != "oui"); LE_BLOC; "")}}
```

**L'objet de l'alerte à l'artisan :**

```
{{if(not(and(length(9.result) > 0; indexOf(9.result; "|") > 0));
     "Nouvelle demande — " + ifempty(2.lieu; "lieu non précisé");
     if(or(trim(get(split(9.result; "|"); 1)) = "3";
           and(2.eau_coule = "oui"; 2.arrivee_coupee != "oui"));
        "Urgent — ";
        if(trim(get(split(9.result; "|"); 1)) = "2"; "À rappeler — "; "Demande — "))
     + trim(get(split(9.result; "|"); 2))
     + " — " + ifempty(2.lieu; "lieu non précisé"))}}
```

> **Piège déjà rencontré :** Make n'envoie pas les champs de formulaire vides,
> il les OMET. `2.eau_coule` peut donc ne pas exister du tout, et une
> comparaison sur un champ absent ne vaut pas « faux » partout de la même
> façon. `ifempty(2.eau_coule; "")` autour de chaque comparaison est plus sûr
> si un test montre un comportement étrange.

---

## Ce que ce document ne règle pas

1. **Les textes ne sont pas dans le dépôt sous forme de code**, donc aucun
   test ne les vérifie. Ils vivent ici et dans Make. La seule garantie est que
   les deux se ressemblent, et c'est une garantie humaine.
2. **Le prompt du module 9 doit perdre ses consignes de rédaction** — le lien
   cal.com, le numéro personnel, le texte de secours. Tant qu'elles y sont,
   le modèle peut encore les écrire. À faire en même temps que le collage de
   ces textes.
3. **Rien ici ne lit `lien_rdv`** tant que la migration `0019` n'est pas
   appliquée et que Make ne va pas chercher la fiche de l'artisan (partie A4).
   D'ici là, le texte C s'applique à tout le monde.
