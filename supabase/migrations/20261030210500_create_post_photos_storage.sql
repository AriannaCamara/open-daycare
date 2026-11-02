-- Migración: create_post_photos_storage (SPEC 16)
-- Bucket privado post-photos para las fotos reales del feed + policies de
-- insert/select/delete en storage.objects que delegan en los helpers de posts.
-- El path es {daycare_id}/{post_id}/{index}-{uuid}.{ext}, así
-- storage.foldername(name)[2] es el post_id y las policies pueden llamar a
-- can_edit_post / can_read_post sin tablas auxiliares.
-- Aplicada vía MCP apply_migration con nombre "create_post_photos_storage".

-- 1. Bucket privado ---------------------------------------------------------
-- Límite 5 MB y solo jpg/png/webp: validación en la plataforma además de
-- cliente y server (no se puede saltar con curl).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-photos',
  'post-photos',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Policies de storage.objects ---------------------------------------------
-- RLS ya habilitado y grants por defecto en Supabase; solo faltan las policies.
-- authenticated: anon queda sin ninguna policy → sin acceso.

create policy "post_photos_objects_insert_author"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'post-photos'
    and public.can_edit_post((storage.foldername(name))[2]::uuid)
  );

create policy "post_photos_objects_select_readable"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'post-photos'
    and public.can_read_post((storage.foldername(name))[2]::uuid)
  );

create policy "post_photos_objects_delete_author"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'post-photos'
    and public.can_edit_post((storage.foldername(name))[2]::uuid)
  );
