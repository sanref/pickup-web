-- Sedes de DEMOSTRACIÓN en Córdoba capital para la rama develop. No correr en producción.
-- Nombres inventados (no son comercios reales); coordenadas aproximadas del barrio. Idempotente.

insert into public.venues (id, name, address, city, location, timezone, status) values
  ('00000000-0000-4000-a000-000000000005', 'Complejo Nueva Córdoba', 'Nueva Córdoba', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.1890 -31.4250)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000006', 'Cancha Cerro Norte', 'Cerro de las Rosas', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.2250 -31.3800)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000007', 'Club Alta Córdoba', 'Alta Córdoba', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.1750 -31.3950)'), 'America/Argentina/Cordoba', 'verified'),
  ('00000000-0000-4000-a000-000000000008', 'Polideportivo Villa Belgrano', 'Villa Belgrano', 'Córdoba',
   st_geogfromtext('SRID=4326;POINT(-64.2750 -31.3600)'), 'America/Argentina/Cordoba', 'verified')
on conflict (id) do nothing;

insert into public.venue_sports (venue_id, sport_id)
select v.venue_id::uuid, s.id
from (values
  ('00000000-0000-4000-a000-000000000005', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000005', 'padel'),
  ('00000000-0000-4000-a000-000000000006', 'futbol-7'),
  ('00000000-0000-4000-a000-000000000006', 'futbol-5'),
  ('00000000-0000-4000-a000-000000000007', 'voley'),
  ('00000000-0000-4000-a000-000000000007', 'basquet'),
  ('00000000-0000-4000-a000-000000000008', 'padel'),
  ('00000000-0000-4000-a000-000000000008', 'tenis')
) as v (venue_id, sport_slug)
join public.sports s on s.slug = v.sport_slug
on conflict do nothing;
