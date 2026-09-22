-- Deportes (datos de referencia, todos los entornos). Idempotente.

insert into public.sports (slug, name, default_capacity, sort_order) values
  ('futbol-5', 'Fútbol 5', 10, 10),
  ('futbol-7', 'Fútbol 7', 14, 20),
  ('padel',    'Pádel',     4, 30),
  ('tenis',    'Tenis',     2, 40),
  ('voley',    'Vóley',    12, 50),
  ('basquet',  'Básquet',  10, 60)
on conflict (slug) do update
  set name             = excluded.name,
      default_capacity = excluded.default_capacity,
      sort_order       = excluded.sort_order;
