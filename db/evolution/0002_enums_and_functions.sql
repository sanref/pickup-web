-- 0002 · Tipos enumerados y funciones comunes

create type public.skill_level as enum ('beginner', 'intermediate', 'advanced');
comment on type public.skill_level is 'Nivel autodeclarado: Principiante / Intermedio / Avanzado. No es un ranking.';

create type public.venue_status as enum ('verified', 'pending', 'rejected');
comment on type public.venue_status is 'verified = catálogo; pending = propuesta por un usuario, sin revisar; rejected = descartada.';

create type public.team_role as enum ('owner', 'admin', 'member');

create type public.match_gender as enum ('mixed', 'male', 'female');

create type public.match_visibility as enum ('public', 'private');

create type public.match_status as enum ('draft', 'open', 'confirmed', 'played', 'cancelled');
comment on type public.match_status is 'draft → open (votación) → confirmed → played; cancelled desde open o confirmed.';

create type public.participant_status as enum ('interested', 'confirmed', 'waitlist', 'left');
comment on type public.participant_status is 'interested = se sumó y vota; confirmed = juega; waitlist = espera lugar; left = se bajó.';

-- Mantiene updated_at en las tablas que lo tienen.
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
