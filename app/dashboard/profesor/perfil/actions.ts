"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { actualizarUsuarioMoodle } from "@/services/adminService";

export interface PerfilActionResult {
  ok: boolean;
  message: string;
}

export async function actualizarPerfilAction(
  input: Record<string, string>,
): Promise<PerfilActionResult> {
  const cookieStore = await cookies();
  const userId = Number(cookieStore.get("user_id")?.value);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { ok: false, message: "Sesion invalida." };
  }

  const changed: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (key !== "username" && typeof value === "string" && value.trim().length > 0) {
      changed[key] = value.trim();
    }
  }

  if (Object.keys(changed).length === 0) {
    return { ok: false, message: "No hay campos para actualizar." };
  }

  try {
    await actualizarUsuarioMoodle(userId, changed);
    revalidatePath("/dashboard/perfil");
    revalidatePath("/dashboard/profesor/perfil");
    return { ok: true, message: "Perfil actualizado correctamente." };
  } catch (error) {
    console.error("[actualizarPerfilAction]", error);
    return {
      ok: false,
      message: "No se pudo actualizar el perfil. Intenta de nuevo mas tarde.",
    };
  }
}
