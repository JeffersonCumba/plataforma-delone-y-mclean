import "server-only";

import { sampleVariance } from "simple-statistics";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";
import { type RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { obtenerEncuestadosPorCurso } from "@/services/respondentService";
import {
  DIMENSIONS_MAP,
  type AnalyticsBetaDatum,
  type AnalyticsData,
  type AnalyticsQuestionAlert,
  type DimensionKey,
  type QuestionFrequency,
  type SatisfactionPieDatum,
} from "@/types/analytics";

type LikertValue = 1 | 2 | 3 | 4 | 5;
type LikertCounts = Record<LikertValue, number>;

const EMPTY_LIKERT_COUNTS: LikertCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

function isLikertValue(score: number): score is LikertValue {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

interface FeedbackAnalyticsRow extends RowDataPacket {
  completedId: number;
  itemId: number;
  question: string;
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

function parseMoodleValue(value: string): number {
  const rawNumber = value.split(">>")[0]?.trim() ?? "";
  const parsed = Number.parseFloat(rawNumber);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeVariance(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  try {
    return sampleVariance(values);
  } catch {
    return 0;
  }
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

function buildAlpha(itemMatrix: number[][]): number {
  if (itemMatrix.length < 2 || itemMatrix[0]?.length < 2) {
    return 0;
  }

  const columnCount = itemMatrix[0].length;
  const columnVariances = Array.from({ length: columnCount }, (_, index) =>
    safeVariance(itemMatrix.map((row) => row[index] ?? 0)),
  );

  const totalScores = itemMatrix.map((row) =>
    row.reduce((acc, value) => acc + value, 0),
  );
  const totalVariance = safeVariance(totalScores);

  if (totalVariance <= 0) {
    return 0;
  }

  const sumOfColumnVariances = columnVariances.reduce(
    (acc, value) => acc + value,
    0,
  );
  const alphaValue =
    (columnCount / (columnCount - 1)) *
    (1 - sumOfColumnVariances / totalVariance);

  return Number.isFinite(alphaValue) ? Number(alphaValue.toFixed(3)) : 0;
}

function buildRegressionBetas(
  rows: Array<{
    qualitySys: number | null;
    qualityInfo: number | null;
    qualityServ: number | null;
    satisfaction: number | null;
  }>,
): AnalyticsBetaDatum[] {
  const emptyBetas: AnalyticsBetaDatum[] = [
    {
      key: "beta_sys",
      name: "Calidad del Sistema",
      value: 0,
      fill: "#0f766e",
    },
    {
      key: "beta_info",
      name: "Calidad de la Información",
      value: 0,
      fill: "#2563eb",
    },
    {
      key: "beta_serv",
      name: "Calidad del Servicio",
      value: 0,
      fill: "#7c3aed",
    },
  ];

  const usableRows = rows.filter(
    (
      row,
    ): row is {
      qualitySys: number;
      qualityInfo: number;
      qualityServ: number;
      satisfaction: number;
    } =>
      row.qualitySys !== null &&
      row.qualityInfo !== null &&
      row.qualityServ !== null &&
      row.satisfaction !== null,
  );

  if (usableRows.length < 2) {
    return emptyBetas;
  }

  const xMatrix = usableRows.map((row) => [
    row.qualitySys,
    row.qualityInfo,
    row.qualityServ,
  ]);
  const yMatrix = usableRows.map((row) => [row.satisfaction]);

  const regression = new MultivariateLinearRegression(xMatrix, yMatrix, {
    intercept: true,
  });

  const weights = regression.weights;
  const betaCoefficients: AnalyticsBetaDatum[] = [
    {
      key: "beta_sys",
      name: "Calidad del Sistema",
      value: Number((weights[1]?.[0] ?? 0).toFixed(3)),
      fill: "#0f766e",
    },
    {
      key: "beta_info",
      name: "Calidad de la Información",
      value: Number((weights[2]?.[0] ?? 0).toFixed(3)),
      fill: "#2563eb",
    },
    {
      key: "beta_serv",
      name: "Calidad del Servicio",
      value: Number((weights[3]?.[0] ?? 0).toFixed(3)),
      fill: "#7c3aed",
    },
  ];

  return betaCoefficients.sort(
    (left, right) => Math.abs(right.value) - Math.abs(left.value),
  );
}

function buildQuestionAlerts(
  questionAccumulator: Map<
    string,
    { dimension: DimensionKey; sum: number; count: number }
  >,
): AnalyticsQuestionAlert[] {
  return Array.from(questionAccumulator.entries())
    .map(([question, bucket]) => ({
      question,
      dimension: bucket.dimension,
      average: Number((bucket.sum / Math.max(bucket.count, 1)).toFixed(2)),
    }))
    .filter((item) => item.average < 3)
    .sort((left, right) => left.average - right.average)
    .slice(0, 3);
}

function buildSatisfactionDistribution(
  surveyAccumulator: Map<
    number,
    {
      dimensions: Map<DimensionKey, { sum: number; count: number }>;
      questionValues: Map<string, number>;
    }
  >,
): SatisfactionPieDatum[] {
  const counts = {
    Satisfechos: 0,
    Neutrales: 0,
    Insatisfechos: 0,
  };

  for (const survey of surveyAccumulator.values()) {
    const bucket = survey.dimensions.get("satis_user");
    if (!bucket || bucket.count === 0) {
      continue;
    }

    const mean = bucket.sum / bucket.count;

    if (mean >= 4) {
      counts.Satisfechos += 1;
    } else if (mean >= 3) {
      counts.Neutrales += 1;
    } else {
      counts.Insatisfechos += 1;
    }
  }

  const total = counts.Satisfechos + counts.Neutrales + counts.Insatisfechos;
  const safePercentage = (value: number) =>
    total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0;

  return [
    {
      name: "Satisfechos",
      value: counts.Satisfechos,
      percentage: safePercentage(counts.Satisfechos),
      color: "#10b981",
    },
    {
      name: "Neutrales",
      value: counts.Neutrales,
      percentage: safePercentage(counts.Neutrales),
      color: "#f59e0b",
    },
    {
      name: "Insatisfechos",
      value: counts.Insatisfechos,
      percentage: safePercentage(counts.Insatisfechos),
      color: "#f43f5e",
    },
  ];
}

function buildQuestionFrequencies(
  questionAccumulator: Map<
    string,
    {
      dimension: DimensionKey;
      sum: number;
      count: number;
      firstItemId: number;
      likertCounts: LikertCounts;
    }
  >,
): QuestionFrequency[] {
  const sortedEntries = Array.from(questionAccumulator.entries()).sort(
    (left, right) => left[1].firstItemId - right[1].firstItemId,
  );

  return sortedEntries.map(([question, bucket], index) => ({
    pregunta: `P${index + 1}`,
    questionId: bucket.firstItemId,
    questionText: question,
    dimension: bucket.dimension,
    "Totalmente en desacuerdo": bucket.likertCounts[1],
    "En desacuerdo": bucket.likertCounts[2],
    Neutral: bucket.likertCounts[3],
    "De acuerdo": bucket.likertCounts[4],
    "Totalmente de acuerdo": bucket.likertCounts[5],
  }));
}

function buildAnalyticsData(
  rows: FeedbackAnalyticsRow[],
): Omit<AnalyticsData, "totalRespondents" | "responseRate"> {
  const dimensionAccumulator = new Map<
    DimensionKey,
    { sum: number; count: number }
  >();
  const questionAccumulator = new Map<
    string,
    {
      dimension: DimensionKey;
      sum: number;
      count: number;
      firstItemId: number;
      likertCounts: LikertCounts;
    }
  >();
  const surveyAccumulator = new Map<
    number,
    {
      dimensions: Map<DimensionKey, { sum: number; count: number }>;
      questionValues: Map<string, number>;
    }
  >();

  for (const row of rows) {
    const dimensionKey = resolveDimensionKey(row.question, row.dimension);
    if (!dimensionKey) {
      continue;
    }

    const score = parseMoodleValue(row.value);

    const dimensionBucket = dimensionAccumulator.get(dimensionKey) ?? {
      sum: 0,
      count: 0,
    };
    dimensionBucket.sum += score;
    dimensionBucket.count += 1;
    dimensionAccumulator.set(dimensionKey, dimensionBucket);

    const questionBucket = questionAccumulator.get(row.question) ?? {
      dimension: dimensionKey,
      sum: 0,
      count: 0,
      firstItemId: row.itemId,
      likertCounts: { ...EMPTY_LIKERT_COUNTS },
    };
    questionBucket.dimension = dimensionKey;
    questionBucket.sum += score;
    questionBucket.count += 1;
    if (isLikertValue(score)) {
      questionBucket.likertCounts[score] += 1;
    }
    questionAccumulator.set(row.question, questionBucket);

    const surveyBucket = surveyAccumulator.get(row.completedId) ?? {
      dimensions: new Map<DimensionKey, { sum: number; count: number }>(),
      questionValues: new Map<string, number>(),
    };

    const surveyDimensionBucket = surveyBucket.dimensions.get(dimensionKey) ?? {
      sum: 0,
      count: 0,
    };
    surveyDimensionBucket.sum += score;
    surveyDimensionBucket.count += 1;
    surveyBucket.dimensions.set(dimensionKey, surveyDimensionBucket);
    surveyBucket.questionValues.set(row.question, score);
    surveyAccumulator.set(row.completedId, surveyBucket);
  }

  const dimensionChartData = Object.entries(DIMENSIONS_MAP).map(
    ([key, name]) => {
      const bucket = dimensionAccumulator.get(key as DimensionKey);
      const score = bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;

      return {
        name,
        score: Number(score.toFixed(2)),
        fill: resolveColor(score),
      };
    },
  );

  const promediosDimensiones = Object.fromEntries(
    Object.entries(DIMENSIONS_MAP).map(([key]) => {
      const dimensionKey = key as DimensionKey;
      const bucket = dimensionAccumulator.get(dimensionKey);
      const score = bucket && bucket.count > 0 ? bucket.sum / bucket.count : 0;

      return [dimensionKey, Number(score.toFixed(2))];
    }),
  ) as Record<DimensionKey, number>;

  const orderedQuestions = Array.from(questionAccumulator.entries())
    .sort((left, right) => left[1].firstItemId - right[1].firstItemId)
    .map(([question]) => question);
  const itemMatrix = Array.from(surveyAccumulator.values()).map((survey) =>
    orderedQuestions.map(
      (question) => survey.questionValues.get(question) ?? 0,
    ),
  );

  const regressionRows = Array.from(surveyAccumulator.values()).map(
    (survey) => {
      const dimensionValue = (dimension: DimensionKey) => {
        const bucket = survey.dimensions.get(dimension);
        return bucket && bucket.count > 0 ? bucket.sum / bucket.count : null;
      };

      return {
        qualitySys: dimensionValue("calidad_sys"),
        qualityInfo: dimensionValue("calidad_info"),
        qualityServ: dimensionValue("calidad_serv"),
        satisfaction: dimensionValue("satis_user"),
      };
    },
  );

  return {
    totalSurveys: surveyAccumulator.size,
    cronbachAlpha: buildAlpha(itemMatrix),
    promediosDimensiones,
    dimensionChartData,
    betaCoefficients: buildRegressionBetas(regressionRows),
    criticalQuestions: buildQuestionAlerts(questionAccumulator),
    satisfactionDistribution: buildSatisfactionDistribution(surveyAccumulator),
    questionFrequencies: buildQuestionFrequencies(questionAccumulator),
  };
}

export async function getCourseAnalyticsData(
  courseId: number,
): Promise<AnalyticsData> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("El courseId no es valido para consultar analitica");
  }

  const [rows] = await pool.execute<FeedbackAnalyticsRow[]>(
    `SELECT
        fc.id AS completedId,
        fi.id AS itemId,
        fi.name AS question,
        fi.label AS dimension,
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

  const summary = buildAnalyticsData(rows);
  const totalRespondents = (await obtenerEncuestadosPorCurso(courseId)).length;
  const responseRate =
    totalRespondents > 0
      ? Number(
          Math.min(
            100,
            (summary.totalSurveys / totalRespondents) * 100,
          ).toFixed(1),
        )
      : 0;

  return {
    ...summary,
    totalRespondents,
    responseRate,
  };
}
