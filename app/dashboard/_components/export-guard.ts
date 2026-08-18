"use client";

import { toast } from "sonner";

import { MIN_EXPORT_RESPONSES } from "@/lib/constants";

import type { createTranslator } from "next-intl";

export function canExport(
  totalSurveys: number,
  t?: ReturnType<typeof createTranslator>,
): boolean {
  if (totalSurveys < MIN_EXPORT_RESPONSES) {
    toast.warning(
      t
        ? t("export.minResponses", { count: MIN_EXPORT_RESPONSES })
        : `Se requieren al menos ${MIN_EXPORT_RESPONSES} respuestas válidas para exportar.`,
    );
    return false;
  }

  return true;
}
