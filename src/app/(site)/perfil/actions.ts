"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { profileSchema } from "@/lib/validations/profile";
import { auth, requireOnboardedActor } from "@/server/auth/session";
import { updateProfile } from "@/server/services/profiles";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function updateProfileAction(input: unknown): Promise<ActionResult> {
  const { user } = await requireOnboardedActor("/perfil");
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  try {
    await updateProfile(user.id, parsed.data);
  } catch {
    return { ok: false, error: "No pudimos guardar los cambios. Probá de nuevo." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changePasswordAction(_prev: ActionResult | undefined, form: FormData): Promise<ActionResult> {
  await requireOnboardedActor("/perfil");
  const parsed = z
    .object({
      currentPassword: z.string().min(1, "Poné tu contraseña actual."),
      newPassword: z.string().min(8, "La contraseña nueva tiene que tener al menos 8 caracteres.").max(128),
    })
    .safeParse({ currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Revisá los datos." };

  const { error } = await auth.changePassword({ ...parsed.data, revokeOtherSessions: true });
  if (error) {
    const code = (error.code ?? "").toUpperCase();
    const wrong =
      code === "INVALID_PASSWORD" || code === "INVALID_CREDENTIALS" || /invalid (email or )?password/i.test(error.message ?? "");
    if (!wrong) console.error("[auth] changePassword", error);
    return { ok: false, error: wrong ? "La contraseña actual no es correcta." : "No pudimos cambiar la contraseña. Probá de nuevo." };
  }
  return { ok: true };
}
