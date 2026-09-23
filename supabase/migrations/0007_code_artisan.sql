-- ═════════════════════════════════════════════════════════════════════════
-- Le code d'artisan : la fin du câblage en dur
--
-- Le module 5 du scénario de capture insère les demandes avec un
-- `artisan_id` ÉCRIT EN DUR — celui de Plomberie Test. Tant que c'est vrai :
--
--   • un deuxième artisan est impossible ;
--   • la vue `artisans_contact` (migration 0003) ne peut pas être branchée,
--     puisque toutes les alertes partiraient vers le compte de test ;
--   • résilier le compte de test casserait la capture (migration 0005).
--
-- Trois dettes, une seule cause. Ce fichier la supprime.
-- ═════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Pourquoi un code court, et pas l'uuid qu'on a déjà.
-- ─────────────────────────────────────────────────────────────────────────
-- Ce code voyage dans le lien du SMS. Un uuid, c'est 36 caractères ; sur un
-- message facturé à 160, ça fait 22 % du SMS dépensés en identifiant. Huit
-- caractères en coûtent 8.
--
-- L'alphabet exclut ce qui se confond quand on lit un code à voix haute ou
-- qu'on le recopie : 0 et O, 1 et I et L. Restent 31 signes, soit 31^8 ≈
-- 850 milliards de combinaisons. La contrainte d'unicité attrape les
-- collisions ; à moins de cent artisans, elle ne se déclenchera jamais.
--
-- Ce code n'est PAS un secret. Le connaître permet d'envoyer un faux
-- formulaire à un artisan — une nuisance, pas une fuite : il ne donne accès
-- à aucune donnée. Le secret, c'est le jeton de session ; ceci n'est qu'une
-- adresse.
create or replace function nouveau_code_artisan()
returns text
language sql
volatile
set search_path = ''
as $$
  select string_agg(
    substr('ABCDEFGHJKMNPQRSTUVWXYZ23456789', 1 + floor(random() * 31)::int, 1),
    ''
  )
  from generate_series(1, 8);
$$;

alter table artisans
  add column if not exists code text;

-- Les artisans existants en reçoivent un, chacun le sien : `nouveau_code_artisan()`
-- est volatile, donc réévaluée pour chaque ligne. (Même piège que
-- `gen_random_uuid()` dans la migration 0002 : une fonction stable aurait
-- donné la même valeur à tout le monde.)
update artisans set code = nouveau_code_artisan() where code is null;

alter table artisans
  alter column code set default nouveau_code_artisan(),
  alter column code set not null;

create unique index if not exists artisans_code_unique on artisans (code);

comment on column artisans.code is
  'Identifiant court porté par le lien du SMS. Sert à retrouver l''artisan au moment où le formulaire revient. Public, pas secret.';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Ce que la chaîne de capture devra faire de ce code.
-- ─────────────────────────────────────────────────────────────────────────
-- RIEN N'EST ENCORE BRANCHÉ. Cette migration pose la colonne ; le scénario
-- Make continue d'insérer en dur. Le rebranchement touche la capture, la
-- seule partie du système dont une panne perd des clients, et il se fait en
-- une fois, avec Elie devant l'écran :
--
--   1. Le SMS porte `{LIEN}` = …/formulaire?a=<code>&t=<telephone>
--   2. Le formulaire renvoie `a` avec les réponses.
--   3. Le module 5 lit `artisans?code=eq.{{a}}` (clé de service, donc pas
--      de RLS) et insère l'`artisan_id` trouvé.
--   4. Si le code est inconnu ou absent : NE PAS PERDRE LA DEMANDE. La
--      règle C1 du cahier — « aucun lead n'est perdu si une étape échoue »
--      — passe avant la justesse de l'attribution. Il vaut mieux une
--      demande rattachée au mauvais artisan qu'une demande qui n'existe pas.
--
-- Le point 4 est celui qu'on oublie, et c'est celui qui coûte un client.
