-- ═════════════════════════════════════════════════════════════════════════
-- Déposer une demande : la porte d'entrée, enfin nommée
--
-- Jusqu'ici le formulaire était un Tally, et la chaîne y insérait avec un
-- `artisan_id` ÉCRIT EN DUR. Deux conséquences, toujours les mêmes : un
-- deuxième artisan est impossible, et la vue `artisans_contact` ne peut pas
-- être branchée.
--
-- La migration 0007 a posé le code court. Celle-ci pose les deux fonctions
-- qui s'en servent :
--
--   `artisan_public(code)` — ce que la page du formulaire a le droit de
--     montrer à un inconnu : le nom de l'entreprise, rien d'autre.
--   `deposer_demande(...)` — l'insertion, qui résout l'artisan à partir du
--     code au lieu de le recevoir tout fait.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Où va une demande dont on ne sait pas à qui elle appartient.
-- ─────────────────────────────────────────────────────────────────────────
-- La règle C1 du cahier — « aucun lead n'est perdu si une étape échoue » —
-- passe avant la justesse de l'attribution. Un code absent, mal recopié ou
-- effacé par un client qui nettoie son lien ne doit pas faire disparaître
-- quelqu'un qui a pris le temps d'écrire.
--
-- On ne rend donc PAS `demandes.artisan_id` nullable : ce serait affaiblir
-- la clé sur laquelle repose toute la séparation entre artisans, pour un
-- cas rare. Les orphelines vivent à côté, avec leur charge utile brute, et
-- Elie les rattache à la main.
create table if not exists demandes_orphelines (
  id        bigserial primary key,
  recue_le  timestamptz not null default now(),
  code_recu text,                 -- ce qui est arrivé, même illisible
  charge    jsonb not null,       -- tout le reste, tel quel
  traitee   boolean not null default false
);

alter table demandes_orphelines enable row level security;
-- RLS active + zéro politique : refusé à tous les rôles clients. Seule la
-- clé de service y accède. Même formulation que `oppositions` et `purges`.

comment on table demandes_orphelines is
  'Demandes arrivées sans code d''artisan exploitable. Conservées telles quelles plutôt que perdues ; à rattacher à la main.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Ce qu'un inconnu peut lire.
-- ─────────────────────────────────────────────────────────────────────────
-- La page du formulaire doit pouvoir écrire « Vous avez appelé Plomberie
-- Test » — sinon le visiteur ne sait pas où il a atterri, et un formulaire
-- anonyme ne se remplit pas.
--
-- Cette fonction est donc ouverte à `anon`, et c'est pour ça qu'elle ne rend
-- QUE le nom et le métier. Ni l'identifiant, ni le numéro attribué, ni le
-- code postal, ni le message SMS. Un code deviné ne donne rien de plus que
-- ce qui est déjà écrit dans le SMS que son porteur a reçu.
create or replace function artisan_public(p_code text)
returns table (entreprise text, metier text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.entreprise, a.metier
  from public.artisans a
  where a.code = upper(btrim(p_code));
$$;

revoke all    on function artisan_public(text) from public;
revoke all    on function artisan_public(text) from service_role;
grant  execute on function artisan_public(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Le dépôt.
-- ─────────────────────────────────────────────────────────────────────────
-- ELLE N'EST PAS OUVERTE AU NAVIGATEUR, et c'est une décision.
--
-- La page du formulaire n'écrit pas dans la base : elle envoie au webhook
-- Make, qui appelle cette fonction avec la clé de service. C'est plus long
-- à dessiner et ça évite qu'une URL publique permette d'insérer des lignes
-- dans la base de quelqu'un. Le jour où on voudra s'affranchir de Make, il
-- faudra d'abord répondre à la question « qu'est-ce qui empêche un robot
-- d'en poster mille ? » — et on ne l'a pas fait.
create or replace function deposer_demande(
  p_code         text,
  p_prenom       text default null,
  p_telephone    text default null,
  p_email        text default null,
  p_lieu         text default null,
  p_besoin       text default null,
  p_urgence_dite text default null
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_artisan uuid;
  v_id      bigint;
begin
  select a.id into v_artisan
  from public.artisans a
  where a.code = upper(btrim(coalesce(p_code, '')));

  -- Code inconnu : on garde tout, on ne rend rien. L'appelant saura que
  -- c'est orphelin parce qu'il reçoit `null` au lieu d'un identifiant.
  if v_artisan is null then
    insert into public.demandes_orphelines (code_recu, charge)
    values (
      p_code,
      jsonb_build_object(
        'prenom', p_prenom, 'telephone', p_telephone, 'email', p_email,
        'lieu', p_lieu, 'besoin', p_besoin, 'urgence_dite', p_urgence_dite
      )
    );
    return null;
  end if;

  insert into public.demandes
    (artisan_id, prenom, telephone, email, lieu, besoin, urgence_dite)
  values
    (v_artisan, p_prenom, p_telephone, p_email, p_lieu, p_besoin, p_urgence_dite)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all    on function deposer_demande(text, text, text, text, text, text, text) from public;
revoke all    on function deposer_demande(text, text, text, text, text, text, text) from anon;
revoke all    on function deposer_demande(text, text, text, text, text, text, text) from authenticated;
-- `service_role` garde son droit : c'est Make qui appelle, avec la clé de
-- service. Leçon de la migration 0005 : Supabase accorde nommément EXECUTE
-- à anon, authenticated et service_role sur toute fonction du schéma
-- `public`. Il faut nommer ceux qu'on retire, et vérifier `proacl` ensuite.

comment on function deposer_demande(text, text, text, text, text, text, text) is
  'Dépose une demande en résolvant l''artisan par son code court. Rend l''identifiant créé, ou NULL si le code est inconnu — la demande part alors dans demandes_orphelines. Réservée à la clé de service.';

-- ─────────────────────────────────────────────────────────────────────────
-- 4. CE QUI RESTE À FAIRE, ET QUI N'EST PAS ICI.
-- ─────────────────────────────────────────────────────────────────────────
-- Le module 5 du scénario de capture insère TOUJOURS en dur. Cette
-- migration pose la porte ; la brancher veut dire réécrire ce module pour
-- qu'il appelle `/rest/v1/rpc/deposer_demande` au lieu de `/rest/v1/demandes`,
-- et c'est un changement de blueprint — donc avec Elie devant l'écran.
--
-- Rien n'alerte non plus sur une orpheline. Tant qu'il n'y a qu'un artisan,
-- le cas ne peut pas se produire ; le jour où il y en a deux, il faudra une
-- ligne de plus dans l'écran de santé.
