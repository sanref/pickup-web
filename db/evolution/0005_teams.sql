-- 0005 · Equipos persistentes
-- Un equipo "de una sola vez" son los participantes de un partido (match_participants).
-- Cuando el organizador lo guarda, se crea un team con sus miembros para volver a convocarlo.

create table public.teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  sport_id    smallint not null references public.sports (id),
  owner_id    uuid not null references public.profiles (user_id),
  invite_code text not null unique,
  created_at  timestamptz not null default now(),
  archived_at timestamptz
);
comment on column public.teams.invite_code is 'Código del link de invitación /i/[code]. Lo genera la aplicación.';

create index teams_owner_idx on public.teams (owner_id);

create table public.team_members (
  team_id   uuid not null references public.teams (id) on delete cascade,
  user_id   uuid not null references public.profiles (user_id),
  role      public.team_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_idx on public.team_members (user_id);
