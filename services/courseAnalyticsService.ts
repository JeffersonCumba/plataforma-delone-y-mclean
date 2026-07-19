import "server-only";

import { sampleVariance } from "simple-statistics";
import MultivariateLinearRegression from "ml-regression-multivariate-linear";
import { type RowDataPacket } from "mysql2";

import { pool } from "@/lib/db";
import { obtenerEncuestadosPorCurso } from "@/services/respondentService";
import { getCachedAnalytics, setCachedAnalytics } from "@/lib/analytics-cache";
import {
  DIMENSIONS_MAP,
  type AnalyticsBetaDatum,
  type AnalyticsData,
  type AnalyticsQuestionAlert,
  type ConstructReliabilityResult,
  type DeloneMcleanModelResult,
  type DiscriminantValidityResult,
  type DimensionKey,
  type FeedbackAnalyticsRow,
  type QuestionFrequency,
  type SatisfactionPieDatum,
  type StructuralPathResult,
} from "@/types/analytics";

type LikertValue = 1 | 2 | 3 | 4 | 5;
type LikertCounts = Record<LikertValue, number>;

const EMPTY_LIKERT_COUNTS: LikertCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
const BOOTSTRAP_SAMPLES = 500;
const DIMENSION_ORDER: DimensionKey[] = [
  "calidad_sys",
  "calidad_info",
  "calidad_serv",
  "uso_sistema",
  "satis_user",
  "benef_netos",
];

function isLikertValue(score: number): score is LikertValue {
  return Number.isInteger(score) && score >= 1 && score <= 5;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function sampleStandardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = average(values);
  const variance =
    values.reduce((acc, value) => acc + (value - mean) ** 2, 0) /
    (values.length - 1);
  return Math.sqrt(Math.max(variance, 0));
}

function zScore(values: number[]): number[] {
  const mean = average(values);
  const std = sampleStandardDeviation(values);
  if (std === 0) {
    return values.map(() => 0);
  }
  return values.map((value) => (value - mean) / std);
}

function pearsonCorrelation(left: number[], right: number[]): number {
  if (left.length !== right.length || left.length < 2) {
    return 0;
  }

  const leftMean = average(left);
  const rightMean = average(right);
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftCentered = left[index] - leftMean;
    const rightCentered = right[index] - rightMean;
    numerator += leftCentered * rightCentered;
    leftDenominator += leftCentered ** 2;
    rightDenominator += rightCentered ** 2;
  }

  const denominator = Math.sqrt(leftDenominator * rightDenominator);
  if (!Number.isFinite(denominator) || denominator === 0) {
    return 0;
  }

  return numerator / denominator;
}

function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const bounded = Math.min(Math.max(fraction, 0), 1);
  const rawIndex = bounded * (sorted.length - 1);
  const lowerIndex = Math.floor(rawIndex);
  const upperIndex = Math.ceil(rawIndex);
  const weight = rawIndex - lowerIndex;
  const lower = sorted[lowerIndex] ?? sorted[0];
  const upper = sorted[upperIndex] ?? sorted[sorted.length - 1];
  return lower + (upper - lower) * weight;
}

interface RegressionResult {
  coefficients: number[];
  rSquared: number;
}

function regressAndScore(
  predictors: number[][],
  target: number[],
): RegressionResult | null {
  if (predictors.length !== target.length || predictors.length < 2) {
    return null;
  }
  if (predictors[0]?.length === 0) {
    return null;
  }

  try {
    const yMatrix = target.map((value) => [value]);
    const regression = new MultivariateLinearRegression(predictors, yMatrix, {
      intercept: true,
    });
    const weights = regression.weights;
    const coefficients = predictors[0].map(
      (_, predictorIndex) => weights[predictorIndex + 1]?.[0] ?? 0,
    );

    let sse = 0;
    const meanY = average(target);
    let sst = 0;
    for (let rowIndex = 0; rowIndex < predictors.length; rowIndex += 1) {
      const predictionRaw = regression.predict(predictors[rowIndex]);
      const prediction = Array.isArray(predictionRaw)
        ? Number(predictionRaw[0] ?? 0)
        : Number(predictionRaw ?? 0);
      const residual = target[rowIndex] - prediction;
      sse += residual * residual;
      const centered = target[rowIndex] - meanY;
      sst += centered * centered;
    }
    const rSquared = sst > 0 ? 1 - sse / sst : 0;

    return {
      coefficients,
      rSquared: Number.isFinite(rSquared) ? rSquared : 0,
    };
  } catch {
    return null;
  }
}

function standardizedRegression(
  predictors: number[][],
  target: number[],
): RegressionResult | null {
  if (predictors.length === 0 || predictors[0]?.length === 0) {
    return null;
  }

  const standardizedPredictorsByColumn = predictors[0].map((_, columnIndex) =>
    zScore(predictors.map((row) => row[columnIndex] ?? 0)),
  );
  const standardizedPredictors = predictors.map((_, rowIndex) =>
    standardizedPredictorsByColumn.map((column) => column[rowIndex] ?? 0),
  );
  const standardizedTarget = zScore(target);

  return regressAndScore(standardizedPredictors, standardizedTarget);
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

type SurveyDimensionMeans = Record<DimensionKey, number | null>;

interface StructuralEquationConfig {
  target: DimensionKey;
  predictors: DimensionKey[];
}

const STRUCTURAL_EQUATIONS: StructuralEquationConfig[] = [
  {
    target: "uso_sistema",
    predictors: ["calidad_sys", "calidad_info", "calidad_serv"],
  },
  {
    target: "satis_user",
    predictors: ["calidad_sys", "calidad_info", "calidad_serv", "uso_sistema"],
  },
  {
    target: "benef_netos",
    predictors: ["uso_sistema", "satis_user"],
  },
];

function buildSurveyDimensionMeans(
  surveyAccumulator: Map<
    number,
    {
      dimensions: Map<DimensionKey, { sum: number; count: number }>;
      questionValues: Map<string, number>;
    }
  >,
): SurveyDimensionMeans[] {
  return Array.from(surveyAccumulator.values()).map((survey) => {
    const record = {} as SurveyDimensionMeans;
    for (const dimension of DIMENSION_ORDER) {
      const bucket = survey.dimensions.get(dimension);
      record[dimension] =
        bucket && bucket.count > 0 ? bucket.sum / bucket.count : null;
    }
    return record;
  });
}

function collectEquationData(
  rows: SurveyDimensionMeans[],
  config: StructuralEquationConfig,
): { predictors: number[][]; target: number[] } {
  const validRows = rows.filter((row) => {
    if (row[config.target] === null) {
      return false;
    }
    return config.predictors.every((predictor) => row[predictor] !== null);
  });

  return {
    predictors: validRows.map((row) =>
      config.predictors.map((predictor) => Number(row[predictor] ?? 0)),
    ),
    target: validRows.map((row) => Number(row[config.target] ?? 0)),
  };
}

function bootstrapStandardizedCoefficients(
  predictors: number[][],
  target: number[],
  sampleCount: number,
): number[][] {
  const coefficientSamples: number[][] = predictors[0].map(() => []);
  if (predictors.length < 3) {
    return coefficientSamples;
  }

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const sampledPredictors: number[][] = [];
    const sampledTarget: number[] = [];

    for (let rowIndex = 0; rowIndex < predictors.length; rowIndex += 1) {
      const randomIndex = Math.floor(Math.random() * predictors.length);
      sampledPredictors.push(predictors[randomIndex]);
      sampledTarget.push(target[randomIndex]);
    }

    const result = standardizedRegression(sampledPredictors, sampledTarget);
    if (!result) {
      continue;
    }

    result.coefficients.forEach((coefficient, coefficientIndex) => {
      coefficientSamples[coefficientIndex]?.push(coefficient);
    });
  }

  return coefficientSamples;
}

function buildStructuralModel(
  surveyDimensionRows: SurveyDimensionMeans[],
): {
  structuralPaths: StructuralPathResult[];
  rSquared: Partial<Record<DimensionKey, number>>;
} {
  const structuralPaths: StructuralPathResult[] = [];
  const rSquared: Partial<Record<DimensionKey, number>> = {};

  for (const equation of STRUCTURAL_EQUATIONS) {
    const equationData = collectEquationData(surveyDimensionRows, equation);
    const regression = standardizedRegression(
      equationData.predictors,
      equationData.target,
    );
    if (!regression) {
      equation.predictors.forEach((predictor) => {
        structuralPaths.push({
          key: `${predictor}->${equation.target}`,
          from: predictor,
          to: equation.target,
          name: `${DIMENSIONS_MAP[predictor]} → ${DIMENSIONS_MAP[equation.target]}`,
          coefficient: 0,
          ciLow: 0,
          ciHigh: 0,
          significant: false,
        });
      });
      rSquared[equation.target] = 0;
      continue;
    }

    const bootstrapSamples = bootstrapStandardizedCoefficients(
      equationData.predictors,
      equationData.target,
      BOOTSTRAP_SAMPLES,
    );

    equation.predictors.forEach((predictor, predictorIndex) => {
      const coefficient = regression.coefficients[predictorIndex] ?? 0;
      const coefficientSamples = bootstrapSamples[predictorIndex] ?? [];
      const ciLow = percentile(coefficientSamples, 0.025);
      const ciHigh = percentile(coefficientSamples, 0.975);
      const significant =
        (ciLow > 0 && ciHigh > 0) || (ciLow < 0 && ciHigh < 0);

      structuralPaths.push({
        key: `${predictor}->${equation.target}`,
        from: predictor,
        to: equation.target,
        name: `${DIMENSIONS_MAP[predictor]} → ${DIMENSIONS_MAP[equation.target]}`,
        coefficient: Number(coefficient.toFixed(3)),
        ciLow: Number(ciLow.toFixed(3)),
        ciHigh: Number(ciHigh.toFixed(3)),
        significant,
      });
    });

    rSquared[equation.target] = Number(regression.rSquared.toFixed(3));
  }

  return { structuralPaths, rSquared };
}

function buildConstructReliability(
  rows: FeedbackAnalyticsRow[],
): ConstructReliabilityResult[] {
  const dimensions = new Map<
    DimensionKey,
    Map<number, Map<number, number>>
  >();

  for (const row of rows) {
    const dimensionKey = resolveDimensionKey(row.question, row.dimension);
    if (!dimensionKey) {
      continue;
    }
    const score = parseMoodleValue(row.value);
    const itemsByDimension = dimensions.get(dimensionKey) ?? new Map();
    const respondentsByItem = itemsByDimension.get(row.itemId) ?? new Map();
    respondentsByItem.set(row.completedId, score);
    itemsByDimension.set(row.itemId, respondentsByItem);
    dimensions.set(dimensionKey, itemsByDimension);
  }

  return DIMENSION_ORDER.map((dimension) => {
    const itemMap = dimensions.get(dimension) ?? new Map();
    const itemEntries = Array.from(itemMap.entries());
    const itemCount = itemEntries.length;

    if (itemCount < 2) {
      return {
        dimension,
        name: DIMENSIONS_MAP[dimension],
        itemCount,
        cronbachAlpha: 0,
        compositeReliability: 0,
        ave: 0,
      };
    }

    const respondentIntersection = itemEntries
      .map(([, respondents]) => new Set(respondents.keys()))
      .reduce((common, current) => {
        return new Set(
          Array.from(common).filter((respondentId) => current.has(respondentId)),
        );
      });

    const respondentIds = Array.from(respondentIntersection.values());
    const itemMatrix = respondentIds.map((respondentId) =>
      itemEntries.map(([, respondents]) => Number(respondents.get(respondentId))),
    );

    const alpha = buildAlpha(itemMatrix);

    const constructScores = itemMatrix.map((values) => average(values));
    const loadings = itemEntries.map((_, itemIndex) => {
      const itemValues = itemMatrix.map((row) => row[itemIndex] ?? 0);
      const correlation = pearsonCorrelation(itemValues, constructScores);
      return Number.isFinite(correlation) ? Math.abs(correlation) : 0;
    });

    const loadingSquares = loadings.map((loading) => loading ** 2);
    const sumLoadings = loadings.reduce((acc, value) => acc + value, 0);
    const errorVariance = loadingSquares.reduce(
      (acc, loadingSquared) => acc + (1 - loadingSquared),
      0,
    );
    const compositeReliability =
      sumLoadings > 0
        ? (sumLoadings ** 2) / ((sumLoadings ** 2) + errorVariance)
        : 0;
    const ave = average(loadingSquares);

    return {
      dimension,
      name: DIMENSIONS_MAP[dimension],
      itemCount,
      cronbachAlpha: Number(alpha.toFixed(3)),
      compositeReliability: Number(compositeReliability.toFixed(3)),
      ave: Number(ave.toFixed(3)),
    };
  });
}

function buildDiscriminantValidity(
  surveyDimensionRows: SurveyDimensionMeans[],
  constructReliability: ConstructReliabilityResult[],
): DiscriminantValidityResult[] {
  const aveByDimension = new Map(
    constructReliability.map((entry) => [entry.dimension, entry.ave]),
  );
  const results: DiscriminantValidityResult[] = [];

  for (let leftIndex = 0; leftIndex < DIMENSION_ORDER.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < DIMENSION_ORDER.length;
      rightIndex += 1
    ) {
      const left = DIMENSION_ORDER[leftIndex];
      const right = DIMENSION_ORDER[rightIndex];
      const paired = surveyDimensionRows.filter(
        (row) => row[left] !== null && row[right] !== null,
      );

      const leftValues = paired.map((row) => Number(row[left] ?? 0));
      const rightValues = paired.map((row) => Number(row[right] ?? 0));
      const correlation = pearsonCorrelation(leftValues, rightValues);

      const sqrtAveLeft = Math.sqrt(Math.max(aveByDimension.get(left) ?? 0, 0));
      const sqrtAveRight = Math.sqrt(Math.max(aveByDimension.get(right) ?? 0, 0));
      const passesFornellLarcker =
        sqrtAveLeft > Math.abs(correlation) &&
        sqrtAveRight > Math.abs(correlation);

      results.push({
        left,
        right,
        leftName: DIMENSIONS_MAP[left],
        rightName: DIMENSIONS_MAP[right],
        correlation: Number(correlation.toFixed(3)),
        sqrtAveLeft: Number(sqrtAveLeft.toFixed(3)),
        sqrtAveRight: Number(sqrtAveRight.toFixed(3)),
        passesFornellLarcker,
      });
    }
  }

  return results;
}

function buildDeloneMcleanModel(
  rows: FeedbackAnalyticsRow[],
  surveyAccumulator: Map<
    number,
    {
      dimensions: Map<DimensionKey, { sum: number; count: number }>;
      questionValues: Map<string, number>;
    }
  >,
): DeloneMcleanModelResult {
  const surveyDimensionRows = buildSurveyDimensionMeans(surveyAccumulator);
  const structural = buildStructuralModel(surveyDimensionRows);
  const constructReliability = buildConstructReliability(rows);
  const discriminantValidity = buildDiscriminantValidity(
    surveyDimensionRows,
    constructReliability,
  );

  return {
    sampleSize: surveyDimensionRows.length,
    bootstrapSamples: BOOTSTRAP_SAMPLES,
    structuralPaths: structural.structuralPaths,
    constructReliability,
    discriminantValidity,
    rSquared: structural.rSquared,
  };
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
    deloneMcleanModel: buildDeloneMcleanModel(rows, surveyAccumulator),
  };
}

async function getCompletedCountForCourse(courseId: number): Promise<number> {
  const [rows] = await pool.execute<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT fc.id) AS count
     FROM mdl_feedback_completed fc
     JOIN mdl_feedback f ON f.id = fc.feedback
     WHERE f.course = ?`,
    [courseId],
  );
  return (rows as { count: number }[])[0]?.count ?? 0;
}

export async function getCourseAnalyticsData(
  courseId: number,
): Promise<AnalyticsData> {
  if (!Number.isInteger(courseId) || courseId <= 0) {
    throw new Error("El courseId no es valido para consultar analitica");
  }

  const currentCount = await getCompletedCountForCourse(courseId);
  const cached = getCachedAnalytics(courseId);
  if (cached && cached.completedCount === currentCount) {
    return cached.data;
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

  const result: AnalyticsData = {
    ...summary,
    totalRespondents,
    responseRate,
  };

  setCachedAnalytics(courseId, result, currentCount);
  return result;
}
