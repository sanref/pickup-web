// Chequeo de tipos (sin código en runtime): el contrato de la API, que es autocontenido para
// poder copiarlo a pickup-mobile, tiene que coincidir con lo que devuelven los servicios ya
// serializado a JSON. Si algo se desincroniza, `npm run typecheck` falla en este archivo.

import type * as C from "@/lib/api/contract";
import type { ManageSlot, MatchDetail, MatchStatus, MyMatch, ParticipantStatus } from "@/server/services/matches";
import type { Sport, UserSport } from "@/server/services/profiles";
import type { MatchSearchResult } from "@/server/services/search";
import type { PickedPlace, PlaceSuggestion } from "@/server/services/places";
import type { CreateVenueResult, VenueStatus, VenueSummary } from "@/server/services/venues";

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Same<A, B> = Equals<C.Jsonify<A>, B>;
type Assert<T extends true> = T;

export type ContractChecks = [
  Assert<Equals<MatchStatus, C.MatchStatus>>,
  Assert<Equals<ParticipantStatus, C.ParticipantStatus>>,
  Assert<Equals<VenueStatus, C.VenueStatus>>,
  Assert<Same<Sport, C.ApiSport>>,
  Assert<Same<UserSport, C.ApiUserSport>>,
  Assert<Same<MatchSearchResult, C.ApiMatchSearchResult>>,
  Assert<Same<MatchDetail, C.ApiMatchDetail>>,
  Assert<Same<MyMatch, C.ApiMyMatch>>,
  Assert<Same<ManageSlot, C.ApiManageSlot>>,
  Assert<Same<VenueSummary, C.ApiVenue>>,
  Assert<Same<CreateVenueResult, C.ApiCreateVenueResult>>,
  Assert<Same<PlaceSuggestion, C.ApiPlaceSuggestion>>,
  Assert<Same<PickedPlace, C.ApiPlace>>,
];
