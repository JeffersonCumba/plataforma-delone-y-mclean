import "server-only";

import { type RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";

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

export interface AnalyticsData {
  totalRespondidas: number;
  chartData: AnalyticsBarDatum[];
}

interface FeedbackAnalyticsRow extends RowDataPacket {
  completedId: number;
  label: string;
  dimension: string;
  value: string;
}

const DIMENSION_KEYWORDS: Record<DimensionKey, string[]> = {
  calidad_sys: [
    "calidad_sys",
    "calidad del sistema",
    "sistema",
    "usabilidad",
    "facil de usar",
    "amigable",
    "rendimiento",
    "estable",
  ],
  calidad_info: [
    "calidad_info",
    "calidad de la informacion",
    "informacion",
    "contenido",
    "claridad",
    "relevante",
    "comprensible",
    "actualizada",
  ],
  calidad_serv: [
    "calidad_serv",
    "calidad del servicio",
    "servicio",
    "soporte",
    "asistencia",
    "atencion",
    "ayuda",
  ],
  uso_sistema: [
    "uso_sistema",
    "uso del sistema",
    "frecuencia de uso",
    "utilizar",
    "usar",
    "adopcion",
    "intencion de uso",
  ],
  satis_user: [
    "satis_user",
    "satisfaccion del usuario",
    "satisfaccion",
    "satisfecho",
    "experiencia",
    "me gusta",
    "recomendaria",
  ],
  benef_netos: [
    "benef_netos",
    "beneficios netos",
    "beneficio",
    "impacto",
    "productividad",
    "aprendizaje",
    "resultado",
    "efectividad",
  ],
};

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isDimensionKey(value: string): value is DimensionKey {
  return value in DIMENSIONS_MAP;
}

function resolveDimensionKey(
  label: string,
  dimension?: string,
): DimensionKey | null {
  const normalizedDimension = normalizeText(dimension ?? "").replace(
    /\s+/g,
    "_",
  );
  if (isDimensionKey(normalizedDimension)) {
    return normalizedDimension;
  }

  const normalizedLabel = normalizeText(label);
  let bestMatch: { key: DimensionKey; score: number } | null = null;

  for (const [key, keywords] of Object.entries(DIMENSION_KEYWORDS) as [
    DimensionKey,
    string[],
  ][]) {
    const score = keywords.reduce((acc, keyword) => {
      const normalizedKeyword = normalizeText(keyword);
      return normalizedLabel.includes(normalizedKeyword) ? acc + 1 : acc;
    }, 0);

    if (score === 0) {
      continue;
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { key, score };
    }
  }

  return bestMatch?.key ?? null;
}

export function parseMoodleValue(value: string): number {
  const rawNumber = value.split(">>")[0]?.trim() ?? "";
  const parsed = Number.parseFloat(rawNumber);
  return Number.isFinite(parsed) ? parsed : 0;
}

function resolveColor(score: number): string {
  if (score >= 4) {
    return "#22c55e";
  }

  if (score >= 3) {
    return "#eab308";
  }

  return "#ef4444";
}

function buildAnalyticsChartData(
  rows: FeedbackAnalyticsRow[],
): AnalyticsBarDatum[] {
  const accumulator = new Map<DimensionKey, { sum: number; count: number }>();

  for (const row of rows) {
    const dimensionKey = resolveDimensionKey(row.label, row.dimension);
    if (!dimensionKey) {
      continue;
    }

    const current = accumulator.get(dimensionKey) ?? { sum: 0, count: 0 };

    current.sum += parseMoodleValue(row.value);
    current.count += 1;

    accumulator.set(dimensionKey, current);
  }

  return Object.entries(DIMENSIONS_MAP).map(([key, name]) => {
    const bucket = accumulator.get(key as DimensionKey);
    const score = bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;

    return {
      name,
      score: Number(score.toFixed(2)),
      fill: resolveColor(score),
    };
  });
}

export async function getAnalyticsData(
  courseId: number,
): Promise<AnalyticsData> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("El courseId no es valido para consultar analitica");
  }

  const [rows] = await pool.execute<FeedbackAnalyticsRow[]>(
    `SELECT
        fc.id AS completedId,
        fi.name AS label,
        fi.label as dimension,
        fv.value AS value
      FROM mdl_feedback_value fv
      INNER JOIN mdl_feedback_completed fc ON fc.id = fv.completed
      INNER JOIN mdl_feedback f ON f.id = fc.feedback
      INNER JOIN mdl_feedback_item fi ON fi.id = fv.item
      WHERE f.course = ?
        AND fv.value IS NOT NULL
        AND fv.value <> ''`,
    [courseId],
  );

  const totalRespondidas = new Set(rows.map((row) => row.completedId)).size;

  return {
    totalRespondidas,
    chartData: buildAnalyticsChartData(rows),
  };
}
