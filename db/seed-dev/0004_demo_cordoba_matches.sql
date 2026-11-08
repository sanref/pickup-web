-- Datos de DEMOSTRACIÓN para probar la app en Córdoba (rama develop). No correr en producción.
-- Agrega más sedes, 10 jugadores y 10 partidos con anotados y votos, sobre las sedes de 0003.
-- Los jugadores son perfiles sin cuenta de Neon Auth: no pueden iniciar sesión (para entrar, registrate
-- desde la app). Los horarios se calculan desde hoy: volver a correr el seed los corre hacia adelante.

insert into public.venues (id, name, address, city, location, timezone, status) values
  ('00000000-0000-4000-a000-000000000009', 'Gimnasio Güemes', 'Güemes', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.1960 -31.4270)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000010', 'Cancha Barrio Jardín', 'Barrio Jardín', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.2300 -31.4500)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000011', 'Pádel Cañada', 'Centro', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.1830 -31.4180)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000012', 'Complejo General Paz', 'General Paz', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.1650 -31.4080)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000013', 'Centro Deportivo Argüello', 'Argüello', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.2500 -31.3450)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000014', 'Tenis Club Observatorio', 'Observatorio', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.1950 -31.4350)'), 'America/Argentina/Cordoba', 'verified')
on conflict (id) do nothing;

insert into public.venue_sports (venue_id, sport_id)
select v.venue_id::uuid, s.id
from (values
  ('00000000-0000-4000-a000-000000000009', 'basquet'),
  ('00000000-0000-4000-a000-000000000009', 'voley'),
  ('00000000-0000-4000-a000-000000000010', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000011', 'padel'),
  ('00000000-0000-4000-a000-000000000012', 'futbol-7'),
  ('00000000-0000-4000-a000-000000000012', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000013', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000013', 'voley'),
  ('00000000-0000-4000-a000-000000000014', 'tenis'),
  ('00000000-0000-4000-a000-000000000014', 'padel')
) as v (venue_id, sport_slug)
join public.sports s on s.slug = v.sport_slug
on conflict do nothing;

insert into public.profiles (user_id, display_name, city, onboarded_at) values
  ('00000000-0000-4000-b000-000000000021', 'Matías Oviedo', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000022', 'Florencia Paz', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000023', 'Ignacio Quiroga', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000024', 'Julieta Arce', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000025', 'Lautaro Herrera', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000026', 'Abril Montenegro', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000027', 'Franco Allende', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000028', 'Candela Bustos', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000029', 'Emiliano Funes', 'Córdoba', now()),
  ('00000000-0000-4000-b000-000000000030', 'Milagros Cabrera', 'Córdoba', now())
on conflict (user_id) do nothing;

insert into public.matches (id, sport_id, venue_id, organizer_id, title, capacity, level, price_per_person, visibility, invite_code)
select m.id::uuid, s.id, m.venue_id::uuid, m.organizer_id::uuid, m.title, m.capacity, m.level::public.skill_level, m.price, m.visibility::public.match_visibility, m.invite_code
from (values
  ('00000000-0000-4000-8000-000000000011', 'futbol-5', '00000000-0000-4000-a000-000000000005', '00000000-0000-4000-b000-000000000021',
   'Fútbol 5 en Nueva Córdoba', 10, 'intermediate', 4000, 'public', 'democordo011'),
  ('00000000-0000-4000-8000-000000000012', 'padel', '00000000-0000-4000-a000-000000000008', '00000000-0000-4000-b000-000000000022',
   'Pádel dobles en Villa Belgrano', 4, null, 5500, 'public', 'democordo012'),
  ('00000000-0000-4000-8000-000000000013', 'futbol-7', '00000000-0000-4000-a000-000000000006', '00000000-0000-4000-b000-000000000023',
   'Fútbol 7 en Cerro Norte', 14, 'intermediate', 4800, 'public', 'democordo013'),
  ('00000000-0000-4000-8000-000000000014', 'voley', '00000000-0000-4000-a000-000000000007', '00000000-0000-4000-b000-000000000024',
   'Vóley mixto en Alta Córdoba', 12, 'beginner', 1500, 'public', 'democordo014'),
  ('00000000-0000-4000-8000-000000000015', 'basquet', '00000000-0000-4000-a000-000000000009', '00000000-0000-4000-b000-000000000025',
   'Básquet 5 contra 5 en Güemes', 10, null, 2500, 'public', 'democordo015'),
  ('00000000-0000-4000-8000-000000000016', 'tenis', '00000000-0000-4000-a000-000000000014', '00000000-0000-4000-b000-000000000026',
   'Tenis singles en el Observatorio', 2, 'advanced', 3500, 'public', 'democordo016'),
  ('00000000-0000-4000-8000-000000000017', 'futbol-5', '00000000-0000-4000-a000-000000000010', '00000000-0000-4000-b000-000000000027',
   'Fútbol 5 de amigos', 10, null, 3000, 'private', 'democordo017'),
  ('00000000-0000-4000-8000-000000000018', 'padel', '00000000-0000-4000-a000-000000000011', '00000000-0000-4000-b000-000000000028',
   'Pádel en la Cañada', 4, 'intermediate', 6000, 'public', 'democordo018'),
  ('00000000-0000-4000-8000-000000000019', 'futbol-7', '00000000-0000-4000-a000-000000000012', '00000000-0000-4000-b000-000000000029',
   'Fútbol 7 en General Paz', 14, 'advanced', 5000, 'public', 'democordo019'),
  ('00000000-0000-4000-8000-000000000020', 'futbol-5', '00000000-0000-4000-a000-000000000013', '00000000-0000-4000-b000-000000000030',
   'Fútbol 5 en Argüello', 10, null, 3500, 'public', 'democordo020')
) as m (id, sport_slug, venue_id, organizer_id, title, capacity, level, price, visibility, invite_code)
join public.sports s on s.slug = m.sport_slug
on conflict (id) do nothing;

-- Opciones de horario: días desde hoy + hora local de la sede. Las de un mismo partido tienen horas distintas.
insert into public.match_slots (id, match_id, starts_at, ends_at)
select format('00000000-0000-4000-9000-%s', lpad(o.slot::text, 12, '0'))::uuid, o.match_id::uuid, t.starts_at, t.starts_at + interval '1 hour'
from (values
  (1101, '00000000-0000-4000-8000-000000000011', 1, '20:00'),
  (1102, '00000000-0000-4000-8000-000000000011', 1, '21:00'),
  (1201, '00000000-0000-4000-8000-000000000012', 2, '19:30'),
  (1301, '00000000-0000-4000-8000-000000000013', 3, '21:00'),
  (1302, '00000000-0000-4000-8000-000000000013', 4, '20:00'),
  (1401, '00000000-0000-4000-8000-000000000014', 4, '10:00'),
  (1402, '00000000-0000-4000-8000-000000000014', 5, '11:00'),
  (1501, '00000000-0000-4000-8000-000000000015', 2, '20:30'),
  (1601, '00000000-0000-4000-8000-000000000016', 3, '17:00'),
  (1701, '00000000-0000-4000-8000-000000000017', 3, '21:30'),
  (1801, '00000000-0000-4000-8000-000000000018', 1, '18:00'),
  (1901, '00000000-0000-4000-8000-000000000019', 6, '20:00'),
  (2001, '00000000-0000-4000-8000-000000000020', 5, '18:00'),
  (2002, '00000000-0000-4000-8000-000000000020', 6, '12:00')
) as o (slot, match_id, days, local_time)
join public.matches m on m.id = o.match_id::uuid
join public.venues v on v.id = m.venue_id
cross join lateral (
  select (date_trunc('day', now() at time zone v.timezone) + o.days * interval '1 day' + o.local_time::time) at time zone v.timezone as starts_at
) t
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at;

-- Anotados y votos: (partido, jugador desde, jugador hasta, opciones que les sirven).
with ranges (match_num, from_user, to_user, slot_nums) as (values
  (11, 21, 28, '{1101}'), (11, 21, 24, '{1102}'),
  (12, 22, 24, '{1201}'),
  (13, 21, 29, '{1301}'), (13, 25, 29, '{1302}'),
  (14, 22, 27, '{1401}'), (14, 24, 27, '{1402}'),
  (15, 21, 30, '{1501}'),
  (16, 26, 26, '{1601}'),
  (17, 27, 29, '{1701}'),
  (18, 25, 28, '{1801}'),
  (19, 25, 29, '{1901}'),
  (20, 24, 30, '{2001}'), (20, 24, 27, '{2002}')
),
people as (
  select format('00000000-0000-4000-8000-%s', lpad(r.match_num::text, 12, '0'))::uuid as match_id,
         format('00000000-0000-4000-b000-%s', lpad(u::text, 12, '0'))::uuid as user_id,
         r.slot_nums::int[] as slot_nums
  from ranges r cross join lateral generate_series(r.from_user, r.to_user) as u
),
joined as (
  insert into public.match_participants (match_id, user_id, status)
  select distinct match_id, user_id, 'interested'::public.participant_status from people
  on conflict (match_id, user_id) do nothing
)
-- La FK voto → anotado se verifica al final de la sentencia: ya ve a los anotados del CTE.
insert into public.slot_votes (slot_id, match_id, user_id)
select format('00000000-0000-4000-9000-%s', lpad(s::text, 12, '0'))::uuid, p.match_id, p.user_id
from people p cross join unnest(p.slot_nums) as s
on conflict (slot_id, user_id) do nothing;

-- Pádel de Villa Belgrano: confirmado con 3 de 4 (queda un lugar). Pádel de la Cañada: confirmado y completo.
update public.matches
   set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now()),
       confirmed_slot_id = case id
         when '00000000-0000-4000-8000-000000000012' then '00000000-0000-4000-9000-000000001201'::uuid
         else '00000000-0000-4000-9000-000000001801'::uuid
       end
 where id in ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000018') and status = 'open';

update public.match_participants
   set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
 where match_id in ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000018') and status = 'interested';
