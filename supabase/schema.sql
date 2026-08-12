-- ============================================================
-- SWOO HAIR — schéma Supabase
-- À exécuter dans : Supabase > SQL Editor > New query > Run
-- ============================================================

create table if not exists reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  service_name text not null,
  service_price text,
  deposit numeric,
  note text,
  date date,
  heure text,
  nom text not null,
  telephone text,
  email text not null,
  instagram text,
  status text not null default 'pending' check (status in ('pending','confirmed','declined'))
);

alter table reservations enable row level security;

-- N'importe qui (le site public) peut CRÉER une demande de réservation.
create policy "public can insert reservations"
on reservations for insert
to anon
with check (true);

-- Seule une personne connectée (toi, via admin.html) peut LIRE les demandes.
create policy "admin can read reservations"
on reservations for select
to authenticated
using (true);

-- Seule une personne connectée peut CHANGER le statut (accepter/refuser).
create policy "admin can update reservations"
on reservations for update
to authenticated
using (true);
