-- 0007 · Notificaciones (in-app + outbox de emails)
-- Se insertan en la misma transacción que la acción que las origina.
-- El email se manda después de responder; si falla, un cron reintenta los pendientes.

create table public.notifications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (user_id),
  type           text not null,
  match_id       uuid references public.matches (id) on delete cascade,
  payload        jsonb not null default '{}'::jsonb,
  read_at        timestamptz,
  send_email     boolean not null default true,
  emailed_at     timestamptz,
  email_attempts smallint not null default 0,
  created_at     timestamptz not null default now()
);
comment on column public.notifications.type is 'participant_joined, slot_reached_capacity, match_confirmed, promoted_from_waitlist, match_cancelled, match_reminder, voting_closed. Se valida en la aplicación.';

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_email_pending_idx on public.notifications (created_at)
  where send_email and emailed_at is null;
