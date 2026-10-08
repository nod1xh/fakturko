-- Test data: two companies, memberships, suppliers and invoices.
-- NOT a migration. Run once, as a whole, in the Supabase SQL Editor.
--
-- Before running: replace the three test emails below (v_email_*) with the
-- real ones from Supabase Auth. The users must already exist.
--
-- If any email is not found, or the seed was already applied, the script
-- raises an error and nothing is written (everything is in one transaction).
--
-- Dates are relative to today, so "overdue" and "due soon" stay meaningful
-- whenever the seed is run.

begin;

do $$
declare
  v_email_vlasnik     text := 'tvojemail+vlasnik@gmail.com';
  v_email_poslovodja  text := 'tvojemail+poslovodja@gmail.com';
  v_email_uljez       text := 'tvojemail+uljez@gmail.com';

  v_vlasnik     uuid;
  v_poslovodja  uuid;
  v_uljez       uuid;

  v_intermezo   uuid;
  v_test_kafic  uuid;

  v_pica        uuid;
  v_mesnica     uuid;
  v_pekara      uuid;
  v_kafa        uuid;
  v_mljekara    uuid;

  d             date := current_date;
begin
  -- Users -------------------------------------------------------------------
  select id into v_vlasnik from auth.users where lower(email) = lower(v_email_vlasnik);
  if v_vlasnik is null then
    raise exception 'User not found in auth.users: %', v_email_vlasnik;
  end if;

  select id into v_poslovodja from auth.users where lower(email) = lower(v_email_poslovodja);
  if v_poslovodja is null then
    raise exception 'User not found in auth.users: %', v_email_poslovodja;
  end if;

  select id into v_uljez from auth.users where lower(email) = lower(v_email_uljez);
  if v_uljez is null then
    raise exception 'User not found in auth.users: %', v_email_uljez;
  end if;

  -- Guard against running twice -------------------------------------------
  if exists (select 1 from public.firme where naziv in ('Intermezo', 'Test kafić')) then
    raise exception 'Seed already applied: company Intermezo or Test kafić exists';
  end if;

  -- Companies ---------------------------------------------------------------
  insert into public.firme (naziv, vrsta_objekta)
  values ('Intermezo', 'restoran')
  returning id into v_intermezo;

  insert into public.firme (naziv, vrsta_objekta)
  values ('Test kafić', 'kafic')
  returning id into v_test_kafic;

  -- Memberships -------------------------------------------------------------
  insert into public.clanstva (korisnik_id, firma_id, uloga) values
    (v_vlasnik,    v_intermezo,  'vlasnik'),
    (v_poslovodja, v_intermezo,  'poslovodja'),
    (v_uljez,      v_test_kafic, 'vlasnik');

  -- Suppliers: Intermezo ----------------------------------------------------
  insert into public.dobavljaci (firma_id, naziv, auto_rok_dana)
  values (v_intermezo, 'Pića d.o.o.', 30)
  returning id into v_pica;

  insert into public.dobavljaci (firma_id, naziv, auto_rok_dana)
  values (v_intermezo, 'Mesnica Centar', 7)
  returning id into v_mesnica;

  insert into public.dobavljaci (firma_id, naziv, auto_rok_dana)
  values (v_intermezo, 'Pekara Zrno', null)  -- due date entered manually
  returning id into v_pekara;

  -- Suppliers: Test kafić ---------------------------------------------------
  insert into public.dobavljaci (firma_id, naziv, auto_rok_dana)
  values (v_test_kafic, 'Kafa Import', 15)
  returning id into v_kafa;

  insert into public.dobavljaci (firma_id, naziv, auto_rok_dana)
  values (v_test_kafic, 'Mljekara Sjever', null)
  returning id into v_mljekara;

  -- Invoices: Intermezo -----------------------------------------------------
  insert into public.fakture
    (firma_id, dobavljac_id, broj, iznos, datum_unosa, rok_placanja, placeno, datum_placanja, unio_korisnik_id)
  values
    -- overdue
    (v_intermezo, v_pica,    'PD-2026-101', 1250.00, d - 45, d - 15, false, null,   v_vlasnik),
    -- due soon (in 3 days)
    (v_intermezo, v_pica,    'PD-2026-118',  860.40, d - 27, d + 3,  false, null,   v_poslovodja),
    -- paid
    (v_intermezo, v_pica,    'PD-2026-095',  990.00, d - 60, d - 30, true,  d - 32, v_vlasnik),
    -- due soon (in 4 days)
    (v_intermezo, v_mesnica, '0457',         432.80, d - 3,  d + 4,  false, null,   v_poslovodja),
    -- paid
    (v_intermezo, v_mesnica, '0421',         515.00, d - 20, d - 13, true,  d - 14, v_poslovodja),
    -- not due yet
    (v_intermezo, v_pekara,  '17/2026',       96.50, d - 2,  d + 20, false, null,   v_vlasnik),
    -- paid
    (v_intermezo, v_pekara,  '12/2026',       88.00, d - 25, d - 10, true,  d - 11, v_vlasnik);

  -- Invoices: Test kafić ----------------------------------------------------
  insert into public.fakture
    (firma_id, dobavljac_id, broj, iznos, datum_unosa, rok_placanja, placeno, datum_placanja, unio_korisnik_id)
  values
    -- overdue
    (v_test_kafic, v_kafa,     'KI-55', 340.00, d - 30, d - 15, false, null,  v_uljez),
    -- due soon (in 5 days)
    (v_test_kafic, v_kafa,     'KI-61', 210.00, d - 10, d + 5,  false, null,  v_uljez),
    -- paid
    (v_test_kafic, v_mljekara, 'MS-9',   75.20, d - 12, d - 5,  true,  d - 6, v_uljez);
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Check: one row per company (2 rows expected)
-- ---------------------------------------------------------------------------
select
  f.naziv,
  f.vrsta_objekta,
  (select string_agg(u.email || ' (' || c.uloga || ')', ', ' order by u.email)
     from public.clanstva c join auth.users u on u.id = c.korisnik_id
    where c.firma_id = f.id)                                         as clanovi,
  (select count(*) from public.clanstva c   where c.firma_id = f.id)  as clanstva,
  (select count(*) from public.dobavljaci d where d.firma_id = f.id)  as dobavljaci,
  (select count(*) from public.fakture fa   where fa.firma_id = f.id) as fakture,
  (select count(*) from public.fakture fa
    where fa.firma_id = f.id and fa.placeno)                          as placene,
  (select count(*) from public.fakture fa
    where fa.firma_id = f.id and not fa.placeno
      and fa.rok_placanja < current_date)                             as kasne,
  (select count(*) from public.fakture fa
    where fa.firma_id = f.id and not fa.placeno
      and fa.rok_placanja between current_date and current_date + 7)  as uskoro,
  (select coalesce(sum(fa.iznos), 0) from public.fakture fa
    where fa.firma_id = f.id and not fa.placeno)                      as ukupan_dug
from public.firme f
order by f.naziv;
