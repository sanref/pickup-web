// Contrato de la API v1 (/api/v1/*), la que consume la app mobile.
// Solo tipos: se derivan de los servicios para que la API y este archivo no se desincronicen.
// Las fechas viajan como string ISO 8601 en UTC (de ahí Jsonify).

import type { ManageSlot, MatchDetail, MyMatch, ParticipantStatus } from "@/server/services/matches";
import type { Sport, UserSport } from "@/server/services/profiles";
import type { MatchSearchResult } from "@/server/services/search";
import type { CreateVenueResult, VenueSummary } from "@/server/services/venues";

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
  | "internal"; // 500

export type ApiSuccess<T> = { data: T };
export type ApiErrorBody = {
  error: { code: ApiErrorCode; message: string; issues?: { path: string[]; message: string }[] };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

// — Recursos —

export type ApiSport = Sport;

export type ApiMe = {
  user: { id: string; email: string; name: string; image: string | null; emailVerified: boolean; isAdmin: boolean };
  profile: {
    displayName: string;
    avatarUrl: string | null;
    city: string | null;
    bio: string | null;
    onboarded: boolean;
  };
  sports: UserSport[];
  stats: { played: number; organized: number };
};

export type ApiMatchSearch = Jsonify<{ total: number; matches: MatchSearchResult[] }>;
export type ApiMatchDetail = Jsonify<MatchDetail>;
export type ApiMyMatch = Jsonify<MyMatch>;
export type ApiManageSlot = Jsonify<ManageSlot>;
export type ApiJoinResult = { status: ParticipantStatus };
export type ApiVenue = VenueSummary;
export type ApiVenueDetail = VenueSummary & { googlePlaceId: string | null; isMine: boolean };
export type ApiCreateVenueResult = CreateVenueResult;
