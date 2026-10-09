-- 0021 — Séparer le chauffage de l'eau chaude (point 3b)
--
-- ═════════════════════════════════════════════════════════════════════════
-- POURQUOI, ET POURQUOI C'ÉTAIT DÉJÀ ÉCRIT QUELQUE PART
-- ═════════════════════════════════════════════════════════════════════════
-- « Avez-vous encore du chauffage ET de l'eau chaude ? » mélange deux pannes
-- qui n'ont pas la même gravité :
--
--   • plus d'eau chaude            → gênant, toute l'année ;
--   • plus de chauffage en janvier → dangereux.
--
-- Un « non » ne permettait pas de les distinguer. C'est exactement ce que
-- `src/lib/tri.ts` constate depuis le 7 octobre, dans un commentaire qui
-- finit par : « Le jour où l'on séparera la question en deux, ce plancher
-- pourra redevenir saisonnier. Pas avant. » Ce jour-ci.
--
-- ═════════════════════════════════════════════════════════════════════════
-- AUCUNE REPRISE DE DONNÉES — MESURÉ, PAS SUPPOSÉ
-- ═════════════════════════════════════════════════════════════════════════
-- `chauffage_eau_chaude` est nulle sur les ONZE lignes de la base (relevé le
-- 9 octobre 2026). La colonne a été créée en 0017 et les seules demandes qui
-- l'ont renseignée étaient des essais, effacés depuis. Il n'y a donc rien à
-- répartir entre les deux nouvelles colonnes, et pas de règle à inventer
-- pour décider si un ancien « non » parlait du chauffage ou de l'eau chaude.

alter table public.demandes
  add column if not exists chauffage  text,
  add column if not exists eau_chaude text;

comment on column public.demandes.chauffage is
  'Le client a-t-il encore du chauffage ? oui / non / je-ne-sais-pas. NULL = il n''a pas répondu. C''est un fait rapporté par lui, pas un jugement : l''artisan ne peut pas le réécrire.';

comment on column public.demandes.eau_chaude is
  'Le client a-t-il encore de l''eau chaude ? Même liste, même règle. Séparée du chauffage depuis la 0021 : les deux pannes n''ont pas la même gravité.';

alter table public.demandes
  drop constraint if exists demandes_chauffage_connu;
alter table public.demandes
  add constraint demandes_chauffage_connu
  check (chauffage is null or chauffage in ('oui', 'non', 'je-ne-sais-pas'));

alter table public.demandes
  drop constraint if exists demandes_eau_chaude_connue;
alter table public.demandes
  add constraint demandes_eau_chaude_connue
  check (eau_chaude is null or eau_chaude in ('oui', 'non', 'je-ne-sais-pas'));

-- ═════════════════════════════════════════════════════════════════════════
-- L'ANCIENNE COLONNE RESTE, ET C'EST LE POINT DÉLICAT DE CETTE MIGRATION
-- ═════════════════════════════════════════════════════════════════════════
-- `chauffage_eau_chaude` n'est plus écrite par le code neuf. On ne la
-- SUPPRIME PAS pour autant, parce que Make continue de la poster tant que le
-- module 5 n'a pas été modifié — et PostgREST refuse un insert qui nomme une
-- colonne absente. La supprimer maintenant casserait la capture pour toute
-- demande arrivant entre cette migration et la mise à jour de Make.
--
-- Ordre sûr, dans cet ordre :
--   1. cette migration (additive, ne casse rien) ;
--   2. le Worker déployé, qui envoie `chauffage` et `eau_chaude` ;
--   3. le module 5 de Make, qui remplace un champ par deux ;
--   4. plus tard, une migration 0022 qui la supprime, une fois qu'on aura
--      vérifié qu'aucune demande neuve ne la renseigne plus.
--
-- Entre 2 et 3, les demandes arrivent avec les trois colonnes nulles pour
-- cette question : le client a répondu, Make ne transmet pas encore. Ça ne
-- casse rien — c'est le cas « il n'a pas répondu », déjà prévu partout.

-- AUCUN DROIT DE COLONNE À ACCORDER. Comme en 0017 et 0018 : la 0014 a retiré
-- `update` au niveau de la table pour ne rendre que cinq colonnes nommées.
-- Les deux nouvelles n'y sont pas, donc l'artisan peut les LIRE sans pouvoir
-- les réécrire. Ce sont les mots de son client, pas un jugement à corriger.
