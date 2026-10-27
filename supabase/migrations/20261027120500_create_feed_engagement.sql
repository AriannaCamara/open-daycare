-- Migración: create_feed_engagement
-- Tablas post_photos, reactions y comments (engagement del feed), índices,
-- trigger updated_at en comments, RLS + grants. Reutiliza los helpers
-- can_read_post() / can_edit_post() de "create_posts" para las policies.
-- Aplicada vía MCP apply_migration con nombre "create_feed_engagement".

-- 1. Tabla post_photos ------------------------------------------------------

create table public.post_photos (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  url text not null,
  width integer,
  height integer,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

-- Las fotos se leen ordenadas dentro del post.
create index post_photos_post_position_idx on public.post_photos (post_id, position);

-- 2. Tabla reactions --------------------------------------------------------

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.users(id),
  type text not null,
  created_at timestamptz not null default now(),
  -- Una reacción por usuario en cada post (upsert desde la UI).
  unique (post_id, user_id)
);

-- "Mis reacciones" / conteos por usuario.
create index reactions_user_id_idx on public.reactions (user_id);

-- 3. Tabla comments ---------------------------------------------------------

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index comments_post_id_created_at_idx on public.comments (post_id, created_at);
create index comments_author_id_idx on public.comments (author_id);

-- 4. Trigger: mantiene updated_at en cada update de comments ----------------
-- Reutiliza public.set_updated_at() de SPEC 01.

create trigger set_comments_updated_at
  before update on public.comments
  for each row
  execute function public.set_updated_at();

-- 5. RLS --------------------------------------------------------------------

alter table public.post_photos enable row level security;
alter table public.reactions enable row level security;
alter table public.comments enable row level security;

-- post_photos: lectura si el post es legible; escritura solo su autor.
create policy "post_photos_select_readable"
  on public.post_photos
  for select
  to authenticated
  using (public.can_read_post(post_id));

create policy "post_photos_insert_author"
  on public.post_photos
  for insert
  to authenticated
  with check (public.can_edit_post(post_id));

create policy "post_photos_update_author"
  on public.post_photos
  for update
  to authenticated
  using (public.can_edit_post(post_id))
  with check (public.can_edit_post(post_id));

create policy "post_photos_delete_author"
  on public.post_photos
  for delete
  to authenticated
  using (public.can_edit_post(post_id));

-- reactions: quien reacciona es siempre el usuario actual; debe poder leer
-- el post. Update permite cambiar el tipo de reacción.

create policy "reactions_select_readable"
  on public.reactions
  for select
  to authenticated
  using (public.can_read_post(post_id));

create policy "reactions_insert_own"
  on public.reactions
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_read_post(post_id)
  );

create policy "reactions_update_own"
  on public.reactions
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.can_read_post(post_id)
  );

create policy "reactions_delete_own"
  on public.reactions
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- comments: cualquiera que pueda leer el post comenta; solo el autor
-- edita/borra lo suyo.

create policy "comments_select_readable"
  on public.comments
  for select
  to authenticated
  using (public.can_read_post(post_id));

create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and public.can_read_post(post_id)
  );

create policy "comments_update_own"
  on public.comments
  for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (
    author_id = (select auth.uid())
    and public.can_read_post(post_id)
  );

create policy "comments_delete_own"
  on public.comments
  for delete
  to authenticated
  using (author_id = (select auth.uid()));

-- 6. Grants -----------------------------------------------------------------

grant select, insert, update, delete on public.post_photos to authenticated;
grant select, insert, update, delete on public.reactions to authenticated;
grant select, insert, update, delete on public.comments to authenticated;
