"use client";

import { toast } from "sonner";

export function getMoodleLoginUrl(): string {
  const base = process.env.NEXT_PUBLIC_MOODLE_BASE_URL?.trim() ?? "";
  return `${base}/login/index.php`;
}

export async function copyMoodleLoginLink(): Promise<boolean> {
  const url = getMoodleLoginUrl();

  if (!url || url === "/login/index.php") {
    toast.error("No hay URL base configurada para Moodle");
    return false;
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success("Enlace copiado");
    return true;
  } catch {
    toast.error("No se pudo copiar el enlace");
    return false;
  }
}
