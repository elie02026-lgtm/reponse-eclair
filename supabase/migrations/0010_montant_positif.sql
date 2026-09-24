-- ═════════════════════════════════════════════════════════════════════════
-- Un montant facturé ne peut pas être négatif
--
-- `src/lib/demandes.ts` refuse déjà les négatifs :
--
--     if (!Number.isInteger(montant) || montant < 0) return { erreur: … }
--
-- Mais ce garde-fou est dans le navigateur, et le navigateur n'est pas
-- l'API. Un artisan connecté peut écrire directement dans PostgREST avec
-- sa propre clé — celle qui est déjà dans la page.
--
-- MESURÉ le 24 septembre 2026, sous le rôle `authenticated` avec le jeton
-- de Plomberie Test, dans une transaction annulée ensuite :
--
--     update demandes set montant_signe = -5000 where id = 1;
--     → id 1, Marc, montant_signe = -5000       ACCEPTÉ
--
-- Conséquence : un chiffre d'affaires qui BAISSE quand on ajoute un
-- chantier. C'est la pire sorte de faux — il ne ressemble pas à une
-- erreur, il ressemble à un mauvais mois.
-- ═════════════════════════════════════════════════════════════════════════

-- `is null or >= 0` plutôt que `>= 0` tout court : en SQL, `null >= 0` vaut
-- `null`, et une contrainte CHECK qui vaut `null` PASSE. Écrire `check
-- (montant_signe >= 0)` suffirait donc techniquement — et laisserait le
-- lecteur suivant se demander si le cas null a été pensé. Il l'a été : un
-- montant absent est le cas NORMAL, celui d'un chantier signé le matin et
-- facturé le soir.
alter table demandes
  add constraint demandes_montant_signe_positif
  check (montant_signe is null or montant_signe >= 0);

comment on constraint demandes_montant_signe_positif on demandes is
  'Un montant facturé est nul (pas encore saisi) ou positif. Zéro reste permis : un chantier offert, ou annulé sans frais, est une réponse.';

-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI PAS DE BORNE HAUTE.
-- ─────────────────────────────────────────────────────────────────────────
-- La tentation serait d'ajouter `and montant_signe <= 100000`. On s'en
-- passe : personne ne sait ce que le plus gros chantier d'un plombier peut
-- valoir, et une borne inventée finirait par refuser une vraie facture un
-- jour de chance. Le négatif, lui, n'est pas un montant rare : c'est un
-- montant impossible.
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI AUCUNE POLITIQUE RLS N'EST AJOUTÉE.
-- ─────────────────────────────────────────────────────────────────────────
-- La politique de la migration 0001 couvre déjà ce cas :
--
--     create policy "un artisan ne voit que ses demandes"
--       on demandes for all using (artisan_id = auth.uid());
--
-- `for all` porte sur SELECT, INSERT, UPDATE et DELETE — colonnes
-- comprises. La RLS filtre des LIGNES, pas des colonnes : ajouter une
-- colonne ne crée jamais un trou. Vérifié de fait le 24 septembre : la même
-- écriture, tentée sur la demande 10 qui appartient à plomberie MARTIN,
-- n'a modifié AUCUNE ligne.
--
-- Une politique de plus serait donc du bruit — et le bruit, dans un fichier
-- de sécurité, c'est ce qui fait qu'on ne relit plus.
