-- ════════════════════════════════════════════════════════════════════════
-- 0012 — NE JAMAIS ENVOYER UN ARTISAN VERS UN NUMÉRO QUI N'EXISTE PAS
-- ════════════════════════════════════════════════════════════════════════
--
-- Écrite le 28 septembre 2026. NON APPLIQUÉE : Elie doit lire ce SQL d'abord.
--
-- ───────────────────────────────────────────────────────────────────────
-- CE QUI EST ARRIVÉ, ET QUI N'ÉTAIT PAS UNE HYPOTHÈSE
-- ───────────────────────────────────────────────────────────────────────
-- Le 28 septembre au matin, `artisans.numero_twilio` valait `+33939031234`
-- sur trois fiches. Ce numéro n'est provisionné chez personne : je l'avais
-- écrit à la main pour qu'Elie puisse voir l'écran des codes de renvoi.
--
-- Pendant ce temps, `RenvoiAppel.tsx` affichait, en gros et en monospace :
--
--     **61*0939031234*11*20#
--
-- Un artisan qui compose ce code renvoie ses appels non décrochés vers le
-- vide. Et comme la messagerie vocale d'un opérateur EST un renvoi posé au
-- même endroit, il perd AUSSI son répondeur. Rien à l'écran ne le prévient,
-- et l'opérateur répond « Service activé ». Le premier signe serait un
-- client qui appelle pour dire qu'il n'a jamais pu laisser de message.
--
-- La règle : un numéro présent en base ne prouve pas qu'il fonctionne.
-- Il faut une AFFIRMATION EXPLICITE, écrite par nous, jamais déduite.
--
-- ═══════════════════════════════════════════════════════════════════════
-- 1. LE DRAPEAU
-- ═══════════════════════════════════════════════════════════════════════
--
-- Booléen et non date de vérification : on veut répondre à une seule
-- question — « peut-on afficher les codes ? » — et une date obligerait
-- chaque lecteur à décider lui-même de son sens. Si un jour on veut savoir
-- DEPUIS QUAND, on ajoutera une colonne, sans toucher à celle-ci.
--
-- `default false` : les trois fiches existantes deviennent donc inactives,
-- ce qui est la vérité — aucun numéro n'est provisionné aujourd'hui.
alter table public.artisans
  add column if not exists numero_actif boolean not null default false;

comment on column public.artisans.numero_actif is
  'Le numero a ete provisionne ET verifie par nous. Jamais ecrit par l''artisan.';

-- On ne peut pas être actif sans numéro. Sans cette contrainte, deux
-- écritures dans le mauvais ordre laisseraient un état qui affiche des
-- codes composés sur `null`.
--
-- Pas de piège de NULL ici : `numero_actif` est NOT NULL, donc le CHECK
-- s'évalue toujours à vrai ou faux, jamais à NULL. (Un CHECK qui vaut NULL
-- PASSE — c'est ce qui avait failli nous avoir sur `montant_signe`.)
alter table public.artisans
  drop constraint if exists artisans_numero_actif_exige_un_numero;

alter table public.artisans
  add constraint artisans_numero_actif_exige_un_numero
  check (numero_actif = false or numero_twilio is not null);

-- ═══════════════════════════════════════════════════════════════════════
-- 2. L'ARTISAN NE DOIT PAS POUVOIR LEVER LE DRAPEAU LUI-MÊME
-- ═══════════════════════════════════════════════════════════════════════
--
-- Sinon le garde-fou ne garde rien : la politique RLS d'`artisans` autorise
-- `update` sur SA PROPRE LIGNE, sans distinguer les colonnes. Avec la clé
-- publiable déjà présente dans la page, un `PATCH /artisans?id=eq.<le sien>`
-- portant `{"numero_actif": true}` passerait.
--
-- ATTENTION — LE PIÈGE MESURÉ LE 28 SEPTEMBRE, en transaction annulée :
--
--   revoke update (numero_actif) ... from authenticated  → IL PEUT ENCORE
--   revoke update ... + grant update (colonnes) ...      → il ne peut plus
--
-- Un REVOKE au niveau COLONNE ne retire rien tant que le privilège existe
-- au niveau TABLE : PostgreSQL considère que `UPDATE` sur la table couvre
-- toutes les colonnes, présentes et futures. Il faut donc retirer le
-- privilège de table, puis le rendre colonne par colonne.
--
-- Conséquence à ne pas oublier : TOUTE COLONNE AJOUTÉE PLUS TARD sera
-- interdite à l'artisan par défaut. C'est le bon sens de la règle, mais il
-- faudra penser à l'ajouter ici le jour où une nouvelle colonne doit être
-- modifiable depuis les Réglages.
revoke update on public.artisans from authenticated;
grant  update (entreprise, metier, code_postal, zone_minutes, message_sms)
  on public.artisans to authenticated;

-- Même raisonnement à l'insertion : `Onboarding.tsx` crée la fiche, et
-- pourrait y glisser `numero_actif: true` au moment de la création.
-- Les six colonnes ci-dessous sont EXACTEMENT celles que l'insertion
-- d'`Onboarding.tsx` nomme ; `code` et `cree_le` se remplissent par défaut.
revoke insert on public.artisans from authenticated;
grant  insert (id, entreprise, metier, code_postal, zone_minutes, message_sms)
  on public.artisans to authenticated;

-- `anon` n'est pas traité ici, et ce n'est pas un oubli : aucune politique
-- RLS d'`artisans` ne s'applique à lui (elles comparent toutes à
-- `auth.uid()`, qui est NULL pour anon), donc il ne franchit jamais la
-- porte, quels que soient ses privilèges de table. Le formulaire public
-- passe par la fonction `artisan_public`, pas par la table.
--
-- `service_role` garde tout : c'est le rôle par lequel NOUS activerons un
-- numéro, une fois qu'il aura été acheté, configuré chez Twilio, et qu'un
-- appel d'essai aura vraiment déclenché le SMS.

-- ═══════════════════════════════════════════════════════════════════════
-- 3. CE QU'IL FAUT VOIR APRÈS APPLICATION
-- ═══════════════════════════════════════════════════════════════════════
--
--   select entreprise, numero_twilio, numero_actif from public.artisans;
--   -- attendu : trois lignes, numero_twilio null, numero_actif false
--
--   select has_column_privilege('authenticated','public.artisans','numero_actif','UPDATE');
--   -- attendu : false
--   select has_column_privilege('authenticated','public.artisans','numero_twilio','UPDATE');
--   -- attendu : false
--   select has_column_privilege('authenticated','public.artisans','message_sms','UPDATE');
--   -- attendu : true   ← sinon les Réglages ne s'enregistrent plus
--
-- Et la contrainte doit refuser ceci :
--   update public.artisans set numero_actif = true where numero_twilio is null;
--   -- attendu : violation de artisans_numero_actif_exige_un_numero
