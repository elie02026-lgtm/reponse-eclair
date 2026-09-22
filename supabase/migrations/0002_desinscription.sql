-- ═════════════════════════════════════════════════════════════════════════
-- Désinscription des relances (cahier, groupe D, case D5)
--
--   « Lien de désinscription dans les SMS de relance
--     + liste d'opposition durable »
--
-- Aujourd'hui les relances partent sans aucun moyen de s'y soustraire.
-- Ce n'est pas un détail de confort : c'est ce qui manque pour facturer.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Un jeton par demande, pour que le lien ne soit pas devinable.
-- ─────────────────────────────────────────────────────────────────────────
-- On NE met PAS l'e-mail ni l'id dans l'URL : avec un id numérique,
-- n'importe qui désinscrirait tout le monde en comptant de 1 à 1000.
-- `gen_random_uuid()` est volatile : chaque ligne existante reçoit sa
-- propre valeur au moment de l'ajout de la colonne, pas une valeur commune.
alter table demandes
  add column if not exists jeton uuid not null default gen_random_uuid();

-- ─────────────────────────────────────────────────────────────────────────
-- 2. La liste d'opposition. Le mot « durable » du cahier est le point clé.
-- ─────────────────────────────────────────────────────────────────────────
-- Elle est SÉPARÉE de `demandes`, et volontairement sans clé étrangère.
-- Si la demande est supprimée un jour — par l'artisan, ou par la purge de
-- conservation à venir — l'opposition doit SURVIVRE. Sinon on effacerait
-- le refus en même temps que la trace, et on relancerait à nouveau
-- quelqu'un qui a dit non. C'est exactement ce que la loi interdit.
create table if not exists oppositions (
  email     text primary key,
  cree_le   timestamptz not null default now(),
  origine   text                       -- d'où vient le refus : 'relance', ...
);

-- Personne n'y touche depuis le navigateur. Aucune politique n'est créée :
-- RLS active + zéro politique = tout est refusé, sauf à la clé de service.
-- L'écriture passe uniquement par la fonction ci-dessous.
alter table oppositions enable row level security;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. La fonction appelée par la page publique.
-- ─────────────────────────────────────────────────────────────────────────
-- `security definer` : elle s'exécute avec les droits de son propriétaire,
-- ce qui lui permet d'écrire dans `oppositions` alors que l'appelant
-- anonyme n'a aucun droit dessus. C'est la seule porte, et elle est étroite :
-- elle n'accepte qu'un jeton, et ne rend que l'e-mail correspondant.
--
-- `set search_path = ''` : sans ça, un search_path détourné pourrait faire
-- pointer `demandes` vers une autre table. Obligatoire sur toute fonction
-- security definer.
create or replace function se_desinscrire(p_jeton uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select d.email into v_email
  from public.demandes d
  where d.jeton = p_jeton;

  -- Jeton inconnu, ou demande sans e-mail : on ne dit rien de plus.
  -- Répondre « ce jeton n'existe pas » laisserait deviner lesquels existent.
  if v_email is null then
    return null;
  end if;

  insert into public.oppositions (email, origine)
  values (v_email, 'relance')
  on conflict (email) do nothing;   -- se désinscrire deux fois n'est pas une erreur

  return v_email;
end;
$$;

revoke all on function se_desinscrire(uuid) from public;
grant execute on function se_desinscrire(uuid) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. La vue que la relance doit lire à la place de la table.
-- ─────────────────────────────────────────────────────────────────────────
-- PostgREST ne sait pas exprimer « sauf ceux qui figurent dans une autre
-- table ». On met donc la règle en base, là où elle ne peut pas être
-- oubliée par un filtre mal recopié dans Make.
create or replace view demandes_a_relancer as
  select d.id, d.prenom, d.email, d.recue_le, d.jeton
  from public.demandes d
  where d.statut = 'a_rappeler'
    and d.relance_sms_le is null
    and d.email is not null
    and not exists (
      select 1 from public.oppositions o where o.email = d.email
    );

-- La relance tourne avec la clé de service, qui ignore la RLS.
-- On ne donne la lecture à personne d'autre.
revoke all on demandes_a_relancer from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Ce que l'audit de sécurité Supabase signale ici, et pourquoi on garde.
-- ─────────────────────────────────────────────────────────────────────────
-- Le linter lève trois alertes sur ce fichier. Les trois sont voulues.
-- C'est écrit ici pour que personne — moi compris dans trois semaines — ne
-- les « corrige » en croyant à un oubli.
--
-- * rls_enabled_no_policy sur `oppositions`
--   RLS activée + zéro politique = tout est refusé aux rôles clients.
--   C'est la formulation la plus stricte qui existe, pas un oubli.
--   Vérifié : lecture anonyme -> [], écriture anonyme -> 42501.
--
-- * anon/authenticated peuvent exécuter `se_desinscrire`, en security definer
--   C'est l'objet même d'un lien de désinscription : il doit fonctionner
--   sans compte. La fonction est étroite — elle n'accepte qu'un uuid, ne
--   rend que l'e-mail correspondant, et n'écrit que dans `oppositions`.
--   Un jeton se devine dans un espace de 2^122 : la force brute n'est pas
--   une menace ici.
--
-- Le quatrième point de l'audit, lui, est à traiter et ne se règle pas en
-- SQL : « Leaked Password Protection Disabled ». À activer dans les
-- réglages Auth du tableau de bord Supabase.
