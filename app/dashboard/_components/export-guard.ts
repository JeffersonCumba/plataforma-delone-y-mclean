"use client";

import { toast } from "sonner";

import { MIN_EXPORT_RESPONSES } from "@/lib/constants";

export function canExport(totalSurveys: number): boolean {
  if (totalSurveys < MIN_EXPORT_RESPONSES) {
    toast.warning(
      `Se requieren al menos ${MIN_EXPORT_RESPONSES} respuestas válidas para exportar.`,
    );
    return false;
  }

  return true;
}
