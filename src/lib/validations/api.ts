import { z } from "zod";
import { MAX_SLOTS } from "./match";
import { SKILL_LEVELS } from "./profile";
import { RADIUS_KM, SORT_OPTIONS, WHEN_OPTIONS, type Sort, type When } from "./search";

// Esquemas propios de la API v1 (query strings y cuerpos que en la web viajan por la URL o por
// argumentos de Server Actions). Los de alta y edición se reutilizan de match/profile/venue.

const invite = z.string().regex(/^[a-z0-9]{6,40}$/, "Código de invitación inválido.");
const lat = z.coerce.number().min(-90).max(90);
const lng = z.coerce.number().min(-180).max(180);

// GET /api/v1/matches — sin lat/lng se busca en la ciudad piloto.
export const searchMatchesQuerySchema = z
  .object({
    lat: lat.optional(),
    lng: lng.optional(),
    km: z.coerce.number().int().min(RADIUS_KM.min).max(RADIUS_KM.max).default(RADIUS_KM.default),
    sportId: z.coerce.number().int().positive().optional(),
    level: z.enum(SKILL_LEVELS).optional(),
    when: z.enum(WHEN_OPTIONS.map((o) => o.value) as [When, ...When[]]).default("todas"),
    sort: z.enum(SORT_OPTIONS.map((o) => o.value) as [Sort, ...Sort[]]).default("cerca"),
    limit: z.coerce.number().int().min(1).max(60).default(60),
  })
  .refine((q) => (q.lat == null) === (q.lng == null), "Mandá lat y lng juntas.");
export type SearchMatchesQuery = z.input<typeof searchMatchesQuerySchema>;

// GET /api/v1/venues
export const searchVenuesQuerySchema = z
  .object({
    q: z.string().trim().max(80).optional(),
    sportId: z.coerce.number().int().positive().optional(),
    lat: lat.optional(),
    lng: lng.optional(),
    limit: z.coerce.number().int().min(1).max(60).default(30),
  })
  .refine((q) => (q.lat == null) === (q.lng == null), "Mandá lat y lng juntas.");
export type SearchVenuesQuery = z.input<typeof searchVenuesQuerySchema>;

// GET /api/v1/matches/:id?invite=
export const matchDetailQuerySchema = z.object({ invite: invite.optional() });

// PUT /api/v1/matches/:id/votes
export const votesBodySchema = z.object({
  slotIds: z.array(z.string().uuid()).max(MAX_SLOTS),
  invite: invite.optional(),
});
export type VotesBody = z.infer<typeof votesBodySchema>;

// POST /api/v1/matches/:id/join
export const joinBodySchema = z.object({ invite: invite.optional() });
export type JoinBody = z.infer<typeof joinBodySchema>;

// POST /api/v1/matches/:id/confirm
export const confirmSlotBodySchema = z.object({ slotId: z.string().uuid() });
export type ConfirmSlotBody = z.infer<typeof confirmSlotBodySchema>;

// PUT /api/v1/matches/:id/auto-confirm
export const autoConfirmBodySchema = z.object({ value: z.boolean() });
export type AutoConfirmBody = z.infer<typeof autoConfirmBodySchema>;
