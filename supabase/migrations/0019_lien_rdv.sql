-- 0019 — Le lien de prise de rendez-vous DE L'ARTISAN (partie A2)
--
-- ═════════════════════════════════════════════════════════════════════════
-- POURQUOI CETTE COLONNE EXISTE : UN DÉFAUT DE PRODUIT, PAS UN AGRÉMENT
-- ═════════════════════════════════════════════════════════════════════════
-- Le prompt du module 9 de la chaîne Make contient en dur le lien cal.com
-- d'Elie et son numéro de portable personnel. Avec un vrai client, ses
-- clients en urgence appelleraient Elie — et prendraient rendez-vous dans
-- l'agenda d'Elie.
--
-- Ce n'est pas une panne bruyante : c'est un produit qui a l'air de marcher.
-- Même famille que la migration 0003, qui avait sorti l'adresse de l'alerte
-- du blueprint pour la lire là où elle est vraie.
--
-- FACULTATIF, et c'est un choix. La cible commerciale, ce sont des patrons de
-- cinquante à soixante ans ; beaucoup n'ont pas d'agenda en ligne et n'en
-- auront jamais. Une colonne `not null` les aurait exclus de l'inscription.
-- `null` veut dire « cet artisan n'en a pas », et les textes du client
-- prévoient ce cas (voir `docs/messages-client.md`).

-- ═════════════════════════════════════════════════════════════════════════
-- 1. LA COLONNE
-- ═════════════════════════════════════════════════════════════════════════
alter table public.artisans
  add column if not exists lien_rdv text;

comment on column public.artisans.lien_rdv is
  'Lien de prise de rendez-vous de l''artisan (cal.com, Calendly...). Facultatif. N''est JAMAIS proposé au client sur une demande urgente : voir docs/messages-client.md.';

-- `https://` EXIGÉ, ET PAS SEULEMENT « UNE ADRESSE VALIDE ».
--
-- Ce lien part dans un e-mail à un inconnu qui vient de donner son numéro de
-- téléphone. Un `http://` l'exposerait à lire — et à remplir — une page en
-- clair sur un réseau qu'il ne choisit pas. Les trois services que la cible
-- emploie (cal.com, Calendly, Google Agenda) sont tous en https ; refuser
-- http ne coûte donc rien à personne.
--
-- 300 signes : un lien cal.com en fait une cinquantaine. Au-delà, ce n'est
-- plus un lien de rendez-vous, c'est un collage de travers — et ça part
-- quand même au client.
--
-- LIMITE ASSUMÉE : « https:// » tout seul passe cette contrainte (huit
-- signes, commence bien par https://). La base ne sait pas si un hôte
-- existe, et le lui apprendre demanderait une expression régulière qu'on ne
-- saurait plus relire. Le garde-fou utile est côté écran, où l'artisan voit
-- ce qu'il tape.
alter table public.artisans
  drop constraint if exists artisans_lien_rdv_https;
alter table public.artisans
  add constraint artisans_lien_rdv_https
  check (
    lien_rdv is null
    or (starts_with(lien_rdv, 'https://') and length(lien_rdv) <= 300)
  );

-- ═════════════════════════════════════════════════════════════════════════
-- 2. LES DROITS, COLONNE PAR COLONNE
-- ═════════════════════════════════════════════════════════════════════════
-- LE PIÈGE QUE LA 0012 A FERMÉ, ET QU'IL NE FAUT PAS ROUVRIR : sur cette
-- table, `insert` et `update` ont été RETIRÉS AU NIVEAU DE LA TABLE, puis
-- rendus colonne par colonne. Une colonne nouvelle n'est donc écrite par
-- personne tant qu'on ne l'a pas nommée — ce qui est la bonne valeur par
-- défaut, et ce qui oblige à écrire ces deux lignes.
--
-- Mesuré AVANT cette migration, pour que la preuve d'après veuille dire
-- quelque chose :
--   authenticated UPDATE → code_postal, entreprise, message_sms, metier,
--                          zone_minutes
--   authenticated INSERT → les mêmes, plus id
--   anon                 → AUCUNE LIGNE, sur aucun droit (migration 0016)
--
-- Deux droits et pas un : `update` pour la modifier dans les Réglages,
-- `insert` parce que l'inscription écrit la fiche d'un seul coup. Sans
-- `insert`, un artisan qui renseignerait son lien à l'inscription verrait
-- « 42501 » sans comprendre.
grant insert (lien_rdv) on public.artisans to authenticated;
grant update (lien_rdv) on public.artisans to authenticated;

-- RIEN À `anon`, et il n'y a rien à écrire pour ça : la migration 0016 lui a
-- tout retiré sur cette table. Une colonne nouvelle n'y change rien, et le
-- contrôle G08 ci-dessous le vérifie plutôt que de le supposer.

-- `select` n'est PAS à accorder : il est resté au niveau de la table, donc il
-- couvre déjà la colonne nouvelle. C'est ce qu'on veut — l'écran des
-- Réglages doit pouvoir relire ce que l'artisan a tapé. Et la RLS d'
-- `artisans` (migration 0001) borne la lecture à SA ligne : `using (id =
-- auth.uid())`.

-- ═════════════════════════════════════════════════════════════════════════
-- CE QUE CETTE MIGRATION NE FAIT PAS
-- ═════════════════════════════════════════════════════════════════════════
-- Elle ne touche NI au scénario Make, NI à la vue `artisans_contact`. Le
-- branchement — faire lire à Make le lien et l'adresse de l'artisan concerné
-- — reste à faire à la main, et la requête à employer est donnée dans le
-- rapport de la partie A4.
