-- ═════════════════════════════════════════════════════════════════════════
-- Le montant réellement facturé (cahier, Partie 5, Écran 2)
--
--   « En haut, le total des chantiers signés en euros. C'est le chiffre à
--     montrer à un artisan au bout d'un mois. Rappli l'estime avec un
--     curseur ; ICI IL EST RÉEL. »
--
-- Il ne l'était pas. L'écran additionnait `panier`, qui sort du prompt de
-- classification : « montant typique facturé pour ce type d'intervention ».
-- Une estimation d'IA. Et l'écran affirmait en dessous, en toutes lettres,
-- « chiffre réel, pas une estimation ».
--
-- `panier` garde son rôle — il sert à trier, et à proposer une valeur de
-- départ quand l'artisan saisit le vrai montant. Mais il ne doit plus
-- JAMAIS être additionné pour produire un chiffre d'affaires.
-- ═════════════════════════════════════════════════════════════════════════

alter table demandes
  add column if not exists montant_signe integer;

comment on column demandes.montant_signe is
  'Montant réellement facturé, en euros, saisi par l''artisan. NULL tant qu''il ne l''a pas renseigné. Ne jamais remplacer par panier, qui est une estimation.';

-- Pourquoi `null` et pas `0` par défaut : zéro est une réponse — un
-- chantier offert, ou annulé sans frais — et `null` est une absence de
-- réponse. Les confondre ferait disparaître les chantiers à renseigner.
