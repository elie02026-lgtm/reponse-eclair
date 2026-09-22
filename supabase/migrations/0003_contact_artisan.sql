-- ═════════════════════════════════════════════════════════════════════════
-- L'alerte doit partir chez l'artisan concerné, pas chez Elie.
--
-- Le module 4 du scénario de capture envoie l'alerte à une adresse écrite
-- en dur : elie02026@gmail.com. Tant qu'il n'y a qu'un artisan, ça marche.
-- Au deuxième, les demandes de son client atterrissent dans la boîte
-- d'Elie et le client, lui, ne reçoit rien. Ce n'est pas une panne
-- bruyante : c'est un produit qui a l'air de marcher et qui ne marche pas.
--
-- Cette migration ne prépare QUE la base. Le branchement dans Make est
-- délibérément laissé pour un moment où la chaîne de capture n'a pas été
-- cassée vingt minutes plus tôt.
-- ═════════════════════════════════════════════════════════════════════════

-- L'e-mail de l'artisan n'est pas dans `artisans` : il vit dans
-- `auth.users`, géré par Supabase. On ne le recopie PAS dans notre table —
-- une copie se périme le jour où quelqu'un change d'adresse, et on
-- enverrait alors les alertes dans le vide sans le savoir. On le lit là où
-- il est vrai.
create or replace view artisans_contact as
  select a.id,
         a.entreprise,
         u.email
  from public.artisans a
  join auth.users u on u.id = a.id;

-- ATTENTION : cette vue expose des adresses e-mail. Elle ne doit être
-- lisible QUE par la clé de service, celle qu'utilise Make.
-- Sans ce revoke, n'importe quel visiteur muni de la clé publique lirait
-- l'adresse de tous les artisans inscrits.
revoke all on artisans_contact from anon, authenticated;
