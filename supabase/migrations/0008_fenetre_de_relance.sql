-- ═════════════════════════════════════════════════════════════════════════
-- La fenêtre d'envoi : on ne relance pas le dimanche ni un jour férié
--
-- Les réseaux mobiles français mettent en file les SMS marketing envoyés le
-- dimanche, la nuit et les jours fériés (Twilio, « Limitations on sending
-- SMS from French mobile numbers »). Le SMS qui répond à un appel manqué
-- est transactionnel et passe ; la RELANCE à J+2, elle, est discutable.
--
-- Elie a tranché le 23 septembre, et son argument n'est pas juridique :
-- « aucun des deux ne fera l'effort, c'est trop tard de toute façon, et au
-- contraire ça promet le respect des clients ». Une relance qui arrive un
-- dimanche à 23 h ne rapporte rien et coûte l'image de l'artisan.
--
-- La fenêtre : lundi–samedi, 9 h–19 h, heure de Paris, hors jours fériés.
-- Le samedi est ouvert — pour un plombier et pour son client, c'est un jour
-- de travail.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. POURQUOI LA RÈGLE EST ICI ET PAS DANS LA PLANIFICATION DE MAKE.
-- ─────────────────────────────────────────────────────────────────────────
-- Make sait restreindre un scénario à certains jours et à une plage
-- horaire. Il ne sait pas ce qu'est le lundi de Pentecôte.
--
-- Et la migration 0002 avait déjà tranché ce débat pour la liste
-- d'opposition : « on met la règle en base, là où elle ne peut pas être
-- oubliée par un filtre mal recopié dans Make ». Un enregistrement depuis
-- un onglet périmé a effacé quatre filtres le 22 septembre ; ce qui vit
-- dans la vue n'a pas ce problème.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Les jours fériés, en données plutôt qu'en code.
-- ─────────────────────────────────────────────────────────────────────────
-- Quatre des onze fériés français dépendent de Pâques. Les calculer en SQL
-- voudrait dire écrire l'algorithme de Meeus une SECONDE fois, à côté de
-- celui de `src/lib/heures.ts` — et deux implémentations d'une même règle
-- finissent toujours par diverger.
--
-- Une seule implémentation, donc : celle de TypeScript, testée sur des
-- années dont la date de Pâques est publiée (2000, 2024, 2025). Les lignes
-- ci-dessous en sortent, et `src/lib/heures.test.ts` RELIT CE FICHIER pour
-- vérifier qu'aucune date n'a été retouchée à la main.
--
-- Quinze ans d'avance. Le jour où 2040 approche, le test ne dira rien —
-- c'est la limite connue de ce dispositif, et elle est écrite ici :
--
--   select max(jour) from jours_feries;   -- doit rester loin devant
create table if not exists jours_feries (
  jour date primary key
);

alter table jours_feries enable row level security;
-- RLS active + zéro politique = refusé à tout le monde sauf à la clé de
-- service, qui est la seule à lire la vue. Même formulation que
-- `oppositions` et `purges`.

insert into jours_feries (jour) values
  ('2026-01-01'), ('2026-04-06'), ('2026-05-01'), ('2026-05-08'), ('2026-05-14'), ('2026-05-25'), ('2026-07-14'), ('2026-08-15'), ('2026-11-01'), ('2026-11-11'), ('2026-12-25'),
  ('2027-01-01'), ('2027-03-29'), ('2027-05-01'), ('2027-05-06'), ('2027-05-08'), ('2027-05-17'), ('2027-07-14'), ('2027-08-15'), ('2027-11-01'), ('2027-11-11'), ('2027-12-25'),
  ('2028-01-01'), ('2028-04-17'), ('2028-05-01'), ('2028-05-08'), ('2028-05-25'), ('2028-06-05'), ('2028-07-14'), ('2028-08-15'), ('2028-11-01'), ('2028-11-11'), ('2028-12-25'),
  ('2029-01-01'), ('2029-04-02'), ('2029-05-01'), ('2029-05-08'), ('2029-05-10'), ('2029-05-21'), ('2029-07-14'), ('2029-08-15'), ('2029-11-01'), ('2029-11-11'), ('2029-12-25'),
  ('2030-01-01'), ('2030-04-22'), ('2030-05-01'), ('2030-05-08'), ('2030-05-30'), ('2030-06-10'), ('2030-07-14'), ('2030-08-15'), ('2030-11-01'), ('2030-11-11'), ('2030-12-25'),
  ('2031-01-01'), ('2031-04-14'), ('2031-05-01'), ('2031-05-08'), ('2031-05-22'), ('2031-06-02'), ('2031-07-14'), ('2031-08-15'), ('2031-11-01'), ('2031-11-11'), ('2031-12-25'),
  ('2032-01-01'), ('2032-03-29'), ('2032-05-01'), ('2032-05-06'), ('2032-05-08'), ('2032-05-17'), ('2032-07-14'), ('2032-08-15'), ('2032-11-01'), ('2032-11-11'), ('2032-12-25'),
  ('2033-01-01'), ('2033-04-18'), ('2033-05-01'), ('2033-05-08'), ('2033-05-26'), ('2033-06-06'), ('2033-07-14'), ('2033-08-15'), ('2033-11-01'), ('2033-11-11'), ('2033-12-25'),
  ('2034-01-01'), ('2034-04-10'), ('2034-05-01'), ('2034-05-08'), ('2034-05-18'), ('2034-05-29'), ('2034-07-14'), ('2034-08-15'), ('2034-11-01'), ('2034-11-11'), ('2034-12-25'),
  ('2035-01-01'), ('2035-03-26'), ('2035-05-01'), ('2035-05-03'), ('2035-05-08'), ('2035-05-14'), ('2035-07-14'), ('2035-08-15'), ('2035-11-01'), ('2035-11-11'), ('2035-12-25'),
  ('2036-01-01'), ('2036-04-14'), ('2036-05-01'), ('2036-05-08'), ('2036-05-22'), ('2036-06-02'), ('2036-07-14'), ('2036-08-15'), ('2036-11-01'), ('2036-11-11'), ('2036-12-25'),
  ('2037-01-01'), ('2037-04-06'), ('2037-05-01'), ('2037-05-08'), ('2037-05-14'), ('2037-05-25'), ('2037-07-14'), ('2037-08-15'), ('2037-11-01'), ('2037-11-11'), ('2037-12-25'),
  ('2038-01-01'), ('2038-04-26'), ('2038-05-01'), ('2038-05-08'), ('2038-06-03'), ('2038-06-14'), ('2038-07-14'), ('2038-08-15'), ('2038-11-01'), ('2038-11-11'), ('2038-12-25'),
  ('2039-01-01'), ('2039-04-11'), ('2039-05-01'), ('2039-05-08'), ('2039-05-19'), ('2039-05-30'), ('2039-07-14'), ('2039-08-15'), ('2039-11-01'), ('2039-11-11'), ('2039-12-25'),
  ('2040-01-01'), ('2040-04-02'), ('2040-05-01'), ('2040-05-08'), ('2040-05-10'), ('2040-05-21'), ('2040-07-14'), ('2040-08-15'), ('2040-11-01'), ('2040-11-11'), ('2040-12-25')
on conflict (jour) do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. La vue, qui se tait hors de la fenêtre.
-- ─────────────────────────────────────────────────────────────────────────
-- Le scénario « Relance quotidienne » lit `/rest/v1/demandes_a_relancer`
-- (module 4, vérifié dans le blueprint). Hors fenêtre, la vue ne rend rien,
-- le scénario ne trouve rien, et la relance repart d'elle-même au prochain
-- passage. Aucune demande n'est perdue : `relance_sms_le` reste nul tant
-- que l'e-mail n'est pas parti.
--
-- `at time zone 'Europe/Paris'` fait le travail des changements d'heure.
-- On ne compare JAMAIS des heures UTC : en été le décalage est de deux
-- heures, et une fenêtre calculée en UTC s'ouvrirait à 11 h de Paris six
-- mois par an sans que personne ne s'en aperçoive.
create or replace view demandes_a_relancer as
  select d.id, d.prenom, d.email, d.recue_le, d.jeton
  from public.demandes d
  where d.statut = 'a_rappeler'
    and d.relance_sms_le is null
    and d.email is not null
    and not exists (
      select 1 from public.oppositions o where o.email = d.email
    )
    -- Dimanche fermé. `isodow` rend 7 pour dimanche, jamais 0 : avec
    -- `dow`, dimanche vaut 0 et un `<> 7` mal recopié ne filtrerait rien.
    and extract(isodow from (now() at time zone 'Europe/Paris')) <> 7
    -- Jours fériés fermés.
    and not exists (
      select 1 from public.jours_feries f
      where f.jour = (now() at time zone 'Europe/Paris')::date
    )
    -- 9 h–19 h. `between 9 and 18` = de 9 h 00 à 18 h 59 inclus.
    and extract(hour from (now() at time zone 'Europe/Paris')) between 9 and 18;

revoke all on demandes_a_relancer from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. CE QUE CETTE MIGRATION NE FAIT PAS : ELLE NE TOUCHE PAS À MAKE.
-- ─────────────────────────────────────────────────────────────────────────
-- La planification du scénario « Relance quotidienne » tourne sept jours
-- sur sept, à 10 h, dimanche compris. J'ai voulu en retirer le dimanche :
-- cinquante-deux passages à vide par an sur un forfait gratuit de mille
-- opérations mensuelles, ça se remarque.
--
-- Je ne l'ai pas fait, et le calcul est vite fait. Un passage à vide coûte
-- une ou deux opérations : cinquante-deux dimanches, c'est environ cent
-- opérations par an sur les douze mille du forfait. Moins de 1 %.
--
-- En face : `scenarios_update` réécrit le scénario. C'est exactement le
-- geste qui, le 22 septembre, a effacé deux routes `onerror`, quatre
-- `ifempty`, un filtre et le `dlq` du scénario de capture, et coupé la
-- prise d'appels pendant cinq minutes. Le gain ne paie pas le risque.
--
-- La règle vit dans la vue, elle y est complète, et elle n'a pas besoin de
-- Make pour être juste. Le scénario tournera le dimanche et ne trouvera
-- rien : c'est un peu bête, et c'est sans danger.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 5. CE QUI A ÉTÉ MESURÉ, LE 23 SEPTEMBRE 2026 À 19 H 17 (PARIS).
-- ─────────────────────────────────────────────────────────────────────────
-- Onze instants passés au crible du prédicat, directement en base, et
-- comparés un par un au module TypeScript : les quatre bords d'horaire, le
-- samedi contre le dimanche, le 14 juillet contre le 15, le lundi de
-- Pentecôte 2033, et deux instants d'été pour l'heure d'été. Onze fois
-- d'accord.
--
-- Et sur les données réelles, à l'instant où la vue a été posée :
--
--   il était 19 h 17 à Paris — hors fenêtre
--   `demandes_a_relancer`                      → 0
--   les mêmes conditions SANS la fenêtre       → 3
--
-- Sans ce second chiffre, le zéro n'aurait rien prouvé : on n'aurait pas su
-- distinguer une fenêtre qui marche d'une base qui n'a rien à relancer.
