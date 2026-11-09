-- 0008 · Gestión de sedes: administradores de sede, canchas y turnos
-- Un "admin de sede" es un usuario asignado a una o más sedes (venue_managers). No es un rol
-- global de Neon Auth: el permiso es por sede. El admin del sitio (role = admin) gestiona todas.

-- btree_gist: exclusión de turnos superpuestos en la misma cancha (uuid = y rango &&).
create extension if not exists btree_gist;

create table public.venue_managers (
  venue_id   uuid not null references public.venues (id) on delete cascade,
  user_id    uuid not null references public.profiles (user_id) on delete cascade,
  added_by   uuid references public.profiles (user_id),
  created_at timestamptz not null default now(),
  primary key (venue_id, user_id)
);
comment on table public.venue_managers is 'Admins de sede: pueden editar los datos de la sede, sus canchas y sus turnos. Los asigna un admin del sitio.';

create index venue_managers_user_idx on public.venue_managers (user_id);

create table public.courts (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references public.venues (id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60),
  sport_id     smallint not null references public.sports (id),
  slot_minutes smallint not null check (slot_minutes between 15 and 240 and slot_minutes % 15 = 0),
  is_active    boolean not null default true,
  sort_order   smallint not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint courts_venue_name_key unique (venue_id, name),
  -- Permite FKs compuestas que garantizan que la cancha es de la sede del partido.
  constraint courts_id_venue_key unique (id, venue_id)
);
comment on table public.courts is 'Canchas de una sede. Cada una tiene una actividad (deporte) y un turno mínimo.';
comment on column public.courts.slot_minutes is 'Duración mínima de un turno; los turnos duran un múltiplo de este valor.';
comment on column public.courts.is_active is 'Una cancha con historial no se borra: se desactiva y deja de ofrecerse.';

create index courts_venue_idx on public.courts (venue_id, sort_order);

create trigger courts_set_updated_at
  before update on public.courts
  for each row execute function public.set_updated_at();

create type public.booking_status as enum ('booked', 'cancelled');

create table public.court_bookings (
  id             uuid primary key default gen_random_uuid(),
  court_id       uuid not null references public.courts (id),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         public.booking_status not null default 'booked',
  match_id       uuid references public.matches (id) on delete set null,
  customer_name  text check (char_length(customer_name) <= 80),
  customer_phone text check (char_length(customer_phone) <= 40),
  notes          text check (char_length(notes) <= 500),
  created_by     uuid references public.profiles (user_id),
  cancelled_at   timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint court_bookings_valid_range check (ends_at > starts_at),
  constraint court_bookings_no_overlap
    exclude using gist (court_id with =, tstzrange(starts_at, ends_at) with &&) where (status = 'booked')
);
comment on table public.court_bookings is 'Turnos de una cancha. Los carga la sede (manuales) o se generan al confirmar un partido con cancha (match_id).';
comment on column public.court_bookings.match_id is 'Turno generado por un partido confirmado; se cancela si se cancela el partido.';

create index court_bookings_court_starts_idx on public.court_bookings (court_id, starts_at);
create unique index court_bookings_match_active_key on public.court_bookings (match_id)
  where status = 'booked' and match_id is not null;

create trigger court_bookings_set_updated_at
  before update on public.court_bookings
  for each row execute function public.set_updated_at();

-- Cancha (opcional) del partido. La FK compuesta asegura que sea de la sede del partido.
alter table public.matches add column court_id uuid;
alter table public.matches
  add constraint matches_court_fk foreign key (court_id, venue_id) references public.courts (id, venue_id);
comment on column public.matches.court_id is 'Cancha elegida al crear el partido (opcional). Al confirmar, se reserva el turno.';

create index matches_court_idx on public.matches (court_id) where court_id is not null;
