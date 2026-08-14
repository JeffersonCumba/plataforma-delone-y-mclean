import type { AnalyticsData } from "@/types/analytics";

export interface AiConclusions {
  satisfaction: string;
  descriptive: string;
  betas: string;
  frequencies: string;
  critical: string;
}

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

export interface ExportOdtRequest {
  courseId: number;
  courseName: string;
  analytics: AnalyticsData;
  aiInterpretations: AiConclusions;
}

export type ExportVariant = "button" | "dropdown-item";
