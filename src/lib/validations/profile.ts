import { z } from "zod";

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, { long: string; short: string }> = {
  beginner: { long: "Principiante", short: "Princ." },
  intermediate: { long: "Intermedio", short: "Interm." },
  advanced: { long: "Avanzado", short: "Avanz." },
};

const displayName = z.string().trim().min(1, "Poné cómo querés que te llamen.").max(60, "Máximo 60 caracteres.");
const city = z.string().trim().min(2, "Poné tu ciudad.").max(80, "Máximo 80 caracteres.");
const bio = z.string().trim().max(280, "Máximo 280 caracteres.").optional().default("");
const userSports = z
  .array(z.object({ sportId: z.number().int().positive(), level: z.enum(SKILL_LEVELS) }))
  .refine((items) => new Set(items.map((s) => s.sportId)).size === items.length, "Deporte repetido.");

export const onboardingSchema = z.object({
  displayName,
  city,
  bio,
  sports: userSports.min(1, "Elegí al menos un deporte."),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export const profileSchema = z.object({ displayName, city, bio, sports: userSports });
export type ProfileInput = z.infer<typeof profileSchema>;
