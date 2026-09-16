-- Réponse Éclair — schéma initial
-- Traduction directe du cahier des charges, Partie 4 (validé en prod le 14 sept).
-- À exécuter dans Supabase > SQL Editor.

-- Un artisan = un compte (lié à l'utilisateur d'authentification Supabase)
create table artisans (
  id            uuid primary key references auth.users(id) on delete cascade,
  entreprise    text not null,
  metier        text not null,          -- plombier, chauffagiste, electricien...
  code_postal   text not null,          -- point de départ, pour les distances
  zone_minutes  int  default 30,
  message_sms   text not null,
  numero_twilio text,                   -- null tant que non provisionné
  cree_le       timestamptz default now()
);

-- Une demande
create table demandes (
  id           bigserial primary key,
  artisan_id   uuid not null references artisans(id) on delete cascade,
  recue_le     timestamptz not null default now(),

  -- ce que le prospect a fourni
  prenom       text,
  email        text,
  telephone    text,
  lieu         text,
  besoin       text,
  urgence_dite text,                    -- ce qu'il a coché ; presque toujours "urgent"
  photo_url    text,

  -- ce que le système a déduit
  motif        text,                    -- 2 à 4 mots, minuscules
  gravite      int  check (gravite between 0 and 3),
  panier       int,                     -- euros, estimation
  distance_min int,                     -- null tant que le géocodage n'est pas fait

  -- cycle de vie
  statut       text not null default 'a_rappeler'
               check (statut in ('a_rappeler','rappele','devis_envoye','signe','perdu')),
  relance_sms_le timestamptz,
  traite_le      timestamptz
);

create index on demandes (artisan_id, statut, gravite desc, panier desc);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security : la séparation entre artisans se fait EN BASE.
-- Sans ces politiques, la clé anon publique laisse tout le monde tout lire.
-- ─────────────────────────────────────────────────────────────────────────

-- La ligne la plus importante du projet (cahier, Partie 4)
alter table demandes enable row level security;

create policy "un artisan ne voit que ses demandes"
  on demandes for all
  using (artisan_id = auth.uid());

-- AJOUT hors cahier (voir explication dans la conversation) :
-- la table artisans doit AUSSI être protégée, sinon un compte connecté lit
-- l'entreprise, le code postal, le message et le numéro de tous les autres.
alter table artisans enable row level security;

create policy "un artisan ne lit que sa fiche"
  on artisans for select using (id = auth.uid());

create policy "un artisan ne modifie que sa fiche"
  on artisans for update using (id = auth.uid()) with check (id = auth.uid());

create policy "un artisan ne crée que sa propre fiche"
  on artisans for insert with check (id = auth.uid());
