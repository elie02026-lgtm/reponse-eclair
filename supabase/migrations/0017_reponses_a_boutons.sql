-- 0017 — Les trois réponses à boutons du client (phase 5.1 et 5.2)
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE CES TROIS COLONNES CHANGENT
-- ─────────────────────────────────────────────────────────────────────────
-- Le client tape debout dans sa cuisine, sur un téléphone, avec une fuite à
-- ses pieds. Chaque caractère qu'on lui demande est une occasion de fermer
-- l'onglet. Trois touchers remplacent trois phrases — et ils donnent une
-- information EXPLOITABLE, là où du texte libre demande un modèle pour être
-- compris.
--
-- Elles servent à deux choses, et la seconde est la plus importante :
--
--  1. elles arrivent sur l'écran de l'artisan avec la demande ;
--  2. elles permettent de donner au client UN CONSEIL UTILE IMMÉDIATEMENT,
--     avant que l'intelligence artificielle ait fini de classer — ce qui
--     prend dix-sept à vingt secondes, mesuré en production. La page de
--     confirmation, elle, s'affiche tout de suite. C'est ce conseil qui
--     empêche le client d'appeler le plombier suivant.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI DU TEXTE AVEC UNE CONTRAINTE, ET PAS UN BOOLÉEN
-- ─────────────────────────────────────────────────────────────────────────
-- « Je ne sais pas » est une VRAIE réponse, et elle n'est pas un booléen.
-- Sans elle, quelqu'un qui ignore où est son robinet d'arrêt répondrait
-- « non » — et on lui donnerait un conseil fondé sur une réponse fausse.
--
-- `null` veut dire « il n'a pas répondu », ce qui est permis : aucune des
-- trois questions n'est obligatoire. Trois états bien distincts : répondu
-- oui, répondu non, répondu « je ne sais pas », pas répondu.
--
-- La troisième question n'a que deux réponses : on sait si on a du chauffage.
--
-- Les mêmes listes sont dans `src/lib/conseil.ts` (QUESTIONS). Le nom de la
-- colonne, le nom du champ envoyé à Make et le nom dans le code sont le
-- MÊME MOT : il n'y a rien à traduire, donc rien à se tromper.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE MAKE DOIT FAIRE (phase 5.2)
-- ─────────────────────────────────────────────────────────────────────────
-- Trois champs de plus dans le module 5 (POST /demandes) :
--     eau_coule            = {{2.eau_coule}}
--     arrivee_coupee       = {{2.arrivee_coupee}}
--     chauffage_eau_chaude = {{2.chauffage_eau_chaude}}
-- Rien d'autre. Tant que ce n'est pas fait, les champs sont ignorés et la
-- capture continue exactement comme avant.
--
-- ─────────────────────────────────────────────────────────────────────────
-- ÉPROUVÉE EN TRANSACTION ANNULÉE LE 1ᵉʳ OCTOBRE 2026
-- ─────────────────────────────────────────────────────────────────────────
--   les 11 demandes existantes survivent, les trois colonnes nulles ... OK
--   oui / non / je-ne-sais-pas .................................. acceptés
--   « peut-etre », « OUI », « » ................................. refusés
--   « je-ne-sais-pas » sur le chauffage ......................... refusé
--   un artisan connecté essaie de les écrire .................... 42501
--
-- Ce dernier point est voulu : ces réponses viennent du CLIENT. L'artisan ne
-- doit pas pouvoir réécrire ce que son client a dit — c'est la même raison
-- qui protège `gravite` depuis la migration 0014. Il corrige la gravité, qui
-- est un jugement ; il ne corrige pas un témoignage.

alter table public.demandes
  add column if not exists eau_coule            text,
  add column if not exists arrivee_coupee       text,
  add column if not exists chauffage_eau_chaude text;

alter table public.demandes drop constraint if exists demandes_eau_coule_connu;
alter table public.demandes add constraint demandes_eau_coule_connu
  check (eau_coule is null or eau_coule in ('oui', 'non', 'je-ne-sais-pas'));

alter table public.demandes drop constraint if exists demandes_arrivee_coupee_connu;
alter table public.demandes add constraint demandes_arrivee_coupee_connu
  check (arrivee_coupee is null or arrivee_coupee in ('oui', 'non', 'je-ne-sais-pas'));

alter table public.demandes drop constraint if exists demandes_chauffage_connu;
alter table public.demandes add constraint demandes_chauffage_connu
  check (chauffage_eau_chaude is null or chauffage_eau_chaude in ('oui', 'non'));

comment on column public.demandes.eau_coule is
  'Reponse du CLIENT. oui | non | je-ne-sais-pas | null (pas repondu). Meme liste que QUESTIONS dans src/lib/conseil.ts.';
comment on column public.demandes.arrivee_coupee is
  'Reponse du CLIENT. oui | non | je-ne-sais-pas | null. Avec eau_coule=oui, declenche le conseil de couper l''arrivee.';
comment on column public.demandes.chauffage_eau_chaude is
  'Reponse du CLIENT. oui | non | null. Pas de je-ne-sais-pas : on sait si on a du chauffage.';
