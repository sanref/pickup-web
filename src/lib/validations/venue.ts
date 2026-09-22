import { z } from "zod";

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createVenueSchema = z.object({
  name: z.string().trim().min(2, "El nombre es muy corto.").max(120, "Máximo 120 caracteres."),
  address: z.string().trim().min(3, "Falta la dirección.").max(200),
  city: z.string().trim().min(2, "Falta la ciudad.").max(80),
  location: coordinatesSchema,
  googlePlaceId: z.string().trim().min(10).max(300),
  sportIds: z.array(z.number().int().positive()).min(1, "Elegí al menos un deporte.").max(10),
});
export type CreateVenueInput = z.infer<typeof createVenueSchema>;

export const similarVenuesSchema = z.object({
  name: z.string().trim().min(2).max(120),
  location: coordinatesSchema,
  googlePlaceId: z.string().trim().max(300).optional(),
});
export type SimilarVenuesInput = z.infer<typeof similarVenuesSchema>;
