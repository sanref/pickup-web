-- 0001 · Extensiones
-- PostGIS: ubicación de sedes y búsqueda por distancia (ST_DWithin).
-- pg_trgm: similitud de nombres para detectar sedes duplicadas.

create extension if not exists postgis;
create extension if not exists pg_trgm;
