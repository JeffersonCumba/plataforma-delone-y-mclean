"use server";

import { revalidatePath } from "next/cache";

import { translateError } from "@/lib/errors";
import { getServerLocale } from "@/lib/server-locale";
import { getServerSession } from "@/lib/session";
import { actualizarUsuarioMoodle } from "@/services/adminService";
import { resetVerificationIfEmailChanged } from "@/services/emailVerificationService";

export interface PerfilActionResult {
  ok: boolean;
  message: string;
}

export async function actualizarPerfilAction(
  input: Record<string, string>,
): Promise<PerfilActionResult> {
  const locale = await getServerLocale();
  const session = await getServerSession();
  if (!session) {
    return { ok: false, message: translateError(locale, "perfil.invalidSession") };
  }

  const changed: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key !== "username" && typeof value === "string" && value.trim().length > 0) {
      changed[key] = value.trim();
    }
  }

  if (Object.keys(changed).length === 0) {
    return { ok: false, message: translateError(locale, "perfil.noFields") };
  }

  try {
    await actualizarUsuarioMoodle(session.userId, changed);

    if (changed.email) {
      await resetVerificationIfEmailChanged(session.userId, changed.email);
    }

    revalidatePath("/dashboard/perfil");
    revalidatePath("/dashboard/profesor/perfil");
    revalidatePath("/dashboard");
    return { ok: true, message: translateError(locale, "perfil.updated") };
  } catch (error) {
    console.error("[actualizarPerfilAction]", error);
    return {
      ok: false,
      message: translateError(locale, "perfil.updateFailed"),
    };
  }
}
