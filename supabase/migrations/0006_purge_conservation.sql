-- ═════════════════════════════════════════════════════════════════════════
-- La purge de conservation (cahier, case D6)
--
--   « Durée de conservation définie ET APPLIQUÉE »
--
-- Les trois ans étaient DÉFINIS depuis le 22 septembre : écrits dans
-- /confidentialite, annoncés aux clients des artisans. Ils n'étaient
-- APPLIQUÉS nulle part — aucune ligne n'a jamais été effacée par le temps.
-- Le mot « appliquée » du cahier est là exactement pour ça : une durée
-- annoncée et jamais exécutée est une déclaration fausse, pas un oubli.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. La trace. Elle vient AVANT la fonction, et ce n'est pas un détail.
-- ─────────────────────────────────────────────────────────────────────────
-- Une purge correcte ne supprime rien pendant trois ans. Sans journal, on
-- ne peut pas distinguer « elle tourne et ne trouve rien » de « elle ne
-- tourne plus depuis huit mois ». Les deux ressemblent au silence.
--
-- On journalise donc CHAQUE passage, y compris ceux qui n'effacent rien :
-- c'est la seule preuve de vie, et elle coûte une ligne par jour.
create table if not exists purges (
  id                  bigserial primary key,
  tournee_le          timestamptz not null default now(),
  demandes_supprimees int         not null
);

comment on table purges is
  'Un passage de la purge de conservation. Journalisé même quand rien n''est supprimé : c''est la preuve que la tâche tourne encore.';

-- Personne n'y touche depuis le navigateur. RLS active + zéro politique =
-- tout est refusé aux rôles clients. La même formulation que `oppositions`.
alter table purges enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. La fonction.
-- ─────────────────────────────────────────────────────────────────────────
-- AUCUN PARAMÈTRE, et c'est délibéré. Une `purger(p_jours int)` serait plus
-- souple, et un appel à `purger(0)` viderait la base. La durée est une
-- décision, pas un argument : elle est écrite dans le corps, au même endroit
-- que le commentaire qui l'explique.
--
-- « Dernier contact » = le plus récent des trois moments où quelqu'un a
-- parlé à quelqu'un :
--   • `recue_le`       — le correspondant a écrit ;
--   • `relance_sms_le` — on lui a réécrit ;
--   • `traite_le`      — l'artisan l'a traité, donc rappelé.
-- Prendre le plus récent des trois est ce que recommande la CNIL (trois ans
-- à compter du dernier contact) et c'est aussi le choix le plus prudent :
-- aucune demande encore vivante ne peut être emportée.
create or replace function purger()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_supprimees int;
begin
  with mortes as (
    delete from public.demandes d
    where greatest(
            d.recue_le,
            coalesce(d.relance_sms_le, d.recue_le),
            coalesce(d.traite_le,      d.recue_le)
          ) < now() - interval '3 years'
    returning 1
  )
  select count(*) into v_supprimees from mortes;

  insert into public.purges (demandes_supprimees) values (v_supprimees);
  return v_supprimees;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Qui a le droit de l'appeler : PERSONNE, sauf la tâche planifiée.
-- ─────────────────────────────────────────────────────────────────────────
-- Leçon de la migration 0005 : `revoke from public` NE RETIRE PAS le droit
-- que Supabase accorde nommément à `anon`, `authenticated` et
-- `service_role` sur toute fonction créée dans le schéma `public`. Il faut
-- les nommer un par un, et vérifier `proacl` ensuite.
--
-- Ici on va plus loin que pour `resilier` : même un artisan connecté n'a
-- aucune raison de déclencher une purge. Seul `postgres` la garde, et c'est
-- sous cette identité que pg_cron l'exécute.
revoke all on function purger() from public;
revoke all on function purger() from anon;
revoke all on function purger() from authenticated;
revoke all on function purger() from service_role;

comment on function purger() is
  'Efface les demandes dont le dernier contact remonte à plus de trois ans, et journalise le passage dans `purges`. Réservée à la tâche planifiée.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Le déclencheur.
-- ─────────────────────────────────────────────────────────────────────────
-- pg_cron plutôt qu'un scénario Make, pour trois raisons :
--   • la purge ne dépend d'aucun service extérieur, donc d'aucune panne ni
--     d'aucun quota d'opérations ;
--   • elle ne peut pas être effacée par un enregistrement depuis un onglet
--     périmé — ce qui est déjà arrivé le 22 septembre et a coupé la capture ;
--   • elle vit dans la même base que la donnée qu'elle efface, et part avec
--     elle si le projet est restauré ailleurs.
--
-- Tous les jours à 03h15 UTC. Quotidien plutôt qu'hebdomadaire : la preuve
-- de vie du point 1 vaut ce qu'elle coûte, une ligne par jour.
create extension if not exists pg_cron;

select cron.schedule('purge-conservation', '15 3 * * *', 'select public.purger()');

-- ─────────────────────────────────────────────────────────────────────────
-- 5. CE QUI N'EST PAS PURGÉ, ET POURQUOI.
-- ─────────────────────────────────────────────────────────────────────────
-- * `oppositions` — jamais. Une adresse n'y figure que parce que quelqu'un
--   a demandé à ne plus être relancé. L'effacer ferait disparaître le refus
--   et rendrait la personne relançable à nouveau : on conserve le strict
--   minimum — une adresse — pour pouvoir continuer à ne rien lui envoyer.
--
-- * `artisans` — jamais non plus. Un artisan est un client, pas un
--   prospect ; ses données relèvent du contrat, pas de la prospection. Il
--   part quand il résilie (migration 0005), pas quand le temps passe.
--
-- * Les journaux d'exécution Make, les e-mails déjà envoyés par Gmail et
--   les descriptions passées à Gemini. Du SQL ne les atteint pas. Tant
--   qu'ils ne sont pas traités, la case D3 n'est pas acquise — et la
--   conservation réelle du projet reste celle de ces services-là, pas
--   celle écrite ici.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 6. CE QUI RESTE FRAGILE, ET QU'IL FAUT DIRE.
-- ─────────────────────────────────────────────────────────────────────────
-- Si la tâche pg_cron est supprimée ou échoue en silence, plus rien n'est
-- effacé et personne ne le voit. La table `purges` rend la panne
-- DÉTECTABLE — « aucune ligne depuis N jours » — mais rien ne la SIGNALE
-- aujourd'hui. C'est un trou connu, pas une omission :
--
--   select max(tournee_le) from purges;   -- doit dater de moins de 48 h
--
-- Le jour où il y aura plus d'un client, cette requête ira dans l'écran de
-- santé — du côté d'Elie, pas de celui des artisans : une purge en panne
-- n'est pas un problème que l'artisan peut résoudre.

-- ─────────────────────────────────────────────────────────────────────────
-- 7. CE QUE L'AUDIT SUPABASE DIT DE CE FICHIER.
-- ─────────────────────────────────────────────────────────────────────────
-- * `rls_enabled_no_policy` sur `purges` — voulu, comme pour `oppositions`.
--   RLS active + zéro politique = tout est refusé aux rôles clients. C'est
--   la formulation la plus stricte qui existe, pas un oubli.
--
-- * `purger()` n'apparaît dans AUCUNE des deux alertes sur les fonctions
--   `security definer`, ni celle d'`anon` ni celle d'`authenticated` —
--   contrairement à `resilier` et `se_desinscrire`, qui doivent y figurer.
--   C'est la confirmation, par un outil qui n'est pas moi, que les quatre
--   `revoke` du point 3 ont bien mordu.

-- ─────────────────────────────────────────────────────────────────────────
-- 8. CE QUI A ÉTÉ MESURÉ, LE 23 SEPTEMBRE 2026.
-- ─────────────────────────────────────────────────────────────────────────
-- Cinq témoins antidatés, dont les deux bords exacts de la limite :
--
--   reçue il y a 4 ans, rien d'autre ................... SUPPRIMÉE
--   reçue il y a 3 ans et 1 jour ....................... SUPPRIMÉE
--   reçue il y a 3 ans moins 1 jour .................... gardée
--   reçue il y a 4 ans, RELANCÉE il y a 2 ans 11 mois .. gardée
--   reçue il y a 4 ans, TRAITÉE il y a 1 mois .......... gardée
--
-- L'avant-dernier et le dernier sont le vrai test. Un `recue_le < now() -
-- 3 years` naïf aurait effacé un client rappelé le mois dernier — c'est
-- le piège que `greatest()` évite, et il ne se voit qu'en le posant.
--
-- Contrôles : les 11 demandes réelles intactes, l'opposition survivante,
-- et un passage journalisé À ZÉRO avant même que les témoins existent.
--
-- CE QUI N'EST PAS ENCORE PROUVÉ : que pg_cron DÉCLENCHE la fonction tout
-- seul. La fonction est juste ; le planificateur, lui, n'a pas encore
-- tourné. La case D6 attend la première ligne écrite sans moi, cette nuit
-- à 03h15 UTC. Le journal a été vidé exprès pour que cette ligne-là soit
-- la première — les deux passages d'essai auraient laissé croire à une
-- purge réelle qui n'a jamais eu lieu.
