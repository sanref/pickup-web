-- 0004 · Sedes (canchas, clubes)

create table public.venues (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 2 and 120),
  address         text not null,
  city            text not null,
  location        geography(Point, 4326) not null,
  timezone        text not null default 'America/Argentina/Buenos_Aires',
  google_place_id text unique,
  phone           text,
  photo_url       text,
  status          public.venue_status not null default 'pending',
  created_by      uuid references public.profiles (user_id),
  reviewed_by     uuid references public.profiles (user_id),
  reviewed_at     timestamptz,
  merged_into_id  uuid references public.venues (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint venues_merged_not_self check (merged_into_id is null or merged_into_id <> id)
);
comment on table public.venues is 'Sedes. Catálogo verificado + propuestas de usuarios (pending) que modera un admin.';
comment on column public.venues.created_by is 'Null para las sedes cargadas en el catálogo inicial.';
comment on column public.venues.merged_into_id is 'Si la sede resultó duplicada, apunta a la sede que queda.';
comment on column public.venues.timezone is 'Zona horaria IANA de la sede; los horarios se muestran en esta zona.';

create index venues_location_gix on public.venues using gist (location);
create index venues_name_trgm_idx on public.venues using gin (name gin_trgm_ops);
create index venues_status_idx on public.venues (status);

create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

create table public.venue_sports (
  venue_id uuid not null references public.venues (id) on delete cascade,
  sport_id smallint not null references public.sports (id),
  primary key (venue_id, sport_id)
);
comment on table public.venue_sports is 'Deportes que se pueden jugar en cada sede.';
