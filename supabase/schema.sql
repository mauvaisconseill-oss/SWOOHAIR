-- ============================================================
-- SWOO HAIR — schéma Supabase
-- À exécuter dans : Supabase > SQL Editor > New query > Run
-- ============================================================

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_name text,
  prestation text not null,
  service_price text,
  acompte text,
  note text,
  date_rdv date,
  heure_rdv text,
  duree_minutes integer,
  nom text not null,
  telephone text,
  email text not null,
  instagram text,
  capture_paiement text,
  photo_etat_perruque text,
  supplement_total numeric,
  status text not null default 'pending' check (status in ('pending','confirmed','declined'))
);

-- Compatibilité avec les projets créés avec l'ancien formulaire.
alter table reservations add column if not exists prestation text;
alter table reservations add column if not exists acompte text;
alter table reservations add column if not exists date_rdv date;
alter table reservations add column if not exists heure_rdv text;
alter table reservations add column if not exists duree_minutes integer;
alter table reservations add column if not exists capture_paiement text;
alter table reservations add column if not exists photo_etat_perruque text;
alter table reservations add column if not exists supplement_total numeric;
alter table reservations add column if not exists service_name text;

-- L'ancien schéma imposait service_name, que le formulaire actuel n'envoie plus.
alter table reservations alter column service_name drop not null;

alter table reservations enable row level security;

-- N'importe qui (le site public) peut CRÉER une demande de réservation.
drop policy if exists "public can insert reservations" on reservations;
create policy "public can insert reservations"
on reservations for insert
to anon
with check (true);

-- Seule une personne connectée (toi, via admin.html) peut LIRE les demandes.
drop policy if exists "admin can read reservations" on reservations;
create policy "admin can read reservations"
on reservations for select
to authenticated
using (true);

-- Seule une personne connectée peut CHANGER le statut (accepter/refuser).
drop policy if exists "admin can update reservations" on reservations;
create policy "admin can update reservations"
on reservations for update
to authenticated
using (true);
