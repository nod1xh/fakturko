-- Move is_member out of the public schema, so it is no longer callable
-- through the Data API (/rest/v1/rpc/is_member).
-- Run once, as a whole, in the Supabase SQL Editor.

begin;

-- Schema for internal helpers. It is not in the Data API "Exposed schemas" list.
create schema private;

-- Policies can call functions in this schema, but nothing else is granted.
grant usage on schema private to authenticated;

-- Moving the function keeps its OID, so every RLS policy that uses it
-- keeps working without changes. Its privileges move with it
-- (execute: authenticated only; revoked from public and anon).
alter function public.is_member(uuid) set schema private;

commit;
