-- Migración: users_select_same_daycare_members
-- SPEC 17 — corrección del data layer: el embed
-- comments ( ..., users ( full_name ) ) de fetchPosts devuelve null para
-- comentarios ajenos cuando el lector es un parent, porque la RLS de users
-- solo dejaba ver la fila propia (users_select_own) o la guardería si eras
-- staff (users_select_same_daycare_staff). Con esta policy, cualquier
-- miembro autenticado de la guardería lee los datos básicos de los demás
-- miembros (full_name, role, avatar_url…). public.users no tiene columnas
-- sensibles (sin email ni credenciales). Las policies de RLS se combinan en
-- OR: la de staff queda intacta.
-- Aplicada vía MCP apply_migration con nombre
-- "users_select_same_daycare_members".

create policy "users_select_same_daycare_members"
  on public.users
  for select
  to authenticated
  using (daycare_id = public.auth_daycare_id());
