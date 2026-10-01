-- 0014 — Agir depuis l'e-mail, sans se connecter (phases 4.1 et 4.2)
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE CETTE MIGRATION REND POSSIBLE
-- ─────────────────────────────────────────────────────────────────────────
-- L'artisan visé par ce produit a 55 ans et ne se connectera pas à un
-- logiciel. Il doit pouvoir répondre depuis l'alerte qu'il reçoit : « C'est
-- fait » et « Pas si urgent », en touchant un bouton dans son courrier.
--
-- Un lien qui agit sans connexion EST une autorisation. Toute la question
-- est de la borner. Ici elle est bornée à : UNE demande, UNE opération,
-- TRENTE jours, AUCUNE lecture de donnée.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI PAS `demandes.jeton`
-- ─────────────────────────────────────────────────────────────────────────
-- `jeton` (migration 0002) part AU CLIENT, dans le lien de désinscription en
-- bas des relances. Le réutiliser donnerait au client le pouvoir d'agir à la
-- place de l'artisan. Il faut un secret que SEUL l'artisan reçoit : d'où
-- `cle_action`, qui ne voyage que dans l'e-mail d'alerte.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI PAS UN SECRET GLOBAL DANS LE WORKER
-- ─────────────────────────────────────────────────────────────────────────
-- Le cahier envisageait une signature HMAC avec une clé unique côté Worker.
-- Écarté, et c'est un écart qui RETIRE une clé au lieu d'en ajouter une :
-- chaque demande porte sa propre clé aléatoire. Rien à poser, rien à faire
-- tourner, rien à perdre. Et surtout : Make n'a aucun calcul à faire — il ne
-- recopie que des chaînes qu'il a reçues, donc aucun secret n'entre dans un
-- blueprint, qui s'exporte et se partage.
--
-- Le Worker génère pour chaque demande :
--     cle_action        32 octets aléatoires (WebCrypto)
--     jeton_fait        sha256(cle_action || ':fait')
--     jeton_pas_urgent  sha256(cle_action || ':pas_urgent')
-- Seule `cle_action` est enregistrée ici. Les deux jetons partent dans
-- l'e-mail et ne sont stockés nulle part.
--
-- Celui qui détient le lien « c'est fait » NE PEUT PAS en dériver l'autre :
-- il lui faudrait `cle_action`, qui ne quitte jamais la base. L'exigence
-- « une seule opération par lien » est donc tenue par le calcul, pas par une
-- promesse. Vérifié, contrôle T03.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. LES COLONNES
-- ─────────────────────────────────────────────────────────────────────────

-- La clé d'action. Nulle pour les 11 demandes antérieures : leurs liens
-- n'existeront pas, et la fonction rend « inconnue ». Sans conséquence.
alter table public.demandes
  add column if not exists cle_action text;

comment on column public.demandes.cle_action is
  'Secret par demande, envoyé UNIQUEMENT dans l''e-mail d''alerte de l''artisan. Ne jamais l''exposer au client ni dans un export.';

-- La correction de l'artisan. ON GARDE TOUJOURS `gravite`, la valeur du
-- modèle : l'écart entre les deux est la donnée qui dira, dans six mois, si
-- la classification est juste. L'effacer serait effacer la mesure.
alter table public.demandes
  add column if not exists gravite_corrigee int,
  add column if not exists corrigee_le      timestamptz;

comment on column public.demandes.gravite_corrigee is
  'Gravité corrigée par l''artisan. NULL tant qu''il n''a rien dit. Le tri lit coalesce(gravite_corrigee, gravite).';

alter table public.demandes
  drop constraint if exists demandes_gravite_corrigee_bornee;
alter table public.demandes
  add constraint demandes_gravite_corrigee_bornee
  check (gravite_corrigee is null or gravite_corrigee between 0 and 3);

-- Une correction sans date, ou une date sans correction, n'a pas de sens.
-- La base refuse les deux moitiés orphelines plutôt que de laisser le code
-- s'en souvenir. Vérifié, contrôle C2.
alter table public.demandes
  drop constraint if exists demandes_correction_datee;
alter table public.demandes
  add constraint demandes_correction_datee
  check ((gravite_corrigee is null) = (corrigee_le is null));

-- L'index du tri réel. L'ancien portait sur `gravite` seule ; depuis cette
-- migration l'écran trie sur `coalesce(gravite_corrigee, gravite)`, et un
-- index sur une colonne qu'on ne trie plus ne sert plus à rien.
create index if not exists demandes_tri_gravite_corrigee
  on public.demandes (artisan_id, statut, (coalesce(gravite_corrigee, gravite)) desc, panier desc);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. LA FONCTION D'ACTION
-- ─────────────────────────────────────────────────────────────────────────
-- `security definer` parce que le Worker se présente avec la clé PUBLIABLE,
-- donc en rôle `anon`, à qui l'on retire tout accès à la table juste en
-- dessous. Il ne peut agir QUE par cette porte-là, qui ne fait qu'une chose.
--
-- `set search_path = ''` : sans ça, un objet nommé `demandes` dans un schéma
-- que l'appelant contrôle pourrait être exécuté à la place du nôtre. D'où
-- aussi `extensions.digest` en toutes lettres.
--
-- ELLE NE REND JAMAIS DE DONNÉE. Un mot, toujours le même vocabulaire :
-- ok · refuse · expire · inconnue · operation_inconnue. Un lien ne doit pas
-- pouvoir servir à lire quoi que ce soit — ni un nom, ni un numéro, ni même
-- savoir si une demande existe avec un certain contenu.
create or replace function public.agir_sur_demande(
  p_id        bigint,
  p_jeton     text,
  p_operation text
) returns text
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_cle    text;
  v_recue  timestamptz;
  v_connue int;
begin
  -- Liste blanche. Une opération inventée ne doit pas atteindre la table.
  if p_operation not in ('fait', 'pas_urgent') then
    return 'operation_inconnue';
  end if;

  select cle_action, recue_le into v_cle, v_recue
    from public.demandes where id = p_id;

  -- MÊME RÉPONSE pour « n'existe pas » et « pas de clé ». Distinguer les
  -- deux dirait à un curieux quels identifiants existent.
  if not found or v_cle is null then
    return 'inconnue';
  end if;

  if now() > v_recue + interval '30 days' then
    return 'expire';
  end if;

  if encode(extensions.digest(v_cle || ':' || p_operation, 'sha256'), 'hex')
     <> lower(coalesce(p_jeton, '')) then
    return 'refuse';
  end if;

  if p_operation = 'fait' then
    -- `coalesce` sur traite_le : un deuxième clic ne réécrit pas l'heure du
    -- premier. Les deux opérations sont idempotentes À DESSEIN — l'artisan
    -- qui clique deux fois ne doit rien casser, et un lien à usage unique
    -- tuerait le second bouton du même e-mail.
    update public.demandes
       set statut = 'rappele',
           traite_le = coalesce(traite_le, now())
     where id = p_id;
    return 'ok';
  end if;

  -- « Pas si urgent » : un cran plus bas, jamais sous 0. Une demande pas
  -- encore classée par le modèle descend à 1 — pas à 0, qui voudrait dire
  -- « pas une urgence » alors qu'on n'en sait rien.
  select coalesce(gravite_corrigee, gravite) into v_connue
    from public.demandes where id = p_id;

  update public.demandes
     set gravite_corrigee = case
           when v_connue is null then 1
           else greatest(v_connue - 1, 0)
         end,
         corrigee_le = now()
   where id = p_id;
  return 'ok';
end
$fn$;

comment on function public.agir_sur_demande(bigint, text, text) is
  'Exécute UNE opération sur UNE demande, autorisée par un jeton dérivé de cle_action. Ne rend jamais de donnée. Réservée à anon (le Worker).';

-- Supabase accorde EXECUTE à tout le monde par défaut sur les fonctions de
-- `public`. On reprend tout, puis on ne rend qu'à `anon` : c'est le seul rôle
-- qui en a besoin, celui sous lequel le Worker se présente. Vérifié, D6.
revoke all on function public.agir_sur_demande(bigint, text, text) from public;
revoke all on function public.agir_sur_demande(bigint, text, text) from authenticated;
revoke all on function public.agir_sur_demande(bigint, text, text) from service_role;
grant execute on function public.agir_sur_demande(bigint, text, text) to anon;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. CE QUE LE CLIENT CONNECTÉ A LE DROIT D'ÉCRIRE
-- ─────────────────────────────────────────────────────────────────────────
-- LE PIÈGE, LE MÊME QU'EN MIGRATION 0012 : la RLS filtre des LIGNES, pas des
-- COLONNES. La politique « un artisan ne voit que ses demandes » le laisse
-- écrire N'IMPORTE QUELLE colonne de ses propres lignes — y compris
-- `gravite`, qu'on jure conserver, et `cle_action`, qui est un secret.
--
-- Mesuré avant d'écrire ces lignes (contrôles A1 et A2) : un artisan
-- connecté POUVAIT écraser `gravite` et lire `cle_action`.
--
-- Et comme en 0012 : un `revoke update (colonne)` ne restreint RIEN tant que
-- le droit de table existe. Il faut tout reprendre, puis rendre colonne par
-- colonne.
revoke update on public.demandes from authenticated;
grant  update (statut, traite_le, montant_signe, gravite_corrigee, corrigee_le)
  on public.demandes to authenticated;

-- CE QUI RESTE LISIBLE, ET POURQUOI. `cle_action` demeure dans le SELECT de
-- l'artisan. C'est assumé : c'est SA clé, pour SES demandes, et la retirer
-- obligerait à énumérer les colonnes dans les trois `select('*')` du code —
-- une liste à tenir à jour à chaque migration, donc une liste qu'on oubliera.
-- Elle ne peut pas fuir par l'export : `lib/csv.ts` nomme ses colonnes une à
-- une et ne la nomme pas.

-- `anon` n'a plus rien sur cette table. Il n'en a jamais eu besoin : Make
-- écrit avec la clé de service, et le Worker passe par la fonction ci-dessus,
-- qui s'exécute sous son propriétaire. Vérifié de bout en bout, D1 à D3 :
-- anon ne lit rien, n'écrit rien, et la fonction marche quand même.
revoke select, insert, update, delete on public.demandes from anon;

-- ─────────────────────────────────────────────────────────────────────────
-- CE QUI RESTE VRAI APRÈS CETTE MIGRATION, ET QU'IL FAUT ASSUMER
-- ─────────────────────────────────────────────────────────────────────────
-- 1. Qui lit la boîte mail de l'artisan peut agir sur ces deux champs. Le
--    lien EST l'autorisation. Mais qui a sa boîte mail peut déjà
--    réinitialiser son mot de passe : le lien n'ouvre pas une porte, il
--    élargit une porte déjà ouverte.
-- 2. `cle_action` est en clair dans la base. Qui lit la base peut déjà y
--    écrire directement. Stocker une empreinte empêcherait de dériver les
--    jetons, donc le mécanisme entier.
-- 3. La comparaison du jeton n'est pas à temps constant. Sur 64 caractères
--    hexadécimaux, à travers le réseau, l'attaque n'est pas praticable.
-- 4. Les liens ne sont pas à usage unique. Les deux opérations sont
--    idempotentes ; l'expiration à 30 jours borne la fenêtre.
