-- Sedes de DEMOSTRACIÓN para la rama develop (Rosario). No correr en producción.
-- Nombres tomados del handoff de diseño; coordenadas aproximadas del barrio. Idempotente.

insert into public.venues (id, name, address, city, location, timezone, status) values
  ('00000000-0000-4000-a000-000000000001', 'Complejo La Cantera', 'Av. Francia 1820, Pichincha', 'Rosario',
   st_geogfromtext('SRID=4326;POINT(-60.6560 -32.9383)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000002', 'El Potrero', 'Fisherton', 'Rosario',
   st_geogfromtext('SRID=4326;POINT(-60.7300 -32.9275)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000003', 'Norte Club', 'Alberdi', 'Rosario',
   st_geogfromtext('SRID=4326;POINT(-60.6780 -32.8930)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000004', 'Parque Sur', 'Parque Regional Sur', 'Rosario',
   st_geogfromtext('SRID=4326;POINT(-60.6400 -32.9960)'), 'America/Argentina/Cordoba', 'verified')
on conflict (id) do nothing;

insert into public.venue_sports (venue_id, sport_id)
select v.venue_id::uuid, s.id
from (values
  ('00000000-0000-4000-a000-000000000001', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000001', 'futbol-7'),
  ('00000000-0000-4000-a000-000000000002', 'futbol-7'),
  ('00000000-0000-4000-a000-000000000002', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000003', 'padel'),
  ('00000000-0000-4000-a000-000000000003', 'tenis'),
  ('00000000-0000-4000-a000-000000000004', 'voley'),
  ('00000000-0000-4000-a000-000000000004', 'basquet')
) as v (venue_id, sport_slug)
join public.sports s on s.slug = v.sport_slug
on conflict do nothing;
