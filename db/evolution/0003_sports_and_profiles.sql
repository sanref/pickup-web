-- 0003 · Deportes y perfiles de usuario

create table public.sports (
  id               smallint generated always as identity primary key,
  slug             text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name             text not null,
  default_capacity smallint not null check (default_capacity between 2 and 30),
  sort_order       smallint not null default 0,
  is_active        boolean not null default true
);
comment on table public.sports is 'Deportes disponibles. default_capacity es el cupo sugerido (10 para fútbol 5); el organizador lo puede cambiar.';

-- Un perfil por usuario de Neon Auth. Se crea con ensureProfile() en el primer ingreso.
-- user_id es la ÚNICA referencia a neon_auth.user(id) y es lógica (sin FK) para que estos
-- scripts se puedan recrear en cualquier Postgres. El resto de las tablas referencia a profiles.
create table public.profiles (
  user_id       uuid primary key,
  display_name  text not null check (char_length(display_name) between 1 and 60),
  avatar_url    text,
  city          text,
  city_location geography(Point, 4326),
  bio           text check (char_length(bio) <= 280),
  onboarded_at  timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.profiles is 'Perfil público del usuario. Las cuentas eliminadas se anonimizan (deleted_at), no se borran, para no romper el historial de partidos.';
comment on column public.profiles.user_id is 'Referencia lógica a neon_auth.user(id).';
comment on column public.profiles.city_location is 'Centro aproximado de la ciudad elegida (no la ubicación del usuario). Se usa como punto de partida de las búsquedas.';
comment on column public.profiles.onboarded_at is 'Null hasta que completa el onboarding (ciudad y deportes).';

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_sports (
  user_id  uuid not null references public.profiles (user_id) on delete cascade,
  sport_id smallint not null references public.sports (id),
  level    public.skill_level not null,
  primary key (user_id, sport_id)
);
comment on table public.user_sports is 'Deportes que juega cada usuario y su nivel autodeclarado.';
