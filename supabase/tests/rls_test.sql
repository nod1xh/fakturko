-- RLS and constraint tests. Impersonates users with
-- role + request.jwt.claims, exactly like a request from the app.
--
-- Requires seed.sql to be applied. Before running: replace the three test
-- emails below (v_email_*) with the real ones from Supabase Auth.
--
-- Run as a whole in the Supabase SQL Editor. Nothing is kept:
--   * every test runs in its own savepoint that is always rolled back
--     (this also resets the role back to postgres after each test),
--   * the whole script ends with ROLLBACK.
--
-- No tables are created: results are collected as JSON in a
-- transaction-local setting (rls_test.results) and read at the end.
-- (A CREATE TABLE would make the SQL Editor offer "Run and enable RLS",
-- which appends a statement after ROLLBACK and fails.)
--
-- Result: one table (nr, test, ocekivano, dobijeno, rezultat).
-- Expected errors are written as "greška <SQLSTATE>":
--   42501 = no privilege / RLS policy violation
--   23514 = check constraint violation
--   23503 = foreign key violation

begin;

-- Runs one statement as the given role/user and records the outcome.
-- p_sql must return a single text value (e.g. count(*)::text).
create function pg_temp.run_test(
  p_nr         int,
  p_test       text,
  p_role       text,
  p_user_id    uuid,
  p_sql        text,
  p_ocekivano  text
)
returns void
language plpgsql
as $$
declare
  v_dobijeno text;
begin
  begin
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', p_user_id, 'role', p_role)::text,
      true
    );
    perform set_config('role', p_role, true);

    execute p_sql into v_dobijeno;
    v_dobijeno := coalesce(v_dobijeno, 'NULL');

    -- Always undo: rolls back any change and the role switch
    raise exception 'rls_test_undo';
  exception when others then
    if sqlerrm <> 'rls_test_undo' then
      v_dobijeno := 'greška ' || sqlstate || ': ' || sqlerrm;
    end if;
  end;

  -- Back as postgres here: append the result to the JSON array
  perform set_config(
    'rls_test.results',
    (
      coalesce(nullif(current_setting('rls_test.results', true), ''), '[]')::jsonb
      || jsonb_build_object(
           'nr',        p_nr,
           'test',      p_test,
           'ocekivano', p_ocekivano,
           'dobijeno',  v_dobijeno,
           'rezultat',  case
                          when v_dobijeno = p_ocekivano
                            or v_dobijeno like p_ocekivano || ':%' then 'PASS'
                          else 'FAIL'
                        end
         )
    )::text,
    true
  );
end;
$$;

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
  v_pica        uuid;  -- supplier in Intermezo (has invoices)
  v_faktura     uuid;  -- invoice in Intermezo

  -- Shared SQL snippets
  v_firme       text := $q$select coalesce(string_agg(naziv, ', ' order by naziv), '') from public.firme$q$;
  v_dobavljaci  text := $q$select count(*)::text from public.dobavljaci$q$;
  v_fakture     text := $q$select count(*)::text from public.fakture$q$;
  v_rls         text := 'greška 42501';
begin
  -- Users ---------------------------------------------------------------------
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

  -- Seed data -----------------------------------------------------------------
  select id into v_intermezo  from public.firme where naziv = 'Intermezo';
  select id into v_test_kafic from public.firme where naziv = 'Test kafić';
  select id into v_pica    from public.dobavljaci where firma_id = v_intermezo and naziv = 'Pića d.o.o.';
  select id into v_faktura from public.fakture    where firma_id = v_intermezo and broj = 'PD-2026-101';

  if v_intermezo is null or v_test_kafic is null or v_pica is null or v_faktura is null then
    raise exception 'Seed data not found. Run supabase/seed.sql first.';
  end if;

  -- 1. Owner and manager see only Intermezo ----------------------------------
  perform pg_temp.run_test(101, '1a Vlasnik: vidljive firme',      'authenticated', v_vlasnik, v_firme, 'Intermezo');
  perform pg_temp.run_test(102, '1b Vlasnik: broj dobavljača',      'authenticated', v_vlasnik, v_dobavljaci, '3');
  perform pg_temp.run_test(103, '1c Vlasnik: broj faktura',         'authenticated', v_vlasnik, v_fakture, '7');
  perform pg_temp.run_test(104, '1d Vlasnik: vidi samo svoje članstvo', 'authenticated', v_vlasnik,
    $q$select count(*)::text from public.clanstva$q$, '1');

  perform pg_temp.run_test(111, '1e Poslovođa: vidljive firme',    'authenticated', v_poslovodja, v_firme, 'Intermezo');
  perform pg_temp.run_test(112, '1f Poslovođa: broj dobavljača',    'authenticated', v_poslovodja, v_dobavljaci, '3');
  perform pg_temp.run_test(113, '1g Poslovođa: broj faktura',       'authenticated', v_poslovodja, v_fakture, '7');

  -- 2. Intruder sees only Test kafić -----------------------------------------
  perform pg_temp.run_test(201, '2a Uljez: vidljive firme', 'authenticated', v_uljez, v_firme, 'Test kafić');
  perform pg_temp.run_test(202, '2b Uljez: dobavljači Intermeza', 'authenticated', v_uljez,
    format($q$select count(*)::text from public.dobavljaci where firma_id = %L$q$, v_intermezo), '0');
  perform pg_temp.run_test(203, '2c Uljez: fakture Intermeza', 'authenticated', v_uljez,
    format($q$select count(*)::text from public.fakture where firma_id = %L$q$, v_intermezo), '0');

  -- 3. Intruder cannot write to Intermezo ------------------------------------
  -- Blocked UPDATE/DELETE do not raise an error under RLS: they affect 0 rows.
  perform pg_temp.run_test(301, '3a Uljez: unos fakture u Intermezo', 'authenticated', v_uljez,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, rok_placanja)
      values (%L, %L, 'TEST-1', 10, current_date + 10) returning 1
    ) select count(*)::text from x$q$, v_intermezo, v_pica), v_rls);

  perform pg_temp.run_test(302, '3b Uljez: izmjena fakture Intermeza (redova)', 'authenticated', v_uljez,
    format($q$with x as (
      update public.fakture set iznos = 1 where id = %L returning 1
    ) select count(*)::text from x$q$, v_faktura), '0');

  perform pg_temp.run_test(303, '3c Uljez: brisanje fakture Intermeza (redova)', 'authenticated', v_uljez,
    format($q$with x as (
      delete from public.fakture where id = %L returning 1
    ) select count(*)::text from x$q$, v_faktura), '0');

  perform pg_temp.run_test(304, '3d Uljez: dodavanje dobavljača u Intermezo', 'authenticated', v_uljez,
    format($q$with x as (
      insert into public.dobavljaci (firma_id, naziv) values (%L, 'Uljez dobavljač') returning 1
    ) select count(*)::text from x$q$, v_intermezo), v_rls);

  -- 4. Intruder cannot use an Intermezo supplier in own company --------------
  perform pg_temp.run_test(401, '4a Uljez: faktura u Test kafić sa dobavljačem Intermeza', 'authenticated', v_uljez,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, rok_placanja)
      values (%L, %L, 'TEST-2', 10, current_date + 10) returning 1
    ) select count(*)::text from x$q$, v_test_kafic, v_pica), 'greška 23503');

  -- 5. Owner: no foreign unio_korisnik_id, no moving to another company ------
  perform pg_temp.run_test(501, '5a Vlasnik: unos fakture sa tuđim unio_korisnik_id', 'authenticated', v_vlasnik,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, rok_placanja, unio_korisnik_id)
      values (%L, %L, 'TEST-3', 10, current_date + 10, %L) returning 1
    ) select count(*)::text from x$q$, v_intermezo, v_pica, v_poslovodja), v_rls);

  perform pg_temp.run_test(502, '5b Vlasnik: prebacivanje fakture u drugu firmu', 'authenticated', v_vlasnik,
    format($q$with x as (
      update public.fakture set firma_id = %L where id = %L returning 1
    ) select count(*)::text from x$q$, v_test_kafic, v_faktura), v_rls);

  perform pg_temp.run_test(503, '5c Vlasnik: izmjena unio_korisnik_id', 'authenticated', v_vlasnik,
    format($q$with x as (
      update public.fakture set unio_korisnik_id = %L where id = %L returning 1
    ) select count(*)::text from x$q$, v_poslovodja, v_faktura), v_rls);

  -- Controls: valid writes must work, otherwise the "blocked" tests prove nothing
  perform pg_temp.run_test(504, '5d Kontrola: vlasnik unosi ispravnu fakturu', 'authenticated', v_vlasnik,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, rok_placanja)
      values (%L, %L, 'TEST-4', 10, current_date + 10) returning 1
    ) select count(*)::text from x$q$, v_intermezo, v_pica), '1');

  perform pg_temp.run_test(505, '5e Kontrola: vlasnik mijenja iznos svoje fakture', 'authenticated', v_vlasnik,
    format($q$with x as (
      update public.fakture set iznos = 1 where id = %L returning 1
    ) select count(*)::text from x$q$, v_faktura), '1');

  -- 6. Constraints (as owner, so RLS passes and only the constraint can fail) -
  perform pg_temp.run_test(601, '6a Negativan iznos', 'authenticated', v_vlasnik,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, rok_placanja)
      values (%L, %L, 'TEST-5', -5, current_date + 10) returning 1
    ) select count(*)::text from x$q$, v_intermezo, v_pica), 'greška 23514');

  perform pg_temp.run_test(602, '6b Rok prije datuma unosa', 'authenticated', v_vlasnik,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, datum_unosa, rok_placanja)
      values (%L, %L, 'TEST-6', 10, current_date, current_date - 1) returning 1
    ) select count(*)::text from x$q$, v_intermezo, v_pica), 'greška 23514');

  perform pg_temp.run_test(603, '6c Plaćeno bez datuma plaćanja', 'authenticated', v_vlasnik,
    format($q$with x as (
      insert into public.fakture (firma_id, dobavljac_id, broj, iznos, rok_placanja, placeno, datum_placanja)
      values (%L, %L, 'TEST-7', 10, current_date + 10, true, null) returning 1
    ) select count(*)::text from x$q$, v_intermezo, v_pica), 'greška 23514');

  perform pg_temp.run_test(604, '6d Brisanje dobavljača koji ima fakture', 'authenticated', v_vlasnik,
    format($q$with x as (
      delete from public.dobavljaci where id = %L returning 1
    ) select count(*)::text from x$q$, v_pica), 'greška 23503');

  -- 7. Anonymous (not signed in): no access to tables ------------------------
  perform pg_temp.run_test(701, '7a Anon: firme',      'anon', null, $q$select count(*)::text from public.firme$q$,      v_rls);
  perform pg_temp.run_test(702, '7b Anon: clanstva',   'anon', null, $q$select count(*)::text from public.clanstva$q$,   v_rls);
  perform pg_temp.run_test(703, '7c Anon: dobavljaci', 'anon', null, $q$select count(*)::text from public.dobavljaci$q$, v_rls);
  perform pg_temp.run_test(704, '7d Anon: fakture',    'anon', null, $q$select count(*)::text from public.fakture$q$,    v_rls);
end;
$$;

select nr, test, ocekivano, dobijeno, rezultat
from jsonb_to_recordset(current_setting('rls_test.results')::jsonb)
  as t(nr int, test text, ocekivano text, dobijeno text, rezultat text)
order by nr;

rollback;
