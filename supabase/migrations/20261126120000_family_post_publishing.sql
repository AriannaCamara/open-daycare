-- Migración: family_post_publishing (SPEC 29)
-- Relaja la escritura de posts para que el autor autenticado pueda
-- insertar/updatear/borrar sus propios posts sin exigir is_staff():
--   - staff: sin cambios (puede todo lo que podía antes);
--   - parent: solo type <> 'announcement' (los anuncios son exclusivos del
--     staff) y room_id null o de una sala donde tiene un hijo.
-- can_edit_post() pierde el `and public.is_staff()`: queda "autor = usuario
-- actual". post_children, post_photos y storage.objects delegan en esa
-- función, así que heredan la relajación sin tocar sus policies.
-- can_read_post() no cambia: la visibilidad es la de siempre.
-- Aplicada vía MCP apply_migration con nombre
-- "20261126120000_family_post_publishing".

-- 1. can_edit_post() sin exigir staff ---------------------------------------

create or replace function public.can_edit_post(p_post_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and p.author_id = (select auth.uid())
  )
$$;

-- 2. Policies de escritura de posts -----------------------------------------
-- Regla para no-staff (shared por insert/update/delete): anuncio no, y la
-- sala debe ser null o de alguno de sus hijos.

drop policy if exists "posts_insert_staff_author" on public.posts;
drop policy if exists "posts_update_author" on public.posts;
drop policy if exists "posts_delete_author" on public.posts;

create policy "posts_insert_author"
  on public.posts
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      public.is_staff()
      or (
        type <> 'announcement'
        and (
          room_id is null
          or exists (
            select 1
            from public.children c
            join public.parent_children pch on pch.child_id = c.id
            where pch.parent_id = (select auth.uid())
              and c.room_id = posts.room_id
          )
        )
      )
    )
  );

create policy "posts_update_author"
  on public.posts
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and (
      public.is_staff()
      or type <> 'announcement'
    )
  )
  with check (
    author_id = (select auth.uid())
    and (
      public.is_staff()
      or (
        type <> 'announcement'
        and (
          room_id is null
          or exists (
            select 1
            from public.children c
            join public.parent_children pch on pch.child_id = c.id
            where pch.parent_id = (select auth.uid())
              and c.room_id = posts.room_id
          )
        )
      )
    )
  );

create policy "posts_delete_author"
  on public.posts
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    and (
      public.is_staff()
      or type <> 'announcement'
    )
  );
