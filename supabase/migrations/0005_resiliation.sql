-- ═════════════════════════════════════════════════════════════════════════
-- Résilier : suppression réelle du compte et des données
-- (cahier, case B4 « résilier et récupérer ses données » ; case D3
--  « suppression réelle des données »)
--
-- L'export existait depuis longtemps — la moitié « récupérer ». La moitié
-- « résilier » n'existait pas, et la politique de confidentialité promettait
-- déjà un effacement que personne ne savait exécuter.
--
-- Elie a tranché le 23 septembre : suppression IMMÉDIATE, sans délai de
-- grâce, confirmée en tapant le nom de l'entreprise. Pas de corbeille, pas
-- de compte « désactivé » qui garderait tout en silence pendant trente jours.
-- Ce que le RGPD attend, et ce qu'un artisan comprend sans explication.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Pourquoi UNE SEULE ligne suffit à tout effacer.
-- ─────────────────────────────────────────────────────────────────────────
-- Vérifié dans le catalogue de la base de production, pas déduit des
-- fichiers de migration :
--
--   public.demandes.artisan_id -> public.artisans   ON DELETE CASCADE
--   public.artisans.id         -> auth.users        ON DELETE CASCADE
--
-- Supprimer la ligne d'`auth.users` fait donc tomber la fiche artisan, puis
-- toutes ses demandes. Les tables internes de Supabase Auth (sessions,
-- identities, refresh tokens, one_time_tokens…) sont elles aussi en CASCADE :
-- le compte ne peut plus se reconnecter, il n'est pas seulement vidé.
--
-- Aucun trigger non interne n'est posé sur auth.users (vérifié) : rien ne
-- s'exécute derrière notre dos au moment du DELETE.

-- ─────────────────────────────────────────────────────────────────────────
-- 2. La fonction.
-- ─────────────────────────────────────────────────────────────────────────
-- `security definer` : la fonction appartient à `postgres`, qui a le droit
-- DELETE sur auth.users (vérifié) alors que le rôle `authenticated` ne l'a
-- pas. C'est indispensable — et c'est aussi ce qui rend cette fonction la
-- plus dangereuse du projet. D'où les deux garde-fous :
--
--   • L'identité NE VIENT PAS D'UN PARAMÈTRE. Elle vient de `auth.uid()`,
--     c'est-à-dire du jeton signé. On ne peut donc pas l'orienter vers un
--     autre compte : il n'existe aucun argument pour désigner une victime.
--
--   • La confirmation est vérifiée EN BASE, pas dans le navigateur. Un bouton
--     grisé côté React n'est qu'une politesse ; ici, un appel direct à
--     l'API avec un mauvais texte est refusé par Postgres.
--
-- `set search_path = ''` : obligatoire sur toute fonction security definer,
-- sinon un search_path détourné ferait pointer `artisans` ailleurs.
create or replace function resilier(p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id         uuid := auth.uid();
  v_entreprise text;
  v_demandes   int;
begin
  if v_id is null then
    raise exception 'Il faut être connecté pour résilier.' using errcode = '28000';
  end if;

  select a.entreprise into v_entreprise
  from public.artisans a
  where a.id = v_id;

  if v_entreprise is null then
    raise exception 'Aucune fiche artisan n''est rattachée à ce compte.'
      using errcode = 'P0002';
  end if;

  -- Comparaison insensible à la casse et aux espaces de bord. Le but d'une
  -- confirmation tapée est de prouver l'intention, pas de piéger quelqu'un
  -- dont le clavier de téléphone met une majuscule automatique. La règle
  -- est la même côté écran : voir src/lib/resiliation.ts, qui la teste.
  if lower(btrim(p_confirmation)) is distinct from lower(btrim(v_entreprise)) then
    raise exception 'Le nom saisi ne correspond pas à celui de l''entreprise.'
      using errcode = 'P0001';
  end if;

  -- Compté AVANT le delete : après, il n'y a plus rien à compter, et
  -- l'artisan a le droit de savoir ce qu'il vient de perdre.
  select count(*) into v_demandes
  from public.demandes d
  where d.artisan_id = v_id;

  delete from auth.users u where u.id = v_id;

  return jsonb_build_object('entreprise', v_entreprise, 'demandes', v_demandes);
end;
$$;

-- L'ORDRE DE CES TROIS LIGNES N'EST PAS DÉCORATIF. Voir le point 3.
revoke all    on function resilier(text) from public;
revoke execute on function resilier(text) from anon;
grant  execute on function resilier(text) to authenticated;

comment on function resilier(text) is
  'Supprime définitivement le compte connecté et, par cascade, sa fiche artisan et toutes ses demandes. Exige le nom exact de l''entreprise en confirmation. Irréversible.';

-- ─────────────────────────────────────────────────────────────────────────
-- 3. LE PIÈGE QUI A FAILLI PASSER : `revoke ... from public` NE SUFFIT PAS.
-- ─────────────────────────────────────────────────────────────────────────
-- Première version de ce fichier : `revoke all ... from public` puis
-- `grant execute ... to authenticated`. Cela paraît étanche. Ça ne l'est pas.
--
-- Supabase pose des DEFAULT PRIVILEGES sur le schéma `public` : toute
-- fonction qui y est créée reçoit immédiatement un GRANT EXECUTE DIRECT à
-- `anon`, `authenticated` et `service_role`. Un révoque adressé à PUBLIC ne
-- retire pas un droit accordé nommément à `anon` — ce sont deux choses
-- différentes, et l'ACL le montre :
--
--   avant :  {postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, …}
--   après :  {postgres=X/postgres,                  authenticated=X/postgres, …}
--
-- Mesuré, pas supposé : avec la première version, un appel effectué sous le
-- rôle `anon` a bel et bien supprimé un compte témoin. Après le revoke
-- nommé, le même appel rend « 42501: permission denied for function
-- resilier ». C'est ce contrôle négatif qui fait foi, pas la lecture du
-- fichier.
--
-- Portée réelle de la faille : PostgREST choisit le rôle d'après le jeton,
-- et un jeton anonyme ne porte pas de `sub`, donc `auth.uid()` était nul et
-- la fonction refusait de toute façon. Il fallait forger un jeton — donc
-- connaître le secret — pour en profiter. Le trou était fermé par une
-- seconde serrure ; il était quand même ouvert, et une fonction qui
-- supprime des comptes n'a droit qu'à des serrures fermées.
--
-- À retenir pour toute fonction future : vérifier `proacl` dans `pg_proc`
-- après création, et ne jamais croire un `revoke from public`.
--
-- Confirmation indépendante : l'audit de sécurité Supabase liste bien
-- `se_desinscrire` sous « anon peut exécuter » — c'est voulu, un lien de
-- désinscription doit marcher sans compte — et n'y liste PAS `resilier`.

-- ─────────────────────────────────────────────────────────────────────────
-- 4. CE QUI SURVIT, ET POURQUOI CE N'EST PAS UN OUBLI.
-- ─────────────────────────────────────────────────────────────────────────
-- `public.oppositions` n'a délibérément aucune clé étrangère (voir la
-- migration 0002). Les refus de relance SURVIVENT à la résiliation.
--
-- C'est volontaire et c'est le sens de la loi : si l'on effaçait le refus
-- en même temps que la trace, quelqu'un qui a dit « ne me recontactez plus »
-- redeviendrait relançable le jour où son adresse réapparaît. On conserve
-- donc une adresse e-mail — le strict minimum — pour pouvoir continuer à
-- ne rien lui envoyer.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 5. CE QUE CETTE FONCTION NE SAIT PAS EFFACER. À DIRE, PAS À CACHER.
-- ─────────────────────────────────────────────────────────────────────────
-- La case D3 du cahier dit « suppression réelle des données ». En base,
-- c'est fait. Hors base, il reste trois endroits que du SQL ne touche pas :
--
--   • Make — journaux d'exécution et exécutions incomplètes (dlq). Ils
--     contiennent les champs du formulaire.
--   • Gmail — les e-mails d'alerte et de relance déjà envoyés.
--   • Google Gemini — les descriptions envoyées pour classement.
--
-- Tant que ces trois-là ne sont pas traités, D3 n'est pas acquise, et la
-- page /confidentialite ne doit pas promettre davantage que ce qui est
-- exécutable. C'est écrit ici pour que cette limite ne se perde pas.
--
-- ─────────────────────────────────────────────────────────────────────────
-- 6. UN PIÈGE, TANT QUE LA CHAÎNE MAKE EST CÂBLÉE EN DUR.
-- ─────────────────────────────────────────────────────────────────────────
-- Le module 5 du scénario de capture insère les demandes avec un
-- `artisan_id` ÉCRIT EN DUR (le compte Plomberie Test). Le jour où ce
-- compte-là est résilié, la capture tombe en erreur de clé étrangère sur
-- chaque appel manqué. Ce n'est pas un défaut de cette fonction : c'est la
-- dette du câblage en dur, qui disparaîtra quand `artisan_id` deviendra
-- dynamique. En attendant : ne pas résilier le compte de test.
