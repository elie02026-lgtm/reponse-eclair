-- 0018 — La promesse de rappel (phase 5 bis)
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE CETTE MIGRATION REND POSSIBLE
-- ─────────────────────────────────────────────────────────────────────────
-- Un client qui a une fuite et qui n'a rien d'autre à faire qu'attendre
-- appelle le plombier suivant. Il part dans les trois minutes.
--
-- Ici, l'artisan touche UN bouton dans son courrier — « dans 15 minutes » —
-- et son client l'apprend. C'est le deuxième principe du projet : garder le
-- client jusqu'au rappel.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA RÈGLE D'OR, ET COMMENT ELLE EST TENUE PAR LA FORME
-- ─────────────────────────────────────────────────────────────────────────
-- « On n'annonce JAMAIS au client un délai que l'artisan n'a pas choisi
-- lui-même. Le système informe ; seul l'artisan s'engage. »
--
-- Rien ici ne part tout seul. Aucun calendrier, aucun déclencheur, aucune
-- règle d'heure. Un seul chemin écrit dans ces colonnes : un POST, derrière
-- un jeton que seule la boîte mail de l'artisan a reçu. Un délai sans son
-- doigt dessus est donc IMPOSSIBLE, pas « non prévu ».
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI UNE SECONDE FONCTION, ET PAS UN AJOUT À `agir_sur_demande`
-- ─────────────────────────────────────────────────────────────────────────
-- `agir_sur_demande` (0014) NE REND JAMAIS DE DONNÉE. C'est sa propriété,
-- elle est vérifiée, et elle est ce qui permet de dire d'un lien d'action
-- qu'il n'ouvre aucune lecture.
--
-- Prévenir quelqu'un exige de savoir OÙ. La fonction ci-dessous rend donc le
-- numéro du client — elle ne peut pas avoir la même propriété. Plutôt que
-- d'affaiblir celle de 0014, on en écrit une seconde, avec son propre
-- contrat. Deux portes, deux promesses tenables. Vérifié : le jeton de
-- « c'est fait » ne promet rien (contrôle C11), et `agir_sur_demande` refuse
-- une opération de promesse (C13).
--
-- CE QUE CE LIEN ÉLARGIT, EN CLAIR : qui a la boîte mail de l'artisan peut
-- obtenir le numéro d'un de ses clients. Ce même numéro est écrit en clair
-- dans le même e-mail, sur le gros bouton « Appeler ». Et la lecture n'a lieu
-- QUE sur un POST : un antivirus de messagerie qui ouvre le lien à la
-- livraison ne voit rien.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. LES DEUX COLONNES
-- ─────────────────────────────────────────────────────────────────────────
-- `promesse` est une LISTE FERMÉE DE MOTS, pas un nombre de minutes.
--
-- « fin de journée » n'est pas une durée. Écrire 420 minutes serait inventer
-- une précision que l'artisan n'a pas donnée, et le reste du logiciel s'en
-- servirait comme d'un fait. On garde le mot qu'il a touché ; le délai exact,
-- personne ne le connaît, et c'est la vérité.
--
-- Même idiome que `statut`, `metier` et les trois réponses à boutons : une
-- contrainte `check` en base, un `LIBELLE_*` dans `src/types.ts`. Si les deux
-- divergent un jour, Postgres refuse l'écriture au lieu de laisser passer une
-- valeur que personne ne sait afficher.
alter table public.demandes
  add column if not exists promesse    text,
  add column if not exists promesse_le timestamptz;

comment on column public.demandes.promesse is
  'Le délai de rappel que l''artisan a CHOISI LUI-MÊME, en touchant un bouton de son e-mail. Liste fermée. NULL tant qu''il ne s''est pas engagé. Rien d''automatique ne l''écrit jamais.';

comment on column public.demandes.promesse_le is
  'Quand il s''est engagé. C''est une date sur LUI, pas sur le client : elle ne dit pas que le message est parti.';

alter table public.demandes
  drop constraint if exists demandes_promesse_connue;
alter table public.demandes
  add constraint demandes_promesse_connue
  check (promesse is null or promesse in ('15min', '1h', 'fin_de_journee'));

-- Une promesse sans date, ou une date sans promesse, n'a pas de sens. La base
-- refuse les deux moitiés orphelines plutôt que de laisser le code s'en
-- souvenir. Même mécanisme que `demandes_correction_datee` (0014).
-- Vérifié, contrôles C02 et C03.
alter table public.demandes
  drop constraint if exists demandes_promesse_datee;
alter table public.demandes
  add constraint demandes_promesse_datee
  check ((promesse is null) = (promesse_le is null));

-- AUCUN DROIT DE COLONNE À ACCORDER, et ce n'est pas un oubli.
--
-- La 0014 avait retiré `update` sur TOUTE la table pour ne rendre que cinq
-- colonnes nommées une à une. Une colonne nouvelle n'entre donc dans aucune
-- liste : l'artisan connecté peut LIRE sa promesse, il ne peut pas l'écrire.
-- C'est exactement ce qu'on veut — seul l'e-mail engage.
-- Vérifié, contrôles D03 (refus, 42501) et D04 (lecture, contrôle positif).

-- ─────────────────────────────────────────────────────────────────────────
-- 2. LA FONCTION
-- ─────────────────────────────────────────────────────────────────────────
-- `security definer` parce que le Worker se présente avec la clé PUBLIABLE,
-- donc en rôle `anon`, à qui la 0016 a tout retiré sur cette table. Il ne
-- peut agir que par cette porte-là, qui ne fait qu'une chose.
--
-- `set search_path = ''` : sans ça, un objet nommé `demandes` dans un schéma
-- que l'appelant contrôle pourrait être exécuté à la place du nôtre. D'où
-- aussi `extensions.digest` en toutes lettres.
create or replace function public.promettre_rappel(
  p_id        bigint,
  p_jeton     text,
  p_operation text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_cle        text;
  v_recue      timestamptz;
  v_delai      text;
  v_ancien     text;
  v_ancien_le  timestamptz;
  v_tel        text;
  v_entreprise text;
begin
  -- Liste blanche. La même vit en TypeScript dans `src/lib/promesse.ts`, et
  -- un test compare les deux empreintes SHA-256 sur une valeur relevée dans
  -- cette base : si l'une des deux dérive un jour, il tombe.
  v_delai := case p_operation
               when 'promesse_15min'          then '15min'
               when 'promesse_1h'             then '1h'
               when 'promesse_fin_de_journee' then 'fin_de_journee'
             end;
  if v_delai is null then
    return jsonb_build_object('resultat', 'operation_inconnue');
  end if;

  select d.cle_action, d.recue_le, d.promesse, d.promesse_le, d.telephone, a.entreprise
    into v_cle, v_recue, v_ancien, v_ancien_le, v_tel, v_entreprise
    from public.demandes d
    join public.artisans a on a.id = d.artisan_id
   where d.id = p_id;

  -- MÊME RÉPONSE pour « n'existe pas » et « pas de clé ». Distinguer les deux
  -- dirait à un curieux quels identifiants existent.
  if not found or v_cle is null then
    return jsonb_build_object('resultat', 'inconnue');
  end if;

  -- QUARANTE-HUIT HEURES, LÀ OÙ LES AUTRES BOUTONS EN ONT TRENTE JOURS.
  --
  -- « Je vous rappelle dans 15 minutes » ne veut rien dire trois semaines
  -- plus tard. Un e-mail reste dans une boîte ; un pouce glisse. Ce délai
  -- court est ce qui empêche d'envoyer un message absurde à quelqu'un dont le
  -- problème est réglé depuis longtemps. Vérifié, contrôle C07 : une demande
  -- de trois jours rend « expire » et n'écrit rien.
  if now() > v_recue + interval '48 hours' then
    return jsonb_build_object('resultat', 'expire');
  end if;

  if encode(extensions.digest(v_cle || ':' || p_operation, 'sha256'), 'hex')
     <> lower(coalesce(p_jeton, '')) then
    return jsonb_build_object('resultat', 'refuse');
  end if;

  -- UN DOUBLE TOUCHER NE REDIT RIEN AU CLIENT.
  --
  -- Même promesse dans l'heure : ON NE RÉÉCRIT PAS L'HORODATAGE. C'est la
  -- date de son engagement, et un toucher accidentel ne doit pas la déplacer.
  -- Un double toucher est à deux secondes du premier ; se raviser pour de
  -- vrai, c'est des heures plus tard — et là, le dernier mot gagne.
  -- Vérifié, contrôles C08 et C09.
  --
  -- ELLE REND QUAND MÊME DE QUOI ENVOYER, et c'est voulu : l'artisan qui
  -- touche deux fois ne sait peut-être pas si son premier message est parti.
  -- Lui refuser le bouton d'envoi au nom de l'idempotence serait protéger la
  -- base contre son client.
  if v_ancien = v_delai and v_ancien_le > now() - interval '1 hour' then
    return jsonb_build_object('resultat', 'inchange', 'delai', v_delai,
                              'telephone', v_tel, 'entreprise', v_entreprise);
  end if;

  update public.demandes
     set promesse = v_delai,
         promesse_le = now()
   where id = p_id;

  -- CE QU'ELLE REND, ET RIEN DE PLUS : le numéro où prévenir, et le nom au
  -- bas du message. Pas le prénom du client, pas sa description, pas son
  -- adresse — le message n'en a pas besoin, et chaque champ rendu est un
  -- champ qu'un lien peut lire.
  return jsonb_build_object(
    'resultat',   'ok',
    'delai',      v_delai,
    'telephone',  v_tel,
    'entreprise', v_entreprise
  );
end
$fn$;

comment on function public.promettre_rappel(bigint, text, text) is
  'Enregistre le délai de rappel que l''artisan a choisi, autorisé par un jeton dérivé de cle_action, et rend de quoi prévenir le client : son numéro et le nom de l''entreprise. Réservée à anon (le Worker). Validité 48 h.';

-- Supabase accorde EXECUTE à tout le monde par défaut sur les fonctions de
-- `public`. On reprend tout, puis on ne rend qu'à `anon` : le seul rôle qui en
-- a besoin, celui sous lequel le Worker se présente.
-- Vérifié, contrôles D01 (anon : ok) et D02 (authenticated : 42501).
revoke all on function public.promettre_rappel(bigint, text, text) from public;
revoke all on function public.promettre_rappel(bigint, text, text) from authenticated;
revoke all on function public.promettre_rappel(bigint, text, text) from service_role;
grant execute on function public.promettre_rappel(bigint, text, text) to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- CE QUI RESTE VRAI APRÈS CETTE MIGRATION, ET QU'IL FAUT ASSUMER
-- ─────────────────────────────────────────────────────────────────────────
-- 1. `promesse_le` dit que l'ARTISAN s'est engagé, pas que le client a reçu
--    quelque chose. Tant que le message part du téléphone de l'artisan, il
--    peut ne pas appuyer sur « Envoyer » : la base enregistrerait alors un
--    engagement que personne n'a entendu. C'est pour ça que l'écran écrit
--    « vous avez dit » et jamais « votre client sait ». Le jour où le Worker
--    enverra lui-même par Twilio, une colonne `promesse_envoyee_le` aura
--    enfin un sens — pas avant.
-- 2. La relance quotidienne IGNORE la promesse. Elle part deux jours après
--    réception si la demande est encore « à rappeler » (vue
--    `demandes_a_relancer`, migration 0008). Promettre hier et ne pas appeler
--    n'empêchera pas le client de recevoir le courriel de relance. Ce n'est
--    pas un oubli : c'est une ligne à ajouter à cette vue le jour où ça gêne,
--    et toucher à la relance dans la même migration mêlerait deux risques.
-- 3. La comparaison du jeton n'est pas à temps constant, et les liens ne sont
--    pas à usage unique. Mêmes raisons qu'en 0014 : sur 64 caractères
--    hexadécimaux à travers le réseau l'attaque n'est pas praticable, et
--    l'opération est idempotente.
