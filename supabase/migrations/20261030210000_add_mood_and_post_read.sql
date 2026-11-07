-- Migración: add_mood_and_post_read (SPEC 16)
-- 1) Agrega 'mood' al enum post_type (la UI ya lo ofrecía).
-- 2) Extiende can_read_post(): un padre también lee posts SIN niños etiquetados
--    si su room_id es una sala donde tiene un hijo (cualquier tipo), o si es un
--    anuncio daycare-wide (room_id null). Los posts CON etiquetas siguen
--    viéndolos solo las familias de esos niños.
-- 3) Seed idempotente de los 3 posts que antes eran mocks del feed (sin
--    post_children ni fotos; autor = staff seed; sala = Soles).

-- 1. Enum -------------------------------------------------------------------

alter type public.post_type add value if not exists 'mood';

-- 2. can_read_post() extendida ------------------------------------------------

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
          not exists (
            select 1
            from public.post_children pc
            where pc.post_id = p.id
          )
          and (
            exists (
              select 1
              from public.children c
              join public.parent_children pch on pch.child_id = c.id
              where pch.parent_id = (select auth.uid())
                and c.room_id = p.room_id
            )
            or (
              p.type = 'announcement'
              and p.room_id is null
            )
          )
        )
      )
  )
$$;

-- 3. Seed: los 3 posts del feed (uuids fijos, on conflict do nothing) --------

insert into public.posts (id, author_id, room_id, type, body, published_at)
select
  t.post_id,
  s.id,
  r.id,
  t.post_type,
  t.body,
  ((current_date::timestamp + t.post_time) at time zone 'America/Argentina/Buenos_Aires')
from (values
  (
    'd0000000-0000-4000-a000-000000000001'::uuid,
    'announcement'::public.post_type,
    '07:50'::time,
    'El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.'
  ),
  (
    'd0000000-0000-4000-a000-000000000002'::uuid,
    'activity'::public.post_type,
    '09:40'::time,
    'Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.'
  ),
  (
    'd0000000-0000-4000-a000-000000000003'::uuid,
    'achievement'::public.post_type,
    '14:20'::time,
    '¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.'
  )
) as t(post_id, post_type, post_time, body)
cross join lateral (
  select u.id
  from public.users u
  join auth.users au on au.id = u.id
  where au.email = 'staff@opendaycare.dev'
  limit 1
) s
cross join lateral (
  select rm.id
  from public.rooms rm
  where rm.name = 'Soles'
  limit 1
) r
on conflict (id) do nothing;
