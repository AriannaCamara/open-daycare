-- Migración: seed_parent_test_user
-- Cuenta parent de prueba para verificar el panel de familia (/family y el
-- guard por rol del proxy). Solo actualiza la contraseña y el nombre del
-- usuario existente ariannaisabel795@gmail.com (ya tiene perfil parent
-- activo creado por el flujo de invitación).
-- Aplicada vía MCP apply_migration con nombre "seed_parent_test_user".

update auth.users
set encrypted_password = extensions.crypt('12345678', extensions.gen_salt('bf')),
    updated_at = now()
where email = 'ariannaisabel795@gmail.com';

update public.users
set full_name = 'Maria'
where id = (select id from auth.users where email = 'ariannaisabel795@gmail.com');
