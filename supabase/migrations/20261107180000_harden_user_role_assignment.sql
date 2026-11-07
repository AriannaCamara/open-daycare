-- Migración: harden_user_role_assignment
-- Cierra dos escaladas de privilegios verificadas contra producción:
--   1) public.users: la policy users_update_own permitía editar cualquier
--      columna de la propia fila, así que un parent se autoascendía a staff
--      con un solo PATCH.
--   2) handle_new_user copiaba `role` desde raw_user_meta_data, que decide
--      el cliente: un signup libre mandando role=staff creaba super usuario.
-- El rol ya no lo decide nunca el cliente; el alta de staff se hace con SQL
-- explícito (dashboard o migración).

-- 1) UPDATE por columnas: solo los campos que el propio usuario edita.
--    Quedan fuera role, daycare_id y status (y los inmutables id/created_at).
--    security_definer (los triggers y RPC) no se ve afectado: el revoke es
--    solo sobre el rol authenticated.
revoke update on table public.users from authenticated;

grant update (full_name, avatar_url, notify_on_post, daily_summary_enabled)
  on table public.users
  to authenticated;

-- 2) El rol siempre lo asigna la app: 'parent' fijo, ignorando el metadata.
--    daycare_id sigue siendo obligatorio (el cast falla y aborta el signup,
--    igual que antes, para no crear un perfil sin tenant).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, daycare_id, role, full_name)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'daycare_id')::uuid,
    'parent',
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- Nota: el usuario staff sembrado en 20261019171000 conserva su rol (su fila
-- ya existe); en un reset futuro esa migración lo sigue creando como staff
-- porque corre antes que esta.
