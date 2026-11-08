-- Partidos de DEMOSTRACIÓN para la rama develop (/explorar y la landing con datos). No correr en producción.
-- Usa las sedes de 0001_demo_venues. Los horarios se calculan desde hoy: volver a correr el seed los
-- corre hacia adelante. Los jugadores son perfiles sin cuenta de Neon Auth (no pueden iniciar sesión).

insert into public.profiles (user_id, display_name, city, onboarded_at) values
  ('00000000-0000-4000-b000-000000000001', 'Martina Ferreyra', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000002', 'Joaquín López', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000003', 'Valentina Gómez', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000004', 'Santiago Ruiz', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000005', 'Camila Sosa', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000006', 'Tomás Acosta', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000007', 'Lucía Benítez', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000008', 'Nicolás Medina', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000009', 'Rocío Suárez', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000010', 'Facundo Romero', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000011', 'Agustina Díaz', 'Rosario', now()),
  ('00000000-0000-4000-b000-000000000012', 'Bruno Castro', 'Rosario', now())
on conflict (user_id) do nothing;

-- Todos arrancan en votación; el de pádel se confirma más abajo (necesita su opción cargada).
insert into public.matches (id, sport_id, venue_id, organizer_id, title, capacity, level, price_per_person, visibility, invite_code)
select m.id::uuid, s.id, m.venue_id::uuid, m.organizer_id::uuid, m.title, m.capacity, m.level::public.skill_level, m.price, m.visibility::public.match_visibility, m.invite_code
from (values
  ('00000000-0000-4000-8000-000000000001', 'futbol-5', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000001',
   'Fútbol 5 de los jueves', 10, 'intermediate', 4500, 'public', 'demojueves01'),
  ('00000000-0000-4000-8000-000000000002', 'padel', '00000000-0000-4000-a000-000000000003', '00000000-0000-4000-b000-000000000009',
   'Pádel dobles en Norte Club', 4, null, 6000, 'public', 'demopadel002'),
  ('00000000-0000-4000-8000-000000000003', 'voley', '00000000-0000-4000-a000-000000000004', '00000000-0000-4000-b000-000000000003',
   'Vóley mixto en el parque', 12, 'beginner', 2000, 'public', 'demovoley003'),
  ('00000000-0000-4000-8000-000000000004', 'futbol-7', '00000000-0000-4000-a000-000000000002', '00000000-0000-4000-b000-000000000005',
   'Fútbol 7 en Fisherton', 14, 'intermediate', 5200, 'public', 'demof7fish04'),
  ('00000000-0000-4000-8000-000000000005', 'futbol-5', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000012',
   'Fútbol 5 a la tarde', 10, null, null, 'public', 'demotarde005'),
  ('00000000-0000-4000-8000-000000000006', 'futbol-5', '00000000-0000-4000-a000-000000000001', '00000000-0000-4000-b000-000000000002',
   'Fútbol 5 de la oficina', 10, null, 3000, 'private', 'demoprivado6')
) as m (id, sport_slug, venue_id, organizer_id, title, capacity, level, price, visibility, invite_code)
join public.sports s on s.slug = m.sport_slug
on conflict (id) do nothing;

-- Opciones de horario: días desde hoy + hora local de la sede. Las de un mismo partido tienen horas
-- distintas, así correrlas de día nunca choca con match_slots_unique_start.
insert into public.match_slots (id, match_id, starts_at, ends_at)
select o.id::uuid, o.match_id::uuid, t.starts_at, t.starts_at + interval '1 hour'
from (values
  ('00000000-0000-4000-9000-000000000011', '00000000-0000-4000-8000-000000000001', 2, '20:00'),
  ('00000000-0000-4000-9000-000000000012', '00000000-0000-4000-8000-000000000001', 2, '21:00'),
  ('00000000-0000-4000-9000-000000000021', '00000000-0000-4000-8000-000000000002', 3, '19:30'),
  ('00000000-0000-4000-9000-000000000031', '00000000-0000-4000-8000-000000000003', 4, '10:00'),
  ('00000000-0000-4000-9000-000000000032', '00000000-0000-4000-8000-000000000003', 5, '11:00'),
  ('00000000-0000-4000-9000-000000000041', '00000000-0000-4000-8000-000000000004', 5, '18:00'),
  ('00000000-0000-4000-9000-000000000051', '00000000-0000-4000-8000-000000000005', 9, '18:30'),
  ('00000000-0000-4000-9000-000000000061', '00000000-0000-4000-8000-000000000006', 3, '21:00')
) as o (id, match_id, days, local_time)
join public.matches m on m.id = o.match_id::uuid
join public.venues v on v.id = m.venue_id
cross join lateral (
  select (date_trunc('day', now() at time zone v.timezone) + o.days * interval '1 day' + o.local_time::time) at time zone v.timezone as starts_at
) t
on conflict (id) do update set starts_at = excluded.starts_at, ends_at = excluded.ends_at;

-- Anotados y votos: (partido, jugador, opciones que le sirven).
with votes (match_id, user_id, slot_ids) as (values
  ('00000000-0000-4000-8000-000000000001', 1, '{11,12}'), ('00000000-0000-4000-8000-000000000001', 2, '{11,12}'),
  ('00000000-0000-4000-8000-000000000001', 3, '{11}'), ('00000000-0000-4000-8000-000000000001', 4, '{11}'),
  ('00000000-0000-4000-8000-000000000001', 5, '{11}'), ('00000000-0000-4000-8000-000000000001', 6, '{11}'),
  ('00000000-0000-4000-8000-000000000001', 7, '{11}'), ('00000000-0000-4000-8000-000000000001', 8, '{12}'),
  ('00000000-0000-4000-8000-000000000002', 9, '{21}'), ('00000000-0000-4000-8000-000000000002', 10, '{21}'),
  ('00000000-0000-4000-8000-000000000002', 11, '{21}'),
  ('00000000-0000-4000-8000-000000000003', 3, '{31,32}'), ('00000000-0000-4000-8000-000000000003', 1, '{31}'),
  ('00000000-0000-4000-8000-000000000003', 2, '{31}'), ('00000000-0000-4000-8000-000000000003', 4, '{31,32}'),
  ('00000000-0000-4000-8000-000000000003', 5, '{31}'), ('00000000-0000-4000-8000-000000000003', 6, '{31}'),
  ('00000000-0000-4000-8000-000000000003', 7, '{31}'), ('00000000-0000-4000-8000-000000000003', 8, '{31}'),
  ('00000000-0000-4000-8000-000000000003', 9, '{31}'), ('00000000-0000-4000-8000-000000000003', 10, '{31}'),
  ('00000000-0000-4000-8000-000000000004', 5, '{41}'), ('00000000-0000-4000-8000-000000000004', 1, '{41}'),
  ('00000000-0000-4000-8000-000000000004', 2, '{41}'), ('00000000-0000-4000-8000-000000000004', 3, '{41}'),
  ('00000000-0000-4000-8000-000000000004', 4, '{41}'), ('00000000-0000-4000-8000-000000000004', 6, '{41}'),
  ('00000000-0000-4000-8000-000000000004', 7, '{41}'), ('00000000-0000-4000-8000-000000000004', 8, '{41}'),
  ('00000000-0000-4000-8000-000000000005', 12, '{51}'), ('00000000-0000-4000-8000-000000000005', 6, '{51}'),
  ('00000000-0000-4000-8000-000000000006', 2, '{61}'), ('00000000-0000-4000-8000-000000000006', 11, '{61}')
),
people as (
  select v.match_id::uuid as match_id, format('00000000-0000-4000-b000-%s', lpad(v.user_id::text, 12, '0'))::uuid as user_id, v.slot_ids::int[] as slot_ids
  from votes v
),
joined as (
  insert into public.match_participants (match_id, user_id, status)
  select match_id, user_id, 'interested' from people
  on conflict (match_id, user_id) do nothing
)
-- La FK voto → anotado se verifica al final de la sentencia: ya ve a los anotados del CTE.
insert into public.slot_votes (slot_id, match_id, user_id)
select format('00000000-0000-4000-9000-%s', lpad(s::text, 12, '0'))::uuid, p.match_id, p.user_id
from people p cross join unnest(p.slot_ids) as s
on conflict (slot_id, user_id) do nothing;

-- Pádel: confirmado con 3 de 4 (queda un lugar).
update public.matches
   set status = 'confirmed', confirmed_slot_id = '00000000-0000-4000-9000-000000000021', confirmed_at = coalesce(confirmed_at, now())
 where id = '00000000-0000-4000-8000-000000000002' and status = 'open';

update public.match_participants
   set status = 'confirmed', confirmed_at = coalesce(confirmed_at, now())
 where match_id = '00000000-0000-4000-8000-000000000002' and status = 'interested';
