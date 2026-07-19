import type { AnalyticsData } from "@/types/analytics";
import type { AiConclusions } from "@/lib/odt-report";

export interface ExportExcelRequest {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
}

export interface ExportPdfRequest {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  aiInterpretations: AiConclusions;
}

export type ExportVariant = "button" | "dropdown-item";
