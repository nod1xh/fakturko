-- Give clear names to the CHECK and foreign key constraints that were
-- created without a name (Postgres called them fakture_check, fakture_check1,
-- fakture_iznos_check, ...). The app shows the right Bosnian message by
-- reading the constraint name from the error (src/lib/errors.ts).
--
-- Constraints are found by WHAT they check (table, type, columns), not by
-- their old names, so this works whatever names Postgres picked. If any
-- constraint is found 0 or 2+ times, the script stops and nothing changes.
--
-- Run once, as a whole, in the Supabase SQL Editor.

begin;

do $$
declare
  r        record;
  v_found  text[];
begin
  for r in
    select *
    from (values
      -- table,               type, columns (alphabetical),          new name
      ('public.fakture',      'c',  array['iznos'],                  'fakture_iznos_nije_negativan'),
      ('public.fakture',      'c',  array['broj'],                   'fakture_broj_nije_prazan'),
      ('public.fakture',      'c',  array['datum_unosa', 'rok_placanja'], 'fakture_rok_nije_prije_unosa'),
      ('public.fakture',      'c',  array['datum_placanja', 'placeno'],   'fakture_placeno_ima_datum'),
      ('public.fakture',      'f',  array['dobavljac_id', 'firma_id'],    'fakture_dobavljac_iz_iste_firme'),
      ('public.dobavljaci',   'c',  array['naziv'],                  'dobavljaci_naziv_nije_prazan'),
      ('public.dobavljaci',   'c',  array['auto_rok_dana'],          'dobavljaci_auto_rok_raspon'),
      ('public.firme',        'c',  array['naziv'],                  'firme_naziv_nije_prazan'),
      ('public.firme',        'c',  array['vrsta_objekta'],          'firme_vrsta_objekta_dozvoljena')
    ) as t(table_name, con_type, columns, new_name)
  loop
    select array_agg(c.conname::text)
      into v_found
      from pg_constraint c
     where c.conrelid = r.table_name::regclass
       and c.contype = r.con_type::"char"
       and (
         select array_agg(a.attname::text order by a.attname::text)
           from pg_attribute a
          where a.attrelid = c.conrelid
            and a.attnum = any (c.conkey)
       ) = r.columns;

    if coalesce(array_length(v_found, 1), 0) <> 1 then
      raise exception 'Expected exactly 1 constraint on % (%) for columns %, found: %',
        r.table_name, r.con_type, r.columns, coalesce(v_found::text, 'none');
    end if;

    if v_found[1] <> r.new_name then
      execute format('alter table %s rename constraint %I to %I',
                     r.table_name, v_found[1], r.new_name);
    end if;
  end loop;
end;
$$;

commit;
