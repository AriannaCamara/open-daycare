-- Migración: revoke_anon_execute_feed_helpers
-- Corrección de advisories (security). Las alter default privileges de
-- Supabase otorgan execute a anon/authenticated/service_role en toda función
-- nueva del schema public, por lo que el "revoke from public" de las
-- migraciones anteriores no alcanza a anon. Se revoca execute de anon en los
-- helpers de feed (can_read_post, can_edit_post) y en los helpers usados solo
-- por policies autenticadas (is_staff, is_staff_of_child, auth_daycare_id,
-- accept_parent_invitation). authenticated conserva execute en todos (las
-- policies los invocan con el rol del usuario consultante) y
-- get_invitation_by_code sigue siendo anónimo (ruta de activación).
-- También se fija search_path = '' en set_updated_at() (advisory
-- function_search_path_mutable); el cuerpo solo usa now() y el registro NEW,
-- así que el cambio es seguro y los triggers existentes conservan el OID.
-- Aplicada vía MCP apply_migration con nombre
-- "revoke_anon_execute_feed_helpers".

-- 1. Execute: fuera anon en los helpers de feed y de rol --------------------

revoke execute on function public.can_read_post(uuid) from anon;
revoke execute on function public.can_edit_post(uuid) from anon;

revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_staff_of_child(uuid) from public, anon;
revoke execute on function public.auth_daycare_id() from anon;
revoke execute on function public.accept_parent_invitation(uuid) from anon;

-- 2. set_updated_at(): search_path fijo -------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
