-- Migración: guard_comments_profanity
-- SPEC 17 — piso de seguridad del filtro de groserías: función
-- public.has_profanity() + trigger "comments_profanity_guard" que rechaza
-- cualquier insert/update en public.comments cuyo body contenga lenguaje no
-- permitido, aunque se salte el cliente y la server action (PostgREST/curl).
-- El mensaje 'comment_profanity_blocked' lo traduce la action a PROFANITY_ERROR.
-- La lista es espejo de utils/profanity.ts → mantener ambos archivos en
-- sincronía. Palabras en minúsculas y solo letras: ni el ~* ni los límites de
-- palabra necesitan escaping.
-- Aplicada vía MCP apply_migration con nombre "guard_comments_profanity".

-- 1. Función de detección ----------------------------------------------------

create or replace function public.has_profanity(p_text text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_text ~* (
    '(^|[^[:alpha:]])((' ||
    array_to_string(
      array[
        -- Español
        'carajo',
        'cabron', 'cabrón', 'cabrona', 'cabrones',
        'coño', 'coños',
        'culiao', 'culiado', 'culiada', 'culiados', 'culiadas',
        'estupido', 'estúpido', 'estupida', 'estúpida',
        'estupidos', 'estúpidos', 'estupidas', 'estúpidas',
        'forro', 'forra', 'forros', 'forras',
        'huevon', 'huevón', 'huevona', 'huevones',
        'idiota', 'idiotas',
        'imbecil', 'imbécil', 'imbeciles', 'imbéciles',
        'joder', 'jodido', 'jodida', 'jodidos', 'jodidas',
        'malparido', 'malparida', 'malparidos', 'malparidas',
        'maricon', 'maricón', 'maricona', 'maricones',
        'mierda', 'mierdas',
        'pelotudo', 'pelotuda', 'pelotudos', 'pelotudas',
        'pendejo', 'pendeja', 'pendejos', 'pendejas',
        'pija', 'pijas',
        'puta', 'putas', 'putita', 'putito', 'puto', 'putos',
        'verga', 'vergas',
        'weon', 'weón', 'weona', 'weones',
        -- English
        'asshole', 'assholes',
        'bastard', 'bastards',
        'bitch', 'bitches',
        'cock', 'cocks',
        'cunt', 'cunts',
        'dick', 'dicks',
        'fag', 'fags', 'faggot', 'faggots',
        'bullshit',
        'fuck', 'fucks', 'fucked', 'fucker', 'fuckers', 'fucking',
        'motherfucker', 'motherfuckers', 'motherfucking',
        'nigga', 'niggas', 'nigger', 'niggers',
        'prick', 'pricks',
        'pussy', 'pussies',
        'shit', 'shits', 'shitty',
        'slut', 'sluts',
        'twat', 'twats',
        'wanker', 'wankers',
        'whore', 'whores'
      ],
      '|'
    ) ||
    '))([^[:alpha:]]|$)'
  );
$$;

-- 2. Función del trigger -----------------------------------------------------

create or replace function public.guard_comments_profanity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.has_profanity(new.body) then
    raise exception 'comment_profanity_blocked';
  end if;
  return new;
end;
$$;

-- 3. Trigger: antes de insert y de update (la edición vuelve a pasar el filtro)

create trigger comments_profanity_guard
  before insert or update on public.comments
  for each row
  execute function public.guard_comments_profanity();

-- 4. Grants ------------------------------------------------------------------
-- El trigger corre con el rol que dispara la operación (authenticated), que
-- conserva execute. anon/public no tienen por qué invocar estos helpers.

revoke execute on function public.has_profanity(text) from public, anon;
revoke execute on function public.guard_comments_profanity() from public, anon;
