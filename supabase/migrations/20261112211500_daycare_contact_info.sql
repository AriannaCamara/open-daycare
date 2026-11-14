-- Migración: daycare_contact_info
-- SPEC 19 — datos de contacto de la guardería para la pantalla /family/daycare.
-- daycares tenía RLS habilitado pero cero policies: sin esta policy nadie
-- puede leer la fila desde la app. id = auth_daycare_id() reutiliza el
-- helper security definer ya existente, sin recursión RLS. La policy es
-- solo select: esta spec no agrega escritura (ni updated_at ni trigger).
-- Grants: select en daycares ya está concedido a authenticated.
-- Aplicada vía MCP apply_migration con nombre "daycare_contact_info".

alter table public.daycares
  add column phone text,
  add column email text,
  add column address text,
  add column hours text;

create policy daycares_select_member on public.daycares
  for select to authenticated
  using (id = auth_daycare_id());

-- Datos de prueba (la edición real va en otra spec): hasta que exista la
-- pantalla de edición, se cambian desde la consola de Supabase.
update public.daycares
set phone = '+54 11 5555-0192',
    email = 'hola@opendaycare.com',
    address = 'Av. Libertador 2450, Buenos Aires',
    hours = 'Lunes a viernes, 7:30 a 18:00'
where id = 'cdcdb6de-3826-4056-ad9d-2f0c88cb8a34';
