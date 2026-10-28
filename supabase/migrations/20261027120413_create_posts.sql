-- Migración: create_posts
-- Enum post_type, tablas posts y post_children (feed), índices, trigger
-- updated_at, helpers can_read_post() / can_edit_post() (security definer),
-- RLS + grants. Los helpers rompen la recursión RLS entre posts y
-- post_children y centralizan el modelo de lectura (mismo daycare; staff
-- ve todo, padres ven posts de sus hijos + anuncios de su sala).
-- Aplicada vía MCP apply_migration con nombre "create_posts".

-- 1. Enum -------------------------------------------------------------------

create type public.post_type as enum
  ('meal', 'nap', 'activity', 'achievement', 'photo', 'announcement');

-- 2. Tabla posts ------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.users(id),
  room_id uuid references public.rooms(id),
  type public.post_type not null,
  title text,
  body text not null,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FKs y orden del feed.
create index posts_author_id_idx on public.posts (author_id);
create index posts_room_id_idx on public.posts (room_id);
create index posts_published_at_idx on public.posts (published_at desc);

-- 3. Tabla post_children ----------------------------------------------------
-- PK compuesta: un niño no se etiqueta dos veces en el mismo post.

create table public.post_children (
  post_id uuid not null references public.posts(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (post_id, child_id)
);

-- Feed del padre: filtrar posts por sus hijos.
create index post_children_child_id_idx on public.post_children (child_id);

-- 4. Trigger: mantiene updated_at en cada update de posts -------------------
-- Reutiliza public.set_updated_at() de SPEC 01.

create trigger set_posts_updated_at
  before update on public.posts
  for each row
  execute function public.set_updated_at();

-- 5. Helpers can_read_post() / can_edit_post() ------------------------------
-- SECURITY DEFINER para evitar recursión RLS: las policies de posts y de las
-- tablas hijas (post_children, post_photos, reactions, comments) se llaman
-- mutuamente; al ejecutar con los privilegios del creador (bypassrls) las
-- consultas internas no re-evalúan policies.
-- Lectura: mismo daycare que el autor (vía auth_daycare_id()) y, según rol:
--   - staff/admin: todos los posts de su daycare;
--   - parent: posts que etiquetan a sus hijos (parent_children) + anuncios
--     (type = 'announcement') de una sala de sus hijos, o daycare-wide
--     (room_id is null).

create or replace function public.can_read_post(p_post_id uuid)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and exists (
        select 1
        from public.users a
        where a.id = p.author_id
          and a.daycare_id = public.auth_daycare_id()
      )
      and (
        public.is_staff()
        or exists (
          select 1
          from public.post_children pc
          join public.parent_children pch on pch.child_id = pc.child_id
          where pc.post_id = p.id
            and pch.parent_id = (select auth.uid())
        )
        or (
          p.type = 'announcement'
          and (
            p.room_id is null
            or exists (
              select 1
              from public.children c
              join public.parent_children pch on pch.child_id = c.id
              where pch.parent_id = (select auth.uid())
                and c.room_id = p.room_id
            )
          )
        )
      )
  )
$$;

-- Escritura del post y de sus adjuntos: solo el staff autor del post.
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
  and public.is_staff()
$$;

-- 6. RLS --------------------------------------------------------------------

alter table public.posts enable row level security;
alter table public.post_children enable row level security;

create policy "posts_select_readable"
  on public.posts
  for select
  to authenticated
  using (public.can_read_post(id));

create policy "posts_insert_staff_author"
  on public.posts
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and public.is_staff()
  );

create policy "posts_update_author"
  on public.posts
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and public.is_staff()
  )
  with check (
    author_id = (select auth.uid())
    and public.is_staff()
  );

create policy "posts_delete_author"
  on public.posts
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    and public.is_staff()
  );

-- post_children: lectura si el post es legible; escritura solo su autor.
-- Sin policy de update: las etiquetas son inmutables (se recrean con el post).

create policy "post_children_select_readable"
  on public.post_children
  for select
  to authenticated
  using (public.can_read_post(post_id));

create policy "post_children_insert_author"
  on public.post_children
  for insert
  to authenticated
  with check (public.can_edit_post(post_id));

create policy "post_children_delete_author"
  on public.post_children
  for delete
  to authenticated
  using (public.can_edit_post(post_id));

-- 7. Grants -----------------------------------------------------------------

grant select, insert, update, delete on public.posts to authenticated;
grant select, insert, delete on public.post_children to authenticated;

-- 8. Execute de funciones ---------------------------------------------------
-- Las policies invocan estas funciones como authenticated: revoke de PUBLIC
-- (heredado por anon/authenticated) y grant explícito.

revoke execute on function public.can_read_post(uuid) from public;
grant execute on function public.can_read_post(uuid) to authenticated;

revoke execute on function public.can_edit_post(uuid) from public;
grant execute on function public.can_edit_post(uuid) to authenticated;
