-- 0020 — La fiche dont Make a besoin pour écrire au bon artisan (partie A4)
--
-- ═════════════════════════════════════════════════════════════════════════
-- POURQUOI UNE FONCTION, ET PAS LA VUE `artisans_contact`
-- ═════════════════════════════════════════════════════════════════════════
-- La vue de la migration 0003 rend `id`, `entreprise`, `email`. Elle ne
-- convient pas ici, pour deux raisons dont la seconde est décisive.
--
-- 1. IL MANQUE `lien_rdv`. Réparable en une ligne.
--
-- 2. ELLE N'A PAS DE COLONNE `code`, ET SURTOUT : MAKE NE TIENT PAS UN CODE
--    PROPRE. Le code voyage dans le SMS, puis dans l'adresse du formulaire,
--    puis dans la charge utile. Mesuré en production le 30 septembre : le
--    code reçu était `pnpz ka4u` — EN MINUSCULES, AVEC UN ESPACE. Un
--    `?code=eq.pnpz ka4u` sur une vue rend zéro ligne, donc aucune alerte,
--    et personne ne s'en aperçoit.
--
--    Toute la maison normalise avec `upper(btrim(…))` : `artisan_public` et
--    `deposer_demande` (migration 0009) le font déjà. Une fonction peut
--    appliquer la même règle ; une vue interrogée par URL ne peut pas, elle
--    obligerait Make à écrire `{{upper(trim(2.code))}}` — c'est-à-dire à se
--    souvenir d'une règle de la base dans un blueprint.
--
-- Une troisième raison, plus simple : une fonction se referme. `revoke all`
-- puis `grant execute to service_role` tient en quatre lignes et se vérifie.

-- Dépend de la migration 0019 pour `lien_rdv`.
create or replace function public.artisan_pour_alerte(p_code text)
returns table (id uuid, entreprise text, email text, lien_rdv text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.id, a.entreprise, u.email::text, a.lien_rdv
  from public.artisans a
  join auth.users u on u.id = a.id
  where a.code = upper(btrim(coalesce(p_code, '')));
$$;

comment on function public.artisan_pour_alerte(text) is
  'Rend la fiche d''alerte d''un artisan à partir de son code : id, entreprise, e-mail d''authentification, lien de rendez-vous. RÉSERVÉE À service_role — elle expose une adresse e-mail.';

-- ELLE EXPOSE UNE ADRESSE E-MAIL : elle n'est donc ouverte qu'à la clé de
-- service, celle qui ne quitte jamais Make. `anon` est la clé qui est dans le
-- JavaScript de tous les navigateurs ; `authenticated`, c'est n'importe quel
-- artisan inscrit — et un artisan n'a rien à savoir de l'adresse d'un autre.
--
-- Supabase accorde EXECUTE à tout le monde par défaut sur les fonctions de
-- `public`. On reprend tout, puis on ne rend qu'à un seul rôle.
revoke all on function public.artisan_pour_alerte(text) from public;
revoke all on function public.artisan_pour_alerte(text) from anon;
revoke all on function public.artisan_pour_alerte(text) from authenticated;
grant execute on function public.artisan_pour_alerte(text) to service_role;

-- ═════════════════════════════════════════════════════════════════════════
-- CE QUE LA VUE `artisans_contact` DEVIENT
-- ═════════════════════════════════════════════════════════════════════════
-- Rien ne change pour elle, et on ne la supprime pas. Elle reste le moyen de
-- lister les artisans à des fins d'administration ; cette fonction-ci sert à
-- en trouver UN, par son code, depuis une chaîne qui ne tient pas un code
-- propre. Deux usages, deux objets.
--
-- ═════════════════════════════════════════════════════════════════════════
-- CE QUI RESTE VRAI, ET QU'IL FAUT SAVOIR AVANT DE BRANCHER MAKE
-- ═════════════════════════════════════════════════════════════════════════
-- L'ADRESSE DU COMPTE « Plomberie Test » EST UN TROU NOIR. Son domaine
-- d'authentification est `reponse-eclair.fr`, qui n'a AUCUN enregistrement
-- MX — vérifié le 7 octobre 2026 par `Resolve-DnsName -Type MX`, avec
-- `gmail.com` en témoin positif (5 MX).
--
-- Or dix des onze demandes en base sont rattachées à ce compte. Brancher
-- cette fonction dans Make sans rien faire d'autre enverrait donc les
-- alertes des essais d'Elie dans le vide, SANS ERREUR VISIBLE — exactement
-- la panne muette que la migration 0003 voulait éviter.
--
-- Deux façons d'en sortir, au choix : changer l'adresse d'authentification de
-- Plomberie Test pour une vraie boîte, ou faire ses essais avec
-- « plomberie MARTIN » / « Plomberie Aubagne », dont les adresses sont chez
-- gmail.com.
