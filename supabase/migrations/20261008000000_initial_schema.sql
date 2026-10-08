-- Initial schema: companies, memberships, suppliers, invoices + RLS.
-- Run once, as a whole, in the Supabase SQL Editor.
-- Everything is in one transaction: if any statement fails, nothing is applied.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.firme (
  id             uuid primary key default gen_random_uuid(),
  naziv          text not null check (btrim(naziv) <> ''),
  vrsta_objekta  text not null check (vrsta_objekta in ('restoran', 'kafic', 'nargila_bar')),
  created_at     timestamptz not null default now()
);

create table public.clanstva (
  korisnik_id  uuid not null references auth.users (id) on delete cascade,
  firma_id     uuid not null references public.firme (id) on delete cascade,
  uloga        text not null check (uloga in ('vlasnik', 'poslovodja')),
  created_at   timestamptz not null default now(),
  primary key (korisnik_id, firma_id)
);

-- Deleting a company with suppliers or invoices is blocked (no action),
-- so data is never lost by accident.
create table public.dobavljaci (
  id             uuid primary key default gen_random_uuid(),
  firma_id       uuid not null references public.firme (id),
  naziv          text not null check (btrim(naziv) <> ''),
  -- NULL = due date is entered manually for each invoice
  auto_rok_dana  integer check (auto_rok_dana between 0 and 365),
  created_at     timestamptz not null default now(),
  -- Target for the composite foreign key from fakture (same-company check)
  unique (id, firma_id)
);

create table public.fakture (
  id                uuid primary key default gen_random_uuid(),
  firma_id          uuid not null references public.firme (id),
  dobavljac_id      uuid not null,
  broj              text not null check (btrim(broj) <> ''),
  iznos             numeric(12, 2) not null check (iznos >= 0),
  -- Default is the server date (UTC); the app should always send the local date.
  datum_unosa       date not null default current_date,
  rok_placanja      date not null,
  placeno           boolean not null default false,
  datum_placanja    date,
  unio_korisnik_id  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),

  -- The supplier must belong to the same company as the invoice.
  -- Also blocks deleting a supplier that still has invoices (no action).
  foreign key (dobavljac_id, firma_id) references public.dobavljaci (id, firma_id),

  check (rok_placanja >= datum_unosa),
  check (
    (placeno and datum_placanja is not null)
    or (not placeno and datum_placanja is null)
  )
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- clanstva: lookups by user are covered by the primary key
create index clanstva_firma_id_idx on public.clanstva (firma_id);

-- dobavljaci: supplier name unique per company, ignoring case and outer spaces.
-- Also serves the "suppliers of a company" list.
create unique index dobavljaci_firma_naziv_key
  on public.dobavljaci (firma_id, lower(btrim(naziv)));

-- fakture: supplier screen, tabs Debts / Paid (also covers the composite FK)
create index fakture_dobavljac_placeno_rok_idx
  on public.fakture (dobavljac_id, firma_id, placeno, rok_placanja);

-- fakture: total debt per company and per supplier
create index fakture_firma_placeno_idx on public.fakture (firma_id, placeno);

-- fakture: FK to auth.users (used when a user is deleted)
create index fakture_unio_korisnik_id_idx on public.fakture (unio_korisnik_id);

-- ---------------------------------------------------------------------------
-- Helper: is the current user a member of the company?
-- security definer so it can read clanstva regardless of RLS;
-- empty search_path so every name must be fully qualified.
-- ---------------------------------------------------------------------------

create function public.is_member(p_firma_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.clanstva c
    where c.firma_id = p_firma_id
      and c.korisnik_id = (select auth.uid())
  );
$$;

revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges: anon gets nothing, authenticated gets only what the app needs
-- ---------------------------------------------------------------------------

revoke all on table public.firme, public.clanstva, public.dobavljaci, public.fakture
  from anon, authenticated;

grant select on table public.firme, public.clanstva to authenticated;

grant select, insert, delete on table public.dobavljaci, public.fakture to authenticated;

-- Update only on editable columns: id, firma_id, unio_korisnik_id and
-- created_at can never be changed from the app.
grant update (naziv, auto_rok_dana) on table public.dobavljaci to authenticated;
grant update (dobavljac_id, broj, iznos, datum_unosa, rok_placanja, placeno, datum_placanja)
  on table public.fakture to authenticated;

-- Future tables and sequences created by postgres in public: no access for anon
alter default privileges for role postgres in schema public
  revoke all on tables from anon;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.firme      enable row level security;
alter table public.clanstva   enable row level security;
alter table public.dobavljaci enable row level security;
alter table public.fakture    enable row level security;

-- firme: read only companies the user belongs to
create policy firme_select on public.firme
  for select to authenticated
  using (public.is_member(id));

-- clanstva: read only own memberships (no insert/update/delete from the app)
create policy clanstva_select on public.clanstva
  for select to authenticated
  using (korisnik_id = (select auth.uid()));

-- dobavljaci: full access within own companies
create policy dobavljaci_select on public.dobavljaci
  for select to authenticated
  using (public.is_member(firma_id));

create policy dobavljaci_insert on public.dobavljaci
  for insert to authenticated
  with check (public.is_member(firma_id));

create policy dobavljaci_update on public.dobavljaci
  for update to authenticated
  using (public.is_member(firma_id))
  with check (public.is_member(firma_id));

create policy dobavljaci_delete on public.dobavljaci
  for delete to authenticated
  using (public.is_member(firma_id));

-- fakture: full access within own companies;
-- on insert, unio_korisnik_id must be the current user
create policy fakture_select on public.fakture
  for select to authenticated
  using (public.is_member(firma_id));

create policy fakture_insert on public.fakture
  for insert to authenticated
  with check (
    public.is_member(firma_id)
    and unio_korisnik_id = (select auth.uid())
  );

create policy fakture_update on public.fakture
  for update to authenticated
  using (public.is_member(firma_id))
  with check (public.is_member(firma_id));

create policy fakture_delete on public.fakture
  for delete to authenticated
  using (public.is_member(firma_id));

commit;
