// Contrato de la API v1 (/api/v1/*), la que consume la app mobile.
//
// Autocontenido a propósito: solo importa de ../validations (que solo depende de zod), para que
// pickup-mobile lo pueda copiar tal cual (scripts/sync-shared de la app). Que coincida con lo que
// devuelven los servicios lo garantiza src/server/api/contract-check.ts: si un servicio cambia y
// este archivo no, `npm run typecheck` falla.
//
// Las fechas viajan como string ISO 8601 en UTC.

import type { SkillLevel } from "../validations/profile";

export type Jsonify<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Jsonify<U>[]
    : T extends object
      ? { [K in keyof T]: Jsonify<T[K]> }
      : T;

// — Sobre de respuesta —

export type ApiErrorCode =
  | "invalid_input" // 400: el cuerpo o la query no validan (ver `issues`)
  | "unauthorized" // 401: falta el header Authorization
  | "invalid_token" // 401: token inválido o vencido → renovarlo y reintentar
  | "banned" // 403
  | "onboarding_required" // 403: completar POST /me/onboarding
  | "forbidden" // 403
  | "not_found" // 404
  | "rejected" // 422: regla de negocio (votación cerrada, sin lugar…); `message` es para el usuario
  | "internal" // 500
  | "unavailable"; // 503: una función que depende de un servicio no configurado (Google Places)

export type ApiSuccess<T> = { data: T };
export type ApiErrorBody = {
  error: { code: ApiErrorCode; message: string; issues?: { path: string[]; message: string }[] };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

// — Enumerados —

export type MatchStatus = "draft" | "open" | "confirmed" | "played" | "cancelled";
export type ParticipantStatus = "interested" | "confirmed" | "waitlist" | "left";
export type VenueStatus = "verified" | "pending" | "rejected";
export type Visibility = "public" | "private";
export type LatLng = { lat: number; lng: number };

// — Perfil —

export type ApiSport = { id: number; slug: string; name: string; defaultCapacity: number };
export type ApiUserSport = { sportId: number; level: SkillLevel };

export type ApiMe = {
  user: { id: string; email: string; name: string; image: string | null; emailVerified: boolean; isAdmin: boolean };
  profile: {
    displayName: string;
    avatarUrl: string | null;
    city: string | null;
    bio: string | null;
    onboarded: boolean;
  };
  sports: ApiUserSport[];
  stats: { played: number; organized: number };
};

// — Partidos —

export type ApiMatchSearchResult = {
  id: string;
  title: string;
  status: "open" | "confirmed";
  capacity: number;
  level: SkillLevel | null;
  pricePerPerson: number | null;
  sport: { id: number; name: string; slug: string };
  venue: { id: string; name: string; city: string; timezone: string; location: LatLng };
  distanceKm: number;
  /** Opciones dentro de la ventana de fechas (en un confirmado, solo el horario confirmado). */
  slots: string[];
  /** Votos de la opción que va ganando (en votación) o confirmados. */
  filled: number;
  missing: number;
  participantCount: number;
  /** Los primeros anotados, para la pila de avatares. */
  people: { userId: string; displayName: string; avatarUrl: string | null }[];
  viewerJoined: boolean;
};
export type ApiMatchSearch = { total: number; matches: ApiMatchSearchResult[] };

export type ApiMatchParticipant = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  status: ParticipantStatus;
  isOrganizer: boolean;
  slotIds: string[];
};

export type ApiMatchDetail = {
  id: string;
  title: string;
  description: string | null;
  status: MatchStatus;
  visibility: Visibility;
  capacity: number;
  level: SkillLevel | null;
  pricePerPerson: number | null;
  currency: string;
  inviteCode: string | null;
  autoConfirm: boolean;
  confirmedSlotId: string | null;
  /** Jugado, o confirmado con el horario ya empezado. */
  played: boolean;
  sport: { id: number; name: string; slug: string };
  venue: { id: string; name: string; address: string; city: string; timezone: string; location: LatLng };
  /** Cancha de la sede, si el organizador eligió una. */
  court: { id: string; name: string } | null;
  organizer: { userId: string; displayName: string; avatarUrl: string | null };
  slots: { id: string; startsAt: string; endsAt: string; votes: number }[];
  /** Orden: confirmados por orden de confirmación, lista de espera por turno, interesados por llegada. */
  participants: ApiMatchParticipant[];
  viewer: {
    userId: string | null;
    isOrganizer: boolean;
    isParticipant: boolean;
    status: ParticipantStatus | null;
    waitlistPosition: number | null;
    slotIds: string[];
  };
};

export type ApiMyMatch = {
  id: string;
  title: string;
  status: MatchStatus;
  capacity: number;
  isOrganizer: boolean;
  myStatus: ParticipantStatus | null;
  waitlistPosition: number | null;
  organizerName: string;
  venueName: string;
  timezone: string;
  pricePerPerson: number | null;
  slots: { startsAt: string; votes: number }[];
  confirmedStartsAt: string | null;
  /** Cancelado, jugado o confirmado con el horario ya empezado. */
  isPast: boolean;
  participants: number;
  confirmed: number;
  myVotes: number;
};

export type ApiManageSlot = { id: string; startsAt: string; voters: { userId: string; displayName: string }[] };
export type ApiManage = { slots: ApiManageSlot[] };
export type ApiCreatedMatch = { id: string };
export type ApiJoinResult = { status: ParticipantStatus };
export type ApiInvite = { matchId: string };

// — Sedes —

export type ApiVenue = {
  id: string;
  name: string;
  address: string;
  city: string;
  status: VenueStatus;
  location: LatLng;
  sports: { id: number; name: string }[];
  distanceKm?: number;
};
export type ApiVenueDetail = ApiVenue & { googlePlaceId: string | null; isMine: boolean };
export type ApiCreateVenueResult = { id: string; existing: boolean };

// — Google Places (para proponer una sede) —

export type ApiPlaceSuggestion = { placeId: string; main: string; secondary: string };
/** Listo para POST /venues/similar y POST /venues (más los deportes). */
export type ApiPlace = { googlePlaceId: string; name: string; address: string; city: string; location: LatLng };
