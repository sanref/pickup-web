-- Canchas de DEMOSTRACIÓN para las sedes de Rosario (rama develop). Idempotente.

insert into public.courts (venue_id, name, sport_id, slot_minutes, sort_order)
select c.venue_id::uuid, c.name, s.id, c.slot_minutes, c.sort_order
from (values
  ('00000000-0000-4000-a000-000000000001', 'Cancha 1', 'futbol-5', 60, 10),
  ('00000000-0000-4000-a000-000000000001', 'Cancha 2', 'futbol-5', 60, 20),
  ('00000000-0000-4000-a000-000000000001', 'Cancha 7', 'futbol-7', 60, 30),
  ('00000000-0000-4000-a000-000000000003', 'Pádel 1',  'padel',    90, 10),
  ('00000000-0000-4000-a000-000000000003', 'Pádel 2',  'padel',    90, 20),
  ('00000000-0000-4000-a000-000000000003', 'Tenis',    'tenis',    60, 30)
) as c (venue_id, name, sport_slug, slot_minutes, sort_order)
join public.sports s on s.slug = c.sport_slug
on conflict (venue_id, name) do nothing;
