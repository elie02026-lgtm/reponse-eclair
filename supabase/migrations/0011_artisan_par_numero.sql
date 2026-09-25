-- ════════════════════════════════════════════════════════════════════════
-- 0011 — RETROUVER UN ARTISAN À PARTIR DU NUMÉRO QU'ON VIENT D'APPELER
-- ════════════════════════════════════════════════════════════════════════
--
-- Écrite le 25 septembre 2026, montrée à Elie, **appliquée le même jour**
-- après son accord explicite sur la divulgation décrite plus bas.
--
-- Droits relevés après application, et non déduits :
--   artisan_par_numero  {postgres=X/postgres,anon=X/postgres}   security definer, stable
--   numero_canonique    {postgres=X/postgres}                   immutable
--
-- Et éprouvée en HTTP avec la clé publiable, contre la vraie base :
--   « +33939031234 », «  33939031234 », « 0939031234 », « 0033939031234 »
--       → 200, les trois champs, la même ligne à chaque fois
--   « +33999999999 », « bonjour », «  »  → 406 (l'échec bruyant voulu)
--   numero_canonique appelée par anon    → 42501 permission denied
--
-- Le scénario « Appel manqué → SMS » reçoit de Twilio le numéro appelé
-- (`To`) et doit en tirer trois choses : le nom de l'entreprise, pour le
-- message vocal ; le texte du SMS ; et le code qui ira dans le lien.
--
-- ───────────────────────────────────────────────────────────────────────
-- POURQUOI UNE FONCTION, ET PAS LA CLÉ DE SERVICE
-- ───────────────────────────────────────────────────────────────────────
-- La chaîne de capture interroge `/rest/v1/artisans` avec la CLÉ DE
-- SERVICE, qui passe outre toutes les politiques RLS : elle peut lire et
-- écrire n'importe quelle ligne de n'importe quelle table. Pour retrouver
-- trois champs à partir d'un numéro, c'est donner les clés de l'immeuble
-- pour ouvrir une boîte aux lettres.
--
-- Cette fonction rend exactement ces trois champs, et rien d'autre. Elle
-- s'appelle avec la clé PUBLIABLE — celle qui est déjà dans le JavaScript
-- servi à tous les navigateurs, donc publique par construction. Le
-- blueprint Make ne contient alors plus aucun secret, et peut être versé
-- dans ce dépôt tel quel. C'est la réponse de fond à la fuite du
-- 24 septembre : ce qui ne contient pas de secret ne peut pas en perdre.
--
-- ───────────────────────────────────────────────────────────────────────
-- CE QU'ON EXPOSE, ET CE QU'ON N'EXPOSE PAS — À LIRE AVANT D'APPLIQUER
-- ───────────────────────────────────────────────────────────────────────
-- Cette fonction est appelable SANS COMPTE. Quelqu'un qui devine un de nos
-- numéros apprend donc : le nom de l'entreprise, le texte de son SMS, et
-- son code de lien.
--
-- Les trois sont déjà publics par ailleurs — c'est le SMS lui-même qui les
-- porte, à chaque appel manqué, vers un inconnu. La fonction ne révèle
-- donc rien de neuf sur UN artisan.
--
-- Ce qu'elle ajoute est ailleurs : elle permet de PARCOURIR l'espace des
-- numéros pour dresser la liste de nos clients. Un concurrent qui balaie
-- une plage de numéros saurait qui travaille avec nous. C'est un risque
-- commercial, pas un risque pour les données des prospects — aucune
-- demande, aucun téléphone de client, aucun e-mail n'est atteignable par
-- ici. À dire clairement plutôt qu'à découvrir plus tard.
--
-- ═══════════════════════════════════════════════════════════════════════
-- 1. LA FORME CANONIQUE D'UN NUMÉRO
-- ═══════════════════════════════════════════════════════════════════════
--
-- Twilio écrit « +33939031234 ». La base aussi. Mais entre les deux il y a
-- Make, une chaîne de requête, et un encodage — et dans une URL, « + » se
-- lit ESPACE. Mesuré le 24 septembre contre PostgREST :
--
--   ?numero_twilio=eq.+33939031234    → 0 ligne  (406)
--   ?numero_twilio=eq.%2B33939031234  → 1 ligne  (200)
--
-- Le même piège que dans le lien du SMS, à l'autre bout de la chaîne. On
-- ne le corrige pas à coups de « %2B » disséminés : on le rend inoffensif
-- une fois pour toutes, ICI, au seul endroit qui voit toutes les écritures
-- d'un même numéro. « +33939031234 », « 33939031234 », « 0939031234 »,
-- « 0033939031234 » et même « 33939031234 » précédé d'un espace y
-- désignent la même ligne.
create or replace function public.numero_canonique(p text)
returns text
language sql
immutable
set search_path = ''
as $fonction$
  select case
           -- On ne garde que les chiffres, puis on ramène à la forme
           -- nationale : dix chiffres commençant par 0.
           when d ~ '^33[1-9][0-9]{8}$'   then '0' || right(d, 9)
           when d ~ '^0033[1-9][0-9]{8}$' then '0' || right(d, 9)
           when d ~ '^0[1-9][0-9]{8}$'    then d
           -- Tout le reste — vide, tronqué, étranger — ne désigne AUCUN
           -- numéro français. On rend '' plutôt que la saisie : sinon deux
           -- entrées illisibles se « ressembleraient » et se retrouveraient
           -- rattachées l'une à l'autre.
           else ''
         end
    from (select regexp_replace(coalesce(p, ''), '[^0-9]', '', 'g')) as t(d)
$fonction$;

comment on function public.numero_canonique(text) is
  'Forme nationale a dix chiffres d''un numero francais, chaine vide si illisible. Interne.';

-- Elle ne sert qu'à la fonction ci-dessous : personne d'autre ne l'appelle.
revoke all     on function public.numero_canonique(text) from public;
revoke execute on function public.numero_canonique(text) from anon;
revoke execute on function public.numero_canonique(text) from authenticated;
revoke execute on function public.numero_canonique(text) from service_role;

-- ═══════════════════════════════════════════════════════════════════════
-- 2. LA FONCTION APPELÉE PAR LE SCÉNARIO
-- ═══════════════════════════════════════════════════════════════════════
--
-- `returns table` avec au plus une ligne. Le scénario demande
-- `Accept: application/vnd.pgrst.object+json` : un numéro inconnu rend
-- alors 406 au lieu d'une liste vide. Le module échoue, l'exécution part
-- en file d'attente (`dlq: true`), Make envoie un e-mail. Le même choix
-- délibéré que pour le module 15 de la chaîne de capture : mieux vaut un
-- échec bruyant qu'un SMS envoyé au nom de personne.
create or replace function public.artisan_par_numero(p_numero text)
returns table (entreprise text, message_sms text, code text)
language sql
stable
security definer
set search_path = ''
as $fonction$
  select a.entreprise, a.message_sms, a.code
    from public.artisans a
   where public.numero_canonique(p_numero) <> ''
     and public.numero_canonique(a.numero_twilio) = public.numero_canonique(p_numero)
   limit 1
$fonction$;

comment on function public.artisan_par_numero(text) is
  'Trois champs publics d''un artisan, a partir du numero appele. Appelee par le scenario Make « Appel manque -> SMS ».';

-- LE PIÈGE DES DROITS PAR DÉFAUT, ENCORE.
-- Supabase accorde EXECUTE à anon, authenticated ET service_role sur toute
-- fonction créée dans `public`. `revoke ... from public` NE LES RETIRE
-- PAS : ce sont des rôles nommés. Le 23 septembre, un appel `anon` avait
-- ainsi réellement supprimé un compte témoin. On nomme donc chaque rôle.
revoke all     on function public.artisan_par_numero(text) from public;
revoke execute on function public.artisan_par_numero(text) from authenticated;
revoke execute on function public.artisan_par_numero(text) from service_role;

-- `anon` seul, parce qu'un seul appelant existe : le scénario Make, avec
-- la clé publiable. Aucun écran de l'application ne s'en sert — un artisan
-- connecté lit sa propre fiche par RLS, il n'a rien à faire ici.
grant execute on function public.artisan_par_numero(text) to anon;

-- ═══════════════════════════════════════════════════════════════════════
-- 3. CE QU'IL FAUT VOIR APRÈS APPLICATION
-- ═══════════════════════════════════════════════════════════════════════
--
--   select proname, proacl from pg_proc
--    where proname in ('artisan_par_numero','numero_canonique');
--
-- Attendu :
--   artisan_par_numero  {postgres=X/postgres,anon=X/postgres}
--   numero_canonique    {postgres=X/postgres}
--
-- Et les quatre écritures d'un même numéro doivent rendre la même ligne :
--
--   select public.numero_canonique(v)
--     from (values ('+33939031234'), ('33939031234'),
--                  ('0939031234'), (' 33939031234')) as t(v);
--   -- attendu : 0939031234, quatre fois
