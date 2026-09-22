-- 0006 · Partidos, opciones de horario, participantes y votos

create table public.matches (
  id                uuid primary key default gen_random_uuid(),
  sport_id          smallint not null references public.sports (id),
  venue_id          uuid not null references public.venues (id),
  organizer_id      uuid not null references public.profiles (user_id),
  team_id           uuid references public.teams (id) on delete set null,
  title             text not null check (char_length(title) between 3 and 80),
  description       text check (char_length(description) <= 1000),
  capacity          smallint not null check (capacity between 2 and 30),
  level             public.skill_level,
  gender            public.match_gender not null default 'mixed',
  price_per_person  numeric(10, 2) check (price_per_person >= 0),
  currency          char(3) not null default 'ARS',
  visibility        public.match_visibility not null default 'public',
  invite_code       text not null unique,
  status            public.match_status not null default 'open',
  auto_confirm      boolean not null default false,
  voting_deadline   timestamptz,
  confirmed_slot_id uuid,
  contact_link      text,
  confirmed_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint matches_confirmed_has_slot
    check (status not in ('confirmed', 'played') or confirmed_slot_id is not null)
);
comment on table public.matches is 'Convocatoria a un partido. Se vota entre varias opciones de horario (match_slots) hasta confirmar una.';
comment on column public.matches.level is 'Nivel sugerido; null = cualquier nivel.';
comment on column public.matches.price_per_person is 'Null = sin costo o no informado.';
comment on column public.matches.contact_link is 'Link al grupo (p. ej. WhatsApp). Solo lo ven los confirmados.';

create index matches_status_sport_idx on public.matches (status, sport_id);
create index matches_venue_idx on public.matches (venue_id);
create index matches_organizer_idx on public.matches (organizer_id);
create index matches_team_idx on public.matches (team_id) where team_id is not null;

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

create table public.match_slots (
  id        uuid primary key default gen_random_uuid(),
  match_id  uuid not null references public.matches (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at   timestamptz not null,
  constraint match_slots_valid_range check (ends_at > starts_at),
  constraint match_slots_unique_start unique (match_id, starts_at),
  -- Permite FKs compuestas que garantizan que la opción pertenece al partido.
  constraint match_slots_id_match_key unique (id, match_id)
);
comment on table public.match_slots is 'Opciones de fecha y hora que propone el organizador.';

create index match_slots_starts_at_idx on public.match_slots (starts_at);

-- La opción confirmada tiene que ser una opción de ESE partido.
alter table public.matches
  add constraint matches_confirmed_slot_fk
  foreign key (confirmed_slot_id, id) references public.match_slots (id, match_id);

create table public.match_participants (
  match_id          uuid not null references public.matches (id) on delete cascade,
  user_id           uuid not null references public.profiles (user_id),
  status            public.participant_status not null default 'interested',
  joined_at         timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  confirmed_at      timestamptz,
  primary key (match_id, user_id)
);
comment on column public.match_participants.status_changed_at is 'Orden de la lista de espera: el que entró antes a waitlist sube primero.';

create index match_participants_user_idx on public.match_participants (user_id, status);
create index match_participants_match_status_idx on public.match_participants (match_id, status);

-- Un voto = "esta opción me sirve". Solo pueden votar participantes del partido,
-- y la opción tiene que ser de ese partido (FKs compuestas).
create table public.slot_votes (
  slot_id    uuid not null,
  match_id   uuid not null,
  user_id    uuid not null,
  created_at timestamptz not null default now(),
  primary key (slot_id, user_id),
  constraint slot_votes_slot_fk
    foreign key (slot_id, match_id) references public.match_slots (id, match_id) on delete cascade,
  constraint slot_votes_participant_fk
    foreign key (match_id, user_id) references public.match_participants (match_id, user_id) on delete cascade
);
comment on column public.slot_votes.created_at is 'Orden de confirmación: al confirmar una opción, entran primero los que la votaron antes.';

create index slot_votes_match_user_idx on public.slot_votes (match_id, user_id);
