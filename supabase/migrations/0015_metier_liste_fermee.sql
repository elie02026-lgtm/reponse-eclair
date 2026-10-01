-- 0015 — Le métier devient une liste fermée (phase 4.3)
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI CE CHAMP MÉRITE UNE CONTRAINTE
-- ─────────────────────────────────────────────────────────────────────────
-- `metier` n'est pas une étiquette : il SÉLECTIONNE LA GRILLE DE GRAVITÉ
-- appliquée aux demandes de cet artisan. « plombie », « Plombier » et
-- « plomberie » ne sont pas le même mot pour une machine.
--
-- Une faute de frappe à l'inscription cassait donc le classement de TOUTES
-- les demandes suivantes — et silencieusement : aucun écran ne l'aurait dit,
-- l'artisan aurait simplement trouvé que « ça trie bizarrement ». C'est le
-- genre de panne qui ne se découvre jamais.
--
-- L'écran pose maintenant un menu déroulant (`METIERS` dans `src/types.ts`).
-- Mais un menu déroulant n'est qu'une politesse : avec la clé déjà présente
-- dans la page, un `update` direct par PostgREST passe à côté. La vraie
-- serrure est ici — exactement comme pour `montant_signe` le 24 septembre,
-- où un `-5000` passait par l'API alors que l'écran l'interdisait.
--
-- ─────────────────────────────────────────────────────────────────────────
-- TROIS VALEURS, PARCE QUE LA CIBLE EN COMPTE TROIS
-- ─────────────────────────────────────────────────────────────────────────
-- Entreprises de plomberie-chauffage de 5 à 20 salariés en Île-de-France.
-- Le jour où l'on vendra à un électricien, il faudra AJOUTER sa valeur ici
-- ET une grille de gravité correspondante dans le scénario Make. Les deux
-- vont ensemble : ajouter le métier sans la grille donnerait un classement
-- fait avec la grille d'un plombier.
--
-- ─────────────────────────────────────────────────────────────────────────
-- ÉPROUVÉE EN TRANSACTION ANNULÉE LE 1ᵉʳ OCTOBRE 2026 — 10 contrôles
-- ─────────────────────────────────────────────────────────────────────────
--   les 3 fiches existantes survivent ................. 3 / 3
--   plombier, chauffagiste, plombier-chauffagiste ..... acceptés
--   « plombie » (faute de frappe) ..................... refusé
--   « Plombier » (majuscule) .......................... refusé
--   « plombier » (espace devant) ...................... refusé
--   « » (vide) ........................................ refusé
--   « electricien » (hors cible) ...................... refusé
--   une inscription avec un métier faux ............... refusée
--
-- Aucune donnée à reprendre : les trois fiches portent déjà « plombier ».

alter table public.artisans
  drop constraint if exists artisans_metier_connu;

alter table public.artisans
  add constraint artisans_metier_connu
  check (metier in ('plombier', 'chauffagiste', 'plombier-chauffagiste'));

comment on constraint artisans_metier_connu on public.artisans is
  'Le metier selectionne la grille de gravite. La meme liste est dans src/types.ts (METIERS) : changer l''une sans l''autre casse le classement.';
