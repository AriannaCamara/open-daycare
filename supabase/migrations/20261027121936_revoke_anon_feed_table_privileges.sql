-- Migración: revoke_anon_feed_table_privileges
-- Corrección de defensa en profundidad: las alter default privileges de
-- Supabase otorgan todos los privilegios de tabla (select/insert/update/
-- delete) a anon, authenticated y service_role en toda tabla nueva del
-- schema public. Las policies de las tablas del feed son todas
-- "to authenticated", así que anon ya no ve ni escribe filas (default deny),
-- pero se revocan igual los grants de anon para que la única vía de acceso
-- sea autenticada. service_role se mantiene (rol de servidor, bypassrls).
-- Aplicada vía MCP apply_migration con nombre
-- "revoke_anon_feed_table_privileges".

revoke all on public.posts from anon;
revoke all on public.post_children from anon;
revoke all on public.post_photos from anon;
revoke all on public.reactions from anon;
revoke all on public.comments from anon;
