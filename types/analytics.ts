import { type RowDataPacket } from "mysql2";

export interface FeedbackAnalyticsRow extends RowDataPacket {
  completedId: number;
  itemId: number;
  question: string;
  dimension: string;
  value: string;
}

export const DIMENSIONS_MAP = {
  calidad_sys: "Calidad del Sistema",
  calidad_info: "Calidad de la Información",
  calidad_serv: "Calidad del Servicio",
  uso_sistema: "Uso del Sistema",
  satis_user: "Satisfacción del Usuario",
  benef_netos: "Beneficios Netos",
} as const;

export type DimensionKey = keyof typeof DIMENSIONS_MAP;

export interface AnalyticsBarDatum {
  name: string;
  score: number;
  fill: string;
}

export interface AnalyticsQuestionAlert {
  question: string;
  dimension: DimensionKey;
  average: number;
}

export interface AnalyticsBetaDatum {
  key: "beta_sys" | "beta_info" | "beta_serv";
  name: string;
  value: number;
  fill: string;
}

export interface SatisfactionPieDatum {
  name: "Satisfechos" | "Neutrales" | "Insatisfechos";
  value: number;
  percentage: number;
  color: string;
}

export interface QuestionFrequency {
  pregunta: string;
  questionId: number;
  questionText: string;
  dimension: DimensionKey;
  "Totalmente en desacuerdo": number;
  "En desacuerdo": number;
  Neutral: number;
  "De acuerdo": number;
  "Totalmente de acuerdo": number;
}

export interface StructuralPathResult {
  key: string;
  from: DimensionKey;
  to: DimensionKey;
  name: string;
  coefficient: number;
  ciLow: number;
  ciHigh: number;
  significant: boolean;
}

export interface ConstructReliabilityResult {
  dimension: DimensionKey;
  name: string;
  itemCount: number;
  cronbachAlpha: number;
  compositeReliability: number;
  ave: number;
}

export interface DiscriminantValidityResult {
  left: DimensionKey;
  right: DimensionKey;
  leftName: string;
  rightName: string;
  correlation: number;
  sqrtAveLeft: number;
  sqrtAveRight: number;
  passesFornellLarcker: boolean;
}

export interface DeloneMcleanModelResult {
  sampleSize: number;
  bootstrapSamples: number;
  structuralPaths: StructuralPathResult[];
  constructReliability: ConstructReliabilityResult[];
  discriminantValidity: DiscriminantValidityResult[];
  rSquared: Partial<Record<DimensionKey, number>>;
}

export const LIKERT_LABELS = [
  "Totalmente en desacuerdo",
  "En desacuerdo",
  "Neutral",
  "De acuerdo",
  "Totalmente de acuerdo",
] as const;

export interface AnalyticsData {
  totalSurveys: number;
  totalRespondents: number;
  responseRate: number;
  cronbachAlpha: number;
  promediosDimensiones: Record<DimensionKey, number>;
  dimensionChartData: AnalyticsBarDatum[];
  betaCoefficients: AnalyticsBetaDatum[];
  criticalQuestions: AnalyticsQuestionAlert[];
  satisfactionDistribution: SatisfactionPieDatum[];
  questionFrequencies: QuestionFrequency[];
  deloneMcleanModel: DeloneMcleanModelResult;
}
